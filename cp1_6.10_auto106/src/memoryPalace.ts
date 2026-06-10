export interface Pyramid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  symbol: string;
  size: number;
}

export const PALETTE_COLORS = [
  '#55ddff',
  '#ff6b9d',
  '#ffd93d',
  '#6bcb77',
  '#c780ff',
  '#ff8c42',
  '#4ecdc4',
  '#ff6b6b',
  '#a8e6cf',
  '#ffd3b6'
];

export class MemoryPalace {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pyramids: Pyramid[] = [];
  private nextId = 0;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.width = rect.width;
    this.height = rect.height;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clear(): void {
    this.pyramids = [];
    this.nextId = 0;
  }

  addPyramid(symbol: string, colorIndex: number): void {
    const color = PALETTE_COLORS[colorIndex % PALETTE_COLORS.length];
    const size = 30;
    let attempts = 0;
    let x = 0, y = 0;
    let valid = false;

    while (attempts < 100 && !valid) {
      x = size + Math.random() * (this.width - size * 2);
      y = size + 40 + Math.random() * (this.height - size * 2 - 40);
      valid = this.pyramids.every(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) >= 40;
      });
      attempts++;
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 5;
    this.pyramids.push({
      id: this.nextId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: 0.2,
      color,
      symbol,
      size
    });
  }

  private resolveCollisions(): void {
    for (let i = 0; i < this.pyramids.length; i++) {
      for (let j = i + 1; j < this.pyramids.length; j++) {
        const a = this.pyramids[i];
        const b = this.pyramids[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 40;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const dvx = b.vx - a.vx;
          const dvy = b.vy - a.vy;
          const dot = dvx * nx + dvy * ny;
          if (dot < 0) {
            a.vx += dot * nx;
            a.vy += dot * ny;
            b.vx -= dot * nx;
            b.vy -= dot * ny;
          }
        }
      }
    }
  }

  update(dt: number): void {
    const t = dt / 1000;
    this.pyramids.forEach(p => {
      p.x += p.vx * t;
      p.y += p.vy * t;
      p.rotation += p.rotationSpeed * t;

      if (p.x < p.size) {
        p.x = p.size;
        p.vx = Math.abs(p.vx);
      }
      if (p.x > this.width - p.size) {
        p.x = this.width - p.size;
        p.vx = -Math.abs(p.vx);
      }
      if (p.y < p.size + 40) {
        p.y = p.size + 40;
        p.vy = Math.abs(p.vy);
      }
      if (p.y > this.height - p.size) {
        p.y = this.height - p.size;
        p.vy = -Math.abs(p.vy);
      }
    });

    this.resolveCollisions();
  }

  private drawPyramid(p: Pyramid): void {
    const { ctx } = this;
    const s = p.size;
    const rot = p.rotation;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);

    const top = { x: 0, y: -s * 0.8 };
    const bl = { x: -s * 0.7, y: s * 0.5 };
    const br = { x: s * 0.7, y: s * 0.5 };
    const bm = { x: 0, y: s * 0.7 };

    const baseColor = p.color;
    const lightColor = this.lightenColor(baseColor, 0.35);
    const darkColor = this.darkenColor(baseColor, 0.3);
    const shadowColor = this.darkenColor(baseColor, 0.5);

    ctx.globalAlpha = 0.85;

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.lineTo(bm.x, bm.y);
    ctx.closePath();
    const grad1 = ctx.createLinearGradient(bl.x, bl.y, top.x, top.y);
    grad1.addColorStop(0, darkColor);
    grad1.addColorStop(1, baseColor);
    ctx.fillStyle = grad1;
    ctx.fill();
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bm.x, bm.y);
    ctx.closePath();
    const grad2 = ctx.createLinearGradient(br.x, br.y, top.x, top.y);
    grad2.addColorStop(0, shadowColor);
    grad2.addColorStop(1, lightColor);
    ctx.fillStyle = grad2;
    ctx.fill();
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.closePath();
    const grad3 = ctx.createLinearGradient(0, top.y, 0, br.y);
    grad3.addColorStop(0, lightColor);
    grad3.addColorStop(1, baseColor);
    ctx.fillStyle = grad3;
    ctx.fill();
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.2, s * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#e0e6ed';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.symbol, p.x, p.y + p.size + 16);
    ctx.restore();
  }

  private lightenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.min(255, Math.round(r + (255 - r) * amount));
    const ng = Math.min(255, Math.round(g + (255 - g) * amount));
    const nb = Math.min(255, Math.round(b + (255 - b) * amount));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const nr = Math.max(0, Math.round(r * (1 - amount)));
    const ng = Math.max(0, Math.round(g * (1 - amount)));
    const nb = Math.max(0, Math.round(b * (1 - amount)));
    return `rgb(${nr}, ${ng}, ${nb})`;
  }

  render(): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    this.pyramids.forEach(p => this.drawPyramid(p));
  }
}
