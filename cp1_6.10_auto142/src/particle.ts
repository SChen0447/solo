export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  fontSize: number;
  baseAlpha: number;
  alpha: number;
  baseColor: { h: number; s: number; l: number };
  currentColor: { h: number; s: number; l: number };
  colorTransitionStart: number;
  colorTransitionDuration: number;
  isColorTransitioning: boolean;
  targetX: number;
  targetY: number;
  restoreSpeed: number;
  isDying: boolean;
  deathStart: number;
  deathDuration: number;
}

export class Particle {
  public state: ParticleState;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number, startY?: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = this.createInitialState(startY);
  }

  private createInitialState(startY?: number): ParticleState {
    const fontSize = 16 + Math.random() * 16;
    const baseAlpha = 0.3 + Math.random() * 0.2;
    return {
      x: Math.random() * this.canvasWidth,
      y: startY !== undefined ? startY : -Math.random() * this.canvasHeight,
      vx: 0,
      vy: 0.5 + Math.random() * 1.5,
      char: String(Math.floor(Math.random() * 10)),
      fontSize,
      baseAlpha,
      alpha: baseAlpha,
      baseColor: { h: 165, s: 100, l: 50 },
      currentColor: { h: 165, s: 100, l: 50 },
      colorTransitionStart: 0,
      colorTransitionDuration: 3000,
      isColorTransitioning: false,
      targetX: 0,
      targetY: 0,
      restoreSpeed: 0.02,
      isDying: false,
      deathStart: 0,
      deathDuration: 500,
    };
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public triggerColorPulse(newHue: number, currentTime: number): void {
    this.state.currentColor = { h: newHue, s: 80, l: 90 };
    this.state.isColorTransitioning = true;
    this.state.colorTransitionStart = currentTime;
  }

  public triggerDissolve(currentTime: number): void {
    if (!this.state.isDying) {
      this.state.isDying = true;
      this.state.deathStart = currentTime;
    }
  }

  public reset(): void {
    const newState = this.createInitialState(-50);
    newState.targetX = newState.x;
    newState.targetY = newState.y;
    this.state = newState;
  }

  public update(
    mouseX: number,
    mouseY: number,
    mouseActive: boolean,
    pulseX: number,
    pulseY: number,
    pulseActive: boolean,
    pulseRadius: number,
    currentTime: number
  ): boolean {
    const s = this.state;

    if (s.isDying) {
      const elapsed = currentTime - s.deathStart;
      const progress = Math.min(elapsed / s.deathDuration, 1);
      s.alpha = s.baseAlpha * (1 - progress);
      if (progress >= 1) {
        return false;
      }
    }

    if (s.isColorTransitioning) {
      const elapsed = currentTime - s.colorTransitionStart;
      const progress = Math.min(elapsed / s.colorTransitionDuration, 1);
      s.currentColor.h = s.currentColor.h + (s.baseColor.h - s.currentColor.h) * progress;
      s.currentColor.s = s.currentColor.s + (s.baseColor.s - s.currentColor.s) * progress;
      s.currentColor.l = s.currentColor.l + (s.baseColor.l - s.currentColor.l) * progress;
      if (progress >= 1) {
        s.isColorTransitioning = false;
        s.currentColor = { ...s.baseColor };
      }
    }

    if (pulseActive) {
      const dx = s.x - pulseX;
      const dy = s.y - pulseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= pulseRadius && !s.isColorTransitioning) {
        const hue = Math.floor(Math.random() * 360);
        this.triggerColorPulse(hue, currentTime);
      }
    }

    let repelVx = 0;
    let repelVy = 0;
    if (mouseActive) {
      const dx = s.x - mouseX;
      const dy = s.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = 150;
      if (dist < radius && dist > 0) {
        const force = (radius - dist) / radius * 3;
        repelVx = (dx / dist) * force;
        repelVy = (dy / dist) * force;
      }
    }

    s.vx = s.vx * 0.92 + repelVx * 0.1;
    s.x += s.vx + s.vy * 0.1;

    s.y += s.vy;

    const bottomBandY = this.canvasHeight - 60;
    if (s.y > bottomBandY && !s.isDying) {
      this.triggerDissolve(currentTime);
    }

    if (s.x < -50) s.x = this.canvasWidth + 50;
    if (s.x > this.canvasWidth + 50) s.x = -50;

    if (Math.random() < 0.02) {
      s.char = String(Math.floor(Math.random() * 10));
    }

    return true;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const color = `hsla(${s.currentColor.h}, ${s.currentColor.s}%, ${s.currentColor.l}%, ${s.alpha})`;

    ctx.save();
    ctx.font = `${s.fontSize}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowBlur = 4;
    ctx.shadowColor = `hsla(${s.currentColor.h}, ${s.currentColor.s}%, ${s.currentColor.l}%, 0.8)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.char, s.x, s.y);
    ctx.restore();
  }
}
