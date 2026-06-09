import { BoidsSimulator, GroupStats } from './simulator';
import { Obstacle, Food } from './boids';

const COLORS = {
  background: '#1B1B2F',
  boid: '#00D4AA',
  boidEating: '#FF8C42',
  obstacle: 'rgba(136, 136, 136, 0.5)',
  obstacleHover: 'rgba(136, 136, 136, 0.7)',
  food: '#00FF88',
  trail: '#00D4AA',
};

const BOID_SIZE = 8;
const PULSE_PERIOD = 1500;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private simulator: BoidsSimulator;
  private lastTime: number;
  private frameCount: number;
  private fpsAccum: number;
  private currentFps: number;
  private draggedObstacle: Obstacle | null;
  private dragOffset: { x: number; y: number };
  private hoveredObstacle: Obstacle | null;
  private animationId: number;
  private dpr: number;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsAccum = 0;
    this.currentFps = 0;
    this.draggedObstacle = null;
    this.dragOffset = { x: 0, y: 0 };
    this.hoveredObstacle = null;
    this.animationId = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.resizeCanvas();
    this.simulator = new BoidsSimulator(
      this.canvas.width / this.dpr,
      this.canvas.height / this.dpr
    );

    this.bindEvents();
    this.start();
  }

  private resizeCanvas(): void {
    const wrapper = this.canvas.parentElement!;
    const cssWidth = wrapper.clientWidth;
    const cssHeight = wrapper.clientHeight;

    this.canvas.width = cssWidth * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.simulator) {
      this.simulator.setBounds(cssWidth, cssHeight);
    }
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    const sepSlider = document.getElementById('sep-slider') as HTMLInputElement;
    const aliSlider = document.getElementById('ali-slider') as HTMLInputElement;
    const cohSlider = document.getElementById('coh-slider') as HTMLInputElement;

    const sepValue = document.getElementById('sep-value')!;
    const aliValue = document.getElementById('ali-value')!;
    const cohValue = document.getElementById('coh-value')!;

    sepSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      sepValue.textContent = val.toFixed(1);
      this.simulator.setWeights({ separation: val });
    });

    aliSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      aliValue.textContent = val.toFixed(1);
      this.simulator.setWeights({ alignment: val });
    });

    cohSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      cohValue.textContent = val.toFixed(1);
      this.simulator.setWeights({ cohesion: val });
    });

    const toggleBtn = document.getElementById('toggle-panel')!;
    const panel = document.getElementById('control-panel')!;
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        panel.classList.toggle('mobile-open');
      } else {
        panel.classList.toggle('collapsed');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r') {
        this.simulator.clearFoods();
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const coords = this.getCanvasCoords(e);
      const obstacle = this.simulator.getObstacleAt(coords.x, coords.y);
      if (obstacle) {
        this.draggedObstacle = obstacle;
        obstacle.isDragging = true;
        this.dragOffset = {
          x: coords.x - obstacle.x,
          y: coords.y - obstacle.y,
        };
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const coords = this.getCanvasCoords(e);

      if (this.draggedObstacle) {
        this.draggedObstacle.x = coords.x - this.dragOffset.x;
        this.draggedObstacle.y = coords.y - this.dragOffset.y;
        const width = this.canvas.width / this.dpr;
        const height = this.canvas.height / this.dpr;
        this.draggedObstacle.x = Math.max(this.draggedObstacle.radius, Math.min(width - this.draggedObstacle.radius, this.draggedObstacle.x));
        this.draggedObstacle.y = Math.max(this.draggedObstacle.radius, Math.min(height - this.draggedObstacle.radius, this.draggedObstacle.y));
      } else {
        this.hoveredObstacle = this.simulator.getObstacleAt(coords.x, coords.y);
        this.canvas.style.cursor = this.hoveredObstacle ? 'grab' : 'default';
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.draggedObstacle) {
        this.draggedObstacle.isDragging = false;
        this.draggedObstacle = null;
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.draggedObstacle) return;
      const coords = this.getCanvasCoords(e);
      if (!this.simulator.getObstacleAt(coords.x, coords.y)) {
        this.simulator.addFood(coords.x, coords.y);
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch);
      const obstacle = this.simulator.getObstacleAt(coords.x, coords.y);
      if (obstacle) {
        this.draggedObstacle = obstacle;
        obstacle.isDragging = true;
        this.dragOffset = {
          x: coords.x - obstacle.x,
          y: coords.y - obstacle.y,
        };
      } else {
        this.simulator.addFood(coords.x, coords.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.draggedObstacle) return;
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch);
      this.draggedObstacle.x = coords.x - this.dragOffset.x;
      this.draggedObstacle.y = coords.y - this.dragOffset.y;
      const width = this.canvas.width / this.dpr;
      const height = this.canvas.height / this.dpr;
      this.draggedObstacle.x = Math.max(this.draggedObstacle.radius, Math.min(width - this.draggedObstacle.radius, this.draggedObstacle.x));
      this.draggedObstacle.y = Math.max(this.draggedObstacle.radius, Math.min(height - this.draggedObstacle.radius, this.draggedObstacle.y));
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      if (this.draggedObstacle) {
        this.draggedObstacle.isDragging = false;
        this.draggedObstacle = null;
      }
    });
  }

  private drawBoid(boid: { position: { x: number; y: number }; heading: number; trail: { x: number; y: number }[]; isEating: boolean }): void {
    const { x, y } = boid.position;
    const color = boid.isEating ? COLORS.boidEating : COLORS.boid;

    for (let i = 0; i < boid.trail.length - 1; i++) {
      const t = boid.trail[i];
      const nextT = boid.trail[i + 1];
      const alpha = (1 - i / boid.trail.length) * 0.6;
      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 2 - i * 0.1;
      this.ctx.beginPath();
      this.ctx.moveTo(t.x, t.y);
      this.ctx.lineTo(nextT.x, nextT.y);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(boid.heading);

    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = boid.isEating ? 12 : 6;
    this.ctx.beginPath();
    this.ctx.moveTo(BOID_SIZE, 0);
    this.ctx.lineTo(-BOID_SIZE * 0.6, -BOID_SIZE * 0.5);
    this.ctx.lineTo(-BOID_SIZE * 0.3, 0);
    this.ctx.lineTo(-BOID_SIZE * 0.6, BOID_SIZE * 0.5);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private drawObstacle(obstacle: Obstacle): void {
    const isHovered = obstacle === this.hoveredObstacle || obstacle.isDragging;
    this.ctx.beginPath();
    this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = isHovered ? COLORS.obstacleHover : COLORS.obstacle;
    this.ctx.fill();
    this.ctx.strokeStyle = isHovered ? 'rgba(136, 136, 136, 0.9)' : 'rgba(136, 136, 136, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (isHovered) {
      this.ctx.beginPath();
      this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius + obstacle.avoidRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(0, 212, 170, 0.2)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawFood(food: Food, now: number): void {
    const elapsed = now - food.createdAt;
    const pulse = 0.5 + 0.5 * Math.sin((elapsed / PULSE_PERIOD) * Math.PI * 2 + food.pulsePhase);
    const glowRadius = 8 + pulse * 8;

    const gradient = this.ctx.createRadialGradient(
      food.x, food.y, 0,
      food.x, food.y, glowRadius
    );
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');

    this.ctx.beginPath();
    this.ctx.arc(food.x, food.y, glowRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = COLORS.food;
    this.ctx.shadowColor = COLORS.food;
    this.ctx.shadowBlur = 10 + pulse * 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private updateUI(stats: GroupStats): void {
    document.getElementById('info-count')!.textContent = stats.totalCount.toString();
    document.getElementById('info-speed')!.textContent = stats.avgSpeed.toFixed(2);
    document.getElementById('info-cluster')!.textContent = stats.clusteringCoeff.toFixed(2);
    document.getElementById('info-fps')!.textContent = Math.round(this.currentFps).toString();

    document.getElementById('panel-avg-speed')!.textContent = stats.avgSpeed.toFixed(2);
    document.getElementById('panel-cluster')!.textContent = stats.clusteringCoeff.toFixed(2);
  }

  private render(): void {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.frameCount++;
    this.fpsAccum += dt;
    if (this.fpsAccum >= 500) {
      this.currentFps = (this.frameCount * 1000) / this.fpsAccum;
      this.frameCount = 0;
      this.fpsAccum = 0;
    }

    this.simulator.update(dt);

    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, width, height);

    for (const food of this.simulator.foods) {
      this.drawFood(food, now);
    }

    for (const obstacle of this.simulator.obstacles) {
      this.drawObstacle(obstacle);
    }

    for (const boid of this.simulator.boids) {
      this.drawBoid(boid);
    }

    this.updateUI(this.simulator.getStats());

    this.animationId = requestAnimationFrame(() => this.render());
  }

  private start(): void {
    this.animationId = requestAnimationFrame(() => this.render());
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
