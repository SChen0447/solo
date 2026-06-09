import { PhysicsEngine, GRID_WIDTH, GRID_HEIGHT, Particle } from './physics';
import { ElementType, ELEMENT_CONFIGS, createElement, getElementColor } from './elements';

const HISTORY_MAX = 10;
const HISTORY_INTERVAL = 100;
const CELL_BASE = 10;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private engine: PhysicsEngine;
  private currentElement: ElementType = ElementType.SAND;

  private cellSize: number = CELL_BASE;
  private zoom: number = 1.0;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private isMouseDown: boolean = false;
  private isRightDown: boolean = false;
  private isShiftDown: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastGridX: number = -1;
  private lastGridY: number = -1;
  private fillStartX: number = -1;
  private fillStartY: number = -1;
  private fillEndX: number = -1;
  private fillEndY: number = -1;
  private isFilling: boolean = false;
  private fillQueue: Array<{ x: number; y: number }> = [];
  private fillTimer: number | null = null;

  private accelerated: boolean = false;
  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly physicsStep: number = 1000 / 60;

  private historyStack: Array<any[][]> = [];
  private historyCounter: number = 0;
  private isClearing: boolean = false;

  private statsPanel: HTMLElement;
  private seedCountEl: HTMLElement;
  private fpsValueEl: HTMLElement;
  private stepCountEl: HTMLElement;
  private flashOverlay: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.engine = new PhysicsEngine();

    this.statsPanel = document.getElementById('statsPanel') as HTMLElement;
    this.seedCountEl = document.getElementById('seedCount') as HTMLElement;
    this.fpsValueEl = document.getElementById('fpsValue') as HTMLElement;
    this.stepCountEl = document.getElementById('stepCount') as HTMLElement;
    this.flashOverlay = document.getElementById('flashOverlay') as HTMLElement;

    this.resizeCanvas();
    this.setupEventListeners();
    this.centerCanvas();
    this.pushHistory();
    this.loop(performance.now());
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreenCanvas.width = rect.width * dpr;
    this.offscreenCanvas.height = rect.height * dpr;
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private centerCanvas(): void {
    const container = this.canvas.parentElement!;
    const rect = container.getBoundingClientRect();
    const worldWidth = GRID_WIDTH * this.cellSize * this.zoom;
    const worldHeight = GRID_HEIGHT * this.cellSize * this.zoom;
    this.offsetX = (rect.width - worldWidth) / 2;
    this.offsetY = (rect.height - worldHeight) / 2;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.centerCanvas();
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.isRightDown = false;
    });

    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.isShiftDown = true;
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.isShiftDown = false;
    });

    document.querySelectorAll('.element-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.element-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const el = (btn as HTMLElement).dataset.element!;
        this.currentElement = this.elementFromString(el);
      });
    });

    document.getElementById('clearBtn')!.addEventListener('click', () => {
      if (!this.isClearing) this.clearWorld();
    });

    document.getElementById('speedToggle')!.addEventListener('click', () => {
      this.accelerated = !this.accelerated;
      document.getElementById('speedToggle')!.classList.toggle('active', this.accelerated);
      this.statsPanel.classList.toggle('accelerated', this.accelerated);
    });
  }

  private elementFromString(s: string): ElementType {
    switch (s) {
      case 'sand': return ElementType.SAND;
      case 'water': return ElementType.WATER;
      case 'lava': return ElementType.LAVA;
      case 'wood': return ElementType.WOOD;
      case 'gunpowder': return ElementType.GUNPOWDER;
      default: return ElementType.SAND;
    }
  }

  private screenToGrid(sx: number, sy: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = sx - rect.left - this.offsetX;
    const y = sy - rect.top - this.offsetY;
    return {
      x: Math.floor(x / (this.cellSize * this.zoom)),
      y: Math.floor(y / (this.cellSize * this.zoom)),
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.screenToGrid(e.clientX, e.clientY);
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (e.button === 0) {
      this.isMouseDown = true;
      if (this.isShiftDown) {
        this.isFilling = true;
        this.fillStartX = x;
        this.fillStartY = y;
        this.fillEndX = x;
        this.fillEndY = y;
      } else {
        this.placeElement(x, y);
      }
    } else if (e.button === 2) {
      this.isRightDown = true;
      this.removeElement(x, y);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isMouseDown = false;
      if (this.isFilling) {
        this.isFilling = false;
        this.startFillAnimation();
      }
    } else if (e.button === 2) {
      this.isRightDown = false;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.screenToGrid(e.clientX, e.clientY);
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (this.isFilling) {
      this.fillEndX = x;
      this.fillEndY = y;
    } else if (this.isMouseDown && !this.isShiftDown) {
      if (x !== this.lastGridX || y !== this.lastGridY) {
        this.placeElement(x, y);
        this.lastGridX = x;
        this.lastGridY = y;
      }
    } else if (this.isRightDown) {
      this.removeElement(x, y);
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * delta));
    const rect = this.canvas.getBoundingClientRect();
    const mouseRelX = e.clientX - rect.left;
    const mouseRelY = e.clientY - rect.top;
    const worldX = (mouseRelX - this.offsetX) / (this.cellSize * this.zoom);
    const worldY = (mouseRelY - this.offsetY) / (this.cellSize * this.zoom);
    this.zoom = newZoom;
    this.offsetX = mouseRelX - worldX * this.cellSize * this.zoom;
    this.offsetY = mouseRelY - worldY * this.cellSize * this.zoom;
  }

  private placeElement(x: number, y: number): void {
    if (!this.engine.inBounds(x, y)) return;
    if (this.engine.grid[y][x].type !== ElementType.EMPTY) return;
    const el = createElement(this.currentElement);
    this.engine.setElement(x, y, el);
    this.engine.addSplashParticles(x, y, ELEMENT_CONFIGS[this.currentElement].color);
  }

  private removeElement(x: number, y: number): void {
    if (!this.engine.inBounds(x, y)) return;
    if (this.engine.grid[y][x].type === ElementType.EMPTY) return;
    const color = ELEMENT_CONFIGS[this.engine.grid[y][x].type].color;
    this.engine.addSplashParticles(x, y, color);
    this.engine.grid[y][x] = createElement(ElementType.EMPTY);
  }

  private startFillAnimation(): void {
    if (this.fillTimer) {
      clearInterval(this.fillTimer);
      this.fillTimer = null;
    }

    const x1 = Math.max(0, Math.min(GRID_WIDTH - 1, Math.min(this.fillStartX, this.fillEndX)));
    const x2 = Math.max(0, Math.min(GRID_WIDTH - 1, Math.max(this.fillStartX, this.fillEndX)));
    const y1 = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.min(this.fillStartY, this.fillEndY)));
    const y2 = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.max(this.fillStartY, this.fillEndY)));

    const w = x2 - x1 + 1;
    const h = y2 - y1 + 1;
    if (w < 2 || h < 2) return;

    this.fillQueue = [];
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        this.fillQueue.push({ x, y });
      }
    }

    for (let i = this.fillQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.fillQueue[i], this.fillQueue[j]] = [this.fillQueue[j], this.fillQueue[i]];
    }

    this.fillTimer = window.setInterval(() => {
      const batch = this.fillQueue.splice(0, 5);
      for (const p of batch) {
        this.placeElement(p.x, p.y);
      }
      if (this.fillQueue.length === 0 && this.fillTimer) {
        clearInterval(this.fillTimer);
        this.fillTimer = null;
      }
    }, 50);
  }

  private clearWorld(): void {
    this.isClearing = true;
    this.engine.clearWithAnimation(
      (_row) => {},
      () => {
        this.isClearing = false;
      }
    );
  }

  private pushHistory(): void {
    this.historyStack.push(this.engine.cloneState());
    if (this.historyStack.length > HISTORY_MAX) {
      this.historyStack.shift();
    }
  }

  private undo(): void {
    if (this.historyStack.length <= 1) return;
    this.historyStack.pop();
    const prev = this.historyStack[this.historyStack.length - 1];
    this.engine.restoreState(prev);
    this.flashScreen();
  }

  private flashScreen(): void {
    this.flashOverlay.classList.add('flash');
    setTimeout(() => {
      this.flashOverlay.classList.remove('flash');
    }, 50);
  }

  private updatePhysics(dt: number): void {
    const stepsPerFrame = this.accelerated ? 2 : 1;
    this.accumulator += dt;
    while (this.accumulator >= this.physicsStep) {
      for (let i = 0; i < stepsPerFrame; i++) {
        this.engine.step();
      }
      this.accumulator -= this.physicsStep;
      this.historyCounter++;
      if (this.historyCounter >= HISTORY_INTERVAL) {
        this.historyCounter = 0;
        this.pushHistory();
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    const cellSize = this.cellSize;
    const gridLineWidth = this.zoom < 1.0 ? 0.3 : 0.5;

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const el = this.engine.grid[y][x];
        if (el.type !== ElementType.EMPTY) {
          const color = getElementColor(el.type, x * 31 + y * 17);
          ctx.fillStyle = color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    ctx.strokeStyle = 'rgba(102, 102, 102, 0.2)';
    ctx.lineWidth = gridLineWidth;
    ctx.beginPath();
    for (let x = 0; x <= GRID_WIDTH; x++) {
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, GRID_HEIGHT * cellSize);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(GRID_WIDTH * cellSize, y * cellSize);
    }
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FF6600';
    ctx.strokeRect(-2, -2, GRID_WIDTH * cellSize + 4, GRID_HEIGHT * cellSize + 4);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(0, 0, GRID_WIDTH * cellSize, GRID_HEIGHT * cellSize);

    if (this.isFilling) {
      const x1 = Math.min(this.fillStartX, this.fillEndX);
      const x2 = Math.max(this.fillStartX, this.fillEndX);
      const y1 = Math.min(this.fillStartY, this.fillEndY);
      const y2 = Math.max(this.fillStartY, this.fillEndY);
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
      ctx.lineWidth = 2 / this.zoom;
      ctx.setLineDash([5 / this.zoom, 3 / this.zoom]);
      ctx.strokeRect(
        x1 * cellSize,
        y1 * cellSize,
        (x2 - x1 + 1) * cellSize,
        (y2 - y1 + 1) * cellSize
      );
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.1)';
      ctx.fillRect(
        x1 * cellSize,
        y1 * cellSize,
        (x2 - x1 + 1) * cellSize,
        (y2 - y1 + 1) * cellSize
      );
    }

    this.renderParticles(ctx);

    ctx.restore();

    this.renderCursor(rect);

    this.updateStats();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const cellSize = this.cellSize;
    for (const p of this.engine.particles as Particle[]) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(
        p.x * cellSize,
        p.y * cellSize,
        p.size * (cellSize / 10),
        p.size * (cellSize / 10)
      );
    }
    ctx.globalAlpha = 1;
  }

  private renderCursor(rect: DOMRect): void {
    const ctx = this.ctx;
    const mx = this.mouseX - rect.left;
    const my = this.mouseY - rect.top;
    if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) return;

    const lensRadius = 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mx, my, lensRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.7)';
    ctx.lineWidth = 1.5;
    const crossSize = 12;
    ctx.beginPath();
    ctx.moveTo(mx - crossSize, my);
    ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my);
    ctx.lineTo(mx + crossSize, my);
    ctx.moveTo(mx, my - crossSize);
    ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4);
    ctx.lineTo(mx, my + crossSize);
    ctx.stroke();

    const dotColor = ELEMENT_CONFIGS[this.currentElement].color;
    ctx.fillStyle = dotColor;
    const previewSize = this.cellSize * this.zoom;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(mx - previewSize / 2, my - previewSize / 2, previewSize, previewSize);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private updateStats(): void {
    this.seedCountEl.textContent = this.engine.getSeedCount().toString();
    this.stepCountEl.textContent = this.engine.stepCount.toString();
    this.fpsValueEl.textContent = Math.round(this.fps).toString();
  }

  private loop = (time: number): void => {
    const dt = time - this.lastTime;
    this.lastTime = time;

    this.frameCount++;
    if (time - this.lastFpsTime >= 500) {
      this.fps = (this.frameCount * 1000) / (time - this.lastFpsTime);
      this.frameCount = 0;
      this.lastFpsTime = time;
    }

    this.updatePhysics(dt);
    this.render();

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
