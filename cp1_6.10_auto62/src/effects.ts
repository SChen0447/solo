export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
    for (let i = 0; i < maxSize; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: '#000', size: 0,
        active: false,
      });
    }
  }

  acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        return p;
      }
    }
    return null;
  }

  release(p: Particle): void {
    p.active = false;
  }

  getActive(): Particle[] {
    return this.pool.filter(p => p.active);
  }

  count(): number {
    return this.pool.filter(p => p.active).length;
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
    }
  }
}

export interface CannonballState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  wind: number;
  radius: number;
  color: string;
  active: boolean;
}

export class Cannonball {
  state: CannonballState;
  private trailPool: ParticlePool;

  constructor(x: number, y: number, targetX: number, targetY: number) {
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.max(4, dist / 60);
    const angle = Math.atan2(dy, dx) - 0.3;

    this.state = {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 0.2,
      wind: (Math.random() - 0.5) * 0.1,
      radius: 5,
      color: '#FFD700',
      active: true,
    };
    this.trailPool = new ParticlePool(100);
  }

  update(canvasWidth: number, canvasHeight: number): boolean {
    const s = this.state;
    if (!s.active) return false;

    s.vy += s.gravity;
    s.vx += s.wind;
    s.x += s.vx;
    s.y += s.vy;

    const tp = this.trailPool.acquire();
    if (tp) {
      tp.x = s.x;
      tp.y = s.y;
      tp.vx = 0;
      tp.vy = 0;
      tp.life = 500;
      tp.maxLife = 500;
      tp.color = 'rgba(255, 215, 0, 0.6)';
      tp.size = 3;
      tp.active = true;
    }

    for (const p of this.trailPool.getActive()) {
      p.life -= 16;
      if (p.life <= 0) {
        this.trailPool.release(p);
      }
    }

    if (s.x < 0 || s.x > canvasWidth || s.y > canvasHeight) {
      s.active = false;
      return false;
    }
    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    if (!s.active) return;

    for (const p of this.trailPool.getActive()) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Explosion {
  x: number;
  y: number;
  radius: number;
  pool: ParticlePool;
  duration: number = 300;
  elapsed: number = 0;
  active: boolean = true;

  constructor(x: number, y: number, pool: ParticlePool) {
    this.x = x;
    this.y = y;
    this.radius = 30;
    this.pool = pool;
    this.spawnParticles();
  }

  spawnParticles(): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const p = this.pool.acquire();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1 + Math.random() * 4;
      const t = Math.random();
      const r = Math.floor(255);
      const g = Math.floor(50 + t * 100);
      const b = Math.floor(t * 50);

      p.x = this.x;
      p.y = this.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = this.duration;
      p.maxLife = this.duration;
      p.color = `rgb(${r}, ${g}, ${b})`;
      p.size = 2 + Math.random() * 3;
      p.active = true;
    }
  }

  update(deltaTime: number): void {
    if (!this.active) return;
    this.elapsed += deltaTime;

    for (const p of this.pool.getActive()) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.pool.release(p);
      }
    }

    if (this.elapsed >= this.duration && this.pool.count() === 0) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = 1 - this.elapsed / this.duration;
    const grad = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.6})`);
    grad.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(255, 0, 0, 0)`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const p of this.pool.getActive()) {
      const pAlpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = pAlpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * pAlpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export class WaveRenderer {
  private offset: number = 0;
  private amplitude: number = 5;
  private frequency: number = 0.02;
  private speed: number = 0.5;

  update(): void {
    this.offset += this.speed;
  }

  renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const waveCount = 5;
    for (let w = 0; w < waveCount; w++) {
      const baseY = height * (0.4 + w * 0.1);
      const amp = this.amplitude * (1 - w * 0.15);
      const freq = this.frequency * (1 + w * 0.2);
      const offset = this.offset * (1 + w * 0.1);

      ctx.save();
      ctx.strokeStyle = `rgba(100, 150, 200, ${0.08 + w * 0.02})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 5) {
        const y = baseY + Math.sin((x + offset) * freq) * amp;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  renderBorder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const borderWidth = 8;
    ctx.save();

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, width, borderWidth);
    ctx.fillRect(0, height - borderWidth, width, borderWidth);
    ctx.fillRect(0, 0, borderWidth, height);
    ctx.fillRect(width - borderWidth, 0, borderWidth, height);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      borderWidth,
      borderWidth,
      width - borderWidth * 2,
      height - borderWidth * 2
    );

    ctx.restore();
  }
}

export class VictoryFlag {
  side: 'red' | 'blue';
  x: number;
  baseY: number;
  currentY: number;
  targetY: number;
  width: number = 120;
  height: number = 80;
  poleHeight: number = 200;
  elapsed: number = 0;
  duration: number = 2000;
  active: boolean = true;

  constructor(side: 'red' | 'blue', canvasWidth: number, canvasHeight: number) {
    this.side = side;
    this.x = canvasWidth / 2;
    this.baseY = canvasHeight;
    this.currentY = canvasHeight;
    this.targetY = canvasHeight * 0.3;
  }

  update(deltaTime: number): void {
    if (!this.active) return;
    this.elapsed += deltaTime;
    const t = Math.min(1, this.elapsed / this.duration);
    const eased = 1 - Math.pow(1 - t, 3);
    this.currentY = this.baseY + (this.targetY - this.baseY) * eased;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const time = Date.now() / 500;
    const color1 = this.side === 'red' ? '#8B0000' : '#00008B';
    const color2 = this.side === 'red' ? '#DC143C' : '#4169E1';

    ctx.save();
    ctx.fillStyle = '#654321';
    ctx.fillRect(this.x - 3, this.currentY - 10, 6, this.poleHeight + 10);
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.currentY - 10, 6, 0, Math.PI * 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(
      this.x, this.currentY,
      this.x + this.width, this.currentY + this.height
    );
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(this.x, this.currentY);

    const segments = 10;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const px = this.x + this.width * t;
      const wave = Math.sin(time + t * Math.PI * 2) * 8;
      const py = this.currentY + wave;
      ctx.lineTo(px, py);
    }

    const cp1x = this.x + this.width * 0.7;
    const cp1y = this.currentY + this.height * 0.3 + Math.sin(time * 1.2) * 10;
    const cp2x = this.x + this.width * 0.3;
    const cp2y = this.currentY + this.height * 0.7 + Math.sin(time * 0.8) * 8;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, this.x, this.currentY + this.height);

    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const px = this.x + this.width * t;
      const wave = Math.sin(time + t * Math.PI * 2 + 0.5) * 6;
      const py = this.currentY + this.height + wave;
      ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
