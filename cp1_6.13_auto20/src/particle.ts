export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: RGB;
  alpha: number;
  baseColor: RGB;
  trail: TrailPoint[];
  explosionPhase: number;
  originalX: number;
  originalY: number;
}

export interface IStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const COLOR_PURPLE: RGB = { r: 147, g: 51, b: 234 };
const COLOR_CYAN: RGB = { r: 6, g: 182, b: 212 };
const COLOR_PINK: RGB = { r: 236, g: 72, b: 153 };
const COLOR_YELLOW: RGB = { r: 251, g: 191, b: 36 };
const COLOR_ORANGE: RGB = { r: 249, g: 115, b: 22 };

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

export function getNebulaColor(t: number): RGB {
  if (t < 0.5) {
    return lerpColor(COLOR_PURPLE, COLOR_CYAN, t * 2);
  } else {
    return lerpColor(COLOR_CYAN, COLOR_PINK, (t - 0.5) * 2);
  }
}

export function getExplosionColor(t: number): RGB {
  if (t < 0.5) {
    return lerpColor(COLOR_YELLOW, COLOR_ORANGE, t * 2);
  } else {
    return lerpColor(COLOR_ORANGE, COLOR_PINK, (t - 0.5) * 2);
  }
}

export class Particle implements IParticle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public color: RGB;
  public alpha: number;
  public baseColor: RGB;
  public trail: TrailPoint[];
  public explosionPhase: number;
  public originalX: number;
  public originalY: number;

  private canvasWidth: number;
  private canvasHeight: number;
  private maxTrailLength: number = 10;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.originalX = this.x;
    this.originalY = this.y;
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.size = 1 + Math.random() * 3;
    this.alpha = 0.3 + Math.random() * 0.5;
    
    const colorT = Math.random();
    this.baseColor = getNebulaColor(colorT);
    this.color = { ...this.baseColor };
    
    this.trail = [];
    this.explosionPhase = 0;
  }

  public update(dt: number, mouseSpeed: number): void {
    if (this.explosionPhase > 0) {
      this.explosionPhase -= dt;
      if (this.explosionPhase < 0) this.explosionPhase = 0;
      
      const explosionT = 1 - this.explosionPhase / 1.5;
      const explosionColor = getExplosionColor(Math.min(explosionT * 2, 1));
      const colorT = Math.min(explosionT / 0.8, 1);
      this.color = lerpColor(explosionColor, this.baseColor, colorT);
      
      const restoreForce = 0.002;
      this.vx += (this.originalX - this.x) * restoreForce;
      this.vy += (this.originalY - this.y) * restoreForce;
      
      this.alpha = 0.5 + (1 - explosionT) * 0.5;
    } else {
      this.color = { ...this.baseColor };
      this.alpha = 0.3 + Math.abs(this.vx + this.vy) * 2;
      this.alpha = Math.min(Math.max(this.alpha, 0.3), 0.8);
    }

    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }

    if (this.x < -50) this.x = this.canvasWidth + 50;
    if (this.x > this.canvasWidth + 50) this.x = -50;
    if (this.y < -50) this.y = this.canvasHeight + 50;
    if (this.y > this.canvasHeight + 50) this.y = -50;
  }

  public draw(ctx: CanvasRenderingContext2D, mouseSpeed: number): void {
    if (this.trail.length > 1 && mouseSpeed > 0.5) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      
      const trailAlpha = Math.min(mouseSpeed * 0.3, 0.4) * this.alpha;
      ctx.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${trailAlpha})`;
      ctx.lineWidth = this.size * 0.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.size * 2
    );
    gradient.addColorStop(0, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`);
    gradient.addColorStop(0.5, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
    ctx.fill();
  }

  public resize(width: number, height: number): void {
    const scaleX = width / this.canvasWidth;
    const scaleY = height / this.canvasHeight;
    this.x *= scaleX;
    this.y *= scaleY;
    this.originalX *= scaleX;
    this.originalY *= scaleY;
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    this.trail = this.trail.map(p => ({
      x: p.x * scaleX,
      y: p.y * scaleY
    }));
  }
}

export class Star implements IStar {
  public x: number;
  public y: number;
  public size: number;
  public baseAlpha: number;
  public twinkleSpeed: number;
  public twinklePhase: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = 0.5 + Math.random() * 1.5;
    this.baseAlpha = 0.2 + Math.random() * 0.6;
    this.twinkleSpeed = 0.5 + Math.random() * 1.5;
    this.twinklePhase = Math.random() * Math.PI * 2;
  }

  public update(time: number): void {
    this.twinklePhase = time * this.twinkleSpeed;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.baseAlpha * (0.6 + Math.sin(this.twinklePhase) * 0.4);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  public resize(width: number, height: number, oldWidth: number, oldHeight: number): void {
    this.x = this.x * width / oldWidth;
    this.y = this.y * height / oldHeight;
  }
}
