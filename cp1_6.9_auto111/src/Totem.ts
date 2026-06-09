export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface TotemData {
  id: number;
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  color: ColorRGB;
  originalColor: ColorRGB;
  glowAlpha: number;
  isHovered: boolean;
  scale: number;
  alpha: number;
  energy: number;
  pulsePhase: number;
  pulsePeriod: number;
  pulseAmplitude: number;
  isDying: boolean;
  deathProgress: number;
  isColliding: boolean;
}

export const AURORA_PALETTE: string[] = [
  '#ff4477',
  '#ffaa33',
  '#44ff88',
  '#33ddff',
  '#8866ff',
  '#ff88aa'
];

export function hexToRgb(hex: string): ColorRGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function rgbToHex(c: ColorRGB): string {
  return (
    '#' +
    [c.r, c.g, c.b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function mixColors(a: ColorRGB, b: ColorRGB, t: number): ColorRGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

let totemIdCounter = 0;

export class Totem {
  public data: TotemData;

  constructor(x: number, y: number) {
    const colorHex = AURORA_PALETTE[Math.floor(Math.random() * AURORA_PALETTE.length)];
    const color = hexToRgb(colorHex);
    totemIdCounter++;

    this.data = {
      id: totemIdCounter,
      x,
      y,
      baseRadius: 20,
      currentRadius: 20,
      color: { ...color },
      originalColor: { ...color },
      glowAlpha: 0.6,
      isHovered: false,
      scale: 0,
      alpha: 1,
      energy: 1,
      pulsePhase: Math.random() * Math.PI * 2,
      pulsePeriod: 1.5 + Math.random() * 2,
      pulseAmplitude: 0.1,
      isDying: false,
      deathProgress: 0,
      isColliding: false
    };
  }

  update(dt: number, time: number): void {
    const d = this.data;

    if (d.isDying) {
      d.deathProgress += dt / 0.3;
      d.alpha = Math.max(0, 1 - d.deathProgress);
      d.scale = 1 + d.deathProgress * 1.5;
      return;
    }

    if (d.scale < 1) {
      d.scale = Math.min(1, d.scale + dt / 0.2);
    }

    d.pulsePhase += (dt / d.pulsePeriod) * Math.PI * 2;
    const amplitude = d.isHovered ? d.pulseAmplitude * 2 : d.pulseAmplitude;
    const pulse = Math.sin(d.pulsePhase) * amplitude;
    d.currentRadius = d.baseRadius * (1 + pulse);
    d.glowAlpha = 0.5 + Math.sin(d.pulsePhase) * 0.2;
    if (d.isHovered) {
      d.glowAlpha = Math.min(1, d.glowAlpha + 0.2);
    }
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.data.x;
    const dy = py - this.data.y;
    return dx * dx + dy * dy <= this.data.currentRadius * this.data.currentRadius;
  }

  distanceTo(other: Totem): number {
    const dx = this.data.x - other.data.x;
    const dy = this.data.y - other.data.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  transferEnergyWith(other: Totem, dt: number): boolean {
    const dist = this.distanceTo(other);
    const minDist = this.data.currentRadius + other.data.currentRadius;

    if (dist < minDist) {
      this.data.isColliding = true;
      other.data.isColliding = true;

      const avgRadius = (this.data.baseRadius + other.data.baseRadius) / 2;
      this.data.baseRadius += (avgRadius - this.data.baseRadius) * dt * 2;
      other.data.baseRadius += (avgRadius - other.data.baseRadius) * dt * 2;

      this.data.color = mixColors(this.data.color, other.data.originalColor, 0.1 * dt * 60);
      other.data.color = mixColors(other.data.color, this.data.originalColor, 0.1 * dt * 60);

      const overlap = minDist - dist;
      if (overlap > 0 && dist > 0.001) {
        const nx = (this.data.x - other.data.x) / dist;
        const ny = (this.data.y - other.data.y) / dist;
        const push = overlap * 0.5;
        this.data.x += nx * push;
        this.data.y += ny * push;
        other.data.x -= nx * push;
        other.data.y -= ny * push;
      }
      return true;
    }
    return false;
  }

  endCollision(): void {
    if (this.data.isColliding) {
      this.data.color = { ...this.data.originalColor };
      this.data.isColliding = false;
    }
  }

  markForDeath(): void {
    this.data.isDying = true;
    this.data.deathProgress = 0;
  }

  isDead(): boolean {
    return this.data.isDying && this.data.deathProgress >= 1;
  }

  getDeathParticles(): Array<{ x: number; y: number; vx: number; vy: number; life: number; color: ColorRGB }> {
    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: ColorRGB }> = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 80;
      particles.push({
        x: this.data.x,
        y: this.data.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: { ...this.data.originalColor }
      });
    }
    return particles;
  }
}
