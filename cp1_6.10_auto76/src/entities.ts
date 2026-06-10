export interface Vector2 {
  x: number;
  y: number;
}

export interface ShipConfig {
  x: number;
  y: number;
  rotation: number;
  isPlayer: boolean;
}

export type ShipType = 'player' | 'ai';

export class Ship {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public rotation: number;
  public angularVelocity: number = 0;
  public isPlayer: boolean;
  public shield: number = 100;
  public maxShield: number = 100;
  public weaponCooldown: number = 0;
  public weaponCooldownMax: number;
  public alive: boolean = true;
  public type: ShipType;

  public static readonly PLAYER_ROTATION_SPEED = 0.05;
  public static readonly PLAYER_ACCELERATION = 0.4;
  public static readonly PLAYER_MAX_SPEED = 4;
  public static readonly PLAYER_FRICTION = 0.02;
  public static readonly AI_MAX_SPEED = 3;
  public static readonly PLAYER_WEAPON_COOLDOWN = 200;
  public static readonly AI_WEAPON_COOLDOWN = 400;

  private readonly vertices: Vector2[] = [];

  constructor(config: ShipConfig) {
    this.x = config.x;
    this.y = config.y;
    this.rotation = config.rotation;
    this.isPlayer = config.isPlayer;
    this.type = config.isPlayer ? 'player' : 'ai';
    this.weaponCooldownMax = config.isPlayer ? Ship.PLAYER_WEAPON_COOLDOWN : Ship.AI_WEAPON_COOLDOWN;
  }

  public getVertices(): Vector2[] {
    this.vertices.length = 0;
    if (this.isPlayer) {
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const points: Vector2[] = [
        { x: 30, y: 0 },
        { x: -20, y: -15 },
        { x: -10, y: 0 },
        { x: -20, y: 15 },
        { x: -15, y: -8 },
        { x: -15, y: 8 },
      ];
      for (const p of points) {
        this.vertices.push({
          x: this.x + p.x * cos - p.y * sin,
          y: this.y + p.x * sin + p.y * cos,
        });
      }
    } else {
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const points: Vector2[] = [
        { x: 28, y: 0 },
        { x: 0, y: -20 },
        { x: -20, y: 0 },
        { x: 0, y: 20 },
        { x: -12, y: -10 },
        { x: -12, y: 10 },
      ];
      for (const p of points) {
        this.vertices.push({
          x: this.x + p.x * cos - p.y * sin,
          y: this.y + p.x * sin + p.y * cos,
        });
      }
    }
    return this.vertices;
  }

  public rotate(direction: number): void {
    this.rotation += direction * Ship.PLAYER_ROTATION_SPEED;
  }

  public thrust(): void {
    const ax = Math.cos(this.rotation) * Ship.PLAYER_ACCELERATION;
    const ay = Math.sin(this.rotation) * Ship.PLAYER_ACCELERATION;
    this.vx += ax;
    this.vy += ay;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = this.isPlayer ? Ship.PLAYER_MAX_SPEED : Ship.AI_MAX_SPEED;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
  }

  public update(deltaTime: number, canvasWidth: number, canvasHeight: number): { bouncedX: boolean; bouncedY: boolean } {
    let bouncedX = false;
    let bouncedY = false;

    if (!this.isPlayer) {
      this.rotation += this.angularVelocity;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 30) {
      this.x = 30;
      this.vx = -this.vx;
      bouncedX = true;
    } else if (this.x > canvasWidth - 30) {
      this.x = canvasWidth - 30;
      this.vx = -this.vx;
      bouncedX = true;
    }

    if (this.y < 30) {
      this.y = 30;
      this.vy = -this.vy;
      bouncedY = true;
    } else if (this.y > canvasHeight - 30) {
      this.y = canvasHeight - 30;
      this.vy = -this.vy;
      bouncedY = true;
    }

    const friction = this.isPlayer ? Ship.PLAYER_FRICTION : 0.01;
    this.vx *= 1 - friction;
    this.vy *= 1 - friction;

    if (this.weaponCooldown > 0) {
      this.weaponCooldown -= deltaTime;
      if (this.weaponCooldown < 0) this.weaponCooldown = 0;
    }

    return { bouncedX, bouncedY };
  }

  public canFire(): boolean {
    return this.alive && this.weaponCooldown <= 0;
  }

  public fire(): void {
    this.weaponCooldown = this.weaponCooldownMax;
  }

  public takeDamage(amount: number): void {
    this.shield -= amount;
    if (this.shield <= 0) {
      this.shield = 0;
      this.alive = false;
    }
  }

  public reset(x: number, y: number, rotation: number): void {
    this.x = x;
    this.y = y;
    this.rotation = rotation;
    this.vx = 0;
    this.vy = 0;
    this.angularVelocity = 0;
    this.shield = this.maxShield;
    this.weaponCooldown = 0;
    this.alive = true;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isPlayer) {
      const wingGradient = ctx.createLinearGradient(-20, -15, -20, 15);
      wingGradient.addColorStop(0, '#0099cc');
      wingGradient.addColorStop(0.5, '#00d4ff');
      wingGradient.addColorStop(1, '#0099cc');

      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = wingGradient;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-20, -15);
      ctx.lineTo(-15, 0);
      ctx.lineTo(-20, 15);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#66ffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, 0);
      ctx.lineTo(-20, -15);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-20, 15);
      ctx.closePath();
      ctx.stroke();
    } else {
      const gradient = ctx.createLinearGradient(-20, 0, 28, 0);
      gradient.addColorStop(0, '#cc0000');
      gradient.addColorStop(1, '#ff4444');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(0, -20);
      ctx.lineTo(-20, 0);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#990000';
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(-16, -6);
      ctx.lineTo(-16, 6);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffaaaa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(0, -20);
      ctx.lineTo(-20, 0);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();

    const shieldPercent = this.shield / this.maxShield;
    if (shieldPercent < 1 && shieldPercent > 0) {
      let shouldFlash = false;
      const now = performance.now();
      if (shieldPercent < 0.3) {
        shouldFlash = Math.floor(now / 300) % 2 === 0;
      }
      if (!shouldFlash || shieldPercent >= 0.3) {
        ctx.save();
        ctx.strokeStyle = this.isPlayer
          ? `rgba(0, 212, 255, ${0.3 + shieldPercent * 0.4})`
          : `rgba(255, 68, 68, ${0.3 + shieldPercent * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const radius = this.isPlayer ? 35 : 32;
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  public getEnginePosition(): Vector2 {
    if (this.isPlayer) {
      return {
        x: this.x - Math.cos(this.rotation) * 15,
        y: this.y - Math.sin(this.rotation) * 15,
      };
    }
    return {
      x: this.x - Math.cos(this.rotation) * 18,
      y: this.y - Math.sin(this.rotation) * 18,
    };
  }

  public getNosePosition(): Vector2 {
    if (this.isPlayer) {
      return {
        x: this.x + Math.cos(this.rotation) * 30,
        y: this.y + Math.sin(this.rotation) * 30,
      };
    }
    return {
      x: this.x + Math.cos(this.rotation) * 28,
      y: this.y + Math.sin(this.rotation) * 28,
    };
  }
}

export function polygonCollision(verticesA: Vector2[], verticesB: Vector2[]): boolean {
  const polygons = [verticesA, verticesB];
  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let j = 0; j < polygon.length; j++) {
      const p1 = polygon[j];
      const p2 = polygon[(j + 1) % polygon.length];
      const normal = { x: p2.y - p1.y, y: p1.x - p2.x };
      let minA = Infinity, maxA = -Infinity;
      let minB = Infinity, maxB = -Infinity;
      for (const p of verticesA) {
        const projected = p.x * normal.x + p.y * normal.y;
        if (projected < minA) minA = projected;
        if (projected > maxA) maxA = projected;
      }
      for (const p of verticesB) {
        const projected = p.x * normal.x + p.y * normal.y;
        if (projected < minB) minB = projected;
        if (projected > maxB) maxB = projected;
      }
      if (maxA < minB || maxB < minA) return false;
    }
  }
  return true;
}
