export interface NoteBlockState {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  pitch: number;
}

type AnimationType = 'spawn' | 'remove' | 'drag' | 'glow' | 'idle';

export class NoteBlock {
  public id: string;
  public x: number;
  public y: number;
  public size: number;
  public color: string;
  public pitch: number;
  public rotation: number;

  private animation: AnimationType = 'idle';
  private animationStart = 0;
  private animationDuration = 300;
  private originalX = 0;
  private originalY = 0;
  private originalSize = 0;
  public glowIntensity = 0;
  public isDragging = false;
  public dragOpacity = 1;

  private static readonly COLORS_LOW = ['#4a90d9', '#5077d9', '#5064e3', '#6366f1', '#50e3c2'];
  private static readonly COLORS_HIGH = ['#f5a623', '#f77f00', '#ff6b35', '#d62828', '#d0021b'];
  private static readonly COLORS_MID = ['#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#8b5cf6'];
  public static readonly PITCH_MIN = 48;
  public static readonly PITCH_MAX = 84;

  constructor(x: number, y: number, pitch?: number, id?: string) {
    this.id = id ?? Math.random().toString(36).slice(2, 10);
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.size = 48 + Math.random() * 16;
    this.originalSize = this.size;
    this.rotation = (Math.random() - 0.5) * 0.1;
    this.pitch = pitch ?? Math.floor(NoteBlock.PITCH_MIN + Math.random() * (NoteBlock.PITCH_MAX - NoteBlock.PITCH_MIN + 1));
    this.color = NoteBlock.getColorForPitch(this.pitch);
  }

  public static getColorForPitch(pitch: number): string {
    const normalized = (pitch - NoteBlock.PITCH_MIN) / (NoteBlock.PITCH_MAX - NoteBlock.PITCH_MIN);
    if (normalized < 0.33) {
      const idx = Math.floor(normalized * 3 * NoteBlock.COLORS_LOW.length);
      return NoteBlock.COLORS_LOW[Math.min(idx, NoteBlock.COLORS_LOW.length - 1)];
    } else if (normalized < 0.66) {
      const idx = Math.floor((normalized - 0.33) * 3 * NoteBlock.COLORS_MID.length);
      return NoteBlock.COLORS_MID[Math.min(idx, NoteBlock.COLORS_MID.length - 1)];
    } else {
      const idx = Math.floor((normalized - 0.66) * 3 * NoteBlock.COLORS_HIGH.length);
      return NoteBlock.COLORS_HIGH[Math.min(idx, NoteBlock.COLORS_HIGH.length - 1)];
    }
  }

  public static midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public startSpawnAnimation(): void {
    this.animation = 'spawn';
    this.animationStart = performance.now();
    this.animationDuration = 300;
  }

  public startRemoveAnimation(delay = 0): void {
    this.animation = 'remove';
    this.animationStart = performance.now() + delay;
    this.animationDuration = 500;
  }

  public startGlowPulse(): void {
    this.glowIntensity = 1;
  }

  public setDragging(dragging: boolean): void {
    this.isDragging = dragging;
    this.dragOpacity = dragging ? 0.7 : 1;
    this.animation = dragging ? 'drag' : 'idle';
    if (!dragging) {
      this.size = this.originalSize;
    }
  }

  public update(deltaTime: number): boolean {
    const now = performance.now();

    if (this.glowIntensity > 0) {
      this.glowIntensity = Math.max(0, this.glowIntensity - deltaTime * 0.002);
    }

    if (this.isDragging) {
      this.size = this.originalSize * 0.85;
      return true;
    }

    switch (this.animation) {
      case 'spawn': {
        const elapsed = now - this.animationStart;
        if (elapsed >= this.animationDuration) {
          this.animation = 'idle';
          this.size = this.originalSize;
          return true;
        }
        const t = elapsed / this.animationDuration;
        const overshoot = 0.2;
        const eased = 1 - Math.pow(1 - t, 3);
        const bounce = overshoot * Math.sin(t * Math.PI);
        this.size = this.originalSize * (eased + bounce);
        return true;
      }
      case 'remove': {
        if (now < this.animationStart) return true;
        const elapsed = now - this.animationStart;
        if (elapsed >= this.animationDuration) {
          return false;
        }
        const t = elapsed / this.animationDuration;
        this.size = this.originalSize * (1 - t);
        this.dragOpacity = 1 - t;
        return true;
      }
      case 'drag':
        this.size = this.originalSize * 0.85;
        return true;
      default:
        this.size = this.originalSize;
        this.dragOpacity = 1;
        return true;
    }
  }

  public render(ctx: CanvasRenderingContext2D, glowRadius: number): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = this.dragOpacity;

    const glowFactor = 0.3 + this.glowIntensity * 0.7;
    const effectiveGlow = glowRadius * glowFactor;

    if (effectiveGlow > 0) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = effectiveGlow;
    }

    this.drawHexagon(ctx, this.size / 2, 8);
    ctx.fillStyle = this.color;
    ctx.fill();

    if (effectiveGlow > 0) {
      ctx.shadowBlur = 0;
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size / 2 + effectiveGlow * 0.5);
      gradient.addColorStop(0, this.hexToRgba(this.color, 0.3 * glowFactor));
      gradient.addColorStop(0.5, this.hexToRgba(this.color, 0.1 * glowFactor));
      gradient.addColorStop(1, this.hexToRgba(this.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2 + effectiveGlow * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, radius: number, cornerRadius: number): void {
    ctx.beginPath();
    const angleStep = Math.PI / 3;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }

    for (let i = 0; i < 6; i++) {
      const curr = points[i];
      const next = points[(i + 1) % 6];
      const prev = points[(i - 1 + 6) % 6];

      const prevDist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
      const nextDist = Math.hypot(next.x - curr.x, next.y - curr.y);
      const r = Math.min(cornerRadius, prevDist * 0.4, nextDist * 0.4);

      const toPrevX = (prev.x - curr.x) / prevDist;
      const toPrevY = (prev.y - curr.y) / prevDist;
      const toNextX = (next.x - curr.x) / nextDist;
      const toNextY = (next.y - curr.y) / nextDist;

      const startX = curr.x + toPrevX * r;
      const startY = curr.y + toPrevY * r;
      const endX = curr.x + toNextX * r;
      const endY = curr.y + toNextY * r;

      if (i === 0) {
        ctx.moveTo(startX, startY);
      }
      ctx.quadraticCurveTo(curr.x, curr.y, endX, endY);
    }

    ctx.closePath();
  }

  public hitTest(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    return dist <= this.size / 2;
  }

  public getState(): NoteBlockState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      size: this.originalSize,
      color: this.color,
      pitch: this.pitch,
    };
  }

  public static fromState(state: NoteBlockState): NoteBlock {
    const block = new NoteBlock(state.x, state.y, state.pitch, state.id);
    block.size = state.size;
    block.originalSize = state.size;
    block.color = state.color;
    return block;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
