import { CELL_SIZE } from './grid';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number = 0.5;
  alive: boolean = true;
  color: string = '#ffd700';

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 3 + Math.random() * 3;
    this.life = this.maxLife;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D, offsetY: number) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x - this.size / 2,
      this.y + offsetY - this.size / 2,
      this.size,
      this.size
    );
    ctx.globalAlpha = 1;
  }
}

export interface WaveConfig {
  count: number;
  speed: number;
  hp: number;
  spawnInterval: number;
}

export function getWaveConfig(wave: number): WaveConfig {
  let count: number, speed: number, hp: number;
  if (wave <= 1) {
    count = 5; speed = 1; hp = 50;
  } else if (wave <= 5) {
    const t = (wave - 1) / 4;
    count = Math.round(5 + t * 5);
    speed = 1 + t * 0.5;
    hp = Math.round(50 + t * 30);
  } else {
    const t = Math.min(1, (wave - 5) / 5);
    count = Math.round(10 + t * 5);
    speed = 1.5 + t * 0.5;
    hp = Math.round(80 + t * 70);
  }
  return {
    count,
    speed: speed * CELL_SIZE,
    hp,
    spawnInterval: 0.8
  };
}

export class Enemy {
  pathPoints: { x: number; y: number }[];
  pathIndex: number = 0;
  x: number;
  y: number;
  speed: number;
  hp: number;
  maxHp: number;
  alive: boolean = true;
  reachedEnd: boolean = false;

  constructor(path: { x: number; y: number }[], waveConfig: WaveConfig) {
    this.pathPoints = path;
    this.x = path[0].x;
    this.y = path[0].y;
    this.speed = waveConfig.speed;
    this.hp = waveConfig.hp;
    this.maxHp = waveConfig.hp;
  }

  update(dt: number) {
    if (!this.alive) return;
    if (this.pathIndex >= this.pathPoints.length - 1) {
      this.reachedEnd = true;
      this.alive = false;
      return;
    }
    const target = this.pathPoints[this.pathIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) {
      this.pathIndex++;
      return;
    }
    const move = this.speed * dt;
    if (move >= dist) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }
  }

  takeDamage(dmg: number) {
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  isAlive(): boolean {
    return this.alive;
  }

  spawnDeathParticles(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(this.x, this.y));
    }
    return particles;
  }

  render(ctx: CanvasRenderingContext2D, offsetY: number) {
    if (!this.alive) return;
    const size = CELL_SIZE * 0.6;

    ctx.fillStyle = '#222222';
    ctx.fillRect(this.x - size / 2, this.y + offsetY - size / 2, size, size);

    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(this.x - size * 0.35, this.y + offsetY - size * 0.35, size * 0.7, size * 0.7);

    const barWidth = size * 0.9;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y + offsetY - size / 2 - 8;

    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpRatio = this.hp / this.maxHp;
    const hpColor = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ffc107' : '#f44336';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
  }
}
