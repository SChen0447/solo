import { CellularAutomaton, SeedPoint } from './automaton';

export enum ColorTheme {
  Eden = 'eden',
  Dusk = 'dusk',
  Ocean = 'ocean',
  Lava = 'lava',
  Custom = 'custom'
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const THEME_PRESETS: Record<ColorTheme, ThemeColors> = {
  [ColorTheme.Eden]: { primary: '#00FF88', secondary: '#FF00AA', accent: '#7BFFD4' },
  [ColorTheme.Dusk]: { primary: '#FF7F7F', secondary: '#B39DDB', accent: '#FFD1DC' },
  [ColorTheme.Ocean]: { primary: '#00BFFF', secondary: '#7B68EE', accent: '#40E0D0' },
  [ColorTheme.Lava]: { primary: '#FF8C00', secondary: '#8B0000', accent: '#FF4500' },
  [ColorTheme.Custom]: { primary: '#00FF88', secondary: '#FF00AA', accent: '#7BFFD4' }
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 255, b: 136 };
}

function lerpColor(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, t: number): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t)
  };
}

interface CellRenderData {
  x: number;
  y: number;
  radius: number;
  color: { r: number; g: number; b: number };
  age: number;
}

export class GardenRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private theme: ThemeColors;
  private themeRgb: { primary: { r: number; g: number; b: number }; secondary: { r: number; g: number; b: number }; accent: { r: number; g: number; b: number } };
  private cellSize: number;
  private dirtyRegions: Map<string, boolean> = new Map();
  private cellJitter: Map<number, { jx: number; jy: number; radius: number }> = new Map();
  private statElements: {
    cells: HTMLElement;
    gen: HTMLElement;
    fps: HTMLElement;
  };

  constructor(canvas: HTMLCanvasElement, statElements: { cells: HTMLElement; gen: HTMLElement; fps: HTMLElement }) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.theme = THEME_PRESETS[ColorTheme.Eden];
    this.themeRgb = {
      primary: hexToRgb(this.theme.primary),
      secondary: hexToRgb(this.theme.secondary),
      accent: hexToRgb(this.theme.accent)
    };
    this.cellSize = 8;
    this.statElements = statElements;
    this.initJitter();
    this.clear();
  }

  private initJitter(): void {
    const cols = Math.floor(this.width / this.cellSize);
    const rows = Math.floor(this.height / this.cellSize);
    const total = cols * rows;
    for (let i = 0; i < total; i++) {
      this.cellJitter.set(i, {
        jx: (Math.random() - 0.5) * 0.5,
        jy: (Math.random() - 0.5) * 0.5,
        radius: 4 + Math.random() * 4
      });
    }
  }

  public setTheme(theme: ThemeColors): void {
    this.theme = theme;
    this.themeRgb = {
      primary: hexToRgb(theme.primary),
      secondary: hexToRgb(theme.secondary),
      accent: hexToRgb(theme.accent)
    };
    this.markAllDirty();
  }

  public getPrimaryColor(): string {
    return this.theme.primary;
  }

  private markAllDirty(): void {
    this.dirtyRegions.clear();
    this.dirtyRegions.set('all', true);
  }

  public clear(): void {
    this.ctx.fillStyle = '#0A0A0F';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.markAllDirty();
  }

  public setCellSize(size: number): void {
    this.cellSize = size;
    this.initJitter();
    this.markAllDirty();
  }

  public render(automaton: CellularAutomaton): void {
    const grid = automaton.getGrid();
    const ageGrid = automaton.getAgeGrid();
    const cols = automaton.getCols();
    const rows = automaton.getRows();
    const cs = this.cellSize;

    if (this.dirtyRegions.has('all')) {
      this.ctx.fillStyle = '#0A0A0F';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.dirtyRegions.delete('all');
    }

    const aliveCells: CellRenderData[] = [];
    const deadWithTraces: { x: number; y: number; alpha: number }[] = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const isAlive = grid[idx] === 1;
        const age = ageGrid[idx];

        const cx = x * cs + cs / 2;
        const cy = y * cs + cs / 2;
        const jitter = this.cellJitter.get(idx) || { jx: 0, jy: 0, radius: 6 };

        if (isAlive) {
          const colorT = Math.sin(x * 0.1 + Math.cos(y * 0.1) * 0.5 + 0.5) * 0.6 + age * 0.4;
          const color = lerpColor(this.themeRgb.primary, this.themeRgb.secondary, colorT);
          aliveCells.push({
            x: cx + jitter.jx,
            y: cy + jitter.jy,
            radius: jitter.radius * (0.7 + age * 0.3),
            color,
            age
          });
        } else if (age > 0.02) {
          deadWithTraces.push({
            x: cx + jitter.jx * 0.5,
            y: cy + jitter.jy * 0.5,
            alpha: 0.1 + age * 0.2
          });
        }
      }
    }

    this.drawDeadTraces(deadWithTraces);
    this.drawAliveCells(aliveCells);
    this.drawSeeds(automaton.getSeeds());
  }

  private drawDeadTraces(traces: { x: number; y: number; alpha: number }[]): void {
    const ctx = this.ctx;
    for (const t of traces) {
      ctx.fillStyle = `rgba(30, 20, 45, ${t.alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAliveCells(cells: CellRenderData[]): void {
    const ctx = this.ctx;
    const { primary, secondary, accent } = this.themeRgb;

    for (const cell of cells) {
      const { x, y, radius, color, age } = cell;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const innerColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.95)`;
      const midColor = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.6)`;
      const outerColor = `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0.05)`;

      gradient.addColorStop(0, innerColor);
      gradient.addColorStop(0.6, midColor);
      gradient.addColorStop(0.85, outerColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      const petalCount = 5 + Math.floor(age * 3);
      for (let p = 0; p < petalCount; p++) {
        const angle = (p / petalCount) * Math.PI * 2;
        const pr = radius * (0.7 + Math.sin(age * 10 + p) * 0.3);
        const px = x + Math.cos(angle) * pr * 0.4;
        const py = y + Math.sin(angle) * pr * 0.4;

        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(
          px + Math.cos(angle + 0.3) * pr * 0.5,
          py + Math.sin(angle + 0.3) * pr * 0.5,
          x + Math.cos(angle) * pr,
          y + Math.sin(angle) * pr
        );
        ctx.quadraticCurveTo(
          px + Math.cos(angle - 0.3) * pr * 0.5,
          py + Math.sin(angle - 0.3) * pr * 0.5,
          px,
          py
        );
      }
      ctx.fill();

      ctx.fillStyle = innerColor;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.15)`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawSeeds(seeds: SeedPoint[]): void {
    const ctx = this.ctx;
    const now = performance.now();
    const { primary, secondary } = this.themeRgb;

    for (const seed of seeds) {
      const elapsed = now - seed.createdAt;
      const lifeRatio = Math.min(elapsed / 2000, 1);
      const pixelX = seed.x * this.cellSize + this.cellSize / 2;
      const pixelY = seed.y * this.cellSize + this.cellSize / 2;
      const baseRadius = 12 + lifeRatio * 30;
      const alpha = 1 - lifeRatio * 0.7;

      for (let r = 0; r < 3; r++) {
        const waveRadius = baseRadius * (1 + r * 0.3);
        const waveAlpha = alpha * (1 - r * 0.3);
        const gradient = ctx.createRadialGradient(pixelX, pixelY, 0, pixelX, pixelY, waveRadius);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${waveAlpha * 0.9})`);
        gradient.addColorStop(0.3, `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${waveAlpha * 0.7})`);
        gradient.addColorStop(0.7, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${waveAlpha * 0.2})`);
        gradient.addColorStop(1, `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pixelX, pixelY, waveRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  public updateStats(aliveCount: number, generation: number, fps: number): void {
    this.statElements.cells.textContent = aliveCount.toLocaleString();
    this.statElements.gen.textContent = generation.toLocaleString();
    this.statElements.fps.textContent = fps.toFixed(0);

    const color = this.theme.primary;
    this.statElements.cells.style.color = color;
    this.statElements.gen.style.color = color;
    this.statElements.fps.style.color = color;
  }
}
