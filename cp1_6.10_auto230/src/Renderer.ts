import { Tile, TileChangeEvent, SymmetryMode } from './TileGrid';

const CANVAS_SIZE = 800;
const BG_COLOR = '#e8e4d9';
const GAP_COLOR = '#555';
const GAP_SIZE = 2;

interface AnimatedTile {
  tile: Tile;
  startColor: string;
  endColor: string;
  progress: number;
  delay: number;
  scale: number;
  rotation: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private density: number = 8;
  private symmetry: SymmetryMode = 'mirror';
  private tiles: Tile[] = [];
  private animatedTiles: Map<string, AnimatedTile> = new Map();
  private animating: boolean = false;
  private animationStartTime: number = 0;
  private animationDuration: number = 0;
  private animationType: string = '';
  private rafId: number | null = null;
  private staggerDelay: number = 0;
  private centerOut: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
  }

  setTiles(tiles: Tile[]) {
    this.tiles = tiles;
  }

  setDensity(d: number) {
    this.density = d;
  }

  setSymmetry(s: SymmetryMode) {
    this.symmetry = s;
  }

  handleChange(e: TileChangeEvent, getTileKey: (t: Tile) => string) {
    this.animatedTiles.clear();
    this.animationType = e.type;
    this.animationDuration = e.animationDuration;
    this.animationStartTime = performance.now();
    this.staggerDelay = e.staggerDelay;
    this.centerOut = e.centerOut;

    const centerR = (this.density - 1) / 2;
    const centerC = (this.density - 1) / 2;
    const maxDist = Math.sqrt(centerR * centerR + centerC * centerC);

    e.tiles.forEach((tile, idx) => {
      const key = getTileKey(tile);
      const existing = this.tiles.find(t => getTileKey(t) === key);
      const startColor = existing ? existing.color : tile.color;

      let delay = 0;
      if (this.centerOut) {
        const dist = Math.sqrt(Math.pow(tile.row - centerR, 2) + Math.pow(tile.col - centerC, 2));
        delay = (dist / maxDist) * 200;
      } else if (this.staggerDelay > 0) {
        delay = idx * this.staggerDelay;
      }

      this.animatedTiles.set(key, {
        tile,
        startColor,
        endColor: tile.color,
        progress: 0,
        delay,
        scale: e.type === 'symmetry' ? 0 : 1,
        rotation: e.type === 'symmetry' ? (Math.PI / 4) : 0
      });
    });

    if (!this.animating && e.animationDuration > 0) {
      this.animating = true;
      this.animate();
    } else if (e.animationDuration === 0) {
      this.tiles = [...this.tiles];
      for (const t of e.tiles) {
        const k = getTileKey(t);
        const idx = this.tiles.findIndex(x => getTileKey(x) === k);
        if (idx >= 0) this.tiles[idx] = t;
      }
      this.render();
    }
  }

  render() {
    const ctx = this.ctx;
    const tileSize = (CANVAS_SIZE - GAP_SIZE * (this.density + 1)) / this.density;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (const tile of this.tiles) {
      const x = GAP_SIZE + tile.col * (tileSize + GAP_SIZE);
      const y = GAP_SIZE + tile.row * (tileSize + GAP_SIZE);
      this.drawTile(ctx, tile, x, y, tileSize);
    }

    ctx.fillStyle = GAP_COLOR;
    for (let i = 0; i <= this.density; i++) {
      const pos = i * (tileSize + GAP_SIZE);
      ctx.fillRect(0, pos, CANVAS_SIZE, GAP_SIZE);
      ctx.fillRect(pos, 0, GAP_SIZE, CANVAS_SIZE);
    }

    this.drawInfoPanel(ctx);
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number, size: number) {
    const anim = this.animatedTiles.get(`${tile.row}-${tile.col}`);
    let color = tile.color;
    let scale = 1;
    let rotation = 0;

    if (anim && anim.progress < 1) {
      color = this.lerpColor(anim.startColor, anim.endColor, anim.progress);
      if (this.animationType === 'symmetry') {
        scale = 0.3 + anim.progress * 0.7;
        rotation = anim.rotation * (1 - anim.progress);
      } else if (this.animationType === 'density') {
        scale = 0.5 + anim.progress * 0.5;
      }
    }

    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;

    const s = size / 2;

    switch (tile.shape) {
      case 'rect':
        ctx.fillRect(-s, -s, size, size);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'hexagon':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = Math.cos(angle) * s * 0.95;
          const hy = Math.sin(angle) * s * 0.95;
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  private drawInfoPanel(ctx: CanvasRenderingContext2D) {
    const padding = 12;
    const lineHeight = 18;
    const lines = [
      `密度: ${this.density}x${this.density}`,
      `对称: ${this.getSymmetryLabel()}`
    ];

    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const panelW = maxWidth + 24;
    const panelH = lines.length * lineHeight + 16;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, padding, padding, panelW, panelH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, padding + 12, padding + 8 + i * lineHeight);
    });
  }

  private getSymmetryLabel(): string {
    switch (this.symmetry) {
      case 'rotate': return '旋转';
      case 'mirror': return '镜像';
      case 'fractal': return '分形';
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ah = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const bh = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const rh = Math.round(ah + (bh - ah) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${rh.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private animate() {
    if (!this.animating) return;

    const now = performance.now();
    const elapsed = now - this.animationStartTime;

    let allDone = true;
    this.animatedTiles.forEach((anim, key) => {
      const effectiveElapsed = Math.max(0, elapsed - anim.delay);
      if (effectiveElapsed >= this.animationDuration) {
        anim.progress = 1;
        const tile = this.tiles.find(t => `${t.row}-${t.col}` === key);
        if (tile) {
          tile.color = anim.endColor;
          tile.baseColor = anim.endColor;
        }
      } else {
        anim.progress = this.easeInOut(effectiveElapsed / this.animationDuration);
        allDone = false;
      }
    });

    this.render();

    if (allDone) {
      this.animating = false;
      this.animatedTiles.clear();
      this.rafId = null;
    } else {
      this.rafId = requestAnimationFrame(() => this.animate());
    }
  }

  isAnimating(): boolean {
    return this.animating;
  }

  exportPNG(): string {
    return this.canvas.toDataURL('image/png');
  }

  exportCSS(): string {
    const tileSize = (CANVAS_SIZE - GAP_SIZE * (this.density + 1)) / this.density;
    let css = `.mosaic-bg {
  width: 800px;
  height: 800px;
  background-color: ${BG_COLOR};
  background-image:
`;
    const gradients: string[] = [];
    for (const tile of this.tiles) {
      const x = GAP_SIZE + tile.col * (tileSize + GAP_SIZE);
      const y = GAP_SIZE + tile.row * (tileSize + GAP_SIZE);
      gradients.push(`    linear-gradient(${tile.color}, ${tile.color}) ${x}px ${y}px / ${tileSize}px ${tileSize}px no-repeat`);
    }
    css += gradients.join(',\n') + ';\n}\n';
    return css;
  }

  getTileAt(canvasX: number, canvasY: number): { row: number; col: number } | null {
    const tileSize = (CANVAS_SIZE - GAP_SIZE * (this.density + 1)) / this.density;
    const cellSize = tileSize + GAP_SIZE;
    if (canvasX < GAP_SIZE || canvasY < GAP_SIZE || canvasX >= CANVAS_SIZE - GAP_SIZE || canvasY >= CANVAS_SIZE - GAP_SIZE) {
      return null;
    }
    const col = Math.floor((canvasX - GAP_SIZE) / cellSize);
    const row = Math.floor((canvasY - GAP_SIZE) / cellSize);
    if (row < 0 || row >= this.density || col < 0 || col >= this.density) return null;
    const tileX = GAP_SIZE + col * cellSize;
    const tileY = GAP_SIZE + row * cellSize;
    if (canvasX < tileX || canvasX >= tileX + tileSize || canvasY < tileY || canvasY >= tileY + tileSize) return null;
    return { row, col };
  }

  getCanvasPosition(row: number, col: number): { x: number; y: number } {
    const tileSize = (CANVAS_SIZE - GAP_SIZE * (this.density + 1)) / this.density;
    const cellSize = tileSize + GAP_SIZE;
    return {
      x: GAP_SIZE + col * cellSize + tileSize / 2,
      y: GAP_SIZE + row * cellSize + tileSize / 2
    };
  }
}
