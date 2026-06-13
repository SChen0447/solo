import { Harp } from './harp';
import { Ocean } from './ocean';
import { Sand } from './sand';
import { RGB, rgbToString, randomRange, clamp } from './utils';

const CLOUD_COUNT = 5;
const CLOUD_MIN_OPACITY = 0.2;
const CLOUD_MAX_OPACITY = 0.3;
const CLOUD_SPEED = 8;

const SKY_TOP: RGB = { r: 100, g: 149, b: 237 };
const SKY_BOTTOM: RGB = { r: 70, g: 130, b: 180 };

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  speed: number;
  phase: number;
}

interface FPSCounter {
  lastTime: number;
  frameCount: number;
  fps: number;
}

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private harp!: Harp;
  private ocean!: Ocean;
  private sand!: Sand;
  private clouds: Cloud[] = [];
  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;
  private fpsCounter: FPSCounter = { lastTime: 0, frameCount: 0, fps: 0 };
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastFootprintTime: number = 0;
  private readonly FOOTPRINT_INTERVAL = 80;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.init();
  }

  init(): void {
    this.setupCanvas();
    this.createModules();
    this.createClouds();
    this.setupEventListeners();
    this.startGameLoop();
  }

  private setupCanvas(): void {
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
  }

  private createModules(): void {
    this.harp = new Harp(this.ctx, this.width, this.height);
    this.ocean = new Ocean(this.ctx, this.width, this.height);
    this.sand = new Sand(this.ctx, this.width, this.height);
  }

  private createClouds(): void {
    this.clouds = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      this.clouds.push({
        x: randomRange(-this.width * 0.5, this.width * 1.5),
        y: randomRange(this.height * 0.05, this.height * 0.25),
        width: randomRange(100, 200),
        height: randomRange(30, 60),
        opacity: randomRange(CLOUD_MIN_OPACITY, CLOUD_MAX_OPACITY),
        speed: randomRange(CLOUD_SPEED * 0.5, CLOUD_SPEED * 1.5),
        phase: randomRange(0, Math.PI * 2)
      });
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });

    this.canvas.addEventListener('click', () => {
      Harp.resumeAudio();
      Sand.resumeAudio();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.lastFrameTime = performance.now();
      }
    });
  }

  handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.harp.resize(this.width, this.height);
    this.ocean.resize(this.width, this.height);
    this.sand.resize(this.width, this.height);
  }

  handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    this.tryAddFootprint();
  }

  handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    this.tryAddFootprint();
  }

  private tryAddFootprint(): void {
    const now = performance.now();
    if (now - this.lastFootprintTime < this.FOOTPRINT_INTERVAL) return;

    if (this.sand.isInSandArea(this.mousePosition.y)) {
      this.sand.addFootprint(this.mousePosition.x, this.mousePosition.y);
      this.lastFootprintTime = now;
    }
  }

  private startGameLoop(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private gameLoop(timestamp: number): void {
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    this.update(timestamp);
    this.updateFPS(timestamp);
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  private updateFPS(timestamp: number): void {
    this.fpsCounter.frameCount++;
    if (timestamp - this.fpsCounter.lastTime >= 1000) {
      this.fpsCounter.fps = this.fpsCounter.frameCount;
      this.fpsCounter.frameCount = 0;
      this.fpsCounter.lastTime = timestamp;
    }
  }

  private update(timestamp: number): void {
    const clampedDelta = clamp(timestamp - this.lastFrameTime, 0, 50);

    this.clouds.forEach((cloud) => {
      cloud.x += cloud.speed * (clampedDelta / 1000);
      cloud.phase += clampedDelta * 0.001;
      if (cloud.x > this.width + cloud.width) {
        cloud.x = -cloud.width * 1.5;
        cloud.y = randomRange(this.height * 0.05, this.height * 0.25);
      }
    });

    const harpBounds = this.harp.getBounds();
    const oceanTriggers = this.ocean.update(clampedDelta, harpBounds);
    this.harp.update(clampedDelta, oceanTriggers);
    this.sand.update(clampedDelta);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderSky();
    this.renderClouds();
    this.ocean.render();
    this.harp.render();
    this.sand.render();
  }

  private renderSky(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    gradient.addColorStop(0, rgbToString(SKY_TOP));
    gradient.addColorStop(1, rgbToString(SKY_BOTTOM));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderClouds(): void {
    const ctx = this.ctx;

    this.clouds.forEach((cloud) => {
      const driftY = Math.sin(cloud.phase) * 10;

      ctx.save();
      ctx.globalAlpha = cloud.opacity;

      const gradient = ctx.createRadialGradient(
        cloud.x, cloud.y + driftY, 0,
        cloud.x, cloud.y + driftY, cloud.width / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        cloud.x, cloud.y + driftY,
        cloud.width / 2, cloud.height / 2,
        0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        cloud.x - cloud.width * 0.25, cloud.y + driftY + 5,
        cloud.width * 0.35, cloud.height * 0.45,
        0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(
        cloud.x + cloud.width * 0.25, cloud.y + driftY - 5,
        cloud.width * 0.3, cloud.height * 0.4,
        0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const app = new App(canvas);

  window.addEventListener('beforeunload', () => {
    app.destroy();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
