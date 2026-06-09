import type { FluidSimulation, RGB } from './fluid';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
  trail: Array<{ x: number; y: number }>;
}

export interface RendererStats {
  fps: number;
  particleCount: number;
}

export class FluidRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fluid: FluidSimulation;
  private dpr: number;

  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 2000;
  private readonly TRAIL_LENGTH = 12;

  private currentColor: RGB = [0, 1, 1];
  private paused = false;

  private qualityScale = 1.0;
  private qualityAlpha = 1.0;

  private fpsDisplay: HTMLElement | null = null;
  private particleDisplay: HTMLElement | null = null;

  constructor(canvas: HTMLCanvasElement, fluid: FluidSimulation) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.fluid = fluid;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  setFpsDisplay(el: HTMLElement | null): void {
    this.fpsDisplay = el;
  }

  setParticleDisplay(el: HTMLElement | null): void {
    this.particleDisplay = el;
  }

  updateStats(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = fps.toFixed(0);
    }
    if (this.particleDisplay) {
      this.particleDisplay.textContent = this.particles.length.toString();
    }
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setColor(hex: string): void {
    this.currentColor = this.hexToRgb(hex);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  updatePerformanceQuality(fps: number): void {
    if (fps < 30) {
      this.qualityScale = 0.5;
      this.qualityAlpha = 0.3;
    } else {
      this.qualityScale = 1.0;
      this.qualityAlpha = 1.0;
    }
  }

  emitDragParticles(worldX: number, worldY: number, dx: number, dy: number): void {
    const count = 3;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }
      const jitterX = (Math.random() - 0.5) * 6;
      const jitterY = (Math.random() - 0.5) * 6;
      this.particles.push({
        x: worldX + jitterX,
        y: worldY + jitterY,
        vx: dx,
        vy: dy,
        life: 0,
        maxLife: this.TRAIL_LENGTH,
        color: 'white',
        size: 3,
        alpha: 0.6,
        trail: [],
      });
    }
  }

  emitColorParticles(worldX: number, worldY: number): void {
    const count = 5;
    const [r, g, b] = this.currentColor;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) {
        this.particles.shift();
      }
      const jitterX = (Math.random() - 0.5) * 8;
      const jitterY = (Math.random() - 0.5) * 8;
      const size = 2 + Math.random() * 2;
      const alpha = 0.5 + Math.random() * 0.3;
      this.particles.push({
        x: worldX + jitterX,
        y: worldY + jitterY,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 300 + Math.random() * 200,
        color: this.rgbToHex(r, g, b),
        size,
        alpha,
        trail: [],
      });
    }
  }

  render(): void {
    const [nx, ny] = this.fluid.getGridSize();
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.fillStyle = '#1E1E2E';
    this.ctx.fillRect(0, 0, w, h);

    this.renderColorField(w, h, nx, ny);

    if (!this.paused) {
      this.advanceParticles(w, h, nx, ny);
    }
    this.renderParticles();
  }

  private renderColorField(w: number, h: number, nx: number, ny: number): void {
    const [r, g, b] = this.fluid.getColorField();
    const cellW = w / nx;
    const cellH = h / ny;
    const blendPx = 10;
    const radius = Math.max(1, Math.ceil(blendPx / Math.min(cellW, cellH)));

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        let cr = r[idx];
        let cg = g[idx];
        let cb = b[idx];
        let weight = 1;

        if (radius > 1) {
          let sr = 0, sg = 0, sb = 0, sw = 0;
          for (let dy2 = -radius; dy2 <= radius; dy2++) {
            for (let dx2 = -radius; dx2 <= radius; dx2++) {
              const d2 = dx2 * dx2 + dy2 * dy2;
              if (d2 > radius * radius) continue;
              const xx = Math.min(Math.max(x + dx2, 0), nx - 1);
              const yy = Math.min(Math.max(y + dy2, 0), ny - 1);
              const i2 = yy * nx + xx;
              const w2 = 1 - Math.sqrt(d2) / radius;
              sr += r[i2] * w2;
              sg += g[i2] * w2;
              sb += b[i2] * w2;
              sw += w2;
            }
          }
          if (sw > 0) {
            cr = sr / sw;
            cg = sg / sw;
            cb = sb / sw;
            weight = sw;
          }
        }

        const maxC = Math.max(cr, cg, cb);
        if (maxC * weight < 0.02) continue;

        this.ctx.fillStyle = `rgba(${Math.floor(cr * 255)}, ${Math.floor(cg * 255)}, ${Math.floor(cb * 255)}, ${Math.min(1, maxC * 0.6)})`;
        this.ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
  }

  private advanceParticles(w: number, h: number, nx: number, ny: number): void {
    const [ux, uy] = this.fluid.getVelocityField();
    const cellW = w / nx;
    const cellH = h / ny;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > this.TRAIL_LENGTH) p.trail.shift();

      const gx = Math.floor(p.x / cellW);
      const gy = Math.floor(p.y / cellH);
      if (gx >= 0 && gx < nx && gy >= 0 && gy < ny) {
        const idx = gy * nx + gx;
        p.vx = ux[idx] * cellW * 0.8;
        p.vy = uy[idx] * cellH * 0.8;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.life >= p.maxLife || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    const qs = this.qualityScale;
    const qa = this.qualityAlpha;

    for (const p of this.particles) {
      const lifeRatio = 1 - p.life / p.maxLife;
      const alpha = Math.max(0, p.alpha * lifeRatio * qa);

      if (p.color === 'white' && p.trail.length > 1) {
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.lineWidth = p.size * qs;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          this.ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();
      } else {
        const rgb = this.hexToRgb(p.color);
        this.ctx.fillStyle = `rgba(${Math.floor(rgb[0] * 255)}, ${Math.floor(rgb[1] * 255)}, ${Math.floor(rgb[2] * 255)}, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * qs, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  async exportScreenshot(): Promise<void> {
    const exportW = 1920;
    const exportH = 1080;

    const offscreen = document.createElement('canvas');
    offscreen.width = exportW;
    offscreen.height = exportH;
    const octx = offscreen.getContext('2d');
    if (!octx) throw new Error('Cannot get offscreen context');

    octx.fillStyle = '#1E1E2E';
    octx.fillRect(0, 0, exportW, exportH);

    const [nx, ny] = this.fluid.getGridSize();
    const [r, g, b] = this.fluid.getColorField();
    const cellW = exportW / nx;
    const cellH = exportH / ny;

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        const cr = r[idx];
        const cg = g[idx];
        const cb = b[idx];
        const maxC = Math.max(cr, cg, cb);
        if (maxC < 0.02) continue;
        octx.fillStyle = `rgba(${Math.floor(cr * 255)}, ${Math.floor(cg * 255)}, ${Math.floor(cb * 255)}, ${Math.min(1, maxC * 0.6)})`;
        octx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    const scaleX = exportW / this.canvas.getBoundingClientRect().width;
    const scaleY = exportH / this.canvas.getBoundingClientRect().height;

    for (const p of this.particles) {
      const px = p.x * scaleX;
      const py = p.y * scaleY;
      const lifeRatio = 1 - p.life / p.maxLife;
      const alpha = Math.max(0, p.alpha * lifeRatio);

      if (p.color === 'white' && p.trail.length > 1) {
        octx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        octx.lineWidth = p.size * Math.min(scaleX, scaleY);
        octx.lineCap = 'round';
        octx.beginPath();
        octx.moveTo(p.trail[0].x * scaleX, p.trail[0].y * scaleY);
        for (let i = 1; i < p.trail.length; i++) {
          octx.lineTo(p.trail[i].x * scaleX, p.trail[i].y * scaleY);
        }
        octx.lineTo(px, py);
        octx.stroke();
      } else {
        const rgb = this.hexToRgb(p.color);
        octx.fillStyle = `rgba(${Math.floor(rgb[0] * 255)}, ${Math.floor(rgb[1] * 255)}, ${Math.floor(rgb[2] * 255)}, ${alpha})`;
        octx.beginPath();
        octx.arc(px, py, p.size * Math.min(scaleX, scaleY), 0, Math.PI * 2);
        octx.fill();
      }
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `fluid_export_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;

    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  }

  private hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3
      ? h.split('').map(c => c + c).join('')
      : h, 16);
    return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (v: number) => Math.min(255, Math.max(0, Math.floor(v * 255))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
