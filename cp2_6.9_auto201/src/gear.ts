export type GearType = 'driver' | 'target' | 'small' | 'medium' | 'large';

export interface GearConfig {
  type: GearType;
  x: number;
  y: number;
  radius: number;
  teeth: number;
  colorStart: string;
  colorEnd: string;
  angularVelocity?: number;
  isFixed?: boolean;
}

export interface BackgroundGearConfig {
  x: number;
  y: number;
  radius: number;
  teeth: number;
  rotation: number;
  opacity: number;
}

export class Gear {
  x: number;
  y: number;
  radius: number;
  teeth: number;
  colorStart: string;
  colorEnd: string;
  rotation: number;
  angularVelocity: number;
  isFixed: boolean;
  isEngaged: boolean;
  isDragging: boolean;
  isGhost: boolean;
  type: GearType;
  connectedTo: Gear | null;
  homeX: number;
  homeY: number;
  isReturning: boolean;
  returnProgress: number;

  constructor(config: GearConfig) {
    this.type = config.type;
    this.x = config.x;
    this.y = config.y;
    this.radius = config.radius;
    this.teeth = config.teeth;
    this.colorStart = config.colorStart;
    this.colorEnd = config.colorEnd;
    this.rotation = 0;
    this.angularVelocity = config.angularVelocity ?? 0;
    this.isFixed = config.isFixed ?? false;
    this.isEngaged = false;
    this.isDragging = false;
    this.isGhost = false;
    this.connectedTo = null;
    this.homeX = config.x;
    this.homeY = config.y;
    this.isReturning = false;
    this.returnProgress = 0;
  }

  update(dt: number): void {
    if (this.isReturning) {
      this.returnProgress += dt * 3;
      const t = Math.min(this.returnProgress, 1);
      const elastic = 1 - Math.pow(1 - t, 3);
      this.x = this.homeX + (this.x - this.homeX) * (1 - elastic);
      this.y = this.homeY + (this.y - this.homeY) * (1 - elastic);
      if (t >= 1) {
        this.isReturning = false;
        this.x = this.homeX;
        this.y = this.homeY;
      }
    }
    this.rotation += this.angularVelocity * dt;
  }

  canEngageWith(other: Gear): boolean {
    if (this === other) return false;
    if (this.type === 'driver' && other.type === 'driver') return false;
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const idealDistance = this.radius + other.radius;
    const tolerance = 5;
    return Math.abs(distance - idealDistance) <= tolerance;
  }

  snapTo(other: Gear): void {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance === 0) return;
    const idealDistance = this.radius + other.radius;
    const ratio = idealDistance / distance;
    this.x = other.x + dx * ratio;
    this.y = other.y + dy * ratio;
  }

  engageWith(other: Gear): void {
    this.isEngaged = true;
    this.connectedTo = other;
    const ratio = other.teeth / this.teeth;
    this.angularVelocity = -other.angularVelocity * ratio;
  }

  disengage(): void {
    this.isEngaged = false;
    this.connectedTo = null;
    if (!this.isFixed) {
      this.angularVelocity = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number = 1): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
      0, 0, this.radius
    );
    gradient.addColorStop(0, this.colorEnd);
    gradient.addColorStop(1, this.colorStart);

    ctx.beginPath();
    const toothDepth = this.radius * 0.15;
    const toothWidth = (Math.PI * 2) / (this.teeth * 2);
    for (let i = 0; i < this.teeth; i++) {
      const angle = (i / this.teeth) * Math.PI * 2;
      const innerAngle = angle + toothWidth * 0.5;
      const outerAngle1 = angle - toothWidth * 0.25;
      const outerAngle2 = angle + toothWidth * 0.25;
      const innerR = this.radius - toothDepth;
      const outerR = this.radius;
      if (i === 0) {
        ctx.moveTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
      } else {
        ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
      }
      ctx.lineTo(Math.cos(outerAngle1) * outerR, Math.sin(outerAngle1) * outerR);
      ctx.lineTo(Math.cos(outerAngle2) * outerR, Math.sin(outerAngle2) * outerR);
      const nextInnerAngle = ((i + 1) / this.teeth) * Math.PI * 2 - toothWidth * 0.5;
      ctx.lineTo(Math.cos(nextInnerAngle) * innerR, Math.sin(nextInnerAngle) * innerR);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const innerRadius = this.radius * 0.5;
    const innerGradient = ctx.createRadialGradient(
      -innerRadius * 0.3, -innerRadius * 0.3, innerRadius * 0.1,
      0, 0, innerRadius
    );
    innerGradient.addColorStop(0, this.lightenColor(this.colorEnd, 20));
    innerGradient.addColorStop(1, this.colorStart);
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const holeRadius = this.radius * 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, holeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const boltCount = Math.max(4, Math.floor(this.teeth / 3));
    const boltRadius = this.radius * 0.33;
    const boltSize = Math.max(1.5, this.radius * 0.06);
    for (let i = 0; i < boltCount; i++) {
      const angle = (i / boltCount) * Math.PI * 2;
      const bx = Math.cos(angle) * boltRadius;
      const by = Math.sin(angle) * boltRadius;
      ctx.beginPath();
      ctx.arc(bx, by, boltSize, 0, Math.PI * 2);
      ctx.fillStyle = this.darkenColor(this.colorStart, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();

    if (!this.isFixed && this.type !== 'target') {
      this.drawStatusDot(ctx);
    }
  }

  private drawStatusDot(ctx: CanvasRenderingContext2D): void {
    const dotX = this.x + this.radius * 0.7;
    const dotY = this.y - this.radius * 0.7;
    const dotRadius = Math.max(3, this.radius * 0.12);
    ctx.save();
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    if (this.isEngaged) {
      ctx.fillStyle = '#4ade80';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = '#666666';
    }
    ctx.fill();
    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
    const b = Math.min(255, (num & 0x0000ff) + percent);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - percent);
    const b = Math.max(0, (num & 0x0000ff) - percent);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }
}

export function drawBackgroundGear(
  ctx: CanvasRenderingContext2D,
  gear: BackgroundGearConfig
): void {
  ctx.save();
  ctx.translate(gear.x, gear.y);
  ctx.rotate(gear.rotation);
  ctx.globalAlpha = gear.opacity;

  ctx.beginPath();
  const toothDepth = gear.radius * 0.15;
  const toothWidth = (Math.PI * 2) / (gear.teeth * 2);
  for (let i = 0; i < gear.teeth; i++) {
    const angle = (i / gear.teeth) * Math.PI * 2;
    const innerAngle = angle + toothWidth * 0.5;
    const outerAngle1 = angle - toothWidth * 0.25;
    const outerAngle2 = angle + toothWidth * 0.25;
    const innerR = gear.radius - toothDepth;
    const outerR = gear.radius;
    if (i === 0) {
      ctx.moveTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    } else {
      ctx.lineTo(Math.cos(innerAngle) * innerR, Math.sin(innerAngle) * innerR);
    }
    ctx.lineTo(Math.cos(outerAngle1) * outerR, Math.sin(outerAngle1) * outerR);
    ctx.lineTo(Math.cos(outerAngle2) * outerR, Math.sin(outerAngle2) * outerR);
    const nextInnerAngle = ((i + 1) / gear.teeth) * Math.PI * 2 - toothWidth * 0.5;
    ctx.lineTo(Math.cos(nextInnerAngle) * innerR, Math.sin(nextInnerAngle) * innerR);
  }
  ctx.closePath();
  ctx.fillStyle = '#5a4a2a';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, gear.radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#3a3a2a';
  ctx.fill();

  ctx.restore();
}

export function generateBackgroundGears(
  count: number,
  width: number,
  height: number
): BackgroundGearConfig[] {
  const gears: BackgroundGearConfig[] = [];
  for (let i = 0; i < count; i++) {
    const radius = 8 + Math.random() * 4;
    gears.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius,
      teeth: 6 + Math.floor(Math.random() * 5),
      rotation: Math.random() * Math.PI * 2,
      opacity: 0.1 + Math.random() * 0.1
    });
  }
  return gears;
}

export const GEAR_PRESETS: Record<Exclude<GearType, 'driver' | 'target'>, Omit<GearConfig, 'x' | 'y' | 'type' | 'angularVelocity' | 'isFixed'>> = {
  small: {
    radius: 20,
    teeth: 8,
    colorStart: '#CD853F',
    colorEnd: '#E8A85C'
  },
  medium: {
    radius: 30,
    teeth: 12,
    colorStart: '#B8860B',
    colorEnd: '#DAA520'
  },
  large: {
    radius: 40,
    teeth: 16,
    colorStart: '#A0721A',
    colorEnd: '#CD853F'
  }
};
