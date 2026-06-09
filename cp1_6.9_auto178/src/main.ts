import p5 from 'p5';
import { GameManager } from './GameManager';

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function colorWithAlpha(p: p5, hex: string, alpha: number): p5.Color {
  const { r, g, b } = hexToRgb(hex);
  return p.color(r, g, b, alpha);
}

export const CONFIG = {
  HEX_SIZE: 40,
  GRID_COLS: 6,
  GRID_ROWS: 6,
  PIECE_RADIUS: 16,
  PIECE_GLOW: 4,
  BOARD_ROTATION_PERIOD: 30000,
  STAR_COUNT: 300,
  COLORS: {
    RED: '#ff3355',
    BLUE: '#3399ff',
    GREEN: '#33ff66',
    PURPLE: '#ff66ff',
    HEX_BORDER: '#88aaff',
    ENERGY_LOW: '#3355aa',
    ENERGY_HIGH: '#ff44aa',
    RESONANCE: '#cc66ff',
    BG_START: '#0a051a',
    BG_END: '#071018',
    SHIELD: '#00ff88'
  }
};

export type PieceColor = 'RED' | 'BLUE' | 'GREEN' | 'PURPLE';
export type PlayerId = 1 | 2;

export interface HexCoord {
  q: number;
  r: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  period: number;
}

let gameManager: GameManager;
let stars: Star[] = [];
let canvasWidth = 0;
let canvasHeight = 0;

function generateStars(p: p5): void {
  stars = [];
  for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * p.width,
      y: Math.random() * p.height,
      size: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      period: 500 + Math.random() * 1500
    });
  }
}

let bgCanvas: HTMLCanvasElement | null = null;

function buildBackgroundGradient(p: p5): void {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = p.width;
  bgCanvas.height = p.height;
  const ctx = bgCanvas.getContext('2d')!;
  const cx = p.width / 2;
  const cy = p.height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
  gradient.addColorStop(0, '#0a051a');
  gradient.addColorStop(1, '#071018');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, p.width, p.height);
}

function drawBackground(p: p5): void {
  if (bgCanvas && bgCanvas.width === p.width && bgCanvas.height === p.height) {
    (p as any).drawingContext.drawImage(bgCanvas, 0, 0);
  } else {
    buildBackgroundGradient(p);
    if (bgCanvas) {
      (p as any).drawingContext.drawImage(bgCanvas, 0, 0);
    }
  }
}

function drawStars(p: p5, time: number): void {
  for (const star of stars) {
    const alpha = 0.3 + 0.5 * Math.abs(Math.sin((time / star.period) * Math.PI * 2 + star.phase));
    p.noStroke();
    p.fill(255, 255, 255, alpha * 255);
    p.circle(star.x, star.y, star.size);
  }
}

const sketch = (p: p5) => {
  let lastTime = 0;

  p.setup = () => {
    canvasWidth = p.windowWidth;
    canvasHeight = p.windowHeight;
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('app');
    p.frameRate(60);
    p.pixelDensity(1);
    generateStars(p);
    gameManager = new GameManager(p);
  };

  p.windowResized = () => {
    canvasWidth = p.windowWidth;
    canvasHeight = p.windowHeight;
    p.resizeCanvas(canvasWidth, canvasHeight);
    generateStars(p);
    if (gameManager) {
      gameManager.onResize();
    }
  };

  p.draw = () => {
    const time = p.millis();
    const dt = time - lastTime;
    lastTime = time;

    drawBackground(p);
    drawStars(p, time);

    if (gameManager) {
      gameManager.update(dt, time);
      gameManager.render(time);
    }
  };

  p.mousePressed = () => {
    if (gameManager) gameManager.onMousePressed(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    if (gameManager) gameManager.onMouseDragged(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    if (gameManager) gameManager.onMouseReleased(p.mouseX, p.mouseY);
  };

  p.mouseMoved = () => {
    if (gameManager) gameManager.onMouseMoved(p.mouseX, p.mouseY);
  };
};

new p5(sketch);
