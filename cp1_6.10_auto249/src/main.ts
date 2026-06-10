import { Butterfly } from './butterfly.js';
import { ParticleSystem } from './particles.js';
import { WindSystem } from './wind.js';
import { EffectSystem } from './effects.js';

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
}

interface TrailHeatPoint {
  x: number;
  y: number;
  count: number;
}

interface GameState {
  score: number;
  timeLeft: number;
  totalLights: number;
  hitLights: number;
  running: boolean;
  ended: boolean;
  heatPoints: TrailHeatPoint[];
}

const GAME_DURATION = 300;
const STAR_COUNT = 200;
const HEAT_GRID = 40;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private butterfly!: Butterfly;
  private particles!: ParticleSystem;
  private windSystem!: WindSystem;
  private effectSystem!: EffectSystem;

  private stars: Star[] = [];
  private moonPhase = 0;
  private frame = 0;
  private lastTime = 0;
  private accumulator = 0;
  private animationId = 0;

  private state!: GameState;
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.resize();
    this.init();
    this.bindEvents();
    this.startLoop();
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.windSystem) this.windSystem.resize(this.width, this.height);
    if (this.effectSystem) this.effectSystem.resize(this.width, this.height);
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.001
      });
    }
  }

  private init(): void {
    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;
    this.butterfly = new Butterfly(this.width / 2, this.height / 2);
    this.particles = new ParticleSystem();
    this.windSystem = new WindSystem(this.width, this.height);
    this.effectSystem = new EffectSystem(this.width, this.height);
    this.initStars();

    this.state = {
      score: 0,
      timeLeft: GAME_DURATION,
      totalLights: 0,
      hitLights: 0,
      running: true,
      ended: false,
      heatPoints: []
    };

    this.frame = 0;
    this.lastTime = performance.now();
    this.accumulator = 0;
  }

  private destroy(): void {
    if (this.animationId !== 0) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private restart(): void {
    this.destroy();
    this.init();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('click', (e: MouseEvent) => {
      if (!this.state.running || this.state.ended) return;
      const rect = this.canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      this.effectSystem.createShockwave(cx, cy);
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        this.restart();
      }
    });
  }

  private addHeatPoint(x: number, y: number): void {
    const gx = Math.floor((x / this.width) * HEAT_GRID);
    const gy = Math.floor((y / this.height) * HEAT_GRID);
    for (const hp of this.state.heatPoints) {
      if (hp.x === gx && hp.y === gy) {
        hp.count++;
        return;
      }
    }
    this.state.heatPoints.push({ x: gx, y: gy, count: 1 });
  }

  private heatColor(count: number, maxCount: number): string {
    const t = Math.min(1, count / maxCount);
    const r = Math.round(50 + t * 205);
    const g = Math.round(50 + (1 - Math.abs(t - 0.5) * 2) * 150);
    const b = Math.round(200 - t * 180);
    return `rgba(${r}, ${g}, ${b}, ${0.3 + t * 0.6})`;
  }

  private update(dt: number): void {
    if (!this.state.running) return;

    this.frame++;
    this.accumulator += dt;
    while (this.accumulator >= 1000) {
      this.accumulator -= 1000;
      if (this.state.timeLeft > 0) {
        this.state.timeLeft--;
        if (this.state.timeLeft <= 0) {
          this.state.running = false;
          this.state.ended = true;
        }
      }
    }

    this.moonPhase += 0.005;

    for (const s of this.stars) {
      s.phase += 0.03;
      const cx = this.width / 2;
      const cy = this.height / 2;
      const dx = s.x - cx;
      const dy = s.y - cy;
      const cos = Math.cos(s.speed);
      const sin = Math.sin(s.speed);
      s.x = cx + dx * cos - dy * sin;
      s.y = cy + dx * sin + dy * cos;
    }

    this.butterfly.setTarget(this.mouseX, this.mouseY);
    this.butterfly.update(this.windSystem);

    this.particles.emit({ x: this.butterfly.x, y: this.butterfly.y }, this.butterfly.getCurrentColor());
    this.particles.update();

    this.windSystem.update(this.frame);
    this.state.totalLights = this.windSystem.totalLightsSpawned;

    this.effectSystem.update();
    this.effectSystem.applyShockwavePush(this.particles.pool);

    const hitLight = this.windSystem.checkLightHit(this.butterfly.x, this.butterfly.y);
    if (hitLight) {
      this.state.score += 10;
      this.state.hitLights++;
      this.effectSystem.createBurst(hitLight.x, hitLight.y, '#ffd700', 30);
      this.effectSystem.createCelebration();
    }

    const hitDanger = this.windSystem.checkDangerHit(this.butterfly.x, this.butterfly.y);
    if (hitDanger) {
      this.state.score = Math.max(0, this.state.score - 5);
      this.effectSystem.createBurst(hitDanger.x, hitDanger.y, '#ff0000', 25);
    }

    if (this.frame % 3 === 0) {
      this.addHeatPoint(this.butterfly.x, this.butterfly.y);
    }
  }

  private renderBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(1, '#1b2a4a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    for (const s of this.stars) {
      const alpha = 0.15 + (Math.sin(s.phase) + 1) * 0.5 * 0.55;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();

    const moonX = 80;
    const moonY = this.height - 100 + Math.sin(this.moonPhase) * 8;
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    const moonGrad = this.ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 60);
    moonGrad.addColorStop(0, 'rgba(150, 200, 255, 0.8)');
    moonGrad.addColorStop(0.6, 'rgba(100, 150, 220, 0.3)');
    moonGrad.addColorStop(1, 'rgba(50, 100, 180, 0)');
    this.ctx.fillStyle = moonGrad;
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, 60, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = '#a0c4ff';
    this.ctx.beginPath();
    this.ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private renderHUD(): void {
    this.ctx.save();
    this.ctx.font = '22px sans-serif';
    this.ctx.textBaseline = 'top';

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`分数: ${this.state.score}`, 20, 20);

    const mins = Math.floor(this.state.timeLeft / 60);
    const secs = this.state.timeLeft % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.ctx.textAlign = 'right';

    if (this.state.timeLeft < 60 && !this.state.ended) {
      const flash = Math.sin(this.frame * 0.3) > 0;
      this.ctx.fillStyle = flash ? '#ff3333' : '#ffffff';
    } else {
      this.ctx.fillStyle = '#ffffff';
    }
    this.ctx.fillText(timeStr, this.width - 20, 20);

    this.ctx.restore();
  }

  private renderEndScreen(): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2 - 100;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#ffffff';

    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.fillText('游戏结束', centerX, centerY - 80);

    this.ctx.font = '32px sans-serif';
    this.ctx.fillText(`总分: ${this.state.score}`, centerX, centerY - 10);

    const hitRate = this.state.totalLights > 0
      ? Math.round((this.state.hitLights / this.state.totalLights) * 100)
      : 0;
    this.ctx.fillText(`命中率: ${hitRate}%`, centerX, centerY + 30);

    const heatMapSize = 320;
    const heatX = centerX - heatMapSize / 2;
    const heatY = centerY + 70;

    this.ctx.font = '20px sans-serif';
    this.ctx.fillText('飞行轨迹热力图', centerX, heatY - 20);

    this.ctx.fillStyle = 'rgba(13, 27, 42, 0.8)';
    this.ctx.fillRect(heatX - 5, heatY - 5, heatMapSize + 10, heatMapSize + 10);
    this.ctx.strokeStyle = '#a0c4ff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(heatX - 5, heatY - 5, heatMapSize + 10, heatMapSize + 10);

    let maxCount = 0;
    for (const hp of this.state.heatPoints) {
      if (hp.count > maxCount) maxCount = hp.count;
    }
    if (maxCount === 0) maxCount = 1;

    const cellW = heatMapSize / HEAT_GRID;
    const cellH = heatMapSize / HEAT_GRID;
    for (const hp of this.state.heatPoints) {
      this.ctx.fillStyle = this.heatColor(hp.count, maxCount);
      this.ctx.fillRect(
        heatX + hp.x * cellW,
        heatY + hp.y * cellH,
        cellW + 1,
        cellH + 1
      );
    }

    this.ctx.fillStyle = '#a0c4ff';
    this.ctx.font = '18px sans-serif';
    this.ctx.fillText('按 R 键重新开始', centerX, heatY + heatMapSize + 40);

    this.ctx.restore();
  }

  private render(): void {
    this.renderBackground();
    this.windSystem.render(this.ctx);
    this.particles.render(this.ctx);
    this.butterfly.render(this.ctx);
    this.effectSystem.render(this.ctx);
    this.renderHUD();

    if (this.state.ended) {
      this.renderEndScreen();
    }
  }

  private loop = (now: number): void => {
    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    this.update(dt);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private startLoop(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
