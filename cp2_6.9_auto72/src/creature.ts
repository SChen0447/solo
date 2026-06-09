export interface Vec2 {
  x: number;
  y: number;
}

export type CreatureType = 'fish' | 'turtle' | 'jellyfish';

export abstract class Creature {
  id: number;
  type: CreatureType;
  pos: Vec2;
  vel: Vec2;
  acc: Vec2;
  color: string;
  size: number;
  animFrame: number;
  animSpeed: number;
  alive: boolean;

  constructor(
    id: number,
    type: CreatureType,
    pos: Vec2,
    vel: Vec2,
    color: string,
    size: number
  ) {
    this.id = id;
    this.type = type;
    this.pos = { ...pos };
    this.vel = { ...vel };
    this.acc = { x: 0, y: 0 };
    this.color = color;
    this.size = size;
    this.animFrame = Math.random() * Math.PI * 2;
    this.animSpeed = 0.08;
    this.alive = true;
  }

  abstract update(dt: number, force?: Vec2): void;
  abstract render(ctx: CanvasRenderingContext2D): void;

  protected applyForce(force: Vec2): void {
    this.acc.x += force.x;
    this.acc.y += force.y;
  }

  protected limitSpeed(maxSpeed: number): void {
    const speed = Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
    if (speed > maxSpeed && speed > 0) {
      this.vel.x = (this.vel.x / speed) * maxSpeed;
      this.vel.y = (this.vel.y / speed) * maxSpeed;
    }
  }
}

export class Fish extends Creature {
  baseMaxSpeed: number;
  scared: boolean;
  scaredTimer: number;
  scareForceMultiplier: number;

  constructor(id: number, pos: Vec2) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 30;
    const vel: Vec2 = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
    const size = 8 + Math.random() * 7;
    const hue = 30 + Math.random() * 60;
    const color = `hsl(${hue}, 100%, 60%)`;
    super(id, 'fish', pos, vel, color, size);
    this.baseMaxSpeed = 70 + Math.random() * 20;
    this.scared = false;
    this.scaredTimer = 0;
    this.scareForceMultiplier = 1;
    this.animSpeed = 0.15;
  }

  update(dt: number, force?: Vec2): void {
    if (force) {
      this.applyForce(force);
    }

    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;

    let currentMax = this.baseMaxSpeed;
    if (this.scared) {
      currentMax = this.baseMaxSpeed * 3;
      this.scaredTimer -= dt;
      if (this.scaredTimer <= 0) {
        this.scared = false;
        this.scareForceMultiplier = 1;
      }
    }

    this.limitSpeed(currentMax);

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    this.acc.x = 0;
    this.acc.y = 0;
    this.animFrame += this.animSpeed;
  }

  scare(): void {
    this.scared = true;
    this.scaredTimer = 1;
    this.scareForceMultiplier = 8;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const angle = Math.atan2(this.vel.y, this.vel.x);
    ctx.rotate(angle);

    const tailWag = Math.sin(this.animFrame) * 0.4;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#A0D8EF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, this.size, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-this.size * 0.9, 0);
    ctx.lineTo(-this.size * 1.7, -this.size * 0.4 + tailWag * this.size * 0.3);
    ctx.lineTo(-this.size * 1.7, this.size * 0.4 + tailWag * this.size * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.5);
    ctx.lineTo(this.size * 0.2, -this.size * 0.9);
    ctx.lineTo(this.size * 0.5, -this.size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0A1A2E';
    ctx.beginPath();
    ctx.arc(this.size * 0.4, -this.size * 0.1, this.size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Jellyfish extends Creature {
  baseY: number;
  phase: number;
  amplitude: number;
  period: number;
  tentaclePhase: number;
  flashTimer: number;
  particles: Array<{
    pos: Vec2;
    vel: Vec2;
    life: number;
    maxLife: number;
  }>;
  evading: boolean;
  evadeTimer: number;

  constructor(id: number, pos: Vec2) {
    const size = 30 + Math.random() * 20;
    super(id, 'jellyfish', pos, { x: 0, y: 0 }, '#E0B0FF', size);
    this.baseY = pos.y;
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = 30;
    this.period = 3;
    this.tentaclePhase = Math.random() * Math.PI * 2;
    this.flashTimer = 0;
    this.particles = [];
    this.evading = false;
    this.evadeTimer = 0;
    this.animSpeed = 0.06;
  }

  triggerFlash(): void {
    this.flashTimer = 0.5;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 60 + Math.random() * 40;
      this.particles.push({
        pos: { x: this.pos.x, y: this.pos.y },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 0.5,
        maxLife: 0.5
      });
    }
    this.evading = true;
    this.evadeTimer = 2;
  }

  update(dt: number, _force?: Vec2): void {
    this.phase += (Math.PI * 2 / this.period) * dt;
    this.tentaclePhase += this.animSpeed;

    let targetY = this.baseY + Math.sin(this.phase) * this.amplitude;

    if (this.evading) {
      this.evadeTimer -= dt;
      targetY -= 40 * dt;
      if (this.evadeTimer <= 0) {
        this.evading = false;
        this.baseY = this.pos.y;
      }
    }

    this.pos.y += (targetY - this.pos.y) * 0.05;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    this.animFrame += this.animSpeed;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 5 * alpha + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    let alpha = 0.5;
    if (this.flashTimer > 0) {
      alpha = 0.5 + (this.flashTimer / 0.5) * 0.5;
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#A0D8EF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    const r = this.size;
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r, -r * 0.9, r, -r * 0.9, r, 0);
    ctx.lineTo(r * 0.85, r * 0.15);
    ctx.quadraticCurveTo(0, r * 0.25, -r * 0.85, r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.7;
    for (let i = 0; i < 6; i++) {
      const tx = -r * 0.7 + (i / 5) * r * 1.4;
      const tentacleLength = 15 + Math.random() * 10 + (i % 2) * 5;
      const sway = Math.sin(this.tentaclePhase + i * 0.8) * 5;

      ctx.beginPath();
      ctx.moveTo(tx, r * 0.1);
      ctx.quadraticCurveTo(
        tx + sway,
        r * 0.1 + tentacleLength / 2,
        tx + sway * 0.5,
        r * 0.1 + tentacleLength
      );
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Turtle extends Creature {
  baseSpeed: number;
  mouthOpen: boolean;
  mouthAngle: number;
  targetMouthAngle: number;
  boostTimer: number;
  boostMultiplier: number;

  constructor(id: number, pos: Vec2) {
    const size = 60 + Math.random() * 20;
    const dir = Math.random() > 0.5 ? 1 : -1;
    const vel: Vec2 = { x: dir * (15 + Math.random() * 10), y: 0 };
    super(id, 'turtle', pos, vel, '#2E8B57', size);
    this.baseSpeed = 15 + Math.random() * 10;
    this.mouthOpen = false;
    this.mouthAngle = 0;
    this.targetMouthAngle = 0;
    this.boostTimer = 0;
    this.boostMultiplier = 1;
    this.animSpeed = 0.05;
  }

  openMouth(): void {
    this.mouthOpen = true;
    this.targetMouthAngle = 15 * (Math.PI / 180);
  }

  closeMouth(): void {
    this.mouthOpen = false;
    this.targetMouthAngle = 0;
  }

  triggerBoost(): void {
    this.boostTimer = 2;
    this.boostMultiplier = 1.5;
  }

  update(dt: number, force?: Vec2): void {
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.boostMultiplier = 1;
      }
    }

    if (force) {
      this.applyForce(force);
    }

    this.vel.x += this.acc.x * dt;
    this.vel.y += this.acc.y * dt;

    const targetSpeed = this.baseSpeed * this.boostMultiplier;
    if (this.vel.x > 0) {
      this.vel.x = targetSpeed;
    } else {
      this.vel.x = -targetSpeed;
    }
    this.vel.y *= 0.9;

    this.limitSpeed(targetSpeed * 2);

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    this.mouthAngle += (this.targetMouthAngle - this.mouthAngle) * 0.2;

    this.acc.x = 0;
    this.acc.y = 0;
    this.animFrame += this.animSpeed;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const dir = this.vel.x >= 0 ? 1 : -1;
    ctx.scale(dir, 1);

    const s = this.size;
    const flipperFlap = Math.sin(this.animFrame) * 0.2;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#A0D8EF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(160, 216, 239, 0.5)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * s * 0.15, 0, s * 0.1, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#A0D8EF';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.save();
    ctx.translate(-s * 0.3, -s * 0.3);
    ctx.rotate(-0.4 + flipperFlap);
    ctx.ellipse(0, 0, s * 0.25, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.translate(s * 0.3, -s * 0.3);
    ctx.rotate(0.4 - flipperFlap);
    ctx.ellipse(0, 0, s * 0.25, s * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.translate(-s * 0.3, s * 0.3);
    ctx.rotate(0.3 - flipperFlap);
    ctx.ellipse(0, 0, s * 0.18, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.translate(s * 0.3, s * 0.3);
    ctx.rotate(-0.3 + flipperFlap);
    ctx.ellipse(0, 0, s * 0.18, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.translate(s * 0.55, 0);
    ctx.fillStyle = '#3CB371';
    ctx.ellipse(0, 0, s * 0.18, s * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0A1A2E';
    ctx.beginPath();
    ctx.arc(s * 0.08, -s * 0.06, s * 0.035, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a5a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.save();
    ctx.rotate(-this.mouthAngle);
    ctx.moveTo(s * 0.15, s * 0.02);
    ctx.lineTo(s * 0.22, s * 0.02);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.save();
    ctx.rotate(this.mouthAngle);
    ctx.moveTo(s * 0.15, s * 0.06);
    ctx.lineTo(s * 0.22, s * 0.06);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    ctx.restore();
  }
}
