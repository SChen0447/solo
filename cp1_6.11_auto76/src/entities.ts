export interface Vector2D {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  size: number;
  particles: Particle[];
  trail: TrailPoint[];
  lastParticleTime: number;
  isDragging: boolean;
  dragTarget: Vector2D | null;
  lastCollisionTime: number;

  constructor(x: number, y: number, scale: number = 1) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = -Math.PI / 2;
    this.targetAngle = this.angle;
    this.health = 5;
    this.maxHealth = 5;
    this.size = 20 * scale;
    this.particles = [];
    this.trail = [];
    this.lastParticleTime = 0;
    this.isDragging = false;
    this.dragTarget = null;
    this.lastCollisionTime = 0;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number, keys: Set<string>, scale: number = 1): void {
    const acceleration = 0.35 * scale;
    const friction = 0.92;
    const dragLerp = 1 - Math.exp(-dt / 0.15);

    if (keys.has('w') || keys.has('arrowup')) this.vy -= acceleration;
    if (keys.has('s') || keys.has('arrowdown')) this.vy += acceleration;
    if (keys.has('a') || keys.has('arrowleft')) this.vx -= acceleration;
    if (keys.has('d') || keys.has('arrowright')) this.vx += acceleration;

    if (this.isDragging && this.dragTarget) {
      const dx = this.dragTarget.x - this.x;
      const dy = this.dragTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        const speed = Math.min(dist * 3, 12 * scale);
        this.vx += (dx / dist) * speed * dragLerp;
        this.vy += (dy / dist) * speed * dragLerp;
      }
    }

    if (!this.isDragging || !keys.size) {
      this.vx *= friction;
      this.vy *= friction;
    }

    const maxSpeed = 10 * scale;
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    const margin = this.size;
    this.x = Math.max(margin, Math.min(canvasWidth - margin, this.x));
    this.y = Math.max(margin, Math.min(canvasHeight - margin, this.y));

    if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
      this.targetAngle = Math.atan2(this.vy, this.vx);
    }
    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const angleLerp = 1 - Math.exp(-dt / 0.2);
    this.angle += angleDiff * angleLerp;

    const now = performance.now();
    if (now - this.lastParticleTime > 33 && speed > 0.5) {
      this.lastParticleTime = now;
      this.emitParticle();
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      return p.life > 0;
    });

    if (this.particles.length > 200) {
      this.particles.splice(0, this.particles.length - 200);
    }

    if (speed > 1) {
      this.trail.push({ x: this.x, y: this.y, alpha: 1 });
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.8;
    }
    this.trail = this.trail.filter(t => t.alpha > 0.05);
    if (this.trail.length > 200) {
      this.trail.splice(0, this.trail.length - 200);
    }
  }

  emitParticle(): void {
    const angle = this.angle + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 3;
    const t = Math.random();
    const r = Math.floor(100 + t * 50);
    const g = Math.floor(200 + t * 55);
    const b = Math.floor(255);
    this.particles.push({
      x: this.x - Math.cos(this.angle) * this.size * 0.8,
      y: this.y - Math.sin(this.angle) * this.size * 0.8,
      vx: Math.cos(angle) * speed + this.vx * 0.3,
      vy: Math.sin(angle) * speed + this.vy * 0.3,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      size: 2 + Math.random() * 4,
      color: `rgb(${r},${g},${b})`
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 220, 255, ${t.alpha})`;
        ctx.fill();
      }
    }

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('rgb', 'rgba').replace(')', `,${alpha})`);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const gradient = ctx.createLinearGradient(-this.size, 0, this.size, 0);
    gradient.addColorStop(0, '#1e90ff');
    gradient.addColorStop(1, '#ffffff');

    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size * 0.7, -this.size * 0.6);
    ctx.lineTo(-this.size * 0.4, 0);
    ctx.lineTo(-this.size * 0.7, this.size * 0.6);
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#b8f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.size * 0.2, 0, this.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(184, 240, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }

  getRadius(): number {
    return this.size * 0.75;
  }

  collidesWith(other: { x: number; y: number; getRadius: () => number }): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.getRadius() + other.getRadius();
  }

  damage(): void {
    this.health = Math.max(0, this.health - 1);
    this.lastCollisionTime = performance.now();
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}

export class Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  vertices: number[];
  lastCollisionTime: number;

  constructor(canvasWidth: number, canvasHeight: number, scale: number = 1) {
    const side = Math.floor(Math.random() * 4);
    this.size = (30 + Math.random() * 30) * scale;
    switch (side) {
      case 0:
        this.x = Math.random() * canvasWidth;
        this.y = -this.size;
        break;
      case 1:
        this.x = canvasWidth + this.size;
        this.y = Math.random() * canvasHeight;
        break;
      case 2:
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.size;
        break;
      default:
        this.x = -this.size;
        this.y = Math.random() * canvasHeight;
        break;
    }
    const centerX = canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.5;
    const centerY = canvasHeight / 2 + (Math.random() - 0.5) * canvasHeight * 0.5;
    const angle = Math.atan2(centerY - this.y, centerX - this.x);
    const speed = (0.3 + Math.random() * 0.8) * scale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.lastCollisionTime = performance.now();

    const numVertices = 5 + Math.floor(Math.random() * 4);
    this.vertices = [];
    for (let i = 0; i < numVertices; i++) {
      const a = (i / numVertices) * Math.PI * 2;
      const r = this.size * (0.6 + Math.random() * 0.4);
      this.vertices.push(Math.cos(a) * r, Math.sin(a) * r);
    }
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    const margin = this.size * 2;
    if (this.x < -margin || this.x > canvasWidth + margin ||
        this.y < -margin || this.y > canvasHeight + margin) {
      const angle = Math.atan2(canvasHeight / 2 - this.y, canvasWidth / 2 - this.x);
      this.vx = Math.cos(angle) * (0.3 + Math.random() * 0.5);
      this.vy = Math.sin(angle) * (0.3 + Math.random() * 0.5);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.beginPath();
    ctx.moveTo(this.vertices[0], this.vertices[1]);
    for (let i = 2; i < this.vertices.length; i += 2) {
      ctx.lineTo(this.vertices[i], this.vertices[i + 1]);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
    gradient.addColorStop(0, '#8a8a8a');
    gradient.addColorStop(1, '#4a4a4a');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#6a6a6a';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  getRadius(): number {
    return this.size * 0.6;
  }
}

export class Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  lastCollisionTime: number;

  constructor(canvasWidth: number, canvasHeight: number, scale: number = 1) {
    const side = Math.floor(Math.random() * 4);
    this.size = (20 + Math.random() * 20) * scale;
    switch (side) {
      case 0:
        this.x = Math.random() * canvasWidth;
        this.y = -this.size;
        break;
      case 1:
        this.x = canvasWidth + this.size;
        this.y = Math.random() * canvasHeight;
        break;
      case 2:
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.size;
        break;
      default:
        this.x = -this.size;
        this.y = Math.random() * canvasHeight;
        break;
    }
    const targetX = Math.random() * canvasWidth;
    const targetY = Math.random() * canvasHeight;
    const angle = Math.atan2(targetY - this.y, targetX - this.x);
    const speed = (3 + Math.random() * 4) * scale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.lastCollisionTime = performance.now();
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx;
    this.y += this.vy;

    const margin = this.size * 3;
    if (this.x < -margin || this.x > canvasWidth + margin ||
        this.y < -margin || this.y > canvasHeight + margin) {
      const side = Math.floor(Math.random() * 4);
      switch (side) {
        case 0:
          this.x = Math.random() * canvasWidth;
          this.y = -this.size;
          break;
        case 1:
          this.x = canvasWidth + this.size;
          this.y = Math.random() * canvasHeight;
          break;
        case 2:
          this.x = Math.random() * canvasWidth;
          this.y = canvasHeight + this.size;
          break;
        default:
          this.x = -this.size;
          this.y = Math.random() * canvasHeight;
          break;
      }
      const targetX = Math.random() * canvasWidth;
      const targetY = Math.random() * canvasHeight;
      const angle = Math.atan2(targetY - this.y, targetX - this.x);
      const speed = 3 + Math.random() * 4;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.x - this.size * 0.3, this.y - this.size * 0.3, 0,
      this.x, this.y, this.size
    );
    gradient.addColorStop(0, '#8b5a2b');
    gradient.addColorStop(0.6, '#5a3a1a');
    gradient.addColorStop(1, '#3a2010');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.2, this.y - this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(60, 30, 15, 0.5)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x + this.size * 0.25, this.y + this.size * 0.2, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    const tailLength = 3;
    for (let i = 1; i <= tailLength; i++) {
      const alpha = (1 - i / tailLength) * 0.3;
      ctx.beginPath();
      ctx.arc(
        this.x - this.vx * i * 2,
        this.y - this.vy * i * 2,
        this.size * (1 - i / tailLength * 0.5),
        0, Math.PI * 2
      );
      ctx.fillStyle = `rgba(255, 100, 50, ${alpha})`;
      ctx.fill();
    }
  }

  getRadius(): number {
    return this.size;
  }
}

export class Crystal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  spawnTime: number;
  lifetime: number;

  constructor(canvasWidth: number, canvasHeight: number, scale: number = 1) {
    this.size = (15 + Math.random() * 10) * scale;
    this.x = this.size + Math.random() * (canvasWidth - this.size * 2);
    this.y = this.size + Math.random() * (canvasHeight - this.size * 2);
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.2 + Math.random() * 0.3) * scale;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.phase = 0;
    this.spawnTime = performance.now();
    this.lifetime = 10000 + Math.random() * 5000;
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx;
    this.y += this.vy;
    this.phase += dt * 4;

    if (this.x < this.size || this.x > canvasWidth - this.size) this.vx *= -1;
    if (this.y < this.size || this.y > canvasHeight - this.size) this.vy *= -1;

    this.x = Math.max(this.size, Math.min(canvasWidth - this.size, this.x));
    this.y = Math.max(this.size, Math.min(canvasHeight - this.size, this.y));
  }

  isExpired(): boolean {
    return performance.now() - this.spawnTime > this.lifetime;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const blink = (Math.sin(this.phase * Math.PI) + 1) / 2;
    const alpha = 0.3 + blink * 0.7;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.phase * 0.3);

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * this.size;
      const py = Math.sin(a) * this.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
    gradient.addColorStop(0, `rgba(255, 240, 150, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha})`);
    gradient.addColorStop(1, `rgba(200, 150, 0, ${alpha * 0.8})`);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = `rgba(255, 240, 180, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `rgba(255, 215, 0, ${alpha})`;
    ctx.shadowBlur = 20 * blink;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * this.size * 0.5;
      const py = Math.sin(a) * this.size * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 255, 220, ${alpha * 0.8})`;
    ctx.fill();

    ctx.restore();
  }

  getRadius(): number {
    return this.size * 0.8;
  }
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  frequency: number;
}
