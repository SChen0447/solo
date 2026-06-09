import p5 from 'p5';

export interface Explosion {
  x: number;
  y: number;
  life: number;
  color: p5.Color;
}

export class Particle {
  pos: p5.Vector;
  vel: p5.Vector;
  color: p5.Color;
  alpha: number;
  lifespan: number;
  maxLifespan: number;
  size: number;
  collided: boolean;

  constructor(p: p5, x: number, y: number, vx: number, vy: number, color: p5.Color, maxLifespan: number) {
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(vx, vy);
    this.color = color;
    this.alpha = 0.9;
    this.lifespan = 0;
    this.maxLifespan = maxLifespan;
    this.size = p.random(2, 4);
    this.collided = false;
  }

  update(p: p5, flowForce: p5.Vector): boolean {
    this.vel.add(flowForce);
    this.vel.mult(0.98);
    this.pos.add(this.vel);
    this.lifespan++;

    const speed = this.vel.mag();
    if (speed < 0.3) {
      this.alpha -= 0.02;
    }

    if (this.lifespan >= this.maxLifespan) {
      this.alpha -= 0.02;
    }

    return this.alpha > 0;
  }

  display(p: p5): void {
    p.push();
    p.drawingContext.shadowBlur = 6;
    p.drawingContext.shadowColor = this.color.toString();
    p.noStroke();
    const r = p.red(this.color);
    const g = p.green(this.color);
    const b = p.blue(this.color);
    p.fill(r, g, b, this.alpha * 255);
    p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
    p.pop();
  }

  checkCollision(p: p5, other: Particle): Explosion | null {
    const dx = this.pos.x - other.pos.x;
    const dy = this.pos.y - other.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10 && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;

      const thisVelAlongNormal = this.vel.x * nx + this.vel.y * ny;
      const otherVelAlongNormal = other.vel.x * nx + other.vel.y * ny;

      const thisVelTangentX = this.vel.x - thisVelAlongNormal * nx;
      const thisVelTangentY = this.vel.y - thisVelAlongNormal * ny;
      const otherVelTangentX = other.vel.x - otherVelAlongNormal * nx;
      const otherVelTangentY = other.vel.y - otherVelAlongNormal * ny;

      this.vel.x = thisVelTangentX + otherVelAlongNormal * nx;
      this.vel.y = thisVelTangentY + otherVelAlongNormal * ny;
      other.vel.x = otherVelTangentX + thisVelAlongNormal * nx;
      other.vel.y = otherVelTangentY + thisVelAlongNormal * ny;

      const overlap = 10 - dist;
      this.pos.x += (overlap / 2) * nx;
      this.pos.y += (overlap / 2) * ny;
      other.pos.x -= (overlap / 2) * nx;
      other.pos.y -= (overlap / 2) * ny;

      const mixedColor = this.lerpColor(p, this.color, other.color, 0.5);
      this.color = mixedColor;
      other.color = this.lerpColor(p, other.color, this.color, 0.5);

      const midX = (this.pos.x + other.pos.x) / 2;
      const midY = (this.pos.y + other.pos.y) / 2;
      return {
        x: midX,
        y: midY,
        life: 5,
        color: mixedColor
      };
    }
    return null;
  }

  private lerpColor(p: p5, c1: p5.Color, c2: p5.Color, t: number): p5.Color {
    const r1 = p.red(c1);
    const g1 = p.green(c1);
    const b1 = p.blue(c1);
    const r2 = p.red(c2);
    const g2 = p.green(c2);
    const b2 = p.blue(c2);
    return p.color(
      r1 + (r2 - r1) * t,
      g1 + (g2 - g1) * t,
      b1 + (b2 - b1) * t
    );
  }
}
