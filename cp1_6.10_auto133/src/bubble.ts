import type { AudioEngine } from './audioEngine';

export interface BubbleState {
  baseX: number;
  baseY: number;
  radius: number;
  color: { h: number; s: number; l: number };
  frequency: number;
}

interface Ripple {
  startTime: number;
  duration: number;
  maxRadius: number;
  color: { h: number; s: number; l: number };
}

interface BounceState {
  phase: 'expand' | 'contract' | 'idle';
  startTime: number;
  expandDuration: number;
  contractDuration: number;
  targetScale: number;
}

const BREATH_MIN_PERIOD = 2000;
const BREATH_MAX_PERIOD = 4000;
const BREATH_MIN_AMPLITUDE = 3;
const BREATH_MAX_AMPLITUDE = 6;

export class Bubble {
  public baseX: number;
  public baseY: number;
  public baseRadius: number;
  public color: { h: number; s: number; l: number };
  public frequency: number;
  public row: number;
  public col: number;

  private breathPeriod: number;
  private breathAmplitude: number;
  private breathPhase: number;

  private bounce: BounceState = {
    phase: 'idle',
    startTime: 0,
    expandDuration: 100,
    contractDuration: 200,
    targetScale: 1.3,
  };

  private ripples: Ripple[] = [];

  private audioEngine: AudioEngine;
  private lastHoverTime: number = 0;
  private hoverCooldown: number = 150;

  constructor(state: BubbleState, audioEngine: AudioEngine, row: number, col: number) {
    this.baseX = state.baseX;
    this.baseY = state.baseY;
    this.baseRadius = state.radius;
    this.color = { ...state.color };
    this.frequency = state.frequency;
    this.row = row;
    this.col = col;

    this.audioEngine = audioEngine;
    this.breathPeriod = BREATH_MIN_PERIOD + Math.random() * (BREATH_MAX_PERIOD - BREATH_MIN_PERIOD);
    this.breathAmplitude = BREATH_MIN_AMPLITUDE + Math.random() * (BREATH_MAX_AMPLITUDE - BREATH_MIN_AMPLITUDE);
    this.breathPhase = Math.random() * Math.PI * 2;
  }

  public setPosition(x: number, y: number, radius: number): void {
    this.baseX = x;
    this.baseY = y;
    this.baseRadius = radius;
  }

  public containsPoint(px: number, py: number, currentTime: number): boolean {
    const { x, y, radius } = this.getRenderState(currentTime);
    const dx = px - x;
    const dy = py - y;
    return dx * dx + dy * dy <= radius * radius;
  }

  public triggerHover(currentTime: number): void {
    if (currentTime - this.lastHoverTime < this.hoverCooldown) return;
    this.lastHoverTime = currentTime;

    this.bounce = {
      phase: 'expand',
      startTime: currentTime,
      expandDuration: 100,
      contractDuration: 200,
      targetScale: 1.3,
    };

    this.audioEngine.playNote(this.frequency, 0.3, 0);
  }

  public triggerClick(currentTime: number): void {
    this.ripples.push({
      startTime: currentTime,
      duration: 600,
      maxRadius: 80,
      color: { ...this.color },
    });

    this.audioEngine.playNote(this.frequency, 0.35, 0);
  }

  public triggerNeighborClick(currentTime: number): void {
    this.audioEngine.playNote(this.frequency, 0.175, -200);

    if (this.bounce.phase === 'idle') {
      this.bounce = {
        phase: 'expand',
        startTime: currentTime,
        expandDuration: 80,
        contractDuration: 180,
        targetScale: 1.12,
      };
    }
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private getScale(currentTime: number): number {
    if (this.bounce.phase === 'idle') return 1;

    const elapsed = currentTime - this.bounce.startTime;

    if (this.bounce.phase === 'expand') {
      if (elapsed >= this.bounce.expandDuration) {
        this.bounce.phase = 'contract';
        this.bounce.startTime = currentTime - (elapsed - this.bounce.expandDuration);
        return 1 + (this.bounce.targetScale - 1);
      }
      const t = elapsed / this.bounce.expandDuration;
      return 1 + (this.bounce.targetScale - 1) * this.easeOut(t);
    }

    if (this.bounce.phase === 'contract') {
      if (elapsed >= this.bounce.contractDuration) {
        this.bounce.phase = 'idle';
        return 1;
      }
      const t = elapsed / this.bounce.contractDuration;
      const overshoot = 0.05;
      const eased = this.easeOutBack(t);
      const from = this.bounce.targetScale;
      const to = 1;
      const overshootPeak = 1 - overshoot;
      if (t < 0.6) {
        const t2 = t / 0.6;
        return from + (overshootPeak - from) * this.easeOut(t2);
      } else {
        const t2 = (t - 0.6) / 0.4;
        return overshootPeak + (to - overshootPeak) * this.easeOut(t2);
      }
      void eased;
    }

    return 1;
  }

  public getRenderState(currentTime: number): { x: number; y: number; radius: number; breathOffset: number } {
    const breathT = ((currentTime % this.breathPeriod) / this.breathPeriod) * Math.PI * 2;
    const breathOffset = Math.sin(breathT + this.breathPhase) * this.breathAmplitude;
    const scale = this.getScale(currentTime);

    return {
      x: this.baseX,
      y: this.baseY + breathOffset,
      radius: this.baseRadius * scale,
      breathOffset,
    };
  }

  public getActiveRipples(currentTime: number): Array<{ progress: number; maxRadius: number; color: { h: number; s: number; l: number } }> {
    this.ripples = this.ripples.filter((r) => currentTime - r.startTime < r.duration);

    return this.ripples.map((r) => ({
      progress: (currentTime - r.startTime) / r.duration,
      maxRadius: r.maxRadius,
      color: r.color,
    }));
  }

  public render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const { x, y, radius } = this.getRenderState(currentTime);

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.filter = 'blur(12px)';
    ctx.beginPath();
    ctx.arc(x, y + 10, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.color.h}, ${this.color.s}%, ${this.color.l}%)`;
    ctx.fill();
    ctx.restore();

    const ripples = this.getActiveRipples(currentTime);
    for (const ripple of ripples) {
      const rippleRadius = ripple.maxRadius * ripple.progress;
      const alpha = 0.6 * (1 - ripple.progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `hsl(${ripple.color.h}, ${ripple.color.s}%, ${ripple.color.l}%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, `hsla(${this.color.h}, ${this.color.s}%, ${Math.min(this.color.l + 20, 90)}%, 0.9)`);
    gradient.addColorStop(0.5, `hsla(${this.color.h}, ${this.color.s}%, ${this.color.l}%, 0.75)`);
    gradient.addColorStop(1, `hsla(${this.color.h}, ${this.color.s}%, ${Math.max(this.color.l - 15, 30)}%, 0.6)`);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.restore();
  }
}
