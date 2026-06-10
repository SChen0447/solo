import { Totem, TotemData, ColorRGB } from './Totem';

export interface CollisionSpot {
  x: number;
  y: number;
  time: number;
  colorA: ColorRGB;
  colorB: ColorRGB;
}

export interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: ColorRGB;
}

export interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  maxRadius: number;
}

export interface TotemManagerState {
  totems: TotemData[];
  collisionSpots: CollisionSpot[];
  deathParticles: DeathParticle[];
  clickRipples: ClickRipple[];
  forestParticles: ForestParticle[];
}

export interface ForestParticle {
  x: number;
  y: number;
  size: number;
  baseY: number;
  phase: number;
  speed: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

export class TotemManager {
  private totems: Totem[] = [];
  private collisionSpots: CollisionSpot[] = [];
  private deathParticles: DeathParticle[] = [];
  private clickRipples: ClickRipple[] = [];
  private forestParticles: ForestParticle[] = [];
  private draggingTotem: Totem | null = null;
  private lastTime: number = 0;
  private width: number = 800;
  private height: number = 600;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private prevWidth: number = 800;
  private prevHeight: number = 600;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.prevWidth = width;
    this.prevHeight = height;
    this.initForestParticles();
  }

  private initForestParticles(): void {
    this.forestParticles = [];
    for (let i = 0; i < 150; i++) {
      this.forestParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        baseY: Math.random() * this.height,
        phase: Math.random() * Math.PI * 2,
        speed: 10 + Math.random() * 20,
        alpha: 0.3 + Math.random() * 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 2
      });
    }
  }

  resize(width: number, height: number): void {
    const scaleX = width / this.prevWidth;
    const scaleY = height / this.prevHeight;
    for (const t of this.totems) {
      t.data.x *= scaleX;
      t.data.y *= scaleY;
      t.data.baseRadius *= Math.min(scaleX, scaleY);
    }
    this.prevWidth = width;
    this.prevHeight = height;
    this.width = width;
    this.height = height;
    this.initForestParticles();
  }

  setMousePos(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    for (const t of this.totems) {
      t.data.isHovered = t.containsPoint(x, y);
    }
  }

  handleLeftClick(x: number, y: number): void {
    this.addClickRipple(x, y);
    if (this.totems.length < 50) {
      const newTotem = new Totem(x, y);
      this.totems.push(newTotem);
      this.draggingTotem = newTotem;
    }
  }

  handleLeftDrag(x: number, y: number): void {
    if (this.draggingTotem) {
      this.draggingTotem.data.x = x;
      this.draggingTotem.data.y = y;
    }
  }

  handleLeftRelease(): void {
    this.draggingTotem = null;
  }

  handleRightClick(x: number, y: number): boolean {
    for (let i = this.totems.length - 1; i >= 0; i--) {
      if (this.totems[i].containsPoint(x, y)) {
        const t = this.totems[i];
        t.markForDeath();
        this.deathParticles.push(...t.getDeathParticles());
        this.addClickRipple(x, y);
        if (this.draggingTotem === t) {
          this.draggingTotem = null;
        }
        return true;
      }
    }
    return false;
  }

  private addClickRipple(x: number, y: number): void {
    this.clickRipples.push({
      x,
      y,
      radius: 5,
      alpha: 0.8,
      maxRadius: 60
    });
  }

  update(time: number): TotemManagerState {
    const dt = this.lastTime === 0 ? 1 / 60 : Math.min(0.05, time - this.lastTime);
    this.lastTime = time;

    for (const t of this.totems) {
      t.update(dt, time);
      t.endCollision();
    }

    for (let i = 0; i < this.totems.length; i++) {
      for (let j = i + 1; j < this.totems.length; j++) {
        if (this.totems[i].data.isDying || this.totems[j].data.isDying) continue;
        const collided = this.totems[i].transferEnergyWith(this.totems[j], dt);
        if (collided) {
          const midX = (this.totems[i].data.x + this.totems[j].data.x) / 2;
          const midY = (this.totems[i].data.y + this.totems[j].data.y) / 2;
          const existing = this.collisionSpots.find(
            (s) =>
              Math.abs(s.x - midX) < 5 &&
              Math.abs(s.y - midY) < 5 &&
              time - s.time < 0.1
          );
          if (!existing) {
            this.collisionSpots.push({
              x: midX,
              y: midY,
              time,
              colorA: { ...this.totems[i].data.color },
              colorB: { ...this.totems[j].data.color }
            });
          }
        }
      }
    }

    this.collisionSpots = this.collisionSpots.filter((s) => time - s.time < 2);

    for (const p of this.deathParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt / 0.5;
    }
    this.deathParticles = this.deathParticles.filter((p) => p.life > 0);

    for (const r of this.clickRipples) {
      r.radius += (r.maxRadius - r.radius) * dt * 8;
      r.alpha -= dt * 3;
    }
    this.clickRipples = this.clickRipples.filter((r) => r.alpha > 0);

    const influenceX = (this.mouseX / this.width - 0.5) * 2;
    const influenceY = (this.mouseY / this.height - 0.5) * 2;
    for (const fp of this.forestParticles) {
      fp.phase += dt * 0.5;
      fp.y -= fp.speed * dt;
      fp.x += Math.sin(fp.phase) * 10 * dt + influenceX * 15 * dt;
      fp.y += influenceY * 10 * dt;
      fp.rotation += fp.rotSpeed * dt;
      if (fp.y < -10) {
        fp.y = this.height + 10;
        fp.x = Math.random() * this.width;
      }
      if (fp.x < -10) fp.x = this.width + 10;
      if (fp.x > this.width + 10) fp.x = -10;
    }

    this.totems = this.totems.filter((t) => !t.isDead());

    return {
      totems: this.totems.map((t) => ({ ...t.data })),
      collisionSpots: [...this.collisionSpots],
      deathParticles: [...this.deathParticles],
      clickRipples: [...this.clickRipples],
      forestParticles: [...this.forestParticles]
    };
  }

  getTotemAt(x: number, y: number): TotemData | null {
    for (let i = this.totems.length - 1; i >= 0; i--) {
      if (this.totems[i].containsPoint(x, y) && !this.totems[i].data.isDying) {
        return { ...this.totems[i].data };
      }
    }
    return null;
  }

  getTotemCount(): number {
    return this.totems.filter((t) => !t.data.isDying).length;
  }
}
