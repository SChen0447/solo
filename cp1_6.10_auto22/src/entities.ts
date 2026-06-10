import { Particle } from './skills';

export class Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  alive: boolean = true;
  hitFlash: number = 0;
  hurtTime: number = 0;

  constructor(x: number, y: number, hp: number, radius: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = hp;
    this.maxHp = hp;
    this.radius = radius;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.hitFlash = 0.2;
    this.hurtTime = 0.25;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.hurtTime > 0) this.hurtTime -= dt;
  }
}

export class Player extends Entity {
  combo: number = 0;
  comboTimer: number = 0;
  readonly COMBO_TIMEOUT = 3;
  invulnerable: number = 0;
  animTime: number = 0;
  baseY: number;

  constructor(x: number, y: number) {
    super(x, y, 100, 25);
    this.baseY = y;
  }

  addCombo(): void {
    this.combo++;
    this.comboTimer = this.COMBO_TIMEOUT;
  }

  isHighCombo(): boolean {
    return this.combo >= 10;
  }

  override takeDamage(amount: number): void {
    if (this.invulnerable > 0) return;
    super.takeDamage(amount);
    this.invulnerable = 0.8;
    this.combo = 0;
    this.comboTimer = 0;
  }

  override update(dt: number): void {
    super.update(dt);
    this.animTime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
      }
    }
    if (this.invulnerable > 0) this.invulnerable -= dt;
  }

  draw(ctx: CanvasRenderingContext2D, shieldActive: boolean): void {
    const bob = Math.sin(this.animTime * 2) * 2;
    const tilt = this.hurtTime > 0 ? (this.hurtTime / 0.25) * -0.3 : 0;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(tilt);
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
    glowGrad.addColorStop(0, 'rgba(100,150,255,0.3)');
    glowGrad.addColorStop(1, 'rgba(100,150,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.hitFlash / 0.2})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.2, this.radius * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const bodyGrad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
    bodyGrad.addColorStop(0, '#5577dd');
    bodyGrad.addColorStop(1, '#3344aa');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7799ee';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd4a3';
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.9, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-5, -this.radius * 0.95, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -this.radius * 0.95, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#884422';
    ctx.beginPath();
    ctx.ellipse(0, -this.radius * 1.35, this.radius * 0.55, this.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawAuraParticles(ctx: CanvasRenderingContext2D): Particle[] {
    const particles: Particle[] = [];
    if (this.combo >= 10) {
      for (let i = 0; i < 3; i++) {
        const ang = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * 10;
        particles.push(new Particle(
          this.x + Math.cos(ang) * r,
          this.y + Math.sin(ang) * r,
          Math.cos(ang) * 15,
          Math.sin(ang) * 15,
          0.6,
          4 + Math.random() * 4,
          '#ffcc33'
        ));
      }
    }
    return particles;
  }
}

export class Enemy extends Entity {
  animTime: number;
  baseY: number;
  jumpPhase: number;
  speed: number;

  constructor(x: number, y: number) {
    super(x, y, 40, 22);
    this.baseY = y;
    this.animTime = Math.random() * Math.PI * 2;
    this.jumpPhase = Math.random() * Math.PI * 2;
    this.speed = 15 + Math.random() * 15;
  }

  override update(dt: number, playerX: number, playerY: number): void {
    super.update(dt);
    this.animTime += dt;
    this.jumpPhase += dt * 3;
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed * 0.3;
    } else {
      this.vx *= 0.8;
      this.vy *= 0.8;
    }
    this.y = this.baseY + Math.abs(Math.sin(this.jumpPhase)) * -8;
  }

  onDeath(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 180;
      const col = Math.random() > 0.5 ? '#ff3344' : '#ff6677';
      particles.push(new Particle(this.x, this.y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.8, 5 + Math.random() * 6, col));
    }
    return particles;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const squash = 1 + Math.abs(Math.sin(this.jumpPhase)) * 0.15;
    const stretch = 1 / squash;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(stretch, squash);
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
    glowGrad.addColorStop(0, 'rgba(255,60,80,0.3)');
    glowGrad.addColorStop(1, 'rgba(255,60,80,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.hitFlash / 0.2})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const bodyGrad = ctx.createRadialGradient(-5, -5, 0, 0, 0, this.radius);
    bodyGrad.addColorStop(0, '#ff6677');
    bodyGrad.addColorStop(1, '#cc2233');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff8899';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-6, -8, 5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -2, 4, 0, Math.PI * 2);
    ctx.arc(6, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-5, -1, 2, 0, Math.PI * 2);
    ctx.arc(7, -1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#660011';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 6, 5, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();
  }

  drawHpBar(ctx: CanvasRenderingContext2D, scale: number): void {
    const w = 40 * scale;
    const h = 5 * scale;
    const x = this.x - w / 2;
    const y = this.y - this.radius - 14 * scale;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#330011';
    ctx.fillRect(x, y, w, h);
    const pct = Math.max(0, this.hp / this.maxHp);
    const hpGrad = ctx.createLinearGradient(x, y, x, y + h);
    hpGrad.addColorStop(0, '#ff4455');
    hpGrad.addColorStop(1, '#cc2233');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(x, y, w * pct, h);
  }
}
