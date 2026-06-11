import type { Particle, Building, TreeData } from '@/types';

const GRID_RESOLUTION = 50;
const BLUR_RADIUS = 2;

function lerpColor(color1: number[], color2: number[], t: number): number[] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * t),
    Math.round(color1[1] + (color2[1] - color1[1]) * t),
    Math.round(color1[2] + (color2[2] - color1[2]) * t),
  ];
}

function getHeatColor(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  
  const colors = [
    { pos: 0.0, rgb: [33, 150, 243] },
    { pos: 0.3, rgb: [0, 200, 220] },
    { pos: 0.5, rgb: [76, 175, 80] },
    { pos: 0.7, rgb: [255, 193, 7] },
    { pos: 0.85, rgb: [255, 87, 34] },
    { pos: 1.0, rgb: [244, 67, 54] },
  ];

  for (let i = 0; i < colors.length - 1; i++) {
    if (v >= colors[i].pos && v <= colors[i + 1].pos) {
      const t = (v - colors[i].pos) / (colors[i + 1].pos - colors[i].pos);
      const rgb = lerpColor(colors[i].rgb, colors[i + 1].rgb, t);
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  return 'rgb(33, 150, 243)';
}

export class HeatmapOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridSize: number;
  private gridResolution: number = GRID_RESOLUTION;
  private densityGrid: number[][] = [];

  constructor(canvas: HTMLCanvasElement, gridSize: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gridSize = gridSize;
    this.initGrid();
  }

  private initGrid(): void {
    this.densityGrid = [];
    for (let i = 0; i < this.gridResolution; i++) {
      this.densityGrid[i] = [];
      for (let j = 0; j < this.gridResolution; j++) {
        this.densityGrid[i][j] = 0;
      }
    }
  }

  private worldToGrid(x: number, z: number): { gx: number; gz: number } {
    const half = this.gridSize / 2;
    const gx = Math.floor(((x + half) / this.gridSize) * this.gridResolution);
    const gz = Math.floor(((z + half) / this.gridSize) * this.gridResolution);
    return { gx, gz };
  }

  private computeDensity(particles: Particle[]): void {
    this.initGrid();
    const radius = 1.5;

    for (const p of particles) {
      if (!p.alive || p.captured) continue;
      if (p.y > 25) continue;

      const { gx, gz } = this.worldToGrid(p.x, p.z);
      
      for (let di = -radius; di <= radius; di++) {
        for (let dj = -radius; dj <= radius; dj++) {
          const ni = gx + di;
          const nj = gz + dj;
          if (ni < 0 || ni >= this.gridResolution || nj < 0 || nj >= this.gridResolution) continue;
          
          const dist = Math.sqrt(di * di + dj * dj);
          if (dist <= radius) {
            const weight = 1 - dist / radius;
            this.densityGrid[ni][nj] += weight * 0.8;
          }
        }
      }
    }
  }

  private blurGrid(): void {
    const temp: number[][] = [];
    for (let i = 0; i < this.gridResolution; i++) {
      temp[i] = [];
      for (let j = 0; j < this.gridResolution; j++) {
        temp[i][j] = 0;
      }
    }

    for (let i = 0; i < this.gridResolution; i++) {
      for (let j = 0; j < this.gridResolution; j++) {
        let sum = 0;
        let count = 0;
        for (let di = -BLUR_RADIUS; di <= BLUR_RADIUS; di++) {
          for (let dj = -BLUR_RADIUS; dj <= BLUR_RADIUS; dj++) {
            const ni = i + di;
            const nj = j + dj;
            if (ni >= 0 && ni < this.gridResolution && nj >= 0 && nj < this.gridResolution) {
              sum += this.densityGrid[ni][nj];
              count++;
            }
          }
        }
        temp[i][j] = sum / count;
      }
    }
    this.densityGrid = temp;
  }

  private findMaxDensity(): number {
    let max = 0;
    for (let i = 0; i < this.gridResolution; i++) {
      for (let j = 0; j < this.gridResolution; j++) {
        if (this.densityGrid[i][j] > max) {
          max = this.densityGrid[i][j];
        }
      }
    }
    return max || 1;
  }

  private drawHeatmap(maxDensity: number): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cellW = w / this.gridResolution;
    const cellH = h / this.gridResolution;

    this.ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.gridResolution; i++) {
      for (let j = 0; j < this.gridResolution; j++) {
        const density = this.densityGrid[i][j];
        const normalized = density / maxDensity;
        
        const alpha = Math.min(0.85, normalized * 0.9);
        const color = getHeatColor(normalized);
        
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(i * cellW, j * cellH, cellW + 0.5, cellH + 0.5);
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private drawBuildingOutlines(buildings: Building[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const half = this.gridSize / 2;

    for (const b of buildings) {
      const left = ((b.x - b.width / 2 + half) / this.gridSize) * w;
      const top = ((b.z - b.depth / 2 + half) / this.gridSize) * h;
      const bw = (b.width / this.gridSize) * w;
      const bh = (b.depth / this.gridSize) * h;

      this.ctx.fillStyle = 'rgba(180, 180, 180, 0.7)';
      this.ctx.fillRect(left, top, bw, bh);
      this.ctx.strokeStyle = 'rgba(120, 120, 120, 0.9)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(left, top, bw, bh);
    }
  }

  private drawTreeOutlines(trees: TreeData[]): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const half = this.gridSize / 2;

    for (const t of trees) {
      const cx = ((t.x + half) / this.gridSize) * w;
      const cy = ((t.z + half) / this.gridSize) * h;
      const r = (t.crownRadius / this.gridSize) * w;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(34, 139, 34, 0.5)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(50, 205, 50, 0.7)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  private drawWindArrow(): void {
    const w = this.canvas.width;
    const x = w - 25;
    const y = 25;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(x - 15, y);
    this.ctx.lineTo(x + 15, y);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + 15, y);
    this.ctx.lineTo(x + 8, y - 5);
    this.ctx.lineTo(x + 8, y + 5);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.font = '10px sans-serif';
    this.ctx.fillText('风', x - 4, y - 8);
    this.ctx.restore();
  }

  render(particles: Particle[], buildings: Building[], trees: TreeData[]): void {
    this.computeDensity(particles);
    this.blurGrid();
    const maxDensity = this.findMaxDensity();
    this.drawHeatmap(maxDensity);
    this.drawBuildingOutlines(buildings);
    this.drawTreeOutlines(trees);
    this.drawWindArrow();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
