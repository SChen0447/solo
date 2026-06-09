export type ObstacleType = 'block' | 'spike';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  color: { r: number; g: number; b: number };
  pulsePhase: number;
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private pool: Obstacle[] = [];
  private nextId: number = 0;

  private groundY: number;
  private canvasWidth: number;

  private baseSpeed: number = 300;
  private currentSpeed: number = 300;
  private spawnTimer: number = 0;
  private baseSpawnInterval: number = 1.8;
  private currentSpawnInterval: number = 1.8;

  private highEnergy: number = 0;
  private smoothedColorR: number = 255;
  private smoothedColorG: number = 60;
  private smoothedColorB: number = 60;

  constructor(canvasWidth: number, groundY: number) {
    this.canvasWidth = canvasWidth;
    this.groundY = groundY;
  }

  reset(): void {
    for (const obs of this.obstacles) {
      obs.active = false;
      this.pool.push(obs);
    }
    this.obstacles = [];
    this.spawnTimer = 0;
    this.currentSpeed = this.baseSpeed;
    this.currentSpawnInterval = this.baseSpawnInterval;
  }

  setCanvasSize(width: number, groundY: number): void {
    this.canvasWidth = width;
    this.groundY = groundY;
  }

  setHighEnergy(energy: number): void {
    this.highEnergy = Math.max(0, Math.min(1, energy));
    const targetR = 255;
    const targetG = Math.floor(60 + this.highEnergy * 195);
    const targetB = Math.floor(60 - this.highEnergy * 50);

    this.smoothedColorR += (targetR - this.smoothedColorR) * 0.08;
    this.smoothedColorG += (targetG - this.smoothedColorG) * 0.08;
    this.smoothedColorB += (targetB - this.smoothedColorB) * 0.08;
  }

  updateBPM(bpm: number): void {
    const normalizedBPM = Math.max(60, Math.min(200, bpm));
    const bpmFactor = normalizedBPM / 120;

    this.currentSpeed = this.baseSpeed * (0.6 + bpmFactor * 0.8);
    this.currentSpawnInterval = this.baseSpawnInterval / (0.6 + bpmFactor * 0.7);
  }

  getSpeed(): number {
    return this.currentSpeed;
  }

  update(deltaTime: number): void {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.currentSpawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle();
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.currentSpeed * deltaTime;
      obs.pulsePhase += deltaTime * 4;

      if (obs.x + obs.width < -50) {
        obs.active = false;
        this.pool.push(obs);
        this.obstacles.splice(i, 1);
      }
    }
  }

  private spawnObstacle(): void {
    const type: ObstacleType = Math.random() > 0.45 ? 'block' : 'spike';
    const obs = this.getFromPool();

    if (type === 'block') {
      const width = 30 + Math.random() * 50;
      const height = 30 + Math.random() * 50;
      obs.type = 'block';
      obs.width = width;
      obs.height = height;
      obs.x = this.canvasWidth + 50;
      obs.y = this.groundY - height;
    } else {
      const width = 25 + Math.random() * 20;
      const height = 35 + Math.random() * 35;
      obs.type = 'spike';
      obs.width = width;
      obs.height = height;
      obs.x = this.canvasWidth + 50;
      obs.y = this.groundY - height;
    }

    obs.active = true;
    obs.pulsePhase = Math.random() * Math.PI * 2;
    obs.color = {
      r: Math.round(this.smoothedColorR),
      g: Math.round(this.smoothedColorG),
      b: Math.round(this.smoothedColorB)
    };

    this.obstacles.push(obs);
  }

  private getFromPool(): Obstacle {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return {
      id: this.nextId++,
      type: 'block',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      active: false,
      color: { r: 255, g: 60, b: 60 },
      pulsePhase: 0
    };
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  checkCollision(bounds: { x: number; y: number; width: number; height: number }): boolean {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      const margin = 4;
      let hitboxX = obs.x + margin;
      let hitboxY = obs.y + margin;
      let hitboxW = obs.width - margin * 2;
      let hitboxH = obs.height - margin * 2;

      if (obs.type === 'spike') {
        hitboxX = obs.x + obs.width * 0.2;
        hitboxY = obs.y + obs.height * 0.2;
        hitboxW = obs.width * 0.6;
        hitboxH = obs.height * 0.8;
      }

      if (
        bounds.x < hitboxX + hitboxW &&
        bounds.x + bounds.width > hitboxX &&
        bounds.y < hitboxY + hitboxH &&
        bounds.y + bounds.height > hitboxY
      ) {
        return true;
      }
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;

      const pulse = 0.85 + Math.sin(obs.pulsePhase) * 0.15;

      const glowSize = 20 * pulse;
      const glowGradient = ctx.createRadialGradient(
        obs.x + obs.width / 2,
        obs.y + obs.height / 2,
        0,
        obs.x + obs.width / 2,
        obs.y + obs.height / 2,
        Math.max(obs.width, obs.height) + glowSize
      );
      glowGradient.addColorStop(0, `rgba(${obs.color.r}, ${obs.color.g}, ${obs.color.b}, ${0.4 * pulse})`);
      glowGradient.addColorStop(1, `rgba(${obs.color.r}, ${obs.color.g}, ${obs.color.b}, 0)`);

      ctx.beginPath();
      ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, Math.max(obs.width, obs.height) + glowSize, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      if (obs.type === 'block') {
        this.drawBlock(ctx, obs, pulse);
      } else {
        this.drawSpike(ctx, obs, pulse);
      }
    }
  }

  private drawBlock(ctx: CanvasRenderingContext2D, obs: Obstacle, pulse: number): void {
    const r = obs.color.r;
    const g = obs.color.g;
    const b = obs.color.b;

    ctx.beginPath();
    ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 4);
    const blockGradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
    blockGradient.addColorStop(0, `rgba(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)}, 1)`);
    blockGradient.addColorStop(1, `rgba(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)}, 1)`);
    ctx.fillStyle = blockGradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(obs.x + 3, obs.y + 3, obs.width - 6, 4, 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + pulse * 0.15})`;
    ctx.fill();
  }

  private drawSpike(ctx: CanvasRenderingContext2D, obs: Obstacle, pulse: number): void {
    const r = obs.color.r;
    const g = obs.color.g;
    const b = obs.color.b;
    const cx = obs.x + obs.width / 2;

    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + obs.height);
    ctx.lineTo(cx, obs.y);
    ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
    ctx.closePath();

    const spikeGradient = ctx.createLinearGradient(cx, obs.y, cx, obs.y + obs.height);
    spikeGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
    spikeGradient.addColorStop(0.3, `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 1)`);
    spikeGradient.addColorStop(1, `rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 1)`);
    ctx.fillStyle = spikeGradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
