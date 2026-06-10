import { Vector2, Projectile, Target } from './types';

const PROJECTILE_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d'];
const PROJECTILE_SPEED = 300;
const REFLECTED_SPEED = 450;
const PROJECTILE_RADIUS = 8;
const SPAWN_INTERVAL = 1.5;
const MAX_PROJECTILES = 50;
const MAX_TARGETS = 30;
const MIN_TARGET_RADIUS = 6;
const TARGET_MOVE_AREA = 400;

export class ProjectileManager {
  private projectiles: Projectile[] = [];
  private targets: Target[] = [];
  private nextProjectileId = 0;
  private nextTargetId = 0;
  private spawnTimer = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private center: Vector2;
  private scoreCallback: (points: number) => void;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    center: Vector2,
    scoreCallback: (points: number) => void
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.center = { ...center };
    this.scoreCallback = scoreCallback;
  }

  public resize(canvasWidth: number, canvasHeight: number, center: Vector2): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.center = { ...center };
  }

  public getProjectiles(): Projectile[] {
    return this.projectiles;
  }

  public getTargets(): Target[] {
    return this.targets;
  }

  public reset(): void {
    this.projectiles = [];
    this.targets = [];
    this.spawnTimer = 0;
    this.nextProjectileId = 0;
    this.nextTargetId = 0;
    this.spawnInitialTarget();
  }

  private spawnInitialTarget(): void {
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    const angle = Math.random() * Math.PI * 2;
    const speed = 150;

    this.targets.push({
      id: this.nextTargetId++,
      pos: {
        x: this.center.x + offsetX,
        y: this.center.y + offsetY,
      },
      vel: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      radius: 30,
      blinkPhase: 0,
    });
  }

  private spawnProjectile(): void {
    if (this.projectiles.length >= MAX_PROJECTILES) return;

    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (edge) {
      case 0:
        x = Math.random() * this.canvasWidth;
        y = -PROJECTILE_RADIUS;
        break;
      case 1:
        x = this.canvasWidth + PROJECTILE_RADIUS;
        y = Math.random() * this.canvasHeight;
        break;
      case 2:
        x = Math.random() * this.canvasWidth;
        y = this.canvasHeight + PROJECTILE_RADIUS;
        break;
      default:
        x = -PROJECTILE_RADIUS;
        y = Math.random() * this.canvasHeight;
        break;
    }

    const dx = this.center.x - x;
    const dy = this.center.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.projectiles.push({
      id: this.nextProjectileId++,
      pos: { x, y },
      vel: {
        x: (dx / dist) * PROJECTILE_SPEED,
        y: (dy / dist) * PROJECTILE_SPEED,
      },
      radius: PROJECTILE_RADIUS,
      color: PROJECTILE_COLORS[Math.floor(Math.random() * PROJECTILE_COLORS.length)],
      reflected: false,
      trail: [],
    });
  }

  public reflectProjectile(projectile: Projectile, normal: Vector2): void {
    const dot = projectile.vel.x * normal.x + projectile.vel.y * normal.y;
    projectile.vel.x = projectile.vel.x - 2 * dot * normal.x;
    projectile.vel.y = projectile.vel.y - 2 * dot * normal.y;

    const speed = Math.sqrt(
      projectile.vel.x * projectile.vel.x + projectile.vel.y * projectile.vel.y
    );
    if (speed > 0) {
      projectile.vel.x = (projectile.vel.x / speed) * REFLECTED_SPEED;
      projectile.vel.y = (projectile.vel.y / speed) * REFLECTED_SPEED;
    }

    projectile.reflected = true;
    projectile.color = '#ffffff';
  }

  public update(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnProjectile();
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      p.trail.unshift({ x: p.pos.x, y: p.pos.y });
      if (p.trail.length > 5) {
        p.trail.pop();
      }

      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;

      const margin = 100;
      if (
        p.pos.x < -margin ||
        p.pos.x > this.canvasWidth + margin ||
        p.pos.y < -margin ||
        p.pos.y > this.canvasHeight + margin
      ) {
        this.projectiles.splice(i, 1);
      }
    }

    if (this.targets.length === 0) {
      this.spawnInitialTarget();
    }

    for (const target of this.targets) {
      target.pos.x += target.vel.x * dt;
      target.pos.y += target.vel.y * dt;

      const halfArea = TARGET_MOVE_AREA / 2;
      const minX = this.center.x - halfArea;
      const maxX = this.center.x + halfArea;
      const minY = this.center.y - halfArea;
      const maxY = this.center.y + halfArea;

      if (target.pos.x - target.radius < minX) {
        target.pos.x = minX + target.radius;
        target.vel.x = Math.abs(target.vel.x);
      } else if (target.pos.x + target.radius > maxX) {
        target.pos.x = maxX - target.radius;
        target.vel.x = -Math.abs(target.vel.x);
      }

      if (target.pos.y - target.radius < minY) {
        target.pos.y = minY + target.radius;
        target.vel.y = Math.abs(target.vel.y);
      } else if (target.pos.y + target.radius > maxY) {
        target.pos.y = maxY - target.radius;
        target.vel.y = -Math.abs(target.vel.y);
      }

      target.blinkPhase += dt;
    }

    this.checkProjectileTargetCollisions();
  }

  private checkProjectileTargetCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.reflected) continue;

      for (let j = this.targets.length - 1; j >= 0; j--) {
        const t = this.targets[j];
        const dx = p.pos.x - t.pos.x;
        const dy = p.pos.y - t.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < p.radius + t.radius) {
          this.scoreCallback(10);
          this.projectiles.splice(i, 1);
          this.splitTarget(t, j);
          break;
        }
      }
    }
  }

  private splitTarget(target: Target, index: number): void {
    this.targets.splice(index, 1);

    const newRadius = target.radius * 0.6;
    if (newRadius < MIN_TARGET_RADIUS) return;

    if (this.targets.length >= MAX_TARGETS) return;

    const speed = target.radius === 30 ? 200 : Math.sqrt(target.vel.x * target.vel.x + target.vel.y * target.vel.y) * 1.1;

    for (let i = 0; i < 2; i++) {
      if (this.targets.length >= MAX_TARGETS) break;

      const angle = Math.random() * Math.PI * 2;
      this.targets.push({
        id: this.nextTargetId++,
        pos: {
          x: target.pos.x + (Math.random() - 0.5) * 10,
          y: target.pos.y + (Math.random() - 0.5) * 10,
        },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        radius: newRadius,
        blinkPhase: Math.random(),
      });
    }
  }

  public checkBaseCollision(basePos: Vector2, baseRadius: number): boolean {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.reflected) continue;

      const dx = p.pos.x - basePos.x;
      const dy = p.pos.y - basePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < p.radius + baseRadius) {
        this.projectiles.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const alpha = (1 - i / p.trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(t.x, t.y, p.radius * (1 - i / p.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.reflected ? 15 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const t of this.targets) {
      const blinkOn = Math.floor(t.blinkPhase / 0.2) % 2 === 0;

      ctx.save();
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2);
      ctx.strokeStyle = blinkOn ? '#ff3366' : '#ff6b9d';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, t.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = blinkOn ? '#ff6b9d' : '#ff3366';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(t.pos.x, t.pos.y, t.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = blinkOn ? '#ff3366' : '#ff6b9d';
      ctx.fill();

      ctx.restore();
    }
  }
}
