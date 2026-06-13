export abstract class Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.rotation = 0;
    this.rotationSpeed = 0;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
  }

  abstract render(ctx: CanvasRenderingContext2D): void;

  getBounds(): { x: number; y: number; radius: number } {
    return { x: this.x, y: this.y, radius: this.radius };
  }
}

export class Asteroid extends Entity {
  private vertices: number[];
  private craters: { x: number; y: number; r: number }[];

  constructor(x: number, y: number, radius: number) {
    super(x, y, radius);
    this.vx = (Math.random() - 0.5) * 40;
    this.vy = (Math.random() - 0.5) * 40;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;

    const vertexCount = 8 + Math.floor(Math.random() * 5);
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (Math.PI * 2 * i) / vertexCount;
      const r = this.radius * (0.75 + Math.random() * 0.35);
      this.vertices.push(angle, r);
    }

    this.craters = [];
    const craterCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < craterCount; i++) {
      this.craters.push({
        x: (Math.random() - 0.5) * this.radius * 0.8,
        y: (Math.random() - 0.5) * this.radius * 0.8,
        r: this.radius * (0.1 + Math.random() * 0.15)
      });
    }
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    super.update(dt, canvasWidth, canvasHeight);

    if (this.x < -this.radius) this.x = canvasWidth + this.radius;
    if (this.x > canvasWidth + this.radius) this.x = -this.radius;
    if (this.y < -this.radius) this.y = canvasHeight + this.radius;
    if (this.y > canvasHeight + this.radius) this.y = -this.radius;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius
    );
    gradient.addColorStop(0, '#7a7a7a');
    gradient.addColorStop(0.5, '#5a5a5a');
    gradient.addColorStop(1, '#3a3a3a');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i += 2) {
      const angle = this.vertices[i];
      const r = this.vertices[i + 1];
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';

    for (const crater of this.craters) {
      const craterGradient = ctx.createRadialGradient(
        crater.x - crater.r * 0.3, crater.y - crater.r * 0.3, 0,
        crater.x, crater.y, crater.r
      );
      craterGradient.addColorStop(0, '#3a3a3a');
      craterGradient.addColorStop(1, '#555555');
      ctx.fillStyle = craterGradient;
      ctx.beginPath();
      ctx.arc(crater.x, crater.y, crater.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i += 2) {
      const angle = this.vertices[i];
      const r = this.vertices[i + 1];
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

export class Crystal extends Entity {
  private pulsePhase: number;
  private collectTarget: { x: number; y: number } | null = null;
  private collectProgress: number = 0;
  private isCollecting: boolean = false;
  private trailTimer: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 20);
    this.rotationSpeed = 0.8 + Math.random() * 0.5;
    this.vx = (Math.random() - 0.5) * 15;
    this.vy = (Math.random() - 0.5) * 15;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    if (this.isCollecting && this.collectTarget) {
      this.collectProgress += dt / 0.3;
      const t = this.collectProgress;
      const startX = this.x;
      const startY = this.y;

      const midX = (startX + this.collectTarget.x) / 2 + (Math.random() - 0.5) * 30;
      const midY = (startY + this.collectTarget.y) / 2 + (Math.random() - 0.5) * 30;

      const invT = 1 - t;
      this.x = invT * invT * startX + 2 * invT * t * midX + t * t * this.collectTarget.x;
      this.y = invT * invT * startY + 2 * invT * t * midY + t * t * this.collectTarget.y;

      this.trailTimer += dt;
      if (this.trailTimer > 0.03) {
        this.trailTimer = 0;
      }

      this.rotation += dt * 8;
    } else {
      super.update(dt, canvasWidth, canvasHeight);
      this.pulsePhase += dt * 2;

      if (this.x < this.radius) { this.x = this.radius; this.vx = Math.abs(this.vx); }
      if (this.x > canvasWidth - this.radius) { this.x = canvasWidth - this.radius; this.vx = -Math.abs(this.vx); }
      if (this.y < this.radius) { this.y = this.radius; this.vy = Math.abs(this.vy); }
      if (this.y > canvasHeight - this.radius) { this.y = canvasHeight - this.radius; this.vy = -Math.abs(this.vy); }
    }
  }

  startCollecting(targetX: number, targetY: number): void {
    this.isCollecting = true;
    this.collectTarget = { x: targetX, y: targetY };
    this.collectProgress = 0;
  }

  isCollected(): boolean {
    return this.collectProgress >= 1;
  }

  getIsCollecting(): boolean {
    return this.isCollecting;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.08;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(pulseScale, pulseScale);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.8);
    outerGlow.addColorStop(0, 'rgba(255, 235, 100, 0.4)');
    outerGlow.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
    outerGlow.addColorStop(1, 'rgba(255, 200, 0, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
    gradient.addColorStop(0, '#fff8b0');
    gradient.addColorStop(0.3, '#ffd700');
    gradient.addColorStop(0.7, '#daa520');
    gradient.addColorStop(1, '#b8860b');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * this.radius;
      const py = Math.sin(angle) * this.radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 0.7);
    ctx.lineTo(-this.radius * 0.3, -this.radius * 0.2);
    ctx.lineTo(this.radius * 0.3, -this.radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export class BlackHole {
  x: number;
  y: number;
  radius: number = 120;
  gravityRange: number = 300;
  rotation: number = 0;
  life: number = 5;
  maxLife: number = 5;
  private active: boolean = false;
  private side: 'left' | 'right' | 'top' | 'bottom';

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = 0;
    this.y = 0;
    this.side = 'left';
    this.spawn(canvasWidth, canvasHeight);
  }

  spawn(canvasWidth: number, canvasHeight: number): void {
    this.side = ['left', 'right', 'top', 'bottom'][Math.floor(Math.random() * 4)] as 'left' | 'right' | 'top' | 'bottom';
    
    switch (this.side) {
      case 'left':
        this.x = this.gravityRange;
        this.y = Math.random() * canvasHeight;
        break;
      case 'right':
        this.x = canvasWidth - this.gravityRange;
        this.y = Math.random() * canvasHeight;
        break;
      case 'top':
        this.x = Math.random() * canvasWidth;
        this.y = this.gravityRange;
        break;
      case 'bottom':
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight - this.gravityRange;
        break;
    }
    
    this.rotation = 0;
    this.life = this.maxLife;
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.rotation += dt * 3;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getGravityForce(objX: number, objY: number): { fx: number; fy: number } {
    if (!this.active) return { fx: 0, fy: 0 };

    const dx = this.x - objX;
    const dy = this.y - objY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.gravityRange) return { fx: 0, fy: 0 };
    if (dist < 10) return { fx: 0, fy: 0 };

    const strength = (1 - dist / this.gravityRange) * 150;
    return {
      fx: (dx / dist) * strength,
      fy: (dy / dist) * strength
    };
  }

  isInRange(objX: number, objY: number): boolean {
    if (!this.active) return false;
    const dx = this.x - objX;
    const dy = this.y - objY;
    return Math.sqrt(dx * dx + dy * dy) < this.gravityRange;
  }

  isInside(objX: number, objY: number): boolean {
    if (!this.active) return false;
    const dx = this.x - objX;
    const dy = this.y - objY;
    return Math.sqrt(dx * dx + dy * dy) < this.radius * 0.6;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = Math.min(1, this.life / 0.5) * Math.min(1, (this.maxLife - this.life) / 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    for (let i = 3; i >= 0; i--) {
      const r = this.radius + i * 20;
      const gradient = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      gradient.addColorStop(0, 'rgba(80, 0, 120, 0)');
      gradient.addColorStop(0.5, `rgba(100, 50, 180, ${0.1 + i * 0.05})`);
      gradient.addColorStop(1, 'rgba(60, 20, 100, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const diskGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    diskGradient.addColorStop(0, '#000000');
    diskGradient.addColorStop(0.6, '#0a0015');
    diskGradient.addColorStop(0.85, '#2a0a4a');
    diskGradient.addColorStop(1, 'rgba(80, 20, 140, 0)');

    ctx.fillStyle = diskGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(150, 80, 220, 0.6)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3 + this.rotation * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 1.1, this.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
