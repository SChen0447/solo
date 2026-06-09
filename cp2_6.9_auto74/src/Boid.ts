export interface Vec2 {
  x: number;
  y: number;
}

export interface ScareSource {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  maxAge: number;
  active: boolean;
}

export class Boid {
  pos: Vec2;
  vel: Vec2;
  acc: Vec2;
  trail: Vec2[];
  maxSpeed: number;
  minSpeed: number;
  maxAccel: number;
  size: number;
  fleeing: boolean;
  fleeTimer: number;
  fleeDuration: number;
  width: number;
  height: number;

  static readonly SEPARATION_RADIUS = 40;
  static readonly ALIGNMENT_RADIUS = 80;
  static readonly COHESION_RADIUS = 120;
  static readonly MIN_DISTANCE = 15;
  static readonly CRITICAL_DISTANCE = 10;
  static readonly ALIGNMENT_WEIGHT = 0.5;
  static readonly COHESION_WEIGHT = 0.3;
  static readonly BOUNDARY_MARGIN = 50;
  static readonly BOUNDARY_TURN_FACTOR = 0.3;

  constructor(x: number, y: number, width: number, height: number) {
    this.pos = { x, y };
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    this.vel = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
    this.acc = { x: 0, y: 0 };
    this.trail = [];
    this.maxSpeed = 5;
    this.minSpeed = 1;
    this.maxAccel = 2;
    this.size = 12;
    this.fleeing = false;
    this.fleeTimer = 0;
    this.fleeDuration = 0.5;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(
    boids: Boid[],
    scareSources: ScareSource[],
    deltaTime: number
  ): void {
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > 2) {
      this.trail.shift();
    }

    if (this.fleeing) {
      this.fleeTimer -= deltaTime;
      if (this.fleeTimer <= 0) {
        this.fleeing = false;
      }
    }

    this.checkScareSources(scareSources);

    this.acc = { x: 0, y: 0 };

    const separation = this.calculateSeparation(boids);
    this.addForce(separation, 1.0);

    if (!this.fleeing) {
      const alignment = this.calculateAlignment(boids);
      this.addForce(alignment, Boid.ALIGNMENT_WEIGHT);

      const cohesion = this.calculateCohesion(boids);
      this.addForce(cohesion, Boid.COHESION_WEIGHT);
    }

    const boundary = this.calculateBoundaryAvoidance();
    this.addForce(boundary, 1.0);

    this.limitAcceleration();

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;

    this.limitSpeed();

    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    this.wrapPosition();
  }

  private checkScareSources(sources: ScareSource[]): void {
    for (const source of sources) {
      if (!source.active) continue;
      const dx = this.pos.x - source.x;
      const dy = this.pos.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        this.startFleeing(source);
        break;
      }
    }
  }

  private startFleeing(source: ScareSource): void {
    const dx = this.pos.x - source.x;
    const dy = this.pos.y - source.y;
    const baseAngle = Math.atan2(dy, dx);
    const randomOffset = (Math.random() - 0.5) * Math.PI / 2;
    const fleeAngle = baseAngle + randomOffset;

    this.vel.x = Math.cos(fleeAngle) * 6;
    this.vel.y = Math.sin(fleeAngle) * 6;
    this.fleeing = true;
    this.fleeTimer = this.fleeDuration;
  }

  private calculateSeparation(boids: Boid[]): Vec2 {
    const force: Vec2 = { x: 0, y: 0 };
    let count = 0;

    for (const other of boids) {
      if (other === this) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < Boid.SEPARATION_RADIUS) {
        let strength: number;
        if (dist < Boid.CRITICAL_DISTANCE) {
          strength = Math.exp((Boid.CRITICAL_DISTANCE - dist) * 0.5);
        } else if (dist < Boid.MIN_DISTANCE) {
          strength = (Boid.MIN_DISTANCE - dist) / Boid.MIN_DISTANCE * 2;
        } else {
          strength = (Boid.SEPARATION_RADIUS - dist) / Boid.SEPARATION_RADIUS;
        }

        force.x += (dx / dist) * strength;
        force.y += (dy / dist) * strength;
        count++;
      }
    }

    if (count > 0) {
      force.x /= count;
      force.y /= count;
    }

    return force;
  }

  private calculateAlignment(boids: Boid[]): Vec2 {
    const avgVel: Vec2 = { x: 0, y: 0 };
    let count = 0;

    for (const other of boids) {
      if (other === this) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < Boid.ALIGNMENT_RADIUS) {
        avgVel.x += other.vel.x;
        avgVel.y += other.vel.y;
        count++;
      }
    }

    if (count > 0) {
      avgVel.x /= count;
      avgVel.y /= count;
      const speed = Math.sqrt(avgVel.x * avgVel.x + avgVel.y * avgVel.y);
      if (speed > 0) {
        avgVel.x = (avgVel.x / speed) * this.maxSpeed - this.vel.x;
        avgVel.y = (avgVel.y / speed) * this.maxSpeed - this.vel.y;
      }
    }

    return avgVel;
  }

  private calculateCohesion(boids: Boid[]): Vec2 {
    const center: Vec2 = { x: 0, y: 0 };
    let count = 0;

    for (const other of boids) {
      if (other === this) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < Boid.COHESION_RADIUS) {
        center.x += other.pos.x;
        center.y += other.pos.y;
        count++;
      }
    }

    if (count > 0) {
      center.x /= count;
      center.y /= count;
      center.x -= this.pos.x;
      center.y -= this.pos.y;
      const mag = Math.sqrt(center.x * center.x + center.y * center.y);
      if (mag > 0) {
        center.x = (center.x / mag) * this.maxSpeed - this.vel.x;
        center.y = (center.y / mag) * this.maxSpeed - this.vel.y;
      }
    }

    return center;
  }

  private calculateBoundaryAvoidance(): Vec2 {
    const force: Vec2 = { x: 0, y: 0 };
    const margin = Boid.BOUNDARY_MARGIN;
    const turnFactor = Boid.BOUNDARY_TURN_FACTOR;

    if (this.pos.x < margin) {
      const angle = Math.atan2(this.vel.y, this.vel.x);
      const targetAngle = 0;
      const diff = this.normalizeAngle(targetAngle - angle);
      force.x += Math.cos(angle + diff * turnFactor) * this.maxSpeed - this.vel.x;
      force.y += Math.sin(angle + diff * turnFactor) * this.maxSpeed - this.vel.y;
    }
    if (this.pos.x > this.width - margin) {
      const angle = Math.atan2(this.vel.y, this.vel.x);
      const targetAngle = Math.PI;
      const diff = this.normalizeAngle(targetAngle - angle);
      force.x += Math.cos(angle + diff * turnFactor) * this.maxSpeed - this.vel.x;
      force.y += Math.sin(angle + diff * turnFactor) * this.maxSpeed - this.vel.y;
    }
    if (this.pos.y < margin) {
      const angle = Math.atan2(this.vel.y, this.vel.x);
      const targetAngle = Math.PI / 2;
      const diff = this.normalizeAngle(targetAngle - angle);
      force.x += Math.cos(angle + diff * turnFactor) * this.maxSpeed - this.vel.x;
      force.y += Math.sin(angle + diff * turnFactor) * this.maxSpeed - this.vel.y;
    }
    if (this.pos.y > this.height - margin) {
      const angle = Math.atan2(this.vel.y, this.vel.x);
      const targetAngle = -Math.PI / 2;
      const diff = this.normalizeAngle(targetAngle - angle);
      force.x += Math.cos(angle + diff * turnFactor) * this.maxSpeed - this.vel.x;
      force.y += Math.sin(angle + diff * turnFactor) * this.maxSpeed - this.vel.y;
    }

    return force;
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  private addForce(force: Vec2, weight: number): void {
    this.acc.x += force.x * weight;
    this.acc.y += force.y * weight;
  }

  private limitAcceleration(): void {
    const mag = Math.sqrt(this.acc.x * this.acc.x + this.acc.y * this.acc.y);
    if (mag > this.maxAccel) {
      this.acc.x = (this.acc.x / mag) * this.maxAccel;
      this.acc.y = (this.acc.y / mag) * this.maxAccel;
    }
  }

  private limitSpeed(): void {
    const speed = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
    if (this.fleeing) {
      if (speed > 6) {
        this.vel.x = (this.vel.x / speed) * 6;
        this.vel.y = (this.vel.y / speed) * 6;
      }
    } else {
      if (speed > this.maxSpeed) {
        this.vel.x = (this.vel.x / speed) * this.maxSpeed;
        this.vel.y = (this.vel.y / speed) * this.maxSpeed;
      } else if (speed < this.minSpeed) {
        this.vel.x = (this.vel.x / speed) * this.minSpeed;
        this.vel.y = (this.vel.y / speed) * this.minSpeed;
      }
    }
  }

  private wrapPosition(): void {
    const waterStart = this.height * 0.8;
    if (this.pos.x < 0) this.pos.x = 0;
    if (this.pos.x > this.width) this.pos.x = this.width;
    if (this.pos.y < 0) this.pos.y = 0;
    if (this.pos.y > waterStart) this.pos.y = waterStart;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.globalAlpha = 0.2 * ((i + 1) / this.trail.length);
        this.drawTriangleAt(ctx, t.x, t.y, Math.atan2(this.vel.y, this.vel.x), 0.7);
      }
      ctx.restore();
    }

    this.drawTriangleAt(ctx, this.pos.x, this.pos.y, Math.atan2(this.vel.y, this.vel.x), 1);
  }

  private drawTriangleAt(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    scale: number
  ): void {
    const s = this.size * scale;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const gradient = ctx.createLinearGradient(s / 2, 0, -s / 2, 0);
    gradient.addColorStop(0, '#F5A623');
    gradient.addColorStop(1, '#D0021B');

    ctx.beginPath();
    ctx.moveTo(s / 2, 0);
    ctx.lineTo(-s / 2, -s / 2.5);
    ctx.lineTo(-s / 3, 0);
    ctx.lineTo(-s / 2, s / 2.5);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }
}
