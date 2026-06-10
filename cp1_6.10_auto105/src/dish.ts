import {
  Cell,
  Grid,
  RuleMode,
  Species,
  SPECIES_A,
  SPECIES_B,
  SPECIES_C,
  SPECIES_COLORS,
  SPECIES_EMPTY,
  adaptGridToRule,
  countSpecies,
  createEmptyGrid,
  evolveGrid,
} from './rules';

interface DotPattern {
  canvas: HTMLCanvasElement;
}

export interface DishStats {
  generation: number;
  elapsedMs: number;
  counts: Record<Species, number>;
  ratios: Record<Species, number>;
}

export class CultureDish {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private grid: Grid;
  private cellSize: number;
  private gridW: number;
  private gridH: number;
  public generation: number = 0;
  private ruleMode: RuleMode = 'predator';
  public temperature: number = 20;
  private startTime: number = Date.now();
  private imageData: ImageData;
  private dotPattern: DotPattern | null = null;
  private bgColor = { r: 10, g: 15, b: 30 };
  private gridColor = { r: 26, g: 42, b: 58 };
  private onStatsChange: ((stats: DishStats) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, cellSize: number = 8) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.cellSize = cellSize;
    this.gridW = Math.floor(canvas.width / cellSize);
    this.gridH = Math.floor(canvas.height / cellSize);
    this.grid = createEmptyGrid(this.gridW, this.gridH);
    this.imageData = ctx.createImageData(canvas.width, canvas.height);
    this.buildDotPattern();
    this.seedInitial();
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  setStatsCallback(cb: (stats: DishStats) => void): void {
    this.onStatsChange = cb;
  }

  private buildDotPattern(): void {
    const size = 16;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const cx = c.getContext('2d')!;
    cx.fillStyle = 'rgba(255,255,255,0.1)';
    cx.beginPath();
    cx.arc(size / 2, size / 2, 1, 0, Math.PI * 2);
    cx.fill();
    this.dotPattern = { canvas: c };
  }

  seedInitial(): void {
    this.grid = createEmptyGrid(this.gridW, this.gridH);
    const centerX = this.gridW / 2;
    const centerY = this.gridH / 2;
    const radiusPx = 120;
    const radiusCells = radiusPx / this.cellSize;
    const speciesList: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
    for (const sp of speciesList) {
      let placed = 0;
      let attempts = 0;
      while (placed < 200 && attempts < 5000) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radiusCells;
        const gx = Math.floor(centerX + Math.cos(angle) * r);
        const gy = Math.floor(centerY + Math.sin(angle) * r);
        if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) continue;
        const idx = gy * this.gridW + gx;
        if (this.grid.cells[idx].species === SPECIES_EMPTY) {
          this.grid.cells[idx] = { species: sp, age: 0, state: 0 };
          placed++;
        }
      }
    }
    this.generation = 0;
    this.startTime = Date.now();
  }

  reset(): void {
    this.seedInitial();
  }

  setRule(mode: RuleMode): void {
    if (mode !== this.ruleMode) {
      this.ruleMode = mode;
      adaptGridToRule(this.grid, mode);
    }
  }

  getRule(): RuleMode {
    return this.ruleMode;
  }

  setTemperature(t: number): void {
    this.temperature = Math.max(0, Math.min(100, t));
  }

  setCellSize(size: number): void {
    const clamped = Math.max(6, Math.min(16, size));
    this.cellSize = clamped;
    this.gridW = Math.floor(this.canvas.width / clamped);
    this.gridH = Math.floor(this.canvas.height / clamped);
    this.seedInitial();
  }

  getCellSize(): number {
    return this.cellSize;
  }

  step(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.grid = evolveGrid(this.grid, this.ruleMode, this.temperature);
      this.generation++;
    }
  }

  injectRandomCells(): void {
    const speciesList: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
    const sp = speciesList[Math.floor(Math.random() * 3)];
    let placed = 0;
    let attempts = 0;
    while (placed < 50 && attempts < 2000) {
      attempts++;
      const gx = Math.floor(Math.random() * this.gridW);
      const gy = Math.floor(Math.random() * this.gridH);
      const idx = gy * this.gridW + gx;
      if (this.grid.cells[idx].species === SPECIES_EMPTY) {
        this.grid.cells[idx] = { species: sp, age: 0, state: 0 };
        placed++;
      }
    }
  }

  applyToxin(): void {
    const cIndices: number[] = [];
    for (let i = 0; i < this.grid.cells.length; i++) {
      if (this.grid.cells[i].species === SPECIES_C) cIndices.push(i);
    }
    const killCount = Math.floor(cIndices.length * 0.1);
    for (let i = 0; i < killCount; i++) {
      if (cIndices.length === 0) break;
      const pick = Math.floor(Math.random() * cIndices.length);
      const idx = cIndices[pick];
      this.grid.cells[idx] = { species: SPECIES_EMPTY, age: 0, state: 0 };
      cIndices.splice(pick, 1);
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return;
    if (Math.random() < 0.5) {
      const speciesList: Species[] = [SPECIES_A, SPECIES_B, SPECIES_C];
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || nx >= this.gridW || ny < 0 || ny >= this.gridH) continue;
          const idx = ny * this.gridW + nx;
          if (this.grid.cells[idx].species === SPECIES_EMPTY && Math.random() < 0.5) {
            this.grid.cells[idx] = {
              species: speciesList[Math.floor(Math.random() * 3)],
              age: 0,
              state: 0,
            };
          }
        }
      }
    } else {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || nx >= this.gridW || ny < 0 || ny >= this.gridH) continue;
          const idx = ny * this.gridW + nx;
          if (this.grid.cells[idx].species !== SPECIES_EMPTY && Math.random() < 0.7) {
            this.grid.cells[idx] = { species: SPECIES_EMPTY, age: 0, state: 0 };
          }
        }
      }
    }
  }

  getStats(): DishStats {
    const counts = countSpecies(this.grid);
    const total = counts[SPECIES_A] + counts[SPECIES_B] + counts[SPECIES_C] || 1;
    return {
      generation: this.generation,
      elapsedMs: Date.now() - this.startTime,
      counts,
      ratios: {
        [SPECIES_EMPTY]: counts[SPECIES_EMPTY] / this.grid.cells.length,
        [SPECIES_A]: counts[SPECIES_A] / total,
        [SPECIES_B]: counts[SPECIES_B] / total,
        [SPECIES_C]: counts[SPECIES_C] / total,
      },
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  render(): void {
    const data = this.imageData.data;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cs = this.cellSize;
    const bg = this.bgColor;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = bg.r;
      data[i + 1] = bg.g;
      data[i + 2] = bg.b;
      data[i + 3] = 255;
    }
    const dotAlpha = Math.floor(0.1 * 255);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (px % 16 === 8 && py % 16 === 8) {
          const idx = (py * w + px) * 4;
          data[idx] = Math.min(255, bg.r + 40);
          data[idx + 1] = Math.min(255, bg.g + 50);
          data[idx + 2] = Math.min(255, bg.b + 70);
          data[idx + 3] = dotAlpha;
        }
      }
    }
    const gc = this.gridColor;
    for (let gx = 0; gx <= this.gridW; gx++) {
      const px = gx * cs;
      if (px >= w) continue;
      for (let py = 0; py < h; py++) {
        const idx = (py * w + px) * 4;
        data[idx] = gc.r;
        data[idx + 1] = gc.g;
        data[idx + 2] = gc.b;
        data[idx + 3] = 255;
      }
    }
    for (let gy = 0; gy <= this.gridH; gy++) {
      const py = gy * cs;
      if (py >= h) continue;
      for (let px = 0; px < w; px++) {
        const idx = (py * w + px) * 4;
        data[idx] = gc.r;
        data[idx + 1] = gc.g;
        data[idx + 2] = gc.b;
        data[idx + 3] = 255;
      }
    }
    const radius = Math.max(1, Math.floor(cs * 0.4));
    const r2 = radius * radius;
    const spColors = [
      SPECIES_COLORS[SPECIES_EMPTY],
      SPECIES_COLORS[SPECIES_A],
      SPECIES_COLORS[SPECIES_B],
      SPECIES_COLORS[SPECIES_C],
    ].map((hex) => this.hexToRgb(hex));
    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const cell: Cell = this.grid.cells[gy * this.gridW + gx];
        if (cell.species === SPECIES_EMPTY) continue;
        const cx = gx * cs + Math.floor(cs / 2);
        const cy = gy * cs + Math.floor(cs / 2);
        const col = spColors[cell.species];
        const y0 = Math.max(0, cy - radius);
        const y1 = Math.min(h - 1, cy + radius);
        const x0 = Math.max(0, cx - radius);
        const x1 = Math.min(w - 1, cx + radius);
        for (let py = y0; py <= y1; py++) {
          for (let px = x0; px <= x1; px++) {
            const dx = px - cx;
            const dy = py - cy;
            if (dx * dx + dy * dy <= r2) {
              const idx = (py * w + px) * 4;
              data[idx] = col.r;
              data[idx + 1] = col.g;
              data[idx + 2] = col.b;
              data[idx + 3] = 255;
            }
          }
        }
        if (cell.state === 1) {
          const fire = { r: 255, g: 220, b: 80 };
          for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
              const dx = px - cx;
              const dy = py - cy;
              if (dx * dx + dy * dy <= r2 && Math.random() < 0.5) {
                const idx = (py * w + px) * 4;
                data[idx] = fire.r;
                data[idx + 1] = fire.g;
                data[idx + 2] = fire.b;
                data[idx + 3] = 255;
              }
            }
          }
        }
      }
    }
    this.ctx.putImageData(this.imageData, 0, 0);
    if (this.onStatsChange) {
      this.onStatsChange(this.getStats());
    }
  }
}
