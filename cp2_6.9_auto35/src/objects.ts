export interface Vector2D {
  x: number;
  y: number;
}

export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Ball {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public active: boolean;
  public trail: Vector2D[];
  public maxTrailLength: number;
  public baseSpeed: number;
  public speedMultiplier: number;
  public boostEndTime: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 8;
    this.active = true;
    this.trail = [];
    this.maxTrailLength = 15;
    this.baseSpeed = 5;
    this.speedMultiplier = 1;
    this.boostEndTime = 0;

    const angle = (Math.random() * 60 - 30) * Math.PI / 180;
    this.vx = Math.sin(angle) * this.baseSpeed;
    this.vy = -Math.cos(angle) * this.baseSpeed;
  }

  public update(currentTime: number): void {
    if (currentTime > this.boostEndTime && this.speedMultiplier > 1) {
      this.speedMultiplier = 1;
    }

    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    const actualVx = (this.vx / Math.hypot(this.vx, this.vy) || 0) * currentSpeed;
    const actualVy = (this.vy / Math.hypot(this.vx, this.vy) || -1) * currentSpeed;

    this.x += actualVx;
    this.y += actualVy;
    this.vx = actualVx;
    this.vy = actualVy;

    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
  }

  public isBoosted(currentTime: number): boolean {
    return currentTime < this.boostEndTime;
  }

  public getBoostRemaining(currentTime: number): number {
    const remaining = (this.boostEndTime - currentTime) / 1000;
    return Math.max(0, remaining);
  }

  public activateBoost(durationMs: number, currentTime: number): void {
    this.speedMultiplier = 1.2;
    this.boostEndTime = currentTime + durationMs;
  }

  public render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (this.isBoosted(currentTime)) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const t = this.trail[i];
        const alpha = (1 - i / this.trail.length) * 0.4;
        const size = this.radius * (1 - i / this.trail.length);
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
        ctx.fill();
      }
    }

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, '#F0F0FF');
    gradient.addColorStop(1, '#AADDFF');

    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(170, 221, 255, 0.8)';

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  public getCollisionBox(): CollisionBox {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}

export class Paddle {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public targetX: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.width = 100;
    this.height = 16;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - 40;
    this.targetX = this.x;
  }

  public moveTo(x: number, canvasWidth: number): void {
    this.targetX = Math.max(0, Math.min(canvasWidth - this.width, x - this.width / 2));
  }

  public update(): void {
    this.x += (this.targetX - this.x) * 0.25;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const radius = this.height / 2;

    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';

    const gradient = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.height
    );
    gradient.addColorStop(0, '#E0E0E0');
    gradient.addColorStop(0.3, '#C0C0C0');
    gradient.addColorStop(0.7, '#A0A0A0');
    gradient.addColorStop(1, '#808080');

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, radius);
    ctx.fillStyle = gradient;
    ctx.fill();

    const highlightGradient = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.height * 0.5
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.roundRect(
      this.x + 2,
      this.y + 2,
      this.width - 4,
      this.height / 2 - 1,
      radius / 2
    );
    ctx.fillStyle = highlightGradient;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  public getCollisionBox(): CollisionBox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  public getReflectionAngle(hitX: number): number {
    const relativeX = (hitX - (this.x + this.width / 2)) / (this.width / 2);
    const maxAngle = 60 * Math.PI / 180;
    return relativeX * maxAngle;
  }
}

export class Brick {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public color: string;
  public health: number;
  public maxHealth: number;
  public layer: number;
  public isPowerUp: boolean;
  public active: boolean;

  private static readonly LAYER_COLORS: string[] = [
    '#FF4444',
    '#FF8844',
    '#FFDD44',
    '#44FF44',
    '#4488FF'
  ];

  constructor(x: number, y: number, width: number, height: number, layer: number, isPowerUp: boolean) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.layer = layer;
    this.isPowerUp = isPowerUp;
    this.active = true;
    this.maxHealth = 5 - layer;
    this.health = this.maxHealth;
    this.color = Brick.LAYER_COLORS[layer] || '#FFFFFF';
  }

  public hit(): boolean {
    this.health--;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  public getScore(): number {
    return (5 - this.layer) * 10;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = 0.5 + 0.5 * (this.health / this.maxHealth);

    if (this.isPowerUp) {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#FFD700';
    }

    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 3);
    ctx.fill();

    ctx.globalAlpha = 1;

    if (this.isPowerUp) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 3);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 3);
      ctx.stroke();
    }

    if (this.maxHealth > 1) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.health.toString(),
        this.x + this.width / 2,
        this.y + this.height / 2
      );
    }

    ctx.shadowBlur = 0;
  }

  public getCollisionBox(): CollisionBox {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}

export class PowerUp {
  public x: number;
  public y: number;
  public vy: number;
  public radius: number;
  public active: boolean;
  public spawnTime: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.vy = 2;
    this.radius = 10;
    this.active = true;
    this.spawnTime = performance.now();
  }

  public update(canvasHeight: number): void {
    this.y += this.vy;
    if (this.y > canvasHeight + this.radius) {
      this.active = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const elapsed = performance.now() - this.spawnTime;
    const blink = Math.sin(elapsed * 0.01) * 0.5 + 0.5;

    ctx.shadowBlur = 15 + blink * 10;
    ctx.shadowColor = `rgba(0, 255, 136, ${0.5 + blink * 0.5})`;

    const gradient = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, `rgba(150, 255, 200, ${0.8 + blink * 0.2})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 136, ${0.6 + blink * 0.4})`);
    gradient.addColorStop(1, `rgba(0, 200, 100, ${0.4 + blink * 0.3})`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  public getCollisionBox(): CollisionBox {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}
