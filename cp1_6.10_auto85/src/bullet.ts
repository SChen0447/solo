export type BulletType = 'circle' | 'diamond' | 'triangle';

export interface BulletConfig {
  type: BulletType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speedMultiplier?: number;
}

export class Bullet {
  public type: BulletType;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public rotation: number;
  public rotationSpeed: number;
  public dead: boolean = false;
  public speedMultiplier: number;
  public speedVariation: number;
  public age: number = 0;

  constructor(config: BulletConfig) {
    this.type = config.type;
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.speedMultiplier = config.speedMultiplier ?? 1;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.speedVariation = 1;

    switch (this.type) {
      case 'circle':
        this.radius = 8;
        break;
      case 'diamond':
        this.radius = 12;
        this.rotationSpeed = 2;
        this.speedVariation = 0.7 + Math.random() * 0.6;
        break;
      case 'triangle':
        this.radius = 18;
        break;
    }
  }

  public update(dt: number, playerX: number, playerY: number, canvasWidth: number, canvasHeight: number): void {
    this.age += dt;

    if (this.type === 'diamond') {
      this.rotation += this.rotationSpeed * dt;
      const speed = this.speedVariation * this.speedMultiplier;
      this.x += this.vx * speed * dt;
      this.y += this.vy * speed * dt;
    } else if (this.type === 'triangle') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const desiredAngle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(this.vy, this.vx);
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const maxTurn = (15 * Math.PI / 180) * dt;
        const turnAmount = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        const newAngle = currentAngle + turnAmount;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const decay = Math.pow(0.98, dt * 60);
        const newSpeed = speed * decay;
        this.vx = Math.cos(newAngle) * newSpeed;
        this.vy = Math.sin(newAngle) * newSpeed;
      }
      this.x += this.vx * this.speedMultiplier * dt;
      this.y += this.vy * this.speedMultiplier * dt;
    } else {
      this.x += this.vx * this.speedMultiplier * dt;
      this.y += this.vy * this.speedMultiplier * dt;
    }

    const margin = 100;
    if (this.x < -margin || this.x > canvasWidth + margin ||
        this.y < -margin || this.y > canvasHeight + margin) {
      this.dead = true;
    }
  }

  public getCollisionRadius(): number {
    return this.radius * 0.7;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    switch (this.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3366';
        ctx.fill();
        ctx.strokeStyle = '#ff99aa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;

      case 'diamond':
        ctx.rotate(this.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.8, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius * 0.8, 0);
        ctx.closePath();
        ctx.fillStyle = '#9933ff';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#cc99ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;

      case 'triangle':
        const angle = Math.atan2(this.vy, this.vx);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius * 0.7, -this.radius * 0.6);
        ctx.lineTo(-this.radius * 0.7, this.radius * 0.6);
        ctx.closePath();
        ctx.fillStyle = '#33ff99';
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#99ffcc';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  public knockback(centerX: number, centerY: number, force: number): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const nx = dx / dist;
    const ny = dy / dist;
    this.vx = nx * force;
    this.vy = ny * force;
    this.speedMultiplier = 1;
  }
}

export class BulletSpawner {
  private bullets: Bullet[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private spawnTimer: number = 0;
  private spawnInterval: number = 0.8;
  private waveIntensity: number = 1;
  private speedBoostTimer: number = 0;
  private speedBoostActive: boolean = false;
  private beatIntensity: number = 0.5;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public getBullets(): Bullet[] {
    return this.bullets;
  }

  public onBeat(intensity: number, isStrong: boolean): void {
    this.beatIntensity = intensity;
    if (isStrong || intensity > 0.6) {
      this.speedBoostActive = true;
      this.speedBoostTimer = 2 * (60000 / 120) / 1000;
      this.spawnWave(Math.floor(8 * this.waveIntensity * 2), 1.8);
    } else {
      this.spawnWave(Math.floor(3 * this.waveIntensity), 0.7);
    }
  }

  public update(dt: number, playerX: number, playerY: number): number {
    let repelledCount = 0;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const baseCount = Math.floor(2 + this.waveIntensity * 2);
      const mult = this.speedBoostActive ? 1.8 : 1;
      this.spawnWave(baseCount, mult);
      this.spawnTimer = this.speedBoostActive ? 0.4 : 0.8;
      this.waveIntensity = Math.min(5, this.waveIntensity + dt * 0.05);
    }

    if (this.speedBoostActive) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) {
        this.speedBoostActive = false;
      }
    }

    for (const bullet of this.bullets) {
      bullet.update(dt, playerX, playerY, this.canvasWidth, this.canvasHeight);
    }

    const before = this.bullets.length;
    this.bullets = this.bullets.filter((b) => !b.dead);
    repelledCount = Math.max(0, before - this.bullets.length - 5);

    return repelledCount;
  }

  public spawnWave(count: number, speedMult: number = 1): void {
    for (let i = 0; i < count; i++) {
      const types: BulletType[] = ['circle', 'diamond', 'triangle'];
      const type = types[Math.floor(Math.random() * types.length)];
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      const margin = 30;

      switch (edge) {
        case 0:
          x = Math.random() * this.canvasWidth;
          y = -margin;
          break;
        case 1:
          x = this.canvasWidth + margin;
          y = Math.random() * this.canvasHeight;
          break;
        case 2:
          x = Math.random() * this.canvasWidth;
          y = this.canvasHeight + margin;
          break;
        case 3:
          x = -margin;
          y = Math.random() * this.canvasHeight;
          break;
      }

      const targetX = this.canvasWidth / 2 + (Math.random() - 0.5) * 200;
      const targetY = this.canvasHeight / 2 + (Math.random() - 0.5) * 200;
      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseSpeed = 150 + Math.random() * 150;
      const vx = (dx / dist) * baseSpeed;
      const vy = (dy / dist) * baseSpeed;

      this.bullets.push(new Bullet({
        type,
        x,
        y,
        vx,
        vy,
        speedMultiplier: speedMult
      }));
    }
  }

  public applyShockwave(cx: number, cy: number, radius: number): number {
    let count = 0;
    for (const bullet of this.bullets) {
      const dx = bullet.x - cx;
      const dy = bullet.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        const force = 600 * (1 - dist / radius);
        bullet.knockback(cx, cy, force);
        count++;
      }
    }
    return count;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const bullet of this.bullets) {
      bullet.draw(ctx);
    }
  }

  public isSpeedBoostActive(): boolean {
    return this.speedBoostActive;
  }
}
