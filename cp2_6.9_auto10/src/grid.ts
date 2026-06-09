import { MaterialType, ParticleData, createParticle, isMaterialStatic } from './particle';

export class Grid {
  private cells: (ParticleData | null)[][];
  private width: number;
  private height: number;
  private cellSize: number;
  private gravityAngle: number = 0;
  private particleCount: number = 0;
  private frameAlternator: boolean = false;

  constructor(width: number, height: number, cellSize: number) {
    this.width = Math.floor(width / cellSize);
    this.height = Math.floor(height / cellSize);
    this.cellSize = cellSize;
    this.cells = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => null)
    );
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getGridWidth(): number {
    return this.width;
  }

  getGridHeight(): number {
    return this.height;
  }

  inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gx < this.width && gy >= 0 && gy < this.height;
  }

  getParticle(gx: number, gy: number): ParticleData | null {
    if (!this.inBounds(gx, gy)) return null;
    return this.cells[gy][gx];
  }

  setParticle(gx: number, gy: number, particle: ParticleData | null): void {
    if (!this.inBounds(gx, gy)) return;
    this.cells[gy][gx] = particle;
    if (particle) {
      particle.x = gx;
      particle.y = gy;
    }
  }

  swapParticles(x1: number, y1: number, x2: number, y2: number): void {
    const p1 = this.cells[y1][x1];
    const p2 = this.cells[y2][x2];
    this.cells[y1][x1] = p2;
    this.cells[y2][x2] = p1;
    if (p1) {
      p1.x = x2;
      p1.y = y2;
      p1.updated = true;
    }
    if (p2) {
      p2.x = x1;
      p2.y = y1;
      p2.updated = true;
    }
  }

  isEmpty(gx: number, gy: number): boolean {
    if (!this.inBounds(gx, gy)) return false;
    return this.cells[gy][gx] === null;
  }

  isLiquid(gx: number, gy: number): boolean {
    if (!this.inBounds(gx, gy)) return false;
    const p = this.cells[gy][gx];
    return p !== null && p.material === MaterialType.WATER;
  }

  setGravityAngle(angle: number): void {
    this.gravityAngle = Math.max(-90, Math.min(90, angle));
  }

  getGravityAngle(): number {
    return this.gravityAngle;
  }

  getGravityVector(): { gx: number; gy: number } {
    const rad = (this.gravityAngle * Math.PI) / 180;
    return {
      gx: Math.sin(rad),
      gy: Math.cos(rad)
    };
  }

  addParticle(px: number, py: number, material: MaterialType): boolean {
    const gx = Math.floor(px / this.cellSize);
    const gy = Math.floor(py / this.cellSize);
    if (!this.inBounds(gx, gy)) return false;
    if (this.cells[gy][gx] !== null) return false;
    const particle = createParticle(gx, gy, material);
    this.cells[gy][gx] = particle;
    this.particleCount++;
    return true;
  }

  removeParticlesInRadius(cx: number, cy: number, radius: number): void {
    const gCx = cx / this.cellSize;
    const gCy = cy / this.cellSize;
    const gRadius = radius / this.cellSize;
    const minX = Math.max(0, Math.floor(gCx - gRadius));
    const maxX = Math.min(this.width - 1, Math.ceil(gCx + gRadius));
    const minY = Math.max(0, Math.floor(gCy - gRadius));
    const maxY = Math.min(this.height - 1, Math.ceil(gCy + gRadius));
    const r2 = gRadius * gRadius;

    for (let gy = minY; gy <= maxY; gy++) {
      for (let gx = minX; gx <= maxX; gx++) {
        const dx = gx + 0.5 - gCx;
        const dy = gy + 0.5 - gCy;
        if (dx * dx + dy * dy <= r2) {
          if (this.cells[gy][gx] !== null) {
            this.cells[gy][gx] = null;
            this.particleCount--;
          }
        }
      }
    }
  }

  clear(): void {
    for (let gy = 0; gy < this.height; gy++) {
      for (let gx = 0; gx < this.width; gx++) {
        this.cells[gy][gx] = null;
      }
    }
    this.particleCount = 0;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getAllParticles(): ParticleData[] {
    const result: ParticleData[] = [];
    for (let gy = 0; gy < this.height; gy++) {
      for (let gx = 0; gx < this.width; gx++) {
        if (this.cells[gy][gx] !== null) {
          result.push(this.cells[gy][gx]!);
        }
      }
    }
    return result;
  }

  update(): void {
    this.frameAlternator = !this.frameAlternator;
    const { gx: gravX, gy: gravY } = this.getGravityVector();
    const downX = Math.sign(gravX);
    const downY = Math.sign(gravY);

    for (let gy = 0; gy < this.height; gy++) {
      const y = this.frameAlternator ? this.height - 1 - gy : gy;
      for (let gx = 0; gx < this.width; gx++) {
        const x = this.frameAlternator ? this.width - 1 - gx : gx;
        const particle = this.cells[y][x];
        if (particle === null || particle.updated || isMaterialStatic(particle.material)) {
          continue;
        }
        this.updateParticle(x, y, particle, downX, downY);
      }
    }

    for (let gy = 0; gy < this.height; gy++) {
      for (let gx = 0; gx < this.width; gx++) {
        if (this.cells[gy][gx] !== null) {
          this.cells[gy][gx]!.updated = false;
        }
      }
    }
  }

  private updateParticle(x: number, y: number, particle: ParticleData, dX: number, dY: number): void {
    if (particle.material === MaterialType.SAND) {
      this.updateSand(x, y, dX, dY);
    } else if (particle.material === MaterialType.WATER) {
      this.updateWater(x, y, dX, dY);
    }
  }

  private updateSand(x: number, y: number, dX: number, dY: number): void {
    const belowX = x + dX;
    const belowY = y + dY;

    if (this.canMoveTo(belowX, belowY)) {
      this.swapParticles(x, y, belowX, belowY);
      return;
    }

    const dirs = this.frameAlternator ? [-1, 1] : [1, -1];
    for (const side of dirs) {
      const diagX = x + dX + side;
      const diagY = y + dY;
      if (this.canMoveTo(diagX, diagY)) {
        this.swapParticles(x, y, diagX, diagY);
        return;
      }
    }
  }

  private updateWater(x: number, y: number, dX: number, dY: number): void {
    const belowX = x + dX;
    const belowY = y + dY;

    if (this.canMoveTo(belowX, belowY)) {
      this.swapParticles(x, y, belowX, belowY);
      return;
    }

    const dirs = this.frameAlternator ? [-1, 1] : [1, -1];
    for (const side of dirs) {
      const diagX = x + dX + side;
      const diagY = y + dY;
      if (this.canMoveTo(diagX, diagY)) {
        this.swapParticles(x, y, diagX, diagY);
        return;
      }
    }

    for (const side of dirs) {
      const sideX = x + side;
      const sideY = y;
      if (this.canMoveTo(sideX, sideY)) {
        this.swapParticles(x, y, sideX, sideY);
        return;
      }
    }
  }

  private canMoveTo(gx: number, gy: number): boolean {
    if (!this.inBounds(gx, gy)) return false;
    return this.cells[gy][gx] === null;
  }
}
