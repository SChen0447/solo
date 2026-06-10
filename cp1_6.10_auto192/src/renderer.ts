import type { SamplingPoint } from './dataManager';
import type { DataManager } from './dataManager';

interface PointRenderState {
  point: SamplingPoint;
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  currentColor: { r: number; g: number; b: number };
  targetColor: { r: number; g: number; b: number };
  currentPollution: number;
  targetPollution: number;
  animationStart: number;
  isSelected: boolean;
  breathePhase: number;
}

const COLOR_LEVELS = [
  { max: 20, color: { r: 102, g: 187, b: 106 } },
  { max: 40, color: { r: 255, g: 238, b: 88 } },
  { max: 60, color: { r: 255, g: 167, b: 38 } },
  { max: 80, color: { r: 239, g: 83, b: 80 } },
  { max: 100, color: { r: 183, g: 28, b: 28 } },
];

const ANIMATION_DURATION = 600;

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

function getColorForPollution(index: number): { r: number; g: number; b: number } {
  const clamped = Math.max(0, Math.min(100, index));
  for (let i = 0; i < COLOR_LEVELS.length; i++) {
    if (clamped <= COLOR_LEVELS[i].max) {
      const prev = i === 0 ? { max: 0, color: { r: 102, g: 187, b: 106 } } : COLOR_LEVELS[i - 1];
      const curr = COLOR_LEVELS[i];
      const range = curr.max - prev.max;
      const t = range === 0 ? 0 : (clamped - prev.max) / range;
      return {
        r: Math.round(prev.color.r + (curr.color.r - prev.color.r) * t),
        g: Math.round(prev.color.g + (curr.color.g - prev.color.g) * t),
        b: Math.round(prev.color.b + (curr.color.b - prev.color.b) * t),
      };
    }
  }
  return COLOR_LEVELS[COLOR_LEVELS.length - 1].color;
}

function getRadiusForPollution(index: number, base: number): number {
  const factor = 0.7 + (index / 100) * 0.6;
  return base * factor;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataManager: DataManager;
  private states: PointRenderState[] = [];
  private currentMonth: number = 0;
  private animationFrameId: number | null = null;
  private selectedPointId: number | null = null;
  private onPointClick: ((point: SamplingPoint | null) => void) | null = null;
  private viewOffsetX: number = 0;
  private viewOffsetY: number = 0;
  private viewScale: number = 1;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(canvas: HTMLCanvasElement, dataManager: DataManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.dataManager = dataManager;
    this.resize();
    this.initStates();
    this.bindEvents();
    this.startLoop();
  }

  setOnPointClick(callback: (point: SamplingPoint | null) => void): void {
    this.onPointClick = callback;
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private initStates(): void {
    const data = this.dataManager.getDataByMonth(this.currentMonth);
    const rect = this.canvas.getBoundingClientRect();
    const padding = 60;

    this.states = data.map((point) => {
      const normalizedX = (point.lng - 108) / 18;
      const normalizedY = (point.lat - 18) / 15;
      const x = padding + normalizedX * (rect.width - padding * 2);
      const y = rect.height - padding - normalizedY * (rect.height - padding * 2);
      const baseRadius = 6 + Math.random() * 6;
      const color = getColorForPollution(point.pollutionIndex);
      const radius = getRadiusForPollution(point.pollutionIndex, baseRadius);

      return {
        point,
        x,
        y,
        baseRadius,
        currentRadius: radius,
        targetRadius: radius,
        currentColor: { ...color },
        targetColor: { ...color },
        currentPollution: point.pollutionIndex,
        targetPollution: point.pollutionIndex,
        animationStart: 0,
        isSelected: false,
        breathePhase: Math.random() * Math.PI * 2,
      };
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      if (this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = false;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (e.buttons === 1) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.isDragging = true;
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('resize', () => {
      this.resize();
      this.repositionPoints();
    });
  }

  private repositionPoints(): void {
    const rect = this.canvas.getBoundingClientRect();
    const padding = 60;
    this.states.forEach((state) => {
      const normalizedX = (state.point.lng - 108) / 18;
      const normalizedY = (state.point.lat - 18) / 15;
      state.x = padding + normalizedX * (rect.width - padding * 2);
      state.y = rect.height - padding - normalizedY * (rect.height - padding * 2);
    });
  }

  resetView(): void {
    this.selectedPointId = null;
    this.states.forEach((s) => (s.isSelected = false));
    if (this.onPointClick) this.onPointClick(null);
  }

  handleClick(x: number, y: number): void {
    const tolerance = 5;
    let found: PointRenderState | null = null;

    for (const state of this.states) {
      const dx = x - state.x;
      const dy = y - state.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= state.currentRadius + tolerance) {
        found = state;
        break;
      }
    }

    this.states.forEach((s) => (s.isSelected = false));

    if (found) {
      found.isSelected = true;
      this.selectedPointId = found.point.id;
      if (this.onPointClick) {
        const monthData = this.dataManager.getDataByMonth(this.currentMonth);
        const point = monthData.find((p) => p.id === found!.point.id) || found.point;
        this.onPointClick(point);
      }
    } else {
      this.selectedPointId = null;
      if (this.onPointClick) this.onPointClick(null);
    }
  }

  render(monthIndex: number): void {
    const safeIndex = Math.max(0, Math.min(11, monthIndex));
    if (safeIndex === this.currentMonth && this.states.length > 0) return;
    this.currentMonth = safeIndex;

    const monthData = this.dataManager.getDataByMonth(safeIndex);
    const now = performance.now();

    monthData.forEach((point) => {
      const state = this.states.find((s) => s.point.id === point.id);
      if (state) {
        state.point = point;
        state.targetPollution = point.pollutionIndex;
        state.targetColor = getColorForPollution(point.pollutionIndex);
        state.targetRadius = getRadiusForPollution(point.pollutionIndex, state.baseRadius);
        state.animationStart = now;
      }
    });
  }

  private updateAnimations(now: number): void {
    this.states.forEach((state) => {
      if (state.animationStart > 0) {
        const elapsed = now - state.animationStart;
        if (elapsed >= ANIMATION_DURATION) {
          state.currentPollution = state.targetPollution;
          state.currentColor = { ...state.targetColor };
          state.currentRadius = state.targetRadius;
          state.animationStart = 0;
        } else {
          const t = easeInOut(elapsed / ANIMATION_DURATION);
          state.currentPollution =
            state.currentPollution + (state.targetPollution - state.currentPollution) * t;
          state.currentColor = {
            r: Math.round(state.currentColor.r + (state.targetColor.r - state.currentColor.r) * t),
            g: Math.round(state.currentColor.g + (state.targetColor.g - state.currentColor.g) * t),
            b: Math.round(state.currentColor.b + (state.targetColor.b - state.currentColor.b) * t),
          };
          state.currentRadius =
            state.currentRadius + (state.targetRadius - state.currentRadius) * t;
        }
      }
      state.breathePhase += 0.03;
    });
  }

  private drawBackground(): void {
    const rect = this.canvas.getBoundingClientRect();
    const gradient = this.ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#0b1a2e');
    gradient.addColorStop(1, '#1a3a5c');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    this.ctx.strokeStyle = 'rgba(0, 188, 212, 0.08)';
    this.ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = 0; x < rect.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, rect.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(rect.width, y);
      this.ctx.stroke();
    }
  }

  private drawPoints(): void {
    this.states.forEach((state) => {
      const breathe = 1 + Math.sin(state.breathePhase) * 0.1;
      const radius = state.currentRadius * breathe * (state.isSelected ? 1.5 : 1);
      const color = state.currentColor;

      this.ctx.beginPath();
      this.ctx.arc(state.x, state.y, radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.25)`;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(state.x, state.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.ctx.fill();

      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.stroke();
    });
  }

  private draw = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.drawBackground();
    this.drawPoints();
  };

  private startLoop(): void {
    const loop = (now: number) => {
      this.updateAnimations(now);
      this.draw();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
