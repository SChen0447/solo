import { Firefly } from './firefly';
import { Mushroom } from './mushroom';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const FIREFLY_COUNT = 60;
const MAX_MUSHROOMS = 3;
const MUSHROOM_SPAWN_MIN = 10000;
const MUSHROOM_SPAWN_MAX = 15000;
const FPS_DOWNGRADE_THRESHOLD = 45;

interface TerrainElement {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: string;
  type: 'stone' | 'grass';
}

interface TreeElement {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanopyElement {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fireflies: Firefly[];
  mushrooms: Mushroom[];
  cursorX: number;
  cursorY: number;
  isCursorInCanvas: boolean;
  lastFrameTime: number;
  fps: number;
  fpsSmoothed: number;
  performanceMode: 'high' | 'low';
  nextMushroomSpawn: number;
  startTime: number;
  private terrain: TerrainElement[];
  private trees: TreeElement[];
  private canopies: CanopyElement[];
  private bgGradient: CanvasGradient;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.fireflies = [];
    this.mushrooms = [];
    this.cursorX = CANVAS_WIDTH / 2;
    this.cursorY = CANVAS_HEIGHT / 2;
    this.isCursorInCanvas = false;
    this.lastFrameTime = 0;
    this.fps = 60;
    this.fpsSmoothed = 60;
    this.performanceMode = 'high';
    this.startTime = performance.now();
    this.nextMushroomSpawn = this.startTime + MUSHROOM_SPAWN_MIN + Math.random() * (MUSHROOM_SPAWN_MAX - MUSHROOM_SPAWN_MIN);

    this.bgGradient = this.createBackgroundGradient();
    this.terrain = this.generateTerrain();
    this.trees = this.generateTrees();
    this.canopies = this.generateCanopies();

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      this.fireflies.push(new Firefly());
    }
  }

  private createBackgroundGradient(): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0b1f0e');
    gradient.addColorStop(1, '#1a3a1f');
    return gradient;
  }

  private generateTerrain(): TerrainElement[] {
    const elements: TerrainElement[] = [];
    for (let i = 0; i < 40; i++) {
      elements.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        rx: 3 + Math.random() * 8,
        ry: 2 + Math.random() * 5,
        color: `rgba(30, 30, 30, ${0.5 + Math.random() * 0.3})`,
        type: 'stone'
      });
    }
    for (let i = 0; i < 60; i++) {
      elements.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        rx: 2 + Math.random() * 4,
        ry: 1 + Math.random() * 3,
        color: `rgba(20, 60, 25, ${0.4 + Math.random() * 0.3})`,
        type: 'grass'
      });
    }
    return elements;
  }

  private generateTrees(): TreeElement[] {
    const trees: TreeElement[] = [];
    const positions = [
      { x: 0, y: 0 },
      { x: CANVAS_WIDTH - 40, y: 0 },
      { x: 0, y: CANVAS_HEIGHT - 60 },
      { x: CANVAS_WIDTH - 35, y: CANVAS_HEIGHT - 50 },
      { x: 200, y: 250 },
      { x: 550, y: 180 },
      { x: 400, y: 420 }
    ];
    for (const pos of positions) {
      trees.push({
        x: pos.x,
        y: pos.y,
        width: 30 + Math.random() * 20,
        height: 50 + Math.random() * 40
      });
    }
    return trees;
  }

  private generateCanopies(): CanopyElement[] {
    const canopies: CanopyElement[] = [];
    for (const tree of this.trees) {
      const cx = tree.x + tree.width / 2;
      const cy = tree.y + tree.height / 3;
      for (let i = 0; i < 4; i++) {
        canopies.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 30,
          radius: 35 + Math.random() * 30,
          alpha: 0.15 + Math.random() * 0.2
        });
      }
    }
    for (let i = 0; i < 8; i++) {
      canopies.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        radius: 40 + Math.random() * 50,
        alpha: 0.08 + Math.random() * 0.1
      });
    }
    return canopies;
  }

  setCursor(x: number, y: number, inCanvas: boolean) {
    this.cursorX = x;
    this.cursorY = y;
    this.isCursorInCanvas = inCanvas;
  }

  handleClick(x: number, y: number) {
    const currentTime = performance.now();
    for (const mushroom of this.mushrooms) {
      if (mushroom.containsPoint(x, y)) {
        mushroom.triggerClick(currentTime);
      }
    }
  }

  getAttractedCount(): number {
    return this.fireflies.filter(f => f.isAttracted).length;
  }

  private drawBackground() {
    this.ctx.fillStyle = this.bgGradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawTerrain() {
    for (const el of this.terrain) {
      this.ctx.fillStyle = el.color;
      this.ctx.beginPath();
      this.ctx.ellipse(el.x, el.y, el.rx, el.ry, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawTrees() {
    for (const tree of this.trees) {
      this.ctx.fillStyle = '#3e2723';
      this.ctx.fillRect(tree.x, tree.y, tree.width, tree.height);
    }
  }

  private drawCanopies() {
    for (const canopy of this.canopies) {
      this.ctx.globalAlpha = canopy.alpha;
      this.ctx.fillStyle = '#0d2818';
      this.ctx.beginPath();
      this.ctx.arc(canopy.x, canopy.y, canopy.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawCursor() {
    if (!this.isCursorInCanvas) return;

    const glowGradient = this.ctx.createRadialGradient(
      this.cursorX, this.cursorY, 0,
      this.cursorX, this.cursorY, 40
    );
    glowGradient.addColorStop(0, 'rgba(255, 255, 200, 0.35)');
    glowGradient.addColorStop(0.5, 'rgba(255, 255, 180, 0.15)');
    glowGradient.addColorStop(1, 'rgba(255, 255, 180, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(this.cursorX, this.cursorY, 40, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 200, 0.6)';
    this.ctx.beginPath();
    this.ctx.arc(this.cursorX, this.cursorY, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 230, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(this.cursorX, this.cursorY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  update(currentTime: number) {
    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = currentTime;

    if (dt > 0) {
      const instantFps = 1 / dt;
      this.fpsSmoothed = this.fpsSmoothed * 0.9 + instantFps * 0.1;
      this.fps = this.fpsSmoothed;

      if (this.performanceMode === 'high' && this.fps < FPS_DOWNGRADE_THRESHOLD) {
        this.performanceMode = 'low';
      } else if (this.performanceMode === 'low' && this.fps > 55) {
        this.performanceMode = 'high';
      }
    }

    let mushroomAttractPoint: { x: number; y: number } | null = null;
    for (const mushroom of this.mushrooms) {
      const ap = mushroom.getAttractPoint();
      if (ap) {
        mushroomAttractPoint = ap;
        break;
      }
    }

    for (const firefly of this.fireflies) {
      firefly.update(dt, this.cursorX, this.cursorY, this.isCursorInCanvas, mushroomAttractPoint);
    }

    for (let i = this.mushrooms.length - 1; i >= 0; i--) {
      this.mushrooms[i].update(dt, currentTime);
      if (this.mushrooms[i].isExpired(currentTime)) {
        this.mushrooms.splice(i, 1);
      }
    }

    if (currentTime >= this.nextMushroomSpawn && this.mushrooms.length < MAX_MUSHROOMS) {
      this.mushrooms.push(new Mushroom(CANVAS_WIDTH, CANVAS_HEIGHT, currentTime));
      this.nextMushroomSpawn = currentTime + MUSHROOM_SPAWN_MIN + Math.random() * (MUSHROOM_SPAWN_MAX - MUSHROOM_SPAWN_MIN);
    }
  }

  render() {
    this.drawBackground();
    this.drawTerrain();
    this.drawCanopies();
    this.drawTrees();

    for (const mushroom of this.mushrooms) {
      mushroom.draw(this.ctx);
    }

    for (const firefly of this.fireflies) {
      firefly.draw(this.ctx, this.performanceMode);
    }

    this.drawCursor();
  }
}
