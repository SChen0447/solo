export type ObstacleType = 'pillar' | 'spike';

export interface ObstacleData {
  type: ObstacleType;
  x: number;
  y: number;
  targetY: number;
  width: number;
  height: number;
  active: boolean;
  warning: boolean;
  warningTimer: number;
  rising: boolean;
  passed: boolean;
  speed: number;
}

export class ObstacleManager {
  private pool: ObstacleData[] = [];
  private activeObstacles: ObstacleData[] = [];
  private readonly poolSize: number = 30;
  private readonly warningDuration: number = 0.5;
  private readonly trackWidth: number;
  private readonly groundY: number;
  private readonly pillarRiseSpeed: number = 300;
  private readonly spikeSpeed: number = 280;

  constructor(trackWidth: number, groundY: number) {
    this.trackWidth = trackWidth;
    this.groundY = groundY;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.pool.push(this.createEmpty());
    }
  }

  private createEmpty(): ObstacleData {
    return {
      type: 'pillar',
      x: 0,
      y: 0,
      targetY: 0,
      width: 0,
      height: 0,
      active: false,
      warning: false,
      warningTimer: 0,
      rising: false,
      passed: false,
      speed: 0
    };
  }

  private acquire(): ObstacleData | null {
    for (const obj of this.pool) {
      if (!obj.active) {
        return obj;
      }
    }
    return null;
  }

  private release(obj: ObstacleData): void {
    obj.active = false;
    obj.warning = false;
    obj.warningTimer = 0;
    obj.rising = false;
    obj.passed = false;
    const idx = this.activeObstacles.indexOf(obj);
    if (idx !== -1) {
      this.activeObstacles.splice(idx, 1);
    }
  }

  spawnPillar(scrollSpeed: number): void {
    const obj = this.acquire();
    if (!obj) return;

    obj.type = 'pillar';
    obj.width = 32;
    obj.height = 32;
    obj.x = this.trackWidth + 20;
    obj.targetY = this.groundY - obj.height;
    obj.y = this.groundY + 10;
    obj.active = true;
    obj.warning = true;
    obj.warningTimer = this.warningDuration;
    obj.rising = false;
    obj.passed = false;
    obj.speed = scrollSpeed;

    this.activeObstacles.push(obj);
  }

  spawnSpikeGroup(scrollSpeed: number): void {
    for (let i = 0; i < 3; i++) {
      const obj = this.acquire();
      if (!obj) continue;

      obj.type = 'spike';
      obj.width = 32;
      obj.height = 16;
      obj.x = this.trackWidth + 20 + i * 48;
      obj.y = this.groundY - 48;
      obj.targetY = obj.y;
      obj.active = true;
      obj.warning = true;
      obj.warningTimer = this.warningDuration;
      obj.rising = false;
      obj.passed = false;
      obj.speed = scrollSpeed;

      this.activeObstacles.push(obj);
    }
  }

  update(deltaTime: number, scrollSpeed: number): void {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obj = this.activeObstacles[i];

      if (obj.warning) {
        obj.warningTimer -= deltaTime;
        if (obj.warningTimer <= 0) {
          obj.warning = false;
          obj.rising = true;
        }
      }

      obj.x -= scrollSpeed * deltaTime;

      if (obj.rising && obj.type === 'pillar') {
        const riseAmount = this.pillarRiseSpeed * deltaTime;
        obj.y = Math.max(obj.targetY, obj.y - riseAmount);
      } else if (obj.type === 'spike' && !obj.warning) {
        obj.x -= this.spikeSpeed * deltaTime * 0.3;
      }

      if (obj.x + obj.width < -50) {
        this.release(obj);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const obj of this.activeObstacles) {
      if (obj.warning) {
        const blink = Math.sin(obj.warningTimer * 30) > 0;
        if (blink) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
          if (obj.type === 'pillar') {
            ctx.fillRect(obj.x, obj.targetY, obj.width, obj.height);
          } else {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
          }
        }
        continue;
      }

      if (obj.type === 'pillar') {
        this.drawPillar(ctx, obj);
      } else {
        this.drawSpike(ctx, obj);
      }
    }
  }

  private drawPillar(ctx: CanvasRenderingContext2D, obj: ObstacleData): void {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    ctx.fillStyle = '#A0522D';
    ctx.fillRect(obj.x + 2, obj.y + 2, obj.width - 4, 4);
    ctx.fillRect(obj.x + 2, obj.y + 14, obj.width - 4, 4);
    ctx.fillRect(obj.x + 2, obj.y + 26, obj.width - 4, 4);

    ctx.fillStyle = '#654321';
    ctx.fillRect(obj.x, obj.y, 2, obj.height);
    ctx.fillRect(obj.x + obj.width - 2, obj.y, 2, obj.height);

    ctx.shadowColor = '#8B4513';
    ctx.shadowBlur = 4;
    ctx.fillRect(obj.x, obj.y, obj.width, 2);
    ctx.shadowBlur = 0;
  }

  private drawSpike(ctx: CanvasRenderingContext2D, obj: ObstacleData): void {
    ctx.fillStyle = '#B22222';

    const spikeCount = 4;
    const spikeWidth = obj.width / spikeCount;
    for (let i = 0; i < spikeCount; i++) {
      const sx = obj.x + i * spikeWidth;
      ctx.beginPath();
      ctx.moveTo(sx, obj.y + obj.height);
      ctx.lineTo(sx + spikeWidth / 2, obj.y);
      ctx.lineTo(sx + spikeWidth, obj.y + obj.height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#DC143C';
    for (let i = 0; i < spikeCount; i++) {
      const sx = obj.x + i * spikeWidth;
      ctx.beginPath();
      ctx.moveTo(sx + 2, obj.y + obj.height);
      ctx.lineTo(sx + spikeWidth / 2, obj.y + 3);
      ctx.lineTo(sx + spikeWidth / 2, obj.y + obj.height);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowColor = '#FF0000';
    ctx.shadowBlur = 3;
    ctx.fillRect(obj.x, obj.y + obj.height - 2, obj.width, 2);
    ctx.shadowBlur = 0;
  }

  getActiveObstacles(): ObstacleData[] {
    return this.activeObstacles;
  }

  markPassed(obj: ObstacleData): void {
    obj.passed = true;
  }

  reset(): void {
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      this.release(this.activeObstacles[i]);
    }
  }
}
