import { EcosystemManager } from './ecosystem';
import { Vec2 } from './creature';

interface Coral {
  x: number;
  baseY: number;
  height: number;
  width: number;
  color: string;
  phase: number;
  period: number;
  segments: number;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  wobblePhase: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private ecosystem: EcosystemManager;
  private mousePos: Vec2;

  private corals: Coral[];
  private bubbles: Bubble[];
  private ripples: Ripple[];

  private simTimeSeconds: number;
  private lastTime: number;
  private frameAccumulator: number;
  private readonly targetFPS: number = 30;
  private readonly frameTime: number = 1000 / 30;

  private hudFish: HTMLElement;
  private hudJellyfish: HTMLElement;
  private hudTurtle: HTMLElement;
  private hudTime: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.resizeCanvas();

    this.ecosystem = new EcosystemManager(this.width, this.height);
    this.mousePos = { x: this.width / 2, y: this.height / 2 };

    this.corals = [];
    this.bubbles = [];
    this.ripples = [];
    this.simTimeSeconds = 0;
    this.lastTime = performance.now();
    this.frameAccumulator = 0;

    this.hudFish = document.getElementById('count-fish')!;
    this.hudJellyfish = document.getElementById('count-jellyfish')!;
    this.hudTurtle = document.getElementById('count-turtle')!;
    this.hudTime = document.getElementById('sim-time')!;

    this.generateCorals();
    this.setupEventListeners();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private generateCorals(): void {
    this.corals = [];
    const coralCount = Math.floor(this.width / 40);
    const colors = [
      '#FF6B6B', '#FF8E72', '#FFA07A', '#FFB347',
      '#FFD93D', '#98D8AA', '#6BCB77', '#4ECDC4'
    ];

    for (let i = 0; i < coralCount; i++) {
      const height = 40 + Math.random() * 120;
      this.corals.push({
        x: (i / coralCount) * this.width + Math.random() * 30 - 15,
        baseY: this.height,
        height: height,
        width: 15 + Math.random() * 25,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random(),
        segments: 4 + Math.floor(Math.random() * 3)
      });
    }
  }

  private spawnBubble(): void {
    if (this.bubbles.length < 60 && Math.random() < 0.08) {
      this.bubbles.push({
        x: Math.random() * this.width,
        y: this.height + 10,
        radius: 2 + Math.random() * 5,
        speed: 20 + Math.random() * 20,
        alpha: 0.3 + Math.random() * 0.3,
        wobblePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 80,
      alpha: 0.8,
      life: 0.4,
      maxLife: 0.4
    });
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos.x = e.clientX - rect.left;
      this.mousePos.y = e.clientY - rect.top;
      this.ecosystem.setMousePos(this.mousePos.x, this.mousePos.y);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.addRipple(x, y);
      this.ecosystem.handleClick(x, y);
    });

    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.resizeCanvas();
      this.ecosystem.resize(this.width, this.height);
      this.generateCorals();
    });
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0A1A2E');
    gradient.addColorStop(1, '#01050A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCorals(time: number): void {
    for (const coral of this.corals) {
      const sway = Math.sin(time / coral.period + coral.phase) * 5;

      this.ctx.save();
      this.ctx.strokeStyle = '#A0D8EF';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillStyle = coral.color;

      this.ctx.beginPath();
      this.ctx.moveTo(coral.x - coral.width / 2, coral.baseY);

      const segs = coral.segments;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const y = coral.baseY - coral.height * t;
        const swayAmount = sway * t;
        const xOffset = swayAmount + (i % 2 === 0 ? -coral.width * 0.1 : coral.width * 0.1) * (1 - t);
        const x = coral.x + xOffset + Math.sin(time + coral.phase + i) * 2 * t;

        if (i === 0) {
          this.ctx.lineTo(x - coral.width * 0.3 * (1 - t), y);
        }
        this.ctx.lineTo(x - coral.width * 0.4 * (1 - t), y);
        this.ctx.lineTo(x + coral.width * 0.4 * (1 - t), y);
      }

      for (let i = segs; i >= 0; i--) {
        const t = i / segs;
        const y = coral.baseY - coral.height * t;
        const swayAmount = sway * t;
        const xOffset = swayAmount + (i % 2 === 0 ? coral.width * 0.1 : -coral.width * 0.1) * (1 - t);
        const x = coral.x + xOffset + Math.sin(time + coral.phase + i + 0.5) * 2 * t;
        this.ctx.lineTo(x + coral.width * 0.3 * (1 - t), y);
      }

      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawBubbles(dt: number, time: number): void {
    this.spawnBubble();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.y -= b.speed * dt;
      b.wobblePhase += dt * 2;
      b.x += Math.sin(b.wobblePhase) * 10 * dt;

      if (b.y < -20) {
        this.bubbles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = b.alpha;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.strokeStyle = 'rgba(160, 216, 239, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.globalAlpha = b.alpha * 0.8;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(
        b.x - b.radius * 0.3,
        b.y - b.radius * 0.3,
        b.radius * 0.25,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawFlashlight(): void {
    const gradient = this.ctx.createRadialGradient(
      this.mousePos.x,
      this.mousePos.y,
      0,
      this.mousePos.x,
      this.mousePos.y,
      80
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.4, 'rgba(200, 230, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');

    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      this.mousePos.x - 80,
      this.mousePos.y - 80,
      160,
      160
    );
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(this.mousePos.x, this.mousePos.y, 3, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= dt;
      r.radius = r.maxRadius * (1 - r.life / r.maxLife);
      r.alpha = (r.life / r.maxLife) * 0.6;

      if (r.life <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = r.alpha;
      this.ctx.strokeStyle = '#A0D8EF';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.globalAlpha = r.alpha * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private updateHUD(): void {
    const stats = this.ecosystem.getStats();
    this.hudFish.textContent = stats.fish.toString();
    this.hudJellyfish.textContent = stats.jellyfish.toString();
    this.hudTurtle.textContent = stats.turtle.toString();

    const totalMinutes = Math.floor(this.simTimeSeconds);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    this.hudTime.textContent =
      hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
  }

  private loop(currentTime: number): void {
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.frameAccumulator += delta;

    while (this.frameAccumulator >= this.frameTime) {
      const dt = this.frameTime / 1000;
      const timeInSeconds = currentTime / 1000;

      this.ecosystem.update(dt);
      this.simTimeSeconds += dt * 60;

      this.drawBackground();
      this.drawCorals(timeInSeconds);
      this.drawBubbles(dt, timeInSeconds);
      this.ecosystem.render(this.ctx);
      this.drawRipples(dt);
      this.drawFlashlight();

      this.frameAccumulator -= this.frameTime;
    }

    this.updateHUD();
    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
