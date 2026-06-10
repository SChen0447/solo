export type SymmetryMode = 'rotate' | 'mirror' | 'fractal';

export interface Tile {
  row: number;
  col: number;
  color: string;
  baseColor: string;
  shape: 'rect' | 'diamond' | 'hexagon';
  alpha: number;
}

export interface TileChangeEvent {
  type: 'density' | 'symmetry' | 'palette' | 'single' | 'bleed';
  tiles: Tile[];
  animationDuration: number;
  centerOut: boolean;
  staggerDelay: number;
}

const WARM_PALETTE = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#f9844a', '#f9c74f'];
const COOL_PALETTE = ['#577590', '#43aa8b', '#90be6d', '#277da1', '#4d908e', '#90be6d'];
const ALL_COLORS = [...WARM_PALETTE, ...COOL_PALETTE];

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function jitterColor(hex: string, amount: number = 10): string {
  const hsl = hexToHsl(hex);
  const jitter = (Math.random() - 0.5) * 2 * amount;
  hsl.h = (hsl.h + jitter + 360) % 360;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

function lerpColor(a: string, b: string, t: number): string {
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

export class TileGrid {
  private tiles: Tile[] = [];
  private density: number = 8;
  private symmetry: SymmetryMode = 'mirror';
  private currentPalette: string[] = WARM_PALETTE;
  private listeners: ((e: TileChangeEvent) => void)[] = [];

  constructor() {
    this.generateTiles();
  }

  getDensity(): number {
    return this.density;
  }

  getSymmetry(): SymmetryMode {
    return this.symmetry;
  }

  getTiles(): Tile[] {
    return this.tiles;
  }

  getPaletteColors(): string[] {
    return ALL_COLORS;
  }

  onChange(cb: (e: TileChangeEvent) => void) {
    this.listeners.push(cb);
  }

  setDensity(d: number) {
    if (d < 4 || d > 16 || d === this.density) return;
    this.density = d;
    this.generateTiles(true);
    this.emit({
      type: 'density',
      tiles: this.tiles,
      animationDuration: 500,
      centerOut: true,
      staggerDelay: 0
    });
  }

  setSymmetry(s: SymmetryMode) {
    if (s === this.symmetry) return;
    this.symmetry = s;
    this.applySymmetry();
    this.emit({
      type: 'symmetry',
      tiles: this.tiles,
      animationDuration: 600,
      centerOut: false,
      staggerDelay: 0
    });
  }

  setPalette(warm: boolean) {
    this.currentPalette = warm ? WARM_PALETTE : COOL_PALETTE;
    this.recalculateColorsWithGradient();
    this.emit({
      type: 'palette',
      tiles: this.tiles,
      animationDuration: 800,
      centerOut: false,
      staggerDelay: 20
    });
  }

  setTileColor(row: number, col: number, color: string) {
    const tile = this.tiles.find(t => t.row === row && t.col === col);
    if (!tile) return;
    tile.color = color;
    tile.baseColor = color;
    this.emit({
      type: 'single',
      tiles: [tile],
      animationDuration: 0,
      centerOut: false,
      staggerDelay: 0
    });
    this.bleedColor(row, col, color);
  }

  private bleedColor(row: number, col: number, color: string) {
    const affected: Tile[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        const tile = this.tiles.find(t => t.row === nr && t.col === nc);
        if (tile) {
          const distance = Math.abs(dr) + Math.abs(dc);
          const alpha = Math.max(0.5, 1 - (distance - 1) * 0.25);
          tile.color = lerpColor(tile.baseColor, color, alpha * 0.3);
          tile.alpha = alpha;
          affected.push(tile);
        }
      }
    }
    if (affected.length > 0) {
      this.emit({
        type: 'bleed',
        tiles: affected,
        animationDuration: 300,
        centerOut: false,
        staggerDelay: 0
      });
    }
  }

  private emit(e: TileChangeEvent) {
    this.listeners.forEach(l => l(e));
  }

  private generateTiles(jitter: boolean = false) {
    this.tiles = [];
    for (let r = 0; r < this.density; r++) {
      for (let c = 0; c < this.density; c++) {
        const color = this.getColorForPosition(r, c, jitter);
        const shapes: ('rect' | 'diamond' | 'hexagon')[] = ['rect', 'diamond', 'hexagon'];
        const shape = shapes[(r + c) % 3];
        this.tiles.push({
          row: r,
          col: c,
          color,
          baseColor: color,
          shape,
          alpha: 1
        });
      }
    }
    this.applySymmetry();
  }

  private getColorForPosition(row: number, col: number, jitter: boolean): string {
    const t = (row + col) / (2 * (this.density - 1));
    const palette = this.currentPalette;
    const idx = t * (palette.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, palette.length - 1);
    const localT = idx - lo;
    let color = lerpColor(palette[lo], palette[hi], localT);
    if (jitter) {
      color = jitterColor(color, 10);
    }
    return color;
  }

  private recalculateColorsWithGradient() {
    for (const tile of this.tiles) {
      const newColor = this.getColorForPosition(tile.row, tile.col, false);
      tile.color = newColor;
      tile.baseColor = newColor;
    }
    this.applySymmetry();
  }

  private applySymmetry() {
    const n = this.density;
    const half = Math.floor(n / 2);
    const center = (n - 1) / 2;

    switch (this.symmetry) {
      case 'mirror': {
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < half; c++) {
            const srcTile = this.tiles.find(t => t.row === r && t.col === c);
            const dstTile = this.tiles.find(t => t.row === r && t.col === n - 1 - c);
            if (srcTile && dstTile) {
              dstTile.color = srcTile.color;
              dstTile.baseColor = srcTile.baseColor;
            }
          }
        }
        break;
      }
      case 'rotate': {
        const sector = Math.ceil(n / 2);
        for (let r = 0; r < sector; r++) {
          for (let c = 0; c < sector; c++) {
            const src = this.tiles.find(t => t.row === r && t.col === c);
            if (!src) continue;
            const positions = [
              { row: r, col: c },
              { row: c, col: n - 1 - r },
              { row: n - 1 - r, col: n - 1 - c },
              { row: n - 1 - c, col: r }
            ];
            positions.forEach(pos => {
              const tile = this.tiles.find(t => t.row === pos.row && t.col === pos.col);
              if (tile) {
                tile.color = src.color;
                tile.baseColor = src.baseColor;
              }
            });
          }
        }
        break;
      }
      case 'fractal': {
        const blockSize = Math.max(1, Math.floor(n / 2));
        for (let r = 0; r < n; r++) {
          for (let c = 0; c < n; c++) {
            const srcR = r % blockSize;
            const srcC = c % blockSize;
            const src = this.tiles.find(t => t.row === srcR && t.col === srcC);
            const dst = this.tiles.find(t => t.row === r && t.col === c);
            if (src && dst) {
              dst.color = src.color;
              dst.baseColor = src.baseColor;
            }
          }
        }
        break;
      }
    }
  }
}
