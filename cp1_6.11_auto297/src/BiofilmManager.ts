export interface BiofilmUpdateParams {
  temperature: number;
  ph: number;
  sulfide: number;
}

export class BiofilmManager {
  private grid: Map<string, number> = new Map();
  private gridSize: number;
  private radius: number;
  private centerX: number;
  private centerY: number;
  private cellsPerSide: number;
  private totalCells: number = 0;

  constructor(centerX: number, centerY: number, radius: number = 80, gridSize: number = 8) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.gridSize = gridSize;
    this.cellsPerSide = Math.ceil((radius * 2) / gridSize);
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid.clear();
    this.totalCells = 0;
    for (let gy = 0; gy < this.cellsPerSide; gy++) {
      for (let gx = 0; gx < this.cellsPerSide; gx++) {
        const cellCenterX = this.centerX - this.radius + gx * this.gridSize + this.gridSize / 2;
        const cellCenterY = this.centerY - this.radius + gy * this.gridSize + this.gridSize / 2;
        const dx = cellCenterX - this.centerX;
        const dy = cellCenterY - this.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= this.radius) {
          this.grid.set(`${gx},${gy}`, 0);
          this.totalCells++;
        }
      }
    }
  }

  public resize(centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.initializeGrid();
  }

  private isPhSuitable(ph: number): boolean {
    return ph >= 6 && ph <= 8;
  }

  public update(dt: number, params: BiofilmUpdateParams): void {
    const { ph, sulfide } = params;
    const suitable = this.isPhSuitable(ph);
    if (!suitable) {
      return;
    }
    const baseRate = 0.05;
    const sulfideBonus = sulfide * 0.3;
    const growthRate = baseRate + sulfideBonus;
    for (const [key, density] of this.grid) {
      const [gxStr, gyStr] = key.split(',');
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      const cellCenterX = this.centerX - this.radius + gx * this.gridSize + this.gridSize / 2;
      const cellCenterY = this.centerY - this.radius + gy * this.gridSize + this.gridSize / 2;
      const dx = cellCenterX - this.centerX;
      const dy = cellCenterY - this.centerY;
      const distRatio = Math.sqrt(dx * dx + dy * dy) / this.radius;
      const distanceFactor = 1 - distRatio * 0.5;
      let neighborBonus = 0;
      const neighbors = [
        `${gx - 1},${gy}`, `${gx + 1},${gy}`,
        `${gx},${gy - 1}`, `${gx},${gy + 1}`,
      ];
      let neighborCount = 0;
      for (const nk of neighbors) {
        const nd = this.grid.get(nk);
        if (nd !== undefined) {
          neighborBonus += nd;
          neighborCount++;
        }
      }
      if (neighborCount > 0) {
        neighborBonus = (neighborBonus / neighborCount) * 0.3;
      }
      const finalRate = growthRate * distanceFactor * (1 + neighborBonus);
      const newDensity = Math.min(1, density + finalRate * dt);
      this.grid.set(key, newDensity);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const [key, density] of this.grid) {
      if (density <= 0.01) continue;
      const [gxStr, gyStr] = key.split(',');
      const gx = parseInt(gxStr, 10);
      const gy = parseInt(gyStr, 10);
      const x = this.centerX - this.radius + gx * this.gridSize;
      const y = this.centerY - this.radius + gy * this.gridSize;
      const cellCenterX = x + this.gridSize / 2;
      const cellCenterY = y + this.gridSize / 2;
      const dx = cellCenterX - this.centerX;
      const dy = cellCenterY - this.centerY;
      const distRatio = Math.sqrt(dx * dx + dy * dy) / this.radius;
      const alpha = density * 0.85 * (1 - distRatio * 0.3);
      const t = density;
      const r = Math.round(255);
      const g = Math.round(lerp(179, 140, t));
      const b = Math.round(lerp(71, 0, t));
      const gradient = ctx.createRadialGradient(
        cellCenterX, cellCenterY, 0,
        cellCenterX, cellCenterY, this.gridSize * 0.8
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 2, y - 2, this.gridSize + 4, this.gridSize + 4);
    }
    ctx.restore();
  }

  public getCoverageRatio(): number {
    if (this.totalCells === 0) return 0;
    let coveredCells = 0;
    for (const density of this.grid.values()) {
      if (density > 0.5) {
        coveredCells++;
      }
    }
    return coveredCells / this.totalCells;
  }

  public getGrid(): Map<string, number> {
    return this.grid;
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getRadius(): number {
    return this.radius;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
