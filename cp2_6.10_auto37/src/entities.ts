import Matter from 'matter-js';

export type ProjectileType = 'stone' | 'sticky' | 'bouncy';

export interface ProjectileConfig {
  type: ProjectileType;
  radius: number;
  density: number;
  friction: number;
  frictionAir: number;
  restitution: number;
  color: string;
  damage: number;
  bouncesLeft?: number;
  isSticky?: boolean;
  stickyDuration?: number;
}

export const PROJECTILE_CONFIGS: Record<ProjectileType, ProjectileConfig> = {
  stone: {
    type: 'stone',
    radius: 14,
    density: 0.004,
    friction: 0.6,
    frictionAir: 0.01,
    restitution: 0.2,
    color: '#95a5a6',
    damage: 80
  },
  sticky: {
    type: 'sticky',
    radius: 12,
    density: 0.003,
    friction: 0.9,
    frictionAir: 0.02,
    restitution: 0.05,
    color: '#2ecc71',
    damage: 40,
    isSticky: true,
    stickyDuration: 5000
  },
  bouncy: {
    type: 'bouncy',
    radius: 13,
    density: 0.0025,
    friction: 0.3,
    frictionAir: 0.008,
    restitution: 0.9,
    color: '#e67e22',
    damage: 50,
    bouncesLeft: 3
  }
};

export class Projectile {
  public body: Matter.Body;
  public type: ProjectileType;
  public config: ProjectileConfig;
  public bouncesLeft: number;
  public isLaunched: boolean = false;
  public isStuck: boolean = false;
  public stuckTo: Matter.Body | null = null;
  public stickyPullTimer: number = 0;
  public isActive: boolean = true;

  constructor(type: ProjectileType, x: number, y: number) {
    this.type = type;
    this.config = PROJECTILE_CONFIGS[type];
    this.bouncesLeft = this.config.bouncesLeft ?? 0;

    this.body = Matter.Bodies.circle(x, y, this.config.radius, {
      density: this.config.density,
      friction: this.config.friction,
      frictionAir: this.config.frictionAir,
      restitution: this.config.restitution,
      label: `projectile_${type}`,
      isStatic: true,
      collisionFilter: {
        category: 0x0002,
        mask: 0x0001 | 0x0004
      }
    });

    (this.body as any).projectileRef = this;
  }

  public launch(velocity: Matter.Vector): void {
    this.isLaunched = true;
    Matter.Body.setStatic(this.body, false);
    Matter.Body.setVelocity(this.body, velocity);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    const pos = this.body.position;
    const angle = this.body.angle;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    if (this.type === 'stone') {
      const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.config.radius);
      grad.addColorStop(0, '#bdc3c7');
      grad.addColorStop(1, '#7f8c8d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.config.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d6d7e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (this.type === 'sticky') {
      const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.config.radius);
      grad.addColorStop(0, '#58d68d');
      grad.addColorStop(1, '#27ae60');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.config.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1e8449';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(-4, -4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'bouncy') {
      const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.config.radius);
      grad.addColorStop(0, '#f5b041');
      grad.addColorStop(1, '#d35400');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.config.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a04000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.config.radius - 3, -0.8, 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class Block {
  public body: Matter.Body;
  public width: number;
  public height: number;
  public maxHealth: number;
  public health: number;
  public cracks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  public isDestroyed: boolean = false;
  public owner: 'player' | 'ai';
  public baseColor: string;

  constructor(x: number, y: number, width: number, height: number, owner: 'player' | 'ai') {
    this.width = width;
    this.height = height;
    this.owner = owner;
    this.maxHealth = Math.floor(Math.random() * 101) + 50;
    this.health = this.maxHealth;

    this.baseColor = owner === 'ai' ? '#8b4513' : '#a0522d';

    this.body = Matter.Bodies.rectangle(x, y, width, height, {
      density: 0.003,
      friction: 0.8,
      frictionAir: 0.01,
      restitution: 0.1,
      label: `block_${owner}`,
      isStatic: false,
      collisionFilter: {
        category: 0x0001,
        mask: 0x0001 | 0x0002 | 0x0004
      }
    });

    (this.body as any).blockRef = this;
  }

  public takeDamage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDestroyed = true;
      return;
    }

    const crackCount = Math.min(5, Math.floor((1 - this.health / this.maxHealth) * 5));
    while (this.cracks.length < crackCount) {
      this.addCrack();
    }
  }

  private addCrack(): void {
    const x1 = (Math.random() - 0.5) * this.width * 0.8;
    const y1 = (Math.random() - 0.5) * this.height * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const len = Math.min(this.width, this.height) * (0.3 + Math.random() * 0.5);
    this.cracks.push({
      x1, y1,
      x2: x1 + Math.cos(angle) * len,
      y2: y1 + Math.sin(angle) * len
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.isDestroyed) return;

    const pos = this.body.position;
    const angle = this.body.angle;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    const healthRatio = this.health / this.maxHealth;
    const r = parseInt(this.baseColor.slice(1, 3), 16);
    const g = parseInt(this.baseColor.slice(3, 5), 16);
    const b = parseInt(this.baseColor.slice(5, 7), 16);
    const darken = 1 - healthRatio * 0.4;
    ctx.fillStyle = `rgb(${Math.floor(r * darken)}, ${Math.floor(g * darken)}, ${Math.floor(b * darken)})`;

    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    if (this.height > 30) {
      ctx.beginPath();
      ctx.moveTo(-this.width / 2, 0);
      ctx.lineTo(this.width / 2, 0);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1.5;
    for (const crack of this.cracks) {
      ctx.beginPath();
      ctx.moveTo(crack.x1, crack.y1);
      ctx.lineTo(crack.x2, crack.y2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class BlockFragment {
  public body: Matter.Body;
  public size: number;
  public color: string;
  public lifetime: number = 3000;
  public isActive: boolean = true;

  constructor(x: number, y: number, size: number, color: string) {
    this.size = size;
    this.color = color;

    this.body = Matter.Bodies.rectangle(x, y, size, size, {
      density: 0.002,
      friction: 0.6,
      frictionAir: 0.02,
      restitution: 0.3,
      label: 'fragment',
      angle: Math.random() * Math.PI,
      collisionFilter: {
        category: 0x0008,
        mask: 0x0004
      }
    });

    const angVel = (Math.random() - 0.5) * 0.3;
    Matter.Body.setAngularVelocity(this.body, angVel);
    (this.body as any).fragmentRef = this;
  }

  public update(delta: number): void {
    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      this.isActive = false;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.isActive) return;

    const pos = this.body.position;
    const angle = this.body.angle;
    const alpha = Math.min(1, this.lifetime / 1000);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export class Terrain {
  public ground: Matter.Body;
  public leftPlatform: Matter.Body;
  public rightPlatform: Matter.Body;
  public groundY: number;
  public groundWidth: number;

  constructor(width: number, height: number) {
    this.groundY = height;
    this.groundWidth = width;

    this.ground = Matter.Bodies.rectangle(width / 2, height + 30, width * 2, 60, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.0,
      label: 'ground',
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001 | 0x0002 | 0x0008
      }
    });

    const platRadius = 60;
    const platY = height - 10;

    this.leftPlatform = Matter.Bodies.circle(platRadius + 20, platY, platRadius, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.1,
      label: 'platform',
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001 | 0x0002 | 0x0008
      }
    });

    this.rightPlatform = Matter.Bodies.circle(width - platRadius - 20, platY, platRadius, {
      isStatic: true,
      friction: 0.9,
      restitution: 0.1,
      label: 'platform',
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001 | 0x0002 | 0x0008
      }
    });
  }

  public getBodies(): Matter.Body[] {
    return [this.ground, this.leftPlatform, this.rightPlatform];
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const groundY = this.groundY;

    const grassGrad = ctx.createLinearGradient(0, groundY - 20, 0, groundY);
    grassGrad.addColorStop(0, '#4a7c59');
    grassGrad.addColorStop(1, '#3a6348');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, groundY - 20, width, 20);

    ctx.fillStyle = '#8b6f47';
    ctx.fillRect(0, groundY, width, 60);

    const platRadius = 60;

    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.arc(platRadius + 20, groundY - 10, platRadius, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a7c59';
    ctx.beginPath();
    ctx.arc(platRadius + 20, groundY - 10, platRadius, Math.PI, 0);
    ctx.lineTo(platRadius + 20 - platRadius, groundY - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.arc(width - platRadius - 20, groundY - 10, platRadius, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a7c59';
    ctx.beginPath();
    ctx.arc(width - platRadius - 20, groundY - 10, platRadius, Math.PI, 0);
    ctx.lineTo(width - platRadius - 20 + platRadius, groundY - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#654321';
    ctx.fillRect(platRadius + 20 - 8, groundY - 60, 4, 50);
    ctx.fillRect(platRadius + 20 + 4, groundY - 60, 4, 50);

    ctx.fillStyle = '#654321';
    ctx.fillRect(width - platRadius - 20 - 8, groundY - 60, 4, 50);
    ctx.fillRect(width - platRadius - 20 + 4, groundY - 60, 4, 50);
  }
}

export class Cloud {
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public speed: number = 0.3;
  public canvasWidth: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.width = 80 + Math.random() * 80;
    this.height = this.width * 0.4;
    this.x = Math.random() * canvasWidth;
    this.y = 30 + Math.random() * (canvasHeight * 0.3);
  }

  public update(): void {
    this.x += this.speed;
    if (this.x - this.width > this.canvasWidth) {
      this.x = -this.width;
      this.y = 30 + Math.random() * 150;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    const r = this.height / 2;
    ctx.beginPath();
    ctx.arc(this.x - r, this.y, r, 0, Math.PI * 2);
    ctx.arc(this.x, this.y - r * 0.5, r * 1.1, 0, Math.PI * 2);
    ctx.arc(this.x + r, this.y, r * 0.9, 0, Math.PI * 2);
    ctx.arc(this.x + r * 0.3, this.y + r * 0.3, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Mountain {
  public points: { x: number; y: number }[] = [];
  public color: string;

  constructor(canvasWidth: number, baseY: number, startX: number, numPeaks: number, color: string) {
    this.color = color;
    const segWidth = canvasWidth / (numPeaks * 2);
    for (let i = 0; i <= numPeaks * 2; i++) {
      const x = startX + i * segWidth;
      const y = i % 2 === 0
        ? baseY
        : baseY - 40 - Math.random() * 80;
      this.points.push({ x, y });
    }
  }

  public render(ctx: CanvasRenderingContext2D, baseY: number): void {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, baseY + 50);
    for (const p of this.points) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.lineTo(this.points[this.points.length - 1].x, baseY + 50);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
