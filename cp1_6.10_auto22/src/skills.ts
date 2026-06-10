import { SkillType } from './trajectory';

export interface Vec2 {
  x: number;
  y: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;

  constructor(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.alpha = 1;
  }

  update(dt: number): boolean {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.alpha = Math.max(0, this.life / this.maxLife);
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    grad.addColorStop(0, this.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class DamageNumber {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  value: number;
  color: string;

  constructor(x: number, y: number, value: number, color: string) {
    this.x = x;
    this.y = y;
    this.vy = -40;
    this.life = 1;
    this.maxLife = 1;
    this.value = value;
    this.color = color;
  }

  update(dt: number): boolean {
    this.life -= dt;
    this.y += this.vy * dt;
    this.vy *= 0.96;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D, scale: number): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.font = `bold ${20 * scale}px 'Courier New', Consolas, monospace`;
    ctx.textAlign = 'center';
    const text = `+${this.value}`;
    ctx.strokeText(text, this.x, this.y);
    ctx.fillText(text, this.x, this.y);
    ctx.restore();
  }
}

export class TrajectoryTrail {
  points: { x: number; y: number; life: number; maxLife: number }[] = [];

  addPoint(x: number, y: number): void {
    this.points.push({ x, y, life: 0.5, maxLife: 0.5 });
  }

  update(dt: number): void {
    for (const p of this.points) {
      p.life -= dt;
    }
    this.points = this.points.filter(p => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      const alpha = (curr.life / curr.maxLife) * 0.9;
      const grad = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
      grad.addColorStop(0, `rgba(255,255,255,${(prev.life / prev.maxLife) * 0.9})`);
      grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
  }
}

export class ScreenFlash {
  color: string;
  life: number;
  maxLife: number;

  constructor(color: string) {
    this.color = color;
    this.life = 0.3;
    this.maxLife = 0.3;
  }

  update(dt: number): boolean {
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const t = this.life / this.maxLife;
    const alpha = t * 0.5;
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.8);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.6, this.color.replace('1)', `${alpha * 0.8})`));
    grad.addColorStop(1, this.color.replace('1)', `${alpha})`));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

export abstract class Skill {
  type: SkillType;
  name: string;
  iconColor: string;
  flashColor: string;
  cooldown: number;
  currentCooldown: number = 0;
  active: boolean = false;
  duration: number;
  elapsed: number = 0;

  constructor(type: SkillType, name: string, iconColor: string, flashColor: string, cooldown: number, duration: number) {
    this.type = type;
    this.name = name;
    this.iconColor = iconColor;
    this.flashColor = flashColor;
    this.cooldown = cooldown;
    this.duration = duration;
  }

  isReady(): boolean {
    return this.currentCooldown <= 0;
  }

  getCooldownPercent(): number {
    return this.currentCooldown > 0 ? this.currentCooldown / this.cooldown : 0;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) {
      this.currentCooldown = Math.max(0, this.currentCooldown - dt);
    }
    if (this.active) {
      this.elapsed += dt;
      if (this.elapsed >= this.duration) {
        this.active = false;
      }
    }
  }

  activate(): void {
    if (!this.isReady()) return;
    this.currentCooldown = this.cooldown;
    this.active = true;
    this.elapsed = 0;
    this.onActivate();
  }

  protected abstract onActivate(): void;
  abstract updateEffect(dt: number, caster: Vec2, targetX: number, targetY: number, entities: any[]): boolean;
  abstract drawEffect(ctx: CanvasRenderingContext2D, caster: Vec2): void;
  abstract getParticles(): Particle[];
  abstract getDamageNumbers(): DamageNumber[];
}

export class FireballSkill extends Skill {
  phase: 'charge' | 'fire' = 'charge';
  angle: number = 0;
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];
  fired: boolean = false;
  projectileX: number = 0;
  projectileY: number = 0;
  projectileVx: number = 0;
  projectileVy: number = 0;
  hitEntities: Set<any> = new Set();
  casterPos: Vec2 = { x: 0, y: 0 };

  constructor() {
    super('fireball', '火球术', '#ff4500', 'rgba(255,80,0,1)', 5, 1.5);
  }

  protected onActivate(): void {
    this.phase = 'charge';
    this.fired = false;
    this.hitEntities.clear();
    this.particles = [];
  }

  updateEffect(dt: number, caster: Vec2, _targetX: number, _targetY: number, entities: any[]): boolean {
    this.casterPos = { ...caster };
    if (this.phase === 'charge') {
      this.angle += dt * 6;
      for (let i = 0; i < 4; i++) {
        const ang = this.angle + (i * Math.PI) / 2;
        const r = 50 + Math.sin(this.elapsed * 10 + i) * 10;
        const px = caster.x + Math.cos(ang) * r;
        const py = caster.y + Math.sin(ang) * r;
        const col = Math.random() > 0.5 ? '#ff6600' : '#ffcc00';
        this.particles.push(new Particle(px, py, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0.4, 8 + Math.random() * 6, col));
      }
      if (this.elapsed >= 1.2) {
        this.phase = 'fire';
        this.fired = true;
        this.projectileX = caster.x;
        this.projectileY = caster.y;
        this.projectileVx = 400;
        this.projectileVy = 0;
      }
    } else if (this.phase === 'fire') {
      this.projectileX += this.projectileVx * dt;
      this.projectileY += this.projectileVy * dt;
      for (let i = 0; i < 3; i++) {
        const col = Math.random() > 0.5 ? '#ff6600' : '#ff3300';
        this.particles.push(new Particle(
          this.projectileX + (Math.random() - 0.5) * 20,
          this.projectileY + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          0.5,
          6 + Math.random() * 6,
          col
        ));
      }
      for (const ent of entities) {
        if (this.hitEntities.has(ent)) continue;
        const dx = this.projectileX - ent.x;
        const dy = this.projectileY - ent.y;
        if (dx * dx + dy * dy < 50 * 50) {
          ent.takeDamage(20);
          this.hitEntities.add(ent);
          this.damageNumbers.push(new DamageNumber(ent.x, ent.y - 20, 20, '#ffcc00'));
          for (let i = 0; i < 15; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 120;
            this.particles.push(new Particle(ent.x, ent.y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.6, 5 + Math.random() * 5, '#ff8800'));
          }
        }
      }
    }
    this.particles = this.particles.filter(p => p.update(dt));
    this.damageNumbers = this.damageNumbers.filter(d => d.update(dt));
    return this.active;
  }

  drawEffect(ctx: CanvasRenderingContext2D, caster: Vec2): void {
    if (this.phase === 'charge') {
      for (let i = 0; i < 4; i++) {
        const ang = this.angle + (i * Math.PI) / 2;
        const r = 50 + Math.sin(this.elapsed * 10 + i) * 10;
        const px = caster.x + Math.cos(ang) * r;
        const py = caster.y + Math.sin(ang) * r;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 20);
        grad.addColorStop(0, 'rgba(255,220,0,0.9)');
        grad.addColorStop(0.5, 'rgba(255,100,0,0.6)');
        grad.addColorStop(1, 'rgba(255,50,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.phase === 'fire') {
      const grad = ctx.createRadialGradient(this.projectileX, this.projectileY, 0, this.projectileX, this.projectileY, 35);
      grad.addColorStop(0, 'rgba(255,255,200,1)');
      grad.addColorStop(0.3, 'rgba(255,180,0,0.9)');
      grad.addColorStop(0.7, 'rgba(255,80,0,0.6)');
      grad.addColorStop(1, 'rgba(255,30,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.projectileX, this.projectileY, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of this.particles) p.draw(ctx);
  }

  getParticles(): Particle[] { return this.particles; }
  getDamageNumbers(): DamageNumber[] { return this.damageNumbers; }
}

export class LightningSkill extends Skill {
  bolts: { x1: number; y1: number; x2: number; y2: number; life: number }[] = [];
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];
  hitEntities: Set<any> = new Set();
  chainCount: number = 0;
  maxChains: number = 3;

  constructor() {
    super('lightning', '闪电链', '#00aaff', 'rgba(0,170,255,1)', 5, 0.8);
  }

  protected onActivate(): void {
    this.bolts = [];
    this.particles = [];
    this.damageNumbers = [];
    this.hitEntities.clear();
    this.chainCount = 0;
  }

  updateEffect(dt: number, caster: Vec2, _targetX: number, _targetY: number, entities: any[]): boolean {
    if (this.elapsed < 0.05 && this.chainCount === 0) {
      this.fireChain(caster, entities);
    }
    for (const b of this.bolts) b.life -= dt;
    this.bolts = this.bolts.filter(b => b.life > 0);
    this.particles = this.particles.filter(p => p.update(dt));
    this.damageNumbers = this.damageNumbers.filter(d => d.update(dt));
    return this.active;
  }

  private fireChain(start: Vec2, entities: any[]): void {
    let from: Vec2 = { ...start };
    from.x += 20;
    from.y -= 10;
    let remaining = this.maxChains;
    while (remaining > 0) {
      let nearest: any = null;
      let nearestDist = Infinity;
      for (const ent of entities) {
        if (this.hitEntities.has(ent)) continue;
        const dx = ent.x - from.x;
        const dy = ent.y - from.y;
        const d = dx * dx + dy * dy;
        if (d < nearestDist) {
          nearestDist = d;
          nearest = ent;
        }
      }
      if (!nearest || nearestDist > 350 * 350) break;
      this.generateBolt(from, { x: nearest.x, y: nearest.y });
      nearest.takeDamage(20);
      this.hitEntities.add(nearest);
      this.damageNumbers.push(new DamageNumber(nearest.x, nearest.y - 20, 20, '#00ddff'));
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 100;
        this.particles.push(new Particle(nearest.x, nearest.y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.4, 4 + Math.random() * 4, '#00ddff'));
      }
      from = { x: nearest.x, y: nearest.y };
      remaining--;
      this.chainCount++;
    }
  }

  private generateBolt(from: Vec2, to: Vec2): void {
    const segments = 6;
    let prev = { ...from };
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const baseX = from.x + (to.x - from.x) * t;
      const baseY = from.y + (to.y - from.y) * t;
      const offset = (i === segments) ? 0 : (Math.random() - 0.5) * 30;
      const offsetY = (i === segments) ? 0 : (Math.random() - 0.5) * 30;
      this.bolts.push({ x1: prev.x, y1: prev.y, x2: baseX + offset, y2: baseY + offsetY, life: 0.25 });
      prev = { x: baseX + offset, y: baseY + offsetY };
    }
  }

  drawEffect(ctx: CanvasRenderingContext2D, _caster: Vec2): void {
    for (const b of this.bolts) {
      const alpha = Math.min(1, b.life / 0.25);
      ctx.strokeStyle = `rgba(100,220,255,${alpha})`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    for (const p of this.particles) p.draw(ctx);
  }

  getParticles(): Particle[] { return this.particles; }
  getDamageNumbers(): DamageNumber[] { return this.damageNumbers; }
}

export class DashSkill extends Skill {
  startX: number = 0;
  startY: number = 0;
  endX: number = 0;
  endY: number = 0;
  afterimages: { x: number; y: number; life: number }[] = [];
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];
  hitEntities: Set<any> = new Set();

  constructor() {
    super('dash', '突进斩', '#ffdd00', 'rgba(255,221,0,1)', 5, 0.4);
  }

  protected onActivate(): void {
    this.afterimages = [];
    this.particles = [];
    this.damageNumbers = [];
    this.hitEntities.clear();
  }

  getCurrentPos(caster: Vec2): Vec2 {
    const t = Math.min(1, this.elapsed / this.duration);
    return { x: this.startX + (this.endX - this.startX) * t, y: this.startY + (this.endY - this.startY) * t };
  }

  setStartEnd(caster: Vec2): void {
    this.startX = caster.x;
    this.startY = caster.y;
    this.endX = caster.x + 250;
    this.endY = caster.y;
  }

  updateEffect(dt: number, caster: Vec2, _targetX: number, _targetY: number, entities: any[]): boolean {
    if (this.elapsed < dt && this.startX === 0) {
      this.setStartEnd(caster);
    }
    if (this.active && Math.random() > 0.3) {
      const pos = this.getCurrentPos(caster);
      this.afterimages.push({ x: pos.x, y: pos.y, life: 0.3 });
    }
    for (const a of this.afterimages) a.life -= dt;
    this.afterimages = this.afterimages.filter(a => a.life > 0);
    const curPos = this.getCurrentPos(caster);
    for (const ent of entities) {
      if (this.hitEntities.has(ent)) continue;
      const dx = curPos.x - ent.x;
      const dy = curPos.y - ent.y;
      if (dx * dx + dy * dy < 55 * 55) {
        ent.takeDamage(20);
        this.hitEntities.add(ent);
        this.damageNumbers.push(new DamageNumber(ent.x, ent.y - 20, 20, '#ffdd00'));
        for (let i = 0; i < 10; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 50 + Math.random() * 100;
          this.particles.push(new Particle(ent.x, ent.y, Math.cos(ang) * spd, Math.sin(ang) * spd, 0.5, 4 + Math.random() * 4, '#ffdd00'));
        }
      }
    }
    this.particles = this.particles.filter(p => p.update(dt));
    this.damageNumbers = this.damageNumbers.filter(d => d.update(dt));
    return this.active;
  }

  drawEffect(ctx: CanvasRenderingContext2D, caster: Vec2): void {
    for (const a of this.afterimages) {
      const alpha = a.life / 0.3 * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffdd00';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y, 18, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const pos = this.getCurrentPos(caster);
    ctx.strokeStyle = 'rgba(255,255,200,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pos.x - 30, pos.y);
    ctx.lineTo(pos.x + 30, pos.y);
    ctx.stroke();
    for (const p of this.particles) p.draw(ctx);
  }

  getParticles(): Particle[] { return this.particles; }
  getDamageNumbers(): DamageNumber[] { return this.damageNumbers; }
}

export class ShieldSkill extends Skill {
  shieldActive: boolean = false;
  particles: Particle[] = [];
  damageNumbers: DamageNumber[] = [];
  canReflect: boolean = true;

  constructor() {
    super('shield', '护盾', '#4488ff', 'rgba(68,136,255,1)', 5, 2);
  }

  protected onActivate(): void {
    this.shieldActive = true;
    this.particles = [];
    this.damageNumbers = [];
    this.canReflect = true;
  }

  updateEffect(dt: number, _caster: Vec2, _targetX: number, _targetY: number, _entities: any[]): boolean {
    for (let i = 0; i < 2; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = 70 + Math.random() * 10;
      this.particles.push(new Particle(
        _caster.x + Math.cos(ang) * r,
        _caster.y + Math.sin(ang) * r,
        -Math.cos(ang) * 10,
        -Math.sin(ang) * 10,
        0.5,
        3 + Math.random() * 3,
        '#66aaff'
      ));
    }
    this.particles = this.particles.filter(p => p.update(dt));
    this.damageNumbers = this.damageNumbers.filter(d => d.update(dt));
    this.shieldActive = this.active;
    return this.active;
  }

  drawEffect(ctx: CanvasRenderingContext2D, caster: Vec2): void {
    if (!this.shieldActive) return;
    const sides = 6;
    const r = 75;
    ctx.save();
    ctx.translate(caster.x, caster.y);
    ctx.rotate(this.elapsed * 0.5);
    const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
    grad.addColorStop(0, 'rgba(100,180,255,0.1)');
    grad.addColorStop(1, 'rgba(100,180,255,0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    for (const p of this.particles) p.draw(ctx);
  }

  isShieldActive(): boolean {
    return this.shieldActive;
  }

  getParticles(): Particle[] { return this.particles; }
  getDamageNumbers(): DamageNumber[] { return this.damageNumbers; }
}

export class SkillManager {
  fireball: FireballSkill = new FireballSkill();
  lightning: LightningSkill = new LightningSkill();
  dash: DashSkill = new DashSkill();
  shield: ShieldSkill = new ShieldSkill();

  getAllSkills(): Skill[] {
    return [this.fireball, this.lightning, this.dash, this.shield];
  }

  getSkill(type: SkillType): Skill | null {
    switch (type) {
      case 'fireball': return this.fireball;
      case 'lightning': return this.lightning;
      case 'dash': return this.dash;
      case 'shield': return this.shield;
      default: return null;
    }
  }

  activate(type: SkillType): Skill | null {
    const skill = this.getSkill(type);
    if (!skill || !skill.isReady()) return null;
    skill.activate();
    return skill;
  }

  update(dt: number): void {
    for (const s of this.getAllSkills()) s.update(dt);
  }
}
