import { Trail } from './trail';

export interface BlackHoleState {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  vx: number;
  vy: number;
  breathPhase: number;
  flashFrames: number;
  absorbed: number;
}

export class BlackHole {
  state: BlackHoleState;
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly DRIFT_SPEED = 1.5;
  private readonly BREATH_PERIOD = 2000;
  private readonly BREATH_AMPLITUDE = 2;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = this.createHole();
  }

  private createHole(): BlackHoleState {
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    switch (side) {
      case 0:
        x = Math.random() * this.canvasWidth;
        y = -30;
        break;
      case 1:
        x = this.canvasWidth + 30;
        y = Math.random() * this.canvasHeight;
        break;
      case 2:
        x = Math.random() * this.canvasWidth;
        y = this.canvasHeight + 30;
        break;
      case 3:
        x = -30;
        y = Math.random() * this.canvasHeight;
        break;
    }

    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const dx = centerX - x;
    const dy = centerY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const baseRadius = 6 + Math.random() * 9;

    return {
      x,
      y,
      baseRadius,
      currentRadius: baseRadius,
      vx: (dx / dist) * this.DRIFT_SPEED,
      vy: (dy / dist) * this.DRIFT_SPEED,
      breathPhase: Math.random() * Math.PI * 2,
      flashFrames: 0,
      absorbed: 0
    };
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 16.67;

    this.state.x += this.state.vx * dt;
    this.state.y += this.state.vy * dt;

    this.state.breathPhase += (deltaTime / this.BREATH_PERIOD) * Math.PI * 2;
    this.state.currentRadius =
      this.state.baseRadius +
      Math.sin(this.state.breathPhase) * this.BREATH_AMPLITUDE;

    if (this.state.flashFrames > 0) {
      this.state.flashFrames -= dt;
    }
  }

  checkCollisionWithTrail(trail: Trail): number {
    const absorbed = trail.absorbNearby(
      this.state.x,
      this.state.y,
      this.state.currentRadius
    );
    if (absorbed > 0) {
      this.state.absorbed += absorbed;
      this.state.baseRadius = Math.min(25, this.state.baseRadius + 3);
      this.state.flashFrames = 2;
    }
    return absorbed;
  }

  checkCollisionWithShip(shipX: number, shipY: number): boolean {
    const dx = shipX - this.state.x;
    const dy = shipY - this.state.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.state.currentRadius + 8;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y, currentRadius, flashFrames } = this.state;

    ctx.save();

    const glowRadius = currentRadius * 2.5;
    const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glowGrad.addColorStop(0, 'rgba(26, 11, 46, 0.9)');
    glowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    if (flashFrames > 0) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
    }

    const holeGrad = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    holeGrad.addColorStop(0, '#8e44ad');
    holeGrad.addColorStop(0.3, 'rgba(142, 68, 173, 0.3)');
    holeGrad.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = holeGrad;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(142, 68, 173, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, currentRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class ObstacleManager {
  holes: BlackHole[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL: number = 30000;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    for (const hole of this.holes) {
      hole.resize(canvasWidth, canvasHeight);
    }
  }

  reset(): void {
    this.holes = [];
    this.spawnTimer = 0;
  }

  update(deltaTime: number, trail: Trail, shipX: number, shipY: number): { absorbed: number; shipInHole: boolean } {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.holes.push(new BlackHole(this.canvasWidth, this.canvasHeight));
      this.holes.push(new BlackHole(this.canvasWidth, this.canvasHeight));
    }

    let totalAbsorbed = 0;
    let shipInHole = false;

    for (let i = this.holes.length - 1; i >= 0; i--) {
      const hole = this.holes[i];
      hole.update(deltaTime);
      totalAbsorbed += hole.checkCollisionWithTrail(trail);
      if (hole.checkCollisionWithShip(shipX, shipY)) {
        shipInHole = true;
      }

      if (
        hole.state.x < -100 ||
        hole.state.x > this.canvasWidth + 100 ||
        hole.state.y < -100 ||
        hole.state.y > this.canvasHeight + 100
      ) {
        this.holes.splice(i, 1);
      }
    }

    return { absorbed: totalAbsorbed, shipInHole };
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const hole of this.holes) {
      hole.render(ctx);
    }
  }
}
