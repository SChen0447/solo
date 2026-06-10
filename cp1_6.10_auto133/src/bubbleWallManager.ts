import { Bubble } from './bubble';
import type { AudioEngine } from './audioEngine';

interface GridConfig {
  cols: number;
  rows: number;
  gap: number;
  baseRadius: number;
}

const MIN_COLS = 8;
const MIN_ROWS = 6;
const MAX_BUBBLES = 100;
const DEFAULT_COLS = 10;
const DEFAULT_ROWS = 8;
const BUBBLE_GAP = 15;
const RADIUS_MIN = 25;
const RADIUS_MAX = 40;

const NOTE_SEMITONES = 24;
const C4_FREQUENCY = 261.6255653005986;

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function lerpColor(rowRatio: number): { h: number; s: number; l: number } {
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#0abde3'];
  const stops = [0, 0.33, 0.66, 1];

  let lowerIdx = 0;
  let upperIdx = colors.length - 1;
  for (let i = 0; i < stops.length - 1; i++) {
    if (rowRatio >= stops[i] && rowRatio <= stops[i + 1]) {
      lowerIdx = i;
      upperIdx = i + 1;
      break;
    }
  }

  const localT = (rowRatio - stops[lowerIdx]) / (stops[upperIdx] - stops[lowerIdx]);
  const lower = hexToRgb(colors[lowerIdx]);
  const upper = hexToRgb(colors[upperIdx]);

  const r = lower.r + (upper.r - lower.r) * localT;
  const g = lower.g + (upper.g - lower.g) * localT;
  const b = lower.b + (upper.b - lower.b) * localT;

  return rgbToHsl(r, g, b);
}

function getNoteFrequency(noteIndex: number): number {
  const clampedIndex = Math.max(0, Math.min(NOTE_SEMITONES - 1, noteIndex));
  return C4_FREQUENCY * Math.pow(2, clampedIndex / 12);
}

export class BubbleWallManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioEngine: AudioEngine;
  private bubbles: Bubble[] = [];
  private cols: number = DEFAULT_COLS;
  private rows: number = DEFAULT_ROWS;

  private hoveredBubble: Bubble | null = null;
  private animationFrameId: number | null = null;

  private gradient: CanvasGradient | null = null;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.audioEngine = audioEngine;

    this.resize();
    this.generateBubbles();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouch.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouch.bind(this), { passive: false });
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.resize();
    this.generateBubbles();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.gradient = this.ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    this.gradient.addColorStop(0, '#0f0c29');
    this.gradient.addColorStop(1, '#24243e');
  }

  private computeGridConfig(): GridConfig {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isSmallScreen = width < 600;
    const radiusScale = isSmallScreen ? 0.85 : 1;

    const targetCols = Math.max(MIN_COLS, DEFAULT_COLS);
    const targetRows = Math.max(MIN_ROWS, DEFAULT_ROWS);

    const maxDiameter = RADIUS_MAX * 2 * radiusScale;
    const minDiameter = RADIUS_MIN * 2 * radiusScale;

    const availableWidth = width - 80;
    const availableHeight = height - 120;

    let cols = targetCols;
    let rows = targetRows;

    const testDiameter = (availableWidth - (cols - 1) * BUBBLE_GAP) / cols;
    if (testDiameter < minDiameter) {
      cols = Math.max(MIN_COLS, Math.floor((availableWidth + BUBBLE_GAP) / (minDiameter + BUBBLE_GAP)));
    }

    const testDiameterY = (availableHeight - (rows - 1) * BUBBLE_GAP) / rows;
    if (testDiameterY < minDiameter) {
      rows = Math.max(MIN_ROWS, Math.floor((availableHeight + BUBBLE_GAP) / (minDiameter + BUBBLE_GAP)));
    }

    if (cols * rows > MAX_BUBBLES) {
      const ratio = cols / rows;
      rows = Math.max(MIN_ROWS, Math.floor(Math.sqrt(MAX_BUBBLES / ratio)));
      cols = Math.max(MIN_COLS, Math.floor(MAX_BUBBLES / rows));
    }

    const cellWidth = (availableWidth - (cols - 1) * BUBBLE_GAP) / cols;
    const cellHeight = (availableHeight - (rows - 1) * BUBBLE_GAP) / rows;
    const cellSize = Math.min(cellWidth, cellHeight);
    const baseRadius = Math.max(RADIUS_MIN * radiusScale, Math.min(RADIUS_MAX * radiusScale, cellSize / 2));

    return {
      cols,
      rows,
      gap: BUBBLE_GAP,
      baseRadius,
    };
  }

  private generateBubbles(): void {
    this.bubbles = [];
    const config = this.computeGridConfig();
    this.cols = config.cols;
    this.rows = config.rows;

    const totalWidth = this.cols * config.baseRadius * 2 + (this.cols - 1) * config.gap;
    const totalHeight = this.rows * config.baseRadius * 2 + (this.rows - 1) * config.gap;
    const startX = (window.innerWidth - totalWidth) / 2 + config.baseRadius;
    const startY = (window.innerHeight - totalHeight) / 2 + config.baseRadius;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const rowRatio = this.rows === 1 ? 0.5 : row / (this.rows - 1);
        const color = lerpColor(rowRatio);

        const hueFromHsl = color.h;
        const totalBubbles = this.cols * this.rows;
        const index = row * this.cols + col;
        const hue = (index / Math.max(1, totalBubbles - 1)) * 360;
        void hueFromHsl;

        const noteIndex = Math.floor((index / Math.max(1, totalBubbles)) * NOTE_SEMITONES);
        const frequency = getNoteFrequency(noteIndex);

        const radiusVariation = 0.8 + Math.random() * 0.4;
        const radius = config.baseRadius * radiusVariation;

        const x = startX + col * (config.baseRadius * 2 + config.gap);
        const y = startY + row * (config.baseRadius * 2 + config.gap);

        const bubble = new Bubble(
          {
            baseX: x,
            baseY: y,
            radius,
            color: { h: hue, s: 70, l: 60 },
            frequency,
          },
          this.audioEngine,
          row,
          col
        );

        this.bubbles.push(bubble);
      }
    }
  }

  private getBubbleAt(row: number, col: number): Bubble | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    const idx = row * this.cols + col;
    return this.bubbles[idx] || null;
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.processHover(x, y);
  }

  private handleTouch(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch);
    this.processHover(x, y);
  }

  private processHover(x: number, y: number): void {
    const now = performance.now();
    let foundBubble: Bubble | null = null;

    for (const bubble of this.bubbles) {
      if (bubble.containsPoint(x, y, now)) {
        foundBubble = bubble;
        break;
      }
    }

    if (foundBubble && foundBubble !== this.hoveredBubble) {
      foundBubble.triggerHover(now);
      this.hoveredBubble = foundBubble;
    } else if (!foundBubble) {
      this.hoveredBubble = null;
    }
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.processClick(x, y);
  }

  private processClick(x: number, y: number): void {
    const now = performance.now();

    for (const bubble of this.bubbles) {
      if (bubble.containsPoint(x, y, now)) {
        bubble.triggerClick(now);

        const neighbors = [
          this.getBubbleAt(bubble.row - 1, bubble.col),
          this.getBubbleAt(bubble.row + 1, bubble.col),
          this.getBubbleAt(bubble.row, bubble.col - 1),
          this.getBubbleAt(bubble.row, bubble.col + 1),
        ];

        for (const neighbor of neighbors) {
          if (neighbor) {
            neighbor.triggerNeighborClick(now);
          }
        }
        break;
      }
    }
  }

  private renderFrame = (): void => {
    const now = performance.now();
    const ctx = this.ctx;

    ctx.fillStyle = this.gradient || '#1a1a2e';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    for (const bubble of this.bubbles) {
      bubble.render(ctx, now);
    }

    this.animationFrameId = requestAnimationFrame(this.renderFrame);
  };

  public start(): void {
    if (this.animationFrameId === null) {
      this.renderFrame();
    }
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
