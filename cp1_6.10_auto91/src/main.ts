import { Rope } from './rope';
import { Particle } from './particle';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MAX_ROPES = 8;
const BG_GRADIENT_START = '#16213e';
const BG_GRADIENT_END = '#1a1a2e';
const BORDER_COLOR = '#0d0d1a';
const TEXT_COLOR = '#00ff88';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ropes: Rope[];
  private particles: Particle[];
  private pendingAnchor: { x: number; y: number } | null;
  private mouseX: number;
  private mouseY: number;
  private isMouseDown: boolean;
  private activeDragRope: Rope | null;
  private lastTime: number;
  private fpsFrames: number;
  private fpsTime: number;
  private currentFps: number;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ropes = [];
    this.particles = [];
    this.pendingAnchor = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.activeDragRope = null;
    this.lastTime = performance.now();
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.currentFps = 60;

    this.init();
    this.bindEvents();
    this.loop();
  }

  private init(): void {
    const startX = 50;
    const startY = 100;
    const endX = startX + 19 * 20;
    const endY = startY;
    const initialRope = new Rope(startX, startY, endX, endY, 20, 20, true, true, false);
    this.ropes.push(initialRope);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);
    this.isMouseDown = true;
    this.mouseX = coords.x;
    this.mouseY = coords.y;

    for (let i = this.ropes.length - 1; i >= 0; i--) {
      const rope = this.ropes[i];
      if (rope.startDrag(coords.x, coords.y, 10)) {
        this.activeDragRope = rope;
        break;
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);
    this.mouseX = coords.x;
    this.mouseY = coords.y;

    if (this.activeDragRope) {
      this.activeDragRope.updateDrag(coords.x, coords.y);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isMouseDown = false;

    if (this.activeDragRope) {
      this.activeDragRope.endDrag();
      this.activeDragRope = null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.addAnchor(this.mouseX, this.mouseY);
    }
  }

  private addAnchor(x: number, y: number): void {
    if (this.ropes.length >= MAX_ROPES) return;

    if (!this.pendingAnchor) {
      this.pendingAnchor = { x, y };
    } else {
      const startX = this.pendingAnchor.x;
      const startY = this.pendingAnchor.y;
      const newRope = new Rope(startX, startY, x, y, 20, 20, false, true, true);
      this.ropes.push(newRope);
      this.pendingAnchor = null;
    }
  }

  private update(dt: number): void {
    for (const rope of this.ropes) {
      const newParticles = rope.update(dt);
      this.particles.push(...newParticles);
    }

    for (const particle of this.particles) {
      particle.update(dt);
    }

    this.particles = this.particles.filter((p) => !p.dead);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, BG_GRADIENT_START);
    gradient.addColorStop(1, BG_GRADIENT_END);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.strokeStyle = BORDER_COLOR;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawRopes(): void {
    for (const rope of this.ropes) {
      rope.draw(this.ctx);
    }
  }

  private drawParticles(): void {
    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }
  }

  private drawPendingAnchor(): void {
    if (this.pendingAnchor) {
      const size = 10;
      this.ctx.save();
      this.ctx.fillStyle = '#cccccc';
      this.ctx.globalAlpha = 0.7;
      this.ctx.beginPath();
      this.ctx.moveTo(this.pendingAnchor.x, this.pendingAnchor.y - size * 0.6);
      this.ctx.lineTo(this.pendingAnchor.x - size / 2, this.pendingAnchor.y + size * 0.4);
      this.ctx.lineTo(this.pendingAnchor.x + size / 2, this.pendingAnchor.y + size * 0.4);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawUI(): void {
    this.ctx.save();
    this.ctx.font = '14px monospace';
    this.ctx.fillStyle = TEXT_COLOR;
    this.ctx.fillText(`FPS: ${this.currentFps}`, 10, 24);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Ropes: ${this.ropes.length}`, CANVAS_WIDTH - 10, 24);
    this.ctx.restore();
  }

  private draw(): void {
    this.drawBackground();
    this.drawRopes();
    this.drawParticles();
    this.drawPendingAnchor();
    this.drawUI();
  }

  private updateFps(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.05) dt = 0.05;

    this.updateFps(dt);
    this.update(dt);
    this.draw();

    requestAnimationFrame(() => this.loop());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
