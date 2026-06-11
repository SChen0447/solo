import type { Fish } from './fish';

export interface Jellyfish {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  glowColor: string;
  breathPhase: number;
  breathPeriod: number;
  breathAmp: number;
  recoveryTime: number;
  tentaclePhases: number[];
}

const JELLY_COLORS = [
  { body: '#ff6bcb', glow: 'rgba(255, 107, 203, 0.6)' },
  { body: '#6bcbff', glow: 'rgba(107, 203, 255, 0.6)' }
];

export class JellyfishManager {
  jellyfishes: Jellyfish[] = [];
  private canvasW: number;
  private canvasH: number;

  constructor(count: number, canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.setCount(count, canvasW, canvasH);
  }

  resize(canvasW: number, canvasH: number): void {
    const oldW = this.canvasW;
    const oldH = this.canvasH;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    for (const jf of this.jellyfishes) {
      jf.baseX = (jf.baseX / oldW) * canvasW;
      jf.baseY = (jf.baseY / oldH) * canvasH;
      jf.x = jf.baseX;
      jf.y = jf.baseY;
    }
    this.resolveInitialOverlaps();
  }

  setCount(count: number, canvasW: number, canvasH: number): void {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    if (count > this.jellyfishes.length) {
      while (this.jellyfishes.length < count) {
        const jf = this.createJellyfish();
        this.jellyfishes.push(jf);
      }
      this.resolveInitialOverlaps();
    } else if (count < this.jellyfishes.length) {
      this.jellyfishes.length = count;
    }
  }

  private createJellyfish(): Jellyfish {
    const colorPair = JELLY_COLORS[Math.floor(Math.random() * JELLY_COLORS.length)];
    const radius = 20 + Math.random() * 25;
    const margin = radius + 30;
    let x = 0, y = 0;
    let attempts = 0;
    while (attempts < 50) {
      x = margin + Math.random() * (this.canvasW - margin * 2);
      y = this.canvasH * 0.25 + Math.random() * (this.canvasH * 0.6);
      let ok = true;
      for (const other of this.jellyfishes) {
        const dx = x - other.baseX;
        const dy = y - other.baseY;
        const minDist = radius + other.radius + 10;
        if (dx * dx + dy * dy < minDist * minDist) {
          ok = false;
          break;
        }
      }
      if (ok) break;
      attempts++;
    }
    const phases: number[] = [];
    for (let i = 0; i < 6; i++) phases.push(Math.random() * Math.PI * 2);
    return {
      x, y, baseX: x, baseY: y,
      radius,
      color: colorPair.body,
      glowColor: colorPair.glow,
      breathPhase: Math.random() * Math.PI * 2,
      breathPeriod: 3000 + Math.random() * 2000,
      breathAmp: 8,
      recoveryTime: 0,
      tentaclePhases: phases
    };
  }

  private resolveInitialOverlaps(): void {
    for (let iter = 0; iter < 10; iter++) {
      let moved = false;
      for (let i = 0; i < this.jellyfishes.length; i++) {
        for (let j = i + 1; j < this.jellyfishes.length; j++) {
          const a = this.jellyfishes[i];
          const b = this.jellyfishes[j];
          const dx = b.baseX - a.baseX;
          const dy = b.baseY - a.baseY;
          const distSq = dx * dx + dy * dy;
          const minDist = a.radius + b.radius + 8;
          if (distSq < minDist * minDist && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const push = (minDist - dist) * 0.5;
            a.baseX -= nx * push;
            a.baseY -= ny * push;
            b.baseX += nx * push;
            b.baseY += ny * push;
            a.baseX = Math.max(a.radius + 5, Math.min(this.canvasW - a.radius - 5, a.baseX));
            a.baseY = Math.max(this.canvasH * 0.2, Math.min(this.canvasH - a.radius - 5, a.baseY));
            b.baseX = Math.max(b.radius + 5, Math.min(this.canvasW - b.radius - 5, b.baseX));
            b.baseY = Math.max(this.canvasH * 0.2, Math.min(this.canvasH - b.radius - 5, b.baseY));
            a.x = a.baseX;
            a.y = a.baseY;
            b.x = b.baseX;
            b.y = b.baseY;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  update(dt: number, _fishes: Fish[]): void {
    for (const jf of this.jellyfishes) {
      jf.breathPhase += (dt / jf.breathPeriod) * Math.PI * 2;

      if (jf.recoveryTime > 0) {
        jf.recoveryTime -= dt;
        if (jf.recoveryTime <= 0) {
          jf.recoveryTime = 0;
        }
      }

      const breathOffset = Math.sin(jf.breathPhase) * jf.breathAmp;
      const lerpFactor = jf.recoveryTime > 0 ? 0.002 * dt : 0.03 * (dt / 16);
      jf.x += (jf.baseX - jf.x) * Math.min(1, lerpFactor);
      jf.y += (jf.baseY + breathOffset - jf.y) * Math.min(1, lerpFactor);

      for (let i = 0; i < jf.tentaclePhases.length; i++) {
        jf.tentaclePhases[i] += dt * 0.002;
      }
    }

    this.resolveCollisions();
  }

  private resolveCollisions(): void {
    for (let i = 0; i < this.jellyfishes.length; i++) {
      for (let j = i + 1; j < this.jellyfishes.length; j++) {
        const a = this.jellyfishes[i];
        const b = this.jellyfishes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius * 0.7 + b.radius * 0.7;
        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const push = (minDist - dist) * 0.5;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const jf of this.jellyfishes) {
      this.renderSingleJellyfish(ctx, jf);
    }

    ctx.restore();
  }

  private renderSingleJellyfish(ctx: CanvasRenderingContext2D, jf: Jellyfish): void {
    const breathScale = 1 + Math.sin(jf.breathPhase) * 0.12;
    const r = jf.radius * breathScale;

    ctx.save();
    ctx.translate(jf.x, jf.y);

    const glow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.5);
    glow.addColorStop(0, jf.glowColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(0, -r * 0.3, r * 0.1, 0, 0, r);
    bodyGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    bodyGrad.addColorStop(0.3, this.hexToRgba(jf.color, 0.45));
    bodyGrad.addColorStop(1, this.hexToRgba(jf.color, 0.15));
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r, -r * 1.1, r, -r * 1.1, r, 0);
    ctx.quadraticCurveTo(r * 0.7, r * 0.3, r * 0.4, r * 0.15);
    ctx.quadraticCurveTo(0, r * 0.4, -r * 0.4, r * 0.15);
    ctx.quadraticCurveTo(-r * 0.7, r * 0.3, -r, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, -r * 0.55, r * 0.3, r * 0.15, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.hexToRgba(jf.color, 0.7);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    const tentacleCount = jf.tentaclePhases.length;
    for (let i = 0; i < tentacleCount; i++) {
      const phase = jf.tentaclePhases[i];
      const startX = -r * 0.75 + (i / (tentacleCount - 1)) * r * 1.5;
      const startY = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      const segCount = 5;
      for (let s = 1; s <= segCount; s++) {
        const t = s / segCount;
        const waveAmp = r * 0.35 * t;
        const px = startX + Math.sin(phase + s * 0.8) * waveAmp;
        const py = startY + t * r * 2.2;
        ctx.lineTo(px, py);
      }
      ctx.globalAlpha = 0.4 + Math.sin(phase) * 0.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
