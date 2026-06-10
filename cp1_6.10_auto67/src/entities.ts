export interface Vec2 {
  x: number;
  y: number;
}

export interface GameState {
  width: number;
  height: number;
  mousePos: Vec2;
  isRightClick: boolean;
}

export class Plankton {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;

  constructor(width: number, height: number) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = 2 + Math.random() * 4;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.alpha = 0.2 + Math.random() * 0.4;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(width: number, height: number, time: number): void {
    this.x += this.vx;
    this.y += this.vy + Math.sin(time * 0.001 + this.phase) * 0.1;
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const glow = 0.5 + 0.5 * Math.sin(time * 0.002 + this.phase);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 220, 255, ${this.alpha * glow})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(150, 220, 255, 0.8)';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 0;
    this.color = '#fff';
    this.life = 0;
    this.maxLife = 1000;
    this.active = false;
  }

  init(x: number, y: number, vx: number, vy: number, radius: number, color: string, life: number): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.x += this.vx * dt * 0.06;
    this.y += this.vy * dt * 0.06;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * alpha, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    if (this.color.startsWith('#')) {
      ctx.fillStyle = this.hexToRgba(this.color, alpha);
    }
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export class ParticlePool {
  pool: Particle[];
  maxSize: number;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
    this.pool = [];
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(new Particle());
    }
  }

  emit(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const particle = this.getInactive();
      if (!particle) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const radius = 2 + Math.random() * 3;
      particle.init(x, y, vx, vy, radius, color, 1000);
    }
  }

  private getInactive(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return this.pool[0];
  }

  update(dt: number): void {
    for (const p of this.pool) {
      p.update(dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      p.draw(ctx);
    }
  }

  getActiveCount(): number {
    let count = 0;
    for (const p of this.pool) {
      if (p.active) count++;
    }
    return count;
  }
}

export interface Consumable {
  x: number;
  y: number;
  radius: number;
  color: string;
  active: boolean;
}

export class SmallCell implements Consumable {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  hue: number;
  active: boolean;
  beingConsumed: boolean;
  consumeProgress: number;
  targetX: number;
  targetY: number;
  originalRadius: number;

  constructor(width: number, height: number) {
    this.radius = 8 + Math.random() * 7;
    this.originalRadius = this.radius;
    this.x = this.radius + Math.random() * (width - this.radius * 2);
    this.y = this.radius + Math.random() * (height - this.radius * 2);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.hue = Math.floor(Math.random() * 360);
    this.color = `hsl(${this.hue}, 70%, 60%)`;
    this.active = true;
    this.beingConsumed = false;
    this.consumeProgress = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  update(width: number, height: number, player: PlayerCell | null = null, dt: number = 16): void {
    if (!this.active) return;
    if (this.beingConsumed) {
      this.consumeProgress += dt / 300;
      if (player) {
        this.targetX = player.x;
        this.targetY = player.y;
      }
      const t = Math.min(1, this.consumeProgress);
      this.x += (this.targetX - this.x) * t * 0.3;
      this.y += (this.targetY - this.y) * t * 0.3;
      this.radius = this.originalRadius * (1 - t * 0.9);
      if (this.consumeProgress >= 1) {
        this.active = false;
      }
    } else {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx);
      }
      if (this.x + this.radius > width) {
        this.x = width - this.radius;
        this.vx = -Math.abs(this.vx);
      }
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy);
      }
      if (this.y + this.radius > height) {
        this.y = height - this.radius;
        this.vy = -Math.abs(this.vy);
      }
    }
  }

  startConsume(targetX: number, targetY: number): void {
    this.beingConsumed = true;
    this.consumeProgress = 0;
    this.targetX = targetX;
    this.targetY = targetY;
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active) return;
    const pulse = 1 + 0.05 * Math.sin(time * 0.003 + this.hue);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius * pulse
    );
    gradient.addColorStop(0, `hsl(${this.hue}, 80%, 75%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 70%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, 0.6)`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

export class BigCell {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  hue: number;
  color: string;
  active: boolean;
  trackRange: number;
  speedFactor: number;

  constructor(width: number, height: number) {
    this.radius = 35 + Math.random() * 15;
    this.x = this.radius + Math.random() * (width - this.radius * 2);
    this.y = this.radius + Math.random() * (height - this.radius * 2);
    this.vx = 0;
    this.vy = 0;
    this.hue = 280 + Math.random() * 40;
    this.color = `hsl(${this.hue}, 60%, 35%)`;
    this.active = true;
    this.trackRange = 200;
    this.speedFactor = 0.6;
  }

  update(width: number, height: number, player: PlayerCell, dt: number = 16): void {
    if (!this.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.trackRange + player.radius + this.radius && dist > 0) {
      const baseSpeed = 1.5 * this.speedFactor;
      this.vx += (dx / dist) * baseSpeed * 0.05;
      this.vy += (dy / dist) * baseSpeed * 0.05;
    } else {
      this.vx *= 0.95;
      this.vy *= 0.95;
    }

    const maxSpeed = 2.5 * this.speedFactor;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
    }
    if (this.x + this.radius > width) {
      this.x = width - this.radius;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
    }
    if (this.y + this.radius > height) {
      this.y = height - this.radius;
      this.vy = -Math.abs(this.vy);
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number, player: PlayerCell): void {
    if (!this.active) return;
    const pulse = 1 + 0.03 * Math.sin(time * 0.002 + this.hue);
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inRange = dist < this.trackRange + player.radius + this.radius;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius * pulse
    );
    if (inRange) {
      gradient.addColorStop(0, `hsl(${this.hue}, 70%, 50%)`);
      gradient.addColorStop(1, `hsl(${this.hue}, 70%, 25%)`);
    } else {
      gradient.addColorStop(0, `hsl(${this.hue}, 50%, 45%)`);
      gradient.addColorStop(1, `hsl(${this.hue}, 60%, 25%)`);
    }
    ctx.fillStyle = gradient;
    ctx.shadowBlur = inRange ? 20 : 10;
    ctx.shadowColor = inRange ? `hsla(0, 80%, 50%, 0.6)` : `hsla(${this.hue}, 60%, 40%, 0.5)`;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (inRange) {
      ctx.beginPath();
      ctx.arc(this.x, this.y - this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.x, this.y + this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class EnergyGem implements Consumable {
  x: number;
  y: number;
  radius: number;
  color: string;
  active: boolean;
  respawnTimer: number;
  phase: number;

  constructor(width: number, height: number) {
    this.radius = 12;
    this.spawn(width, height);
    this.color = '#FFD700';
    this.active = true;
    this.respawnTimer = 0;
    this.phase = Math.random() * Math.PI * 2;
  }

  spawn(width: number, height: number): void {
    this.x = this.radius + 30 + Math.random() * (width - this.radius * 2 - 60);
    this.y = this.radius + 30 + Math.random() * (height - this.radius * 2 - 60);
    this.active = true;
  }

  update(width: number, height: number, dt: number = 16): void {
    if (!this.active) {
      this.respawnTimer += dt;
      if (this.respawnTimer >= 10000) {
        this.spawn(width, height);
        this.respawnTimer = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active) return;
    const pulse = 1 + 0.15 * Math.sin(time * 0.005 + this.phase);
    const glow = 0.5 + 0.5 * Math.sin(time * 0.004 + this.phase);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((time * 0.001 + this.phase) % (Math.PI * 2));

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const r = this.radius * pulse;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * pulse);
    gradient.addColorStop(0, `rgba(255, 255, 200, ${0.9 * glow})`);
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(200, 150, 0, 0.9)');
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 25;
    ctx.shadowColor = `rgba(255, 215, 0, ${glow})`;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export class TrailPoint {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.alpha = 0;
    this.life = 0;
    this.maxLife = 300;
    this.active = false;
  }

  init(x: number, y: number, radius: number): void {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.alpha = 0.4;
    this.life = this.maxLife;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const t = this.life / this.maxLife;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * t, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(200, 80%, 60%, ${this.alpha * t})`;
    ctx.fill();
  }
}

export class PlayerCell {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  targetRadius: number;
  hue: number;
  damping: number;
  vx: number;
  vy: number;
  dashCooldown: number;
  dashDuration: number;
  dashVx: number;
  dashVy: number;
  isDashing: boolean;
  knockbackVx: number;
  knockbackVy: number;
  invincibleTimer: number;
  trail: TrailPoint[];
  trailTimer: number;

  constructor(width: number, height: number) {
    this.x = width / 2;
    this.y = height / 2;
    this.targetX = width / 2;
    this.targetY = height / 2;
    this.radius = 25;
    this.targetRadius = 25;
    this.hue = 200;
    this.damping = 0.15;
    this.vx = 0;
    this.vy = 0;
    this.dashCooldown = 0;
    this.dashDuration = 0;
    this.dashVx = 0;
    this.dashVy = 0;
    this.isDashing = false;
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.invincibleTimer = 0;
    this.trail = [];
    this.trailTimer = 0;
    for (let i = 0; i < 30; i++) {
      this.trail.push(new TrailPoint());
    }
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  dash(directionX: number, directionY: number): void {
    if (this.dashCooldown > 0) return;
    const len = Math.sqrt(directionX * directionX + directionY * directionY);
    if (len === 0) return;
    const dashDistance = 80;
    const dashSpeed = dashDistance / 150;
    this.dashVx = (directionX / len) * dashSpeed;
    this.dashVy = (directionY / len) * dashSpeed;
    this.dashDuration = 150;
    this.dashCooldown = 3000;
    this.isDashing = true;
  }

  applyKnockback(fromX: number, fromY: number, force: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    this.knockbackVx = (dx / len) * force;
    this.knockbackVy = (dy / len) * force;
    this.invincibleTimer = 500;
  }

  grow(amount: number): void {
    this.targetRadius = Math.min(80, this.targetRadius + amount);
  }

  update(width: number, height: number, dt: number = 16): void {
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    if (this.dashDuration > 0) {
      this.dashDuration -= dt;
      this.x += this.dashVx * dt;
      this.y += this.dashVy * dt;
      this.trailTimer += dt;
      if (this.trailTimer >= 16) {
        this.trailTimer = 0;
        const tp = this.trail.find(t => !t.active);
        if (tp) tp.init(this.x, this.y, this.radius);
      }
    } else {
      this.isDashing = false;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      this.vx = dx * this.damping;
      this.vy = dy * this.damping;
      this.x += this.vx + this.knockbackVx;
      this.y += this.vy + this.knockbackVy;
    }

    this.knockbackVx *= 0.9;
    this.knockbackVy *= 0.9;

    this.radius += (this.targetRadius - this.radius) * 0.1;

    if (this.x - this.radius < 0) this.x = this.radius;
    if (this.x + this.radius > width) this.x = width - this.radius;
    if (this.y - this.radius < 0) this.y = this.radius;
    if (this.y + this.radius > height) this.y = height - this.radius;

    for (const tp of this.trail) {
      tp.update(dt);
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (const tp of this.trail) {
      tp.draw(ctx);
    }

    const pulse = 0.5 + 0.5 * Math.sin(time / 1000 * Math.PI);
    const glowAlpha = 0.5 + pulse * 0.5;
    const invincible = this.invincibleTimer > 0;
    const flash = invincible ? (Math.sin(time * 0.02) > 0 ? 0.5 : 1) : 1;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${glowAlpha * 0.3 * flash})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, `hsla(${this.hue}, 90%, 80%, ${flash})`);
    gradient.addColorStop(0.7, `hsla(${this.hue}, 80%, 60%, ${flash})`);
    gradient.addColorStop(1, `hsla(${this.hue}, 70%, 40%, ${flash})`);
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `hsla(${this.hue}, 80%, 60%, ${glowAlpha * flash})`;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * flash})`;
    ctx.fill();
  }
}
