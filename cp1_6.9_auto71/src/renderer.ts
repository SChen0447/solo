import p5 from 'p5';
import type { FluidBlobData, ParticleData } from './fluid';
import { COLOR_THEMES } from './fluid';

function desaturate(hex: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
  r = Math.round(r + (gray - r) * amount);
  g = Math.round(g + (gray - g) * amount);
  b = Math.round(b + (gray - b) * amount);
  return '#' + [r, g, b].map(x => {
    const h = x.toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = noise2D(ix, iy, seed);
  const n10 = noise2D(ix + 1, iy, seed);
  const n01 = noise2D(ix, iy + 1, seed);
  const n11 = noise2D(ix + 1, iy + 1, seed);
  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

export class Renderer {
  private p: p5;
  private panelBounceTime = 0;
  private panelBounceDuration = 300;

  constructor(p: p5) {
    this.p = p;
  }

  triggerPanelBounce(): void {
    this.panelBounceTime = performance.now();
  }

  drawBackground(w: number, h: number): void {
    const p = this.p;
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0d001a');
    gradient.addColorStop(1, '#000a1a');
    p.drawingContext.fillStyle = gradient;
    p.drawingContext.fillRect(0, 0, w, h);
  }

  drawBlob(blob: FluidBlobData, now: number): void {
    const p = this.p;
    const glowSin = Math.sin(blob.glowPhase);
    const glowRadius = blob.radius * (2 + glowSin * 0.5);
    const glowAlpha = 0.25 + glowSin * 0.1;
    const glowColor = desaturate(blob.color, 0.3);

    p.drawingContext.save();
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = blob.color;

    const glowGrad = p.drawingContext.createRadialGradient(
      blob.x, blob.y, blob.radius,
      blob.x, blob.y, glowRadius
    );
    glowGrad.addColorStop(0, this.hexToRgba(glowColor, glowAlpha));
    glowGrad.addColorStop(1, this.hexToRgba(glowColor, 0));
    p.drawingContext.fillStyle = glowGrad;
    p.noStroke();
    p.ellipse(blob.x, blob.y, glowRadius * 2, glowRadius * 2);

    const bodyGrad = p.drawingContext.createRadialGradient(
      blob.x - blob.radius * 0.3, blob.y - blob.radius * 0.3, 0,
      blob.x, blob.y, blob.radius
    );
    bodyGrad.addColorStop(0, this.hexToRgba(blob.color, 0.95));
    bodyGrad.addColorStop(0.6, this.hexToRgba(blob.color, 0.8));
    bodyGrad.addColorStop(1, this.hexToRgba(blob.color, 0.6));
    p.drawingContext.fillStyle = bodyGrad;
    p.ellipse(blob.x, blob.y, blob.radius * 2, blob.radius * 2);

    this.drawTexture(blob);

    p.drawingContext.restore();
  }

  private drawTexture(blob: FluidBlobData): void {
    const p = this.p;
    const steps = 8;
    const time = performance.now() * 0.001;
    p.drawingContext.save();
    p.drawingContext.beginPath();
    p.drawingContext.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    p.drawingContext.clip();

    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2 + time * 0.5;
      const r = blob.radius * (0.3 + 0.5 * ((i + 1) / steps));
      const nx = blob.x + Math.cos(angle) * r * 0.5;
      const ny = blob.y + Math.sin(angle) * r * 0.5;
      const n = smoothNoise(nx * 0.02 + time, ny * 0.02, blob.textureSeed);
      const alpha = 0.08 + n * 0.12;
      p.drawingContext.fillStyle = this.hexToRgba('#ffffff', alpha);
      const texR = blob.radius * (0.2 + n * 0.3);
      p.drawingContext.beginPath();
      p.drawingContext.arc(nx, ny, texR, 0, Math.PI * 2);
      p.drawingContext.fill();
    }

    p.drawingContext.restore();
  }

  drawParticle(p: ParticleData): void {
    const pg = this.p;
    const alpha = p.life / p.maxLife;
    pg.drawingContext.save();
    pg.drawingContext.globalAlpha = alpha * 0.8;
    pg.drawingContext.shadowBlur = 8;
    pg.drawingContext.shadowColor = p.color;
    pg.fill(p.color);
    pg.noStroke();
    pg.ellipse(p.x, p.y, p.radius * 2, p.radius * 2);
    pg.drawingContext.restore();
  }

  drawPanel(themeIndex: number, w: number): void {
    const p = this.p;
    const now = performance.now();
    const elapsed = now - this.panelBounceTime;
    let scale = 1;
    if (elapsed < this.panelBounceDuration) {
      const t = elapsed / this.panelBounceDuration;
      scale = 1 + Math.sin(t * Math.PI) * 0.15;
    }

    const panelW = 200;
    const panelH = 60;
    const px = 20;
    const py = 20;
    const cx = px + panelW / 2;
    const cy = py + panelH / 2;

    p.push();
    p.translate(cx, cy);
    p.scale(scale);
    p.translate(-cx, -cy);

    p.drawingContext.fillStyle = 'rgba(26, 26, 46, 0.7)';
    p.noStroke();
    const radius = 8;
    p.rect(px, py, panelW, panelH, radius, radius, radius, radius);

    p.fill(255);
    p.textFont('sans-serif');
    p.textSize(12);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`主题 ${themeIndex + 1}`, px + 12, py + 10);

    const theme = COLOR_THEMES[themeIndex];
    const dotY = py + 38;
    const dotSpacing = 34;
    const dotStartX = px + 15;
    for (let i = 0; i < theme.length; i++) {
      p.drawingContext.shadowBlur = 6;
      p.drawingContext.shadowColor = theme[i];
      p.fill(theme[i]);
      p.noStroke();
      p.ellipse(dotStartX + i * dotSpacing, dotY, 14, 14);
      p.drawingContext.shadowBlur = 0;
    }

    p.pop();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255,255,255,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
