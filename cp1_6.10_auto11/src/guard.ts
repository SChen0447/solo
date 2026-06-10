import { LightingSystem } from './lighting';

export type GuardState = 'patrol' | 'suspicious' | 'chase' | 'investigate' | 'alert';

export interface PatrolPoint {
  x: number;
  y: number;
}

export class Guard {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  width: number = 28;
  height: number = 44;
  facing: number = 1;

  state: GuardState = 'patrol';
  stateTimer: number = 0;
  baseSpeed: number = 60;
  chaseSpeed: number = 140;
  alertSpeed: number = 120;

  patrolPoints: PatrolPoint[];
  currentPatrolIndex: number = 0;
  viewDistance: number = 200;
  viewAngle: number = Math.PI / 3;

  investigateTarget: { x: number; y: number } | null = null;
  exclamationTimer: number = 0;
  alertTimer: number = 0;
  isAlert: boolean = false;

  constructor(patrolPoints: PatrolPoint[]) {
    this.patrolPoints = patrolPoints;
    this.x = patrolPoints[0].x;
    this.y = patrolPoints[0].y;
  }

  update(dt: number, playerX: number, playerY: number, playerInShadow: boolean, lighting: LightingSystem): void {
    if (this.isAlert) {
      this.alertTimer -= dt;
      if (this.alertTimer <= 0) {
        this.isAlert = false;
      }
    }

    const speedMultiplier = this.isAlert ? 2 : 1;
    const viewMultiplier = this.isAlert ? 1.2 : (playerInShadow ? 0.5 : 1);
    const effectiveViewDistance = this.viewDistance * viewMultiplier;

    const canSeePlayer = this.checkLineOfSight(playerX, playerY, effectiveViewDistance, lighting);

    if (this.stateTimer > 0) {
      this.stateTimer -= dt;
    }
    if (this.exclamationTimer > 0) {
      this.exclamationTimer -= dt;
    }

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(dt, speedMultiplier);
        if (canSeePlayer && !playerInShadow) {
          this.state = 'chase';
          this.exclamationTimer = 1.5;
        } else if (canSeePlayer && playerInShadow) {
          this.state = 'suspicious';
          this.stateTimer = 1.5;
        }
        break;

      case 'suspicious':
        this.vx = 0;
        this.vy = 0;
        if (canSeePlayer && !playerInShadow) {
          this.state = 'chase';
          this.exclamationTimer = 1.5;
        } else if (this.stateTimer <= 0) {
          this.state = 'patrol';
        }
        break;

      case 'chase':
        this.updateChase(dt, playerX, playerY);
        if (!canSeePlayer) {
          this.state = 'investigate';
          this.investigateTarget = { x: playerX, y: playerY };
          this.stateTimer = 3;
        }
        break;

      case 'investigate':
        this.updateInvestigate(dt, speedMultiplier);
        if (canSeePlayer && !playerInShadow) {
          this.state = 'chase';
          this.exclamationTimer = 1.5;
        }
        if (this.stateTimer <= 0) {
          this.state = 'patrol';
          this.investigateTarget = null;
        }
        break;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.vx !== 0) {
      this.facing = this.vx > 0 ? 1 : -1;
    }
  }

  goInvestigate(x: number, y: number): void {
    if (this.state === 'chase') return;
    this.state = 'investigate';
    this.investigateTarget = { x, y };
    this.stateTimer = 5;
  }

  triggerAlert(): void {
    this.isAlert = true;
    this.alertTimer = 15;
  }

  private checkLineOfSight(px: number, py: number, maxDist: number, lighting: LightingSystem): boolean {
    const dx = px - this.x;
    const dy = py - (this.y - this.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDist) return false;

    const angleTo = Math.atan2(dy, dx);
    const facingAngle = this.facing > 0 ? 0 : Math.PI;
    let angleDiff = angleTo - facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) > this.viewAngle / 2) return false;

    return true;
  }

  private updatePatrol(dt: number, speedMultiplier: number): void {
    const target = this.patrolPoints[this.currentPatrolIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const speed = this.baseSpeed * speedMultiplier;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  private updateChase(dt: number, playerX: number, playerY: number): void {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const speed = this.isAlert ? this.chaseSpeed * 1.2 : this.chaseSpeed;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  private updateInvestigate(dt: number, speedMultiplier: number): void {
    if (!this.investigateTarget) {
      this.state = 'patrol';
      return;
    }

    const dx = this.investigateTarget.x - this.x;
    const dy = this.investigateTarget.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      this.vx = 0;
      this.vy = 0;
      return;
    }

    const speed = this.baseSpeed * 1.5 * speedMultiplier;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }

  getViewCone(): { x: number; y: number; angle: number; spread: number; range: number; inShadow: boolean } {
    const facingAngle = this.facing > 0 ? 0 : Math.PI;
    return {
      x: this.x,
      y: this.y - this.height / 2,
      angle: facingAngle,
      spread: this.viewAngle * (this.isAlert ? 1.2 : 1),
      range: this.viewDistance * (this.isAlert ? 1.2 : 1),
      inShadow: false
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderViewCone(ctx);
    this.renderPatrolPath(ctx);
    this.renderGuard(ctx);
    if (this.exclamationTimer > 0) {
      this.renderExclamation(ctx);
    }
  }

  private renderViewCone(ctx: CanvasRenderingContext2D): void {
    const cone = this.getViewCone();
    const color = this.state === 'chase' ? 'rgba(255, 80, 80, 0.3)' :
                  this.state === 'suspicious' ? 'rgba(255, 200, 80, 0.25)' :
                  this.isAlert ? 'rgba(255, 120, 80, 0.3)' :
                  'rgba(255, 255, 100, 0.2)';

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cone.x, cone.y);
    ctx.arc(cone.x, cone.y, cone.range, cone.angle - cone.spread / 2, cone.angle + cone.spread / 2);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = this.state === 'chase' ? 'rgba(255, 80, 80, 0.6)' : 'rgba(255, 255, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private renderPatrolPath(ctx: CanvasRenderingContext2D): void {
    if (this.patrolPoints.length < 2) return;

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.patrolPoints[0].x, this.patrolPoints[0].y);
    for (let i = 1; i < this.patrolPoints.length; i++) {
      ctx.lineTo(this.patrolPoints[i].x, this.patrolPoints[i].y);
    }
    ctx.lineTo(this.patrolPoints[0].x, this.patrolPoints[0].y);
    ctx.stroke();
    ctx.restore();
  }

  private renderGuard(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    ctx.fillStyle = '#4A4A5A';
    ctx.fillRect(-14, -44, 28, 30);

    ctx.fillStyle = '#6A6A7A';
    ctx.fillRect(-12, -42, 24, 8);
    ctx.fillRect(-12, -30, 24, 8);
    ctx.fillRect(-12, -18, 24, 4);

    ctx.fillStyle = '#5A5A6A';
    ctx.beginPath();
    ctx.arc(0, -50, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A2A';
    ctx.fillRect(-8, -54, 16, 6);
    ctx.fillStyle = '#FF3333';
    ctx.fillRect(-6, -53, 4, 3);
    ctx.fillRect(2, -53, 4, 3);

    ctx.fillStyle = '#3A3A4A';
    ctx.fillRect(-10, -14, 8, 14);
    ctx.fillRect(2, -14, 8, 14);

    ctx.fillStyle = '#2A2A3A';
    ctx.fillRect(10, -38, 5, 20);
    ctx.fillStyle = '#C0C0D0';
    ctx.fillRect(11, -50, 3, 15);

    ctx.restore();
  }

  private renderExclamation(ctx: CanvasRenderingContext2D): void {
    const bounce = Math.sin(performance.now() / 100) * 3;
    ctx.save();
    ctx.font = 'bold 24px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.state === 'chase' ? '#FF4444' : '#FFAA00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('!', this.x, this.y - 65 + bounce);
    ctx.fillText('!', this.x, this.y - 65 + bounce);
    ctx.restore();
  }

  isCollidingWithPlayer(px: number, py: number, pw: number, ph: number): boolean {
    return this.x - this.width / 2 < px + pw / 2 &&
           this.x + this.width / 2 > px - pw / 2 &&
           this.y - this.height < py &&
           this.y > py - ph;
  }
}
