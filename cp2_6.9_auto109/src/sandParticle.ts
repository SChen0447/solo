export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  timestamp: number;
}

export class SandParticle implements ParticleData {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: string;
  public timestamp: number;

  constructor(x: number, y: number, color: string, timestamp: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.5;
    this.vy = Math.random() * 0.5;
    this.radius = 2 + Math.random() * 3;
    this.color = color;
    this.timestamp = timestamp;
  }

  public update(gravity: number, canvasWidth: number, canvasHeight: number): void {
    this.vy += gravity;
    this.vx += (Math.random() - 0.5) * 0.08;

    this.vx = Math.max(-0.5, Math.min(0.5, this.vx));

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx *= -0.5;
    }
    if (this.x + this.radius > canvasWidth) {
      this.x = canvasWidth - this.radius;
      this.vx *= -0.5;
    }
    if (this.y + this.radius > canvasHeight) {
      this.y = canvasHeight - this.radius;
      this.vy *= -0.3;
      this.vx *= 0.95;
      if (Math.abs(this.vy) < 0.5) {
        this.vy = 0;
      }
    }
  }

  public resolveCollision(other: SandParticle): void {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.radius + other.radius;

    if (distance < minDist && distance > 0) {
      const overlap = minDist - distance;
      const nx = dx / distance;
      const ny = dy / distance;

      const pushX = nx * overlap * 0.3;
      const pushY = ny * overlap * 0.3;

      this.x -= pushX;
      this.y -= pushY;
      other.x += pushX;
      other.y += pushY;

      const dvx = this.vx - other.vx;
      const dvy = this.vy - other.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn > 0) {
        const impulse = dvn * 0.5;
        this.vx -= impulse * nx;
        this.vy -= impulse * ny;
        other.vx += impulse * nx;
        other.vy += impulse * ny;
      }
    }
  }
}
