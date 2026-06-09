import { Rabbit, Fox } from './entities';
import { World } from './world';

const INITIAL_RABBIT_COUNT = 20;
const INITIAL_FOX_COUNT = 3;
const MAX_FOX_COUNT = 6;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

class EntityManager {
  public rabbits: Rabbit[];
  public foxes: Fox[];

  constructor() {
    this.rabbits = [];
    this.foxes = [];
    this.initialize();
  }

  private initialize(): void {
    this.rabbits = [];
    this.foxes = [];
    for (let i = 0; i < INITIAL_RABBIT_COUNT; i++) {
      this.rabbits.push(new Rabbit());
    }
    for (let i = 0; i < INITIAL_FOX_COUNT; i++) {
      this.foxes.push(new Fox());
    }
  }

  public reset(): void {
    this.initialize();
  }

  public addFox(): boolean {
    if (this.foxes.length >= MAX_FOX_COUNT) return false;
    this.foxes.push(new Fox());
    return true;
  }

  public update(dt: number, world: World): void {
    for (const fox of this.foxes) {
      fox.update(dt, this.rabbits);
    }

    for (const rabbit of this.rabbits) {
      rabbit.update(dt, world, this.foxes);
    }

    for (const rabbit of this.rabbits) {
      if (!rabbit.alive) {
        rabbit.respawn();
      }
    }
  }

  public getAliveRabbitCount(): number {
    return this.rabbits.filter(r => r.alive).length;
  }

  public getTotalRabbitCount(): number {
    return this.rabbits.length;
  }

  public getAverageHunger(): number {
    const alive = this.rabbits.filter(r => r.alive);
    if (alive.length === 0) return 0;
    const sum = alive.reduce((acc, r) => acc + r.hunger, 0);
    return sum / alive.length;
  }

  public setFoxSpeedMultiplier(mult: number): void {
    for (const fox of this.foxes) {
      fox.speedMultiplier = mult;
    }
  }
}

class SimulationController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private heatmapCanvas: HTMLCanvasElement;
  private heatmapCtx: CanvasRenderingContext2D;
  private rabbitHeatmapCanvas: HTMLCanvasElement;
  private rabbitHeatmapCtx: CanvasRenderingContext2D;

  private rabbitCountEl: HTMLElement;
  private avgHungerEl: HTMLElement;
  private foxCountEl: HTMLElement;
  private foodCountEl: HTMLElement;
  private foxSpeedSlider: HTMLInputElement;
  private foxSpeedValue: HTMLElement;
  private addFoxBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;

  private entityManager: EntityManager;
  private world: World;

  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private rafId: number | null = null;

  constructor() {
    this.canvas = document.getElementById('simCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.heatmapCanvas = document.getElementById('heatmapCanvas') as HTMLCanvasElement;
    this.heatmapCtx = this.heatmapCanvas.getContext('2d')!;
    this.rabbitHeatmapCanvas = document.getElementById('rabbitHeatmapCanvas') as HTMLCanvasElement;
    this.rabbitHeatmapCtx = this.rabbitHeatmapCanvas.getContext('2d')!;

    this.rabbitCountEl = document.getElementById('rabbitCount')!;
    this.avgHungerEl = document.getElementById('avgHunger')!;
    this.foxCountEl = document.getElementById('foxCount')!;
    this.foodCountEl = document.getElementById('foodCount')!;
    this.foxSpeedSlider = document.getElementById('foxSpeedSlider') as HTMLInputElement;
    this.foxSpeedValue = document.getElementById('foxSpeedValue')!;
    this.addFoxBtn = document.getElementById('addFoxBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.entityManager = new EntityManager();
    this.world = new World();

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.foxSpeedSlider.addEventListener('input', () => {
      const val = parseFloat(this.foxSpeedSlider.value);
      this.foxSpeedValue.textContent = val.toFixed(1) + 'x';
      this.entityManager.setFoxSpeedMultiplier(val);
    });

    this.addFoxBtn.addEventListener('click', () => {
      if (!this.entityManager.addFox()) {
        this.addFoxBtn.disabled = true;
      }
      this.updateUI();
    });

    this.resetBtn.addEventListener('click', () => {
      this.entityManager.reset();
      this.world.reset();
      this.foxSpeedSlider.value = '1.0';
      this.foxSpeedValue.textContent = '1.0x';
      this.addFoxBtn.disabled = false;
      this.updateUI();
    });
  }

  private updateUI(): void {
    this.rabbitCountEl.textContent = `${this.entityManager.getAliveRabbitCount()}/${this.entityManager.getTotalRabbitCount()}`;
    this.avgHungerEl.textContent = `${Math.round(this.entityManager.getAverageHunger())}%`;
    this.foxCountEl.textContent = `${this.entityManager.foxes.length}`;
    this.foodCountEl.textContent = `${this.world.getActiveFoodCount()}`;
  }

  private update(dt: number): void {
    this.world.update(dt, this.entityManager.rabbits);
    this.entityManager.update(dt, this.world);
  }

  private render(): void {
    this.world.drawGround(this.ctx);
    this.world.drawFood(this.ctx);

    for (const rabbit of this.entityManager.rabbits) {
      rabbit.draw(this.ctx);
    }

    for (const fox of this.entityManager.foxes) {
      fox.draw(this.ctx);
    }

    this.world.drawHeatmap(this.heatmapCtx);
    this.world.drawRabbitHeatmap(this.rabbitHeatmapCtx);

    this.updateUI();
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.accumulator = 0;

    const loop = (now: number) => {
      const frameTime = Math.min(now - this.lastFrameTime, 100);
      this.lastFrameTime = now;
      this.accumulator += frameTime;

      while (this.accumulator >= FRAME_DURATION) {
        this.update(FRAME_DURATION / 1000);
        this.accumulator -= FRAME_DURATION;
      }

      this.render();
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

let controller: SimulationController | null = null;

window.addEventListener('DOMContentLoaded', () => {
  controller = new SimulationController();
  controller.start();
});

window.addEventListener('beforeunload', () => {
  if (controller) {
    controller.stop();
  }
});
