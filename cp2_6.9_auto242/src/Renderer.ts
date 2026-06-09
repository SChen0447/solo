import type { Particle } from './AlchemySystem.js';

interface FloatingText {
  text: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

const PIXEL = 4;

const FLAME_FRAMES = 6;
const FLAME_INTERVAL = 150;

const FLAME_COLORS = [
  '#FF4500',
  '#FF6347',
  '#FF8C00',
  '#FFA500',
  '#FFB347',
  '#FFD700'
];

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private crucibleX: number = 0;
  private crucibleY: number = 0;
  private crucibleWidth: number = 60;
  private crucibleHeight: number = 50;
  private flameFrame: number = 0;
  private lastFlameTime: number = 0;
  private floatingTexts: FloatingText[] = [];
  private bgPatternCache: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
    this.crucibleX = Math.floor(width / 2);
    this.crucibleY = Math.floor(height / 2);
    this.createBgPattern();
  }

  public getCrucibleCenter(): { x: number; y: number } {
    return { x: this.crucibleX, y: this.crucibleY };
  }

  public getCrucibleRadius(): number {
    return this.crucibleWidth * PIXEL / 2 - PIXEL;
  }

  public isInCrucible(px: number, py: number): boolean {
    const dx = px - this.crucibleX;
    const dy = py - this.crucibleY;
    const rx = this.crucibleWidth * PIXEL / 2;
    const ry = this.crucibleHeight * PIXEL / 2;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  private createBgPattern(): void {
    const size = 16 * PIXEL;
    const pattern = document.createElement('canvas');
    pattern.width = size;
    pattern.height = size;
    const pctx = pattern.getContext('2d');
    if (!pctx) return;
    pctx.fillStyle = '#2A1A0E';
    pctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 20; i++) {
      pctx.fillStyle = Math.random() > 0.5 ? '#3E2723' : '#1A0F08';
      const x = Math.floor(Math.random() * size / PIXEL) * PIXEL;
      const y = Math.floor(Math.random() * size / PIXEL) * PIXEL;
      pctx.fillRect(x, y, PIXEL, PIXEL);
    }
    this.bgPatternCache = pattern;
  }

  public addFloatingText(text: string, color: string = '#FFD700'): void {
    this.floatingTexts.push({
      text,
      x: this.crucibleX,
      y: this.crucibleY - 80,
      life: 180,
      maxLife: 180,
      color
    });
  }

  public render(particles: Particle[], time: number): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground();
    this.drawFlame(time);
    this.drawCrucible();
    this.drawParticles(particles);
    this.drawFloatingTexts();
  }

  private drawBackground(): void {
    const { width, height } = this.canvas;
    if (this.bgPatternCache) {
      const pattern = this.ctx.createPattern(this.bgPatternCache, 'repeat');
      if (pattern) {
        this.ctx.fillStyle = pattern;
        this.ctx.fillRect(0, 0, width, height);
      }
    } else {
      this.ctx.fillStyle = '#2A1A0E';
      this.ctx.fillRect(0, 0, width, height);
    }
    this.ctx.fillStyle = '#1A0F08';
    for (let y = 0; y < height; y += PIXEL) {
      for (let x = 0; x < width; x += PIXEL * 2) {
        const offset = (y / PIXEL) % 2 === 0 ? 0 : PIXEL;
        if ((x + offset) % (PIXEL * 4) === 0) {
          this.ctx.fillRect(x + offset, y, PIXEL, PIXEL);
        }
      }
    }
  }

  private drawCrucible(): void {
    const cx = this.crucibleX;
    const cy = this.crucibleY;
    const w = this.crucibleWidth * PIXEL;
    const h = this.crucibleHeight * PIXEL;
    const left = cx - w / 2;
    const top = cy - h / 2;
    this.ctx.fillStyle = '#4A2F1A';
    for (let y = 0; y < h * 0.7; y += PIXEL) {
      const row = y / PIXEL;
      const indent = Math.floor(row * 0.3) * PIXEL;
      this.ctx.fillRect(left + indent, top + y, w - indent * 2, PIXEL);
    }
    this.ctx.fillStyle = '#6B4226';
    for (let y = PIXEL; y < h * 0.7; y += PIXEL) {
      const row = y / PIXEL;
      const indent = Math.floor(row * 0.3) * PIXEL;
      this.ctx.fillRect(left + indent + PIXEL, top + y, w - indent * 2 - PIXEL * 2, PIXEL);
    }
    this.ctx.fillStyle = '#8B5A2B';
    for (let i = 0; i < this.crucibleWidth; i += 2) {
      const x = left + i * PIXEL;
      if (i % 4 === 0) {
        this.ctx.fillRect(x, top - PIXEL, PIXEL, PIXEL);
      } else {
        this.ctx.fillRect(x, top, PIXEL, PIXEL);
      }
    }
    this.ctx.fillStyle = '#3E2723';
    for (let y = 0; y < h * 0.15; y += PIXEL) {
      const row = y / PIXEL;
      const indent = Math.floor(row * 1.5) * PIXEL;
      this.ctx.fillRect(left + indent, top + h * 0.6 + y, w - indent * 2, PIXEL);
    }
    this.ctx.fillStyle = '#5D4037';
    this.ctx.fillRect(left - PIXEL, top + PIXEL * 4, PIXEL, PIXEL * 8);
    this.ctx.fillRect(left + w, top + PIXEL * 4, PIXEL, PIXEL * 8);
    this.ctx.fillStyle = '#6B4226';
    this.ctx.fillRect(left - PIXEL * 2, top + PIXEL * 3, PIXEL, PIXEL);
    this.ctx.fillRect(left + w + PIXEL, top + PIXEL * 3, PIXEL, PIXEL);
    this.ctx.fillStyle = '#8B5A2B';
    this.ctx.fillRect(left + PIXEL * 2, top + PIXEL * 2, PIXEL, PIXEL);
    this.ctx.fillRect(left + w - PIXEL * 3, top + PIXEL * 2, PIXEL, PIXEL);
    this.ctx.fillRect(left + PIXEL * 4, top + PIXEL * 5, PIXEL, PIXEL);
  }

  private drawFlame(time: number): void {
    if (time - this.lastFlameTime >= FLAME_INTERVAL) {
      this.flameFrame = (this.flameFrame + 1) % FLAME_FRAMES;
      this.lastFlameTime = time;
    }
    const cx = this.crucibleX;
    const cy = this.crucibleY + this.crucibleHeight * PIXEL / 2 + PIXEL * 2;
    const frameOffset = Math.sin(time / 200) * PIXEL;
    const colorIndex = this.flameFrame % FLAME_COLORS.length;
    const color = FLAME_COLORS[colorIndex];
    this.ctx.fillStyle = '#FF4500';
    this.ctx.fillRect(cx - PIXEL * 3, cy, PIXEL * 6, PIXEL * 3);
    this.ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      const height = PIXEL * (2 + (i % 3));
      const offset = (i - 4) * PIXEL;
      const wobble = Math.sin((time + i * 100) / 150) * PIXEL;
      this.ctx.fillRect(cx + offset + wobble, cy - height - i * PIXEL + frameOffset, PIXEL, height);
    }
    const innerColor = FLAME_COLORS[(this.flameFrame + 2) % FLAME_COLORS.length];
    this.ctx.fillStyle = innerColor;
    for (let i = 1; i < 7; i++) {
      const height = PIXEL * (1 + (i % 2));
      const offset = (i - 3.5) * PIXEL;
      this.ctx.fillRect(cx + offset, cy - height - (i - 1) * PIXEL + frameOffset, PIXEL, height);
    }
    this.ctx.fillStyle = '#FFD700';
    this.ctx.fillRect(cx - PIXEL, cy - PIXEL * 2 + frameOffset, PIXEL * 2, PIXEL * 2);
    this.ctx.fillRect(cx, cy - PIXEL * 4 + frameOffset, PIXEL, PIXEL);
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.explosive ? p.life / p.maxLife : Math.min(1, p.life / 30);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      const size = Math.max(PIXEL / 2, p.size);
      this.ctx.fillRect(
        Math.floor(p.x - size / 2),
        Math.floor(p.y - size / 2),
        Math.ceil(size),
        Math.ceil(size)
      );
    }
    this.ctx.globalAlpha = 1;
  }

  private drawFloatingTexts(): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 0.5;
      t.life--;
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      const alpha = Math.min(1, t.life / 60);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = t.color;
      this.ctx.font = `bold ${PIXEL * 4}px "Courier New", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(t.text, t.x, t.y);
      this.ctx.globalAlpha = alpha * 0.3;
      this.ctx.fillStyle = '#000';
      this.ctx.fillText(t.text, t.x + 2, t.y + 2);
      this.ctx.globalAlpha = 1;
    }
  }
}
