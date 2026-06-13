import { Renderer } from './Renderer';
import { Platform, CelestialBody } from './Platform';
import { ParticleSystem } from './ParticleSystem';

export interface CollisionResult {
  body: CelestialBody;
  hitX: number;
  hitY: number;
}

export class Ball {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  radius = 6;
  active = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;
  private isDragging = false;
  private shimmerPhase = 0;
  private trailTimer = 0;
  launchX: number;
  launchY: number;

  constructor(launchX: number, launchY: number) {
    this.x = launchX;
    this.y = launchY;
    this.launchX = launchX;
    this.launchY = launchY;
  }

  updateLaunchPos(x: number, y: number) {
    this.launchX = x;
    this.launchY = y;
    if (!this.active && !this.isDragging) {
      this.x = x;
      this.y = y;
    }
  }

  onPointerDown(px: number, py: number): boolean {
    if (this.active) return false;
    const dx = px - this.x;
    const dy = py - this.y;
    if (dx * dx + dy * dy < 900) {
      this.isDragging = true;
      this.dragStart = { x: px, y: py };
      this.dragCurrent = { x: px, y: py };
      return true;
    }
    return false;
  }

  onPointerMove(px: number, py: number) {
    if (this.isDragging) {
      this.dragCurrent = { x: px, y: py };
    }
  }

  onPointerUp(): boolean {
    if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
      this.isDragging = false;
      return false;
    }

    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.isDragging = false;
      this.dragStart = null;
      this.dragCurrent = null;
      return false;
    }

    const power = Math.min(dist * 3, 800);
    const angle = Math.atan2(dy, dx);
    this.vx = Math.cos(angle) * power;
    this.vy = Math.sin(angle) * power;
    this.active = true;
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    return true;
  }

  update(dt: number, platform: Platform, particles: ParticleSystem): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    if (!this.active) {
      this.shimmerPhase += dt * 4;
      return collisions;
    }

    this.shimmerPhase += dt * 8;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vy += 30 * dt;

    this.trailTimer += dt;
    if (this.trailTimer > 0.02) {
      this.trailTimer = 0;
      particles.emitTrail(this.x, this.y, this.vx, this.vy);
    }

    const bodies = platform.getBodies();
    for (const body of bodies) {
      const dx = this.x - body.x;
      const dy = this.y - body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = this.radius + body.radius;

      if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        const dot = this.vx * nx + this.vy * ny;
        if (dot < 0) {
          this.vx -= 2 * dot * nx;
          this.vy -= 2 * dot * ny;

          this.vx *= 0.85;
          this.vy *= 0.85;

          const overlap = minDist - dist;
          this.x += nx * overlap;
          this.y += ny * overlap;

          body.hits++;
          const hitX = body.x + nx * body.radius;
          const hitY = body.y + ny * body.radius;

          particles.emitExplosion(
            hitX, hitY,
            body.color.r, body.color.g, body.color.b,
            30 + Math.floor(Math.random() * 20)
          );
          particles.emitShockWave(hitX, hitY, `rgba(${body.color.r},${body.color.g},${body.color.b},0.7)`);

          if (body.type === 'meteorite') {
            platform.hitMeteorite(body);
            particles.emitCollectDots(hitX, hitY, 3);
          }

          if (body.type === 'planet' && body.hits >= body.maxHits) {
            platform.destroyPlanet(body);
            particles.emitExplosion(body.x, body.y, body.color.r, body.color.g, body.color.b, 50);
            particles.emitShockWave(body.x, body.y, `rgba(${body.color.r},${body.color.g},${body.color.b},1)`);
          }

          collisions.push({ body, hitX, hitY });
        }
      }
    }

    return collisions;
  }

  isOutOfBounds(width: number, height: number): boolean {
    const margin = 50;
    return this.x < -margin || this.x > width + margin ||
           this.y < -margin || this.y > height + margin;
  }

  reset() {
    this.x = this.launchX;
    this.y = this.launchY;
    this.vx = 0;
    this.vy = 0;
    this.active = false;
  }

  draw(renderer: Renderer, particles: ParticleSystem) {
    const ctx = renderer.ctx;

    if (this.isDragging && this.dragStart && this.dragCurrent) {
      this.drawAimingUI(ctx);
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    renderer.setAdditiveBlend();
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
    glowGrad.addColorStop(0, 'rgba(180,200,255,0.4)');
    glowGrad.addColorStop(1, 'rgba(100,140,255,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    renderer.setNormalBlend();

    const shimmer = 0.7 + 0.3 * Math.sin(this.shimmerPhase);
    const ballGrad = ctx.createRadialGradient(-2, -2, 0, 0, 0, this.radius);
    ballGrad.addColorStop(0, `rgba(220,230,255,${shimmer})`);
    ballGrad.addColorStop(0.5, `rgba(150,180,255,${shimmer * 0.8})`);
    ballGrad.addColorStop(1, `rgba(80,120,220,${shimmer * 0.5})`);
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawAimingUI(ctx: CanvasRenderingContext2D) {
    if (!this.dragStart || !this.dragCurrent) return;

    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const power = Math.min(dist * 3, 800);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    ctx.beginPath();
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps * 0.5;
      const px = this.x + Math.cos(angle) * power * t;
      const py = this.y + Math.sin(angle) * power * t + 30 * t * t * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const endT = 0.5;
    const endX = this.x + Math.cos(angle) * power * endT;
    const endY = this.y + Math.sin(angle) * power * endT + 30 * endT * endT * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x - 10, this.y);
    ctx.lineTo(this.x + 10, this.y);
    ctx.moveTo(this.x, this.y - 10);
    ctx.lineTo(this.x, this.y + 10);
    ctx.stroke();

    ctx.restore();
  }
}
