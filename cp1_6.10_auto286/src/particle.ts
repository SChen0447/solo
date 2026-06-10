export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export const PRESET_COLORS: RGBAColor[] = [
  { r: 240, g: 240, b: 232, a: 0.8 },
  { r: 44, g: 95, b: 90, a: 0.7 },
  { r: 196, g: 74, b: 77, a: 0.6 },
  { r: 212, g: 168, b: 75, a: 0.5 },
  { r: 57, g: 75, b: 110, a: 0.7 },
  { r: 200, g: 215, b: 217, a: 0.8 },
  { r: 155, g: 122, b: 181, a: 0.6 },
  { r: 107, g: 124, b: 58, a: 0.5 }
];

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public baseColor: RGBAColor;
  public currentColor: RGBAColor;
  public trail: TrailPoint[];
  public maxTrailLength: number;
  public isInPoem: boolean;
  public poemTargetX: number | null;
  public poemTargetY: number | null;
  public poemColor: RGBAColor | null;

  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    
    const speed = 0.3 + Math.random() * 0.5;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    this.radius = 2 + Math.random() * 2;
    this.baseColor = { ...PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)] };
    this.currentColor = { ...this.baseColor };
    this.maxTrailLength = 8 + Math.floor(Math.random() * 5);
    this.trail = [];
    
    this.isInPoem = false;
    this.poemTargetX = null;
    this.poemTargetY = null;
    this.poemColor = null;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setPoemTarget(x: number, y: number, color: RGBAColor): void {
    this.isInPoem = true;
    this.poemTargetX = x;
    this.poemTargetY = y;
    this.poemColor = color;
  }

  public clearPoemTarget(): void {
    this.isInPoem = false;
    this.poemTargetX = null;
    this.poemTargetY = null;
    this.poemColor = null;
  }

  public update(
    mouseX: number | null,
    mouseY: number | null,
    isMouseInCanvas: boolean,
    shockwaves: { x: number; y: number; radius: number; strength: number }[],
    globalRotationCenter: { x: number; y: number },
    globalRotationAngle: number
  ): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    if (this.isInPoem && this.poemTargetX !== null && this.poemTargetY !== null) {
      const dx = this.poemTargetX - this.x;
      const dy = this.poemTargetY - this.y;
      this.vx = dx * 0.15;
      this.vy = dy * 0.15;

      if (this.poemColor) {
        this.currentColor.r += (this.poemColor.r - this.currentColor.r) * 0.1;
        this.currentColor.g += (this.poemColor.g - this.currentColor.g) * 0.1;
        this.currentColor.b += (this.poemColor.b - this.currentColor.b) * 0.1;
        this.currentColor.a += (this.poemColor.a - this.currentColor.a) * 0.1;
      }
    } else {
      const rotCx = globalRotationCenter.x;
      const rotCy = globalRotationCenter.y;
      const dxRot = this.x - rotCx;
      const dyRot = this.y - rotCy;
      const cos = Math.cos(globalRotationAngle);
      const sin = Math.sin(globalRotationAngle);
      const newX = rotCx + dxRot * cos - dyRot * sin;
      const newY = rotCy + dxRot * sin + dyRot * cos;
      this.vx += (newX - this.x) * 0.002;
      this.vy += (newY - this.y) * 0.002;

      this.vx += (Math.random() - 0.5) * 0.05;
      this.vy += (Math.random() - 0.5) * 0.05;

      if (isMouseInCanvas && mouseX !== null && mouseY !== null) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.3;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
          
          this.currentColor.r = Math.min(255, this.baseColor.r + (255 - this.baseColor.r) * 0.2);
          this.currentColor.g = Math.min(255, this.baseColor.g + (200 - this.baseColor.g) * 0.15);
          this.currentColor.b = this.baseColor.b;
        } else {
          this.currentColor.r += (this.baseColor.r - this.currentColor.r) * 0.05;
          this.currentColor.g += (this.baseColor.g - this.currentColor.g) * 0.05;
          this.currentColor.b += (this.baseColor.b - this.currentColor.b) * 0.05;
        }
      } else {
        this.currentColor.r += (this.baseColor.r - this.currentColor.r) * 0.05;
        this.currentColor.g += (this.baseColor.g - this.currentColor.g) * 0.05;
        this.currentColor.b += (this.baseColor.b - this.currentColor.b) * 0.05;
      }

      for (const wave of shockwaves) {
        const dx = this.x - wave.x;
        const dy = this.y - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const waveWidth = 50;
        
        if (dist < wave.radius + waveWidth && dist > wave.radius - waveWidth && dist > 0) {
          const waveForce = wave.strength * Math.max(0, 1 - Math.abs(dist - wave.radius) / waveWidth);
          this.vx += (dx / dist) * waveForce;
          this.vy += (dy / dist) * waveForce;
        }
      }

      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const maxSpeed = 1.5;
      if (speed > maxSpeed) {
        this.vx = (this.vx / speed) * maxSpeed;
        this.vy = (this.vy / speed) * maxSpeed;
      }
      
      const minSpeed = 0.3;
      if (speed < minSpeed && speed > 0) {
        this.vx = (this.vx / speed) * minSpeed;
        this.vy = (this.vy / speed) * minSpeed;
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) this.x = this.width;
    if (this.x > this.width) this.x = 0;
    if (this.y < 0) this.y = this.height;
    if (this.y > this.height) this.y = 0;
  }

  public checkCollision(other: Particle): void {
    if (this.isInPoem || other.isInPoem) return;
    
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.radius + other.radius + 2;

    if (dist < minDist && dist > 0) {
      const overlap = (minDist - dist) / 2;
      const nx = dx / dist;
      const ny = dy / dist;
      
      this.x -= nx * overlap;
      this.y -= ny * overlap;
      other.x += nx * overlap;
      other.y += ny * overlap;

      const dvx = this.vx - other.vx;
      const dvy = this.vy - other.vy;
      const dvDotN = dvx * nx + dvy * ny;

      if (dvDotN > 0) {
        this.vx -= dvDotN * nx * 0.3;
        this.vy -= dvDotN * ny * 0.3;
        other.vx += dvDotN * nx * 0.3;
        other.vy += dvDotN * ny * 0.3;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const alpha = (i / this.trail.length) * 0.5;
        const tRadius = this.radius * (i / this.trail.length);
        
        ctx.beginPath();
        ctx.arc(this.trail[i].x, this.trail[i].y, tRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(this.currentColor.r)}, ${Math.round(this.currentColor.g)}, ${Math.round(this.currentColor.b)}, ${alpha})`;
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.round(this.currentColor.r)}, ${Math.round(this.currentColor.g)}, ${Math.round(this.currentColor.b)}, ${this.currentColor.a})`;
    ctx.fill();
  }
}
