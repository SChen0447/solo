import type { Particle } from './particle';

export interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  isDown: boolean;
  velocityX: number;
  velocityY: number;
}

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export class Field {
  private gravity: number = 0.0003;
  private windStrength: number = 0.8;
  private trailWindCoeff: number = 0.3;
  private attractionStrength: number = 0.5;
  public showFieldLines: boolean = false;

  public applyForces(
    particle: Particle,
    mouse: MouseState,
    keys: KeyState,
    dt: number
  ): void {
    particle.vy += this.gravity * dt * 16;

    if (keys.w) particle.vy -= this.windStrength * 0.01;
    if (keys.s) particle.vy += this.windStrength * 0.01;
    if (keys.a) particle.vx -= this.windStrength * 0.01;
    if (keys.d) particle.vx += this.windStrength * 0.01;

    const trailWindX = mouse.velocityX * this.trailWindCoeff * 0.05;
    const trailWindY = mouse.velocityY * this.trailWindCoeff * 0.05;
    particle.vx += trailWindX;
    particle.vy += trailWindY;

    if (mouse.isDown) {
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist > 1 && dist < 400) {
        const force = (this.attractionStrength * 50) / Math.max(distSq, 100);
        particle.vx += (dx / dist) * force;
        particle.vy += (dy / dist) * force;
      }
    }

    particle.vx *= 0.99;
    particle.vy *= 0.99;
  }

  public handleBoundary(particle: Particle, width: number, height: number): void {
    const bounce = 0.3;
    if (particle.x < particle.size) {
      particle.x = particle.size;
      particle.vx = Math.abs(particle.vx) * bounce;
    } else if (particle.x > width - particle.size) {
      particle.x = width - particle.size;
      particle.vx = -Math.abs(particle.vx) * bounce;
    }
    if (particle.y < particle.size) {
      particle.y = particle.size;
      particle.vy = Math.abs(particle.vy) * bounce;
    } else if (particle.y > height - particle.size) {
      particle.y = height - particle.size;
      particle.vy = -Math.abs(particle.vy) * bounce;
    }
  }

  public renderField(ctx: CanvasRenderingContext2D, mouse: MouseState): void {
    if (!this.showFieldLines) return;
    const numLines = 12;
    const lineLength = 30;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < numLines; i++) {
      const angle = (Math.PI * 2 * i) / numLines;
      const x2 = mouse.x + Math.cos(angle) * lineLength;
      const y2 = mouse.y + Math.sin(angle) * lineLength;
      ctx.beginPath();
      ctx.moveTo(mouse.x, mouse.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
