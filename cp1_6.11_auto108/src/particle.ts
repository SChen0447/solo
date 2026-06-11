export interface LightSource {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  isDragging: boolean;
  pulseStart: number;
}

export interface ParticleParams {
  count: number;
  minRadius: number;
  maxRadius: number;
  speed: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const WARM_START: RGB = { r: 0xff, g: 0x6b, b: 0x35 };
const WARM_END: RGB = { r: 0xff, g: 0xd1, b: 0x66 };
const COLD_START: RGB = { r: 0x11, g: 0x8a, b: 0xb2 };
const COLD_END: RGB = { r: 0x07, g: 0x3b, b: 0x4c };

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToCss(rgb: RGB, alpha: number): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function getColorByDistance(
  distance: number,
  maxDistance: number,
  warmBias: number = 0
): RGB {
  const normalizedT = Math.min(Math.max(distance / maxDistance, 0), 1);
  const effectiveT = Math.max(0, Math.min(1, normalizedT - warmBias * 0.3));

  if (effectiveT < 0.5) {
    const warmT = effectiveT * 2;
    return lerpColor(WARM_START, WARM_END, warmT);
  } else {
    const coldT = (effectiveT - 0.5) * 2;
    return lerpColor(COLD_START, COLD_END, coldT);
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  color: RGB;
  targetColor: RGB;
  targetSpeedFactor: number;
  speedFactor: number;
  targetRadiusFactor: number;
  radiusFactor: number;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    minRadius: number,
    maxRadius: number,
    baseSpeed: number
  ) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;

    const angle = Math.random() * Math.PI * 2;
    const speed = (0.5 + Math.random() * 1.5) * baseSpeed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.baseRadius = minRadius + Math.random() * (maxRadius - minRadius);
    this.radius = this.baseRadius;
    this.baseAlpha = 0.3 + Math.random() * 0.5;
    this.alpha = this.baseAlpha;
    this.color = { r: 0x11, g: 0x8a, b: 0xb2 };
    this.targetColor = { ...this.color };
    this.targetSpeedFactor = 1;
    this.speedFactor = 1;
    this.targetRadiusFactor = 1;
    this.radiusFactor = 1;
  }

  update(
    canvasWidth: number,
    canvasHeight: number,
    lightSource: LightSource,
    maxDistance: number,
    warmBias: number = 0,
    deltaTime: number = 1
  ): void {
    const currentSpeedFactor = this.speedFactor + (this.targetSpeedFactor - this.speedFactor) * 0.05;
    this.speedFactor = currentSpeedFactor;

    this.x += this.vx * currentSpeedFactor * deltaTime;
    this.y += this.vy * currentSpeedFactor * deltaTime;

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.radius > canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    } else if (this.y + this.radius > canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.vy = -Math.abs(this.vy);
    }

    const dx = this.x - lightSource.x;
    const dy = this.y - lightSource.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.targetColor = getColorByDistance(distance, maxDistance, warmBias);

    this.color.r += (this.targetColor.r - this.color.r) * 0.08;
    this.color.g += (this.targetColor.g - this.color.g) * 0.08;
    this.color.b += (this.targetColor.b - this.color.b) * 0.08;

    const currentRadiusFactor = this.radiusFactor + (this.targetRadiusFactor - this.radiusFactor) * 0.05;
    this.radiusFactor = currentRadiusFactor;
    this.radius = this.baseRadius * currentRadiusFactor;

    this.alpha = this.baseAlpha;
  }

  updateBaseParams(
    minRadius: number,
    maxRadius: number,
    baseSpeed: number
  ): void {
    this.baseRadius = minRadius + Math.random() * (maxRadius - minRadius);

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      const newSpeed = (0.5 + Math.random() * 1.5) * baseSpeed;
      const scale = newSpeed / currentSpeed;
      this.vx *= scale;
      this.vy *= scale;
    } else {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * baseSpeed;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }
  }

  setTransitionTarget(speedFactor: number, radiusFactor: number): void {
    this.targetSpeedFactor = speedFactor;
    this.targetRadiusFactor = radiusFactor;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = rgbToCss(this.color, this.alpha);
    ctx.fill();
  }
}
