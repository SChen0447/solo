export interface PheromonePoint {
  x: number;
  y: number;
  strength: number;
  age: number;
}

export class PheromoneSystem {
  private points: PheromonePoint[] = [];
  private maxPoints: number = 3000;
  private decayRate: number = 0.01;

  constructor(maxPoints: number = 3000, decayRate: number = 0.01) {
    this.maxPoints = maxPoints;
    this.decayRate = decayRate;
  }

  addTrail(x: number, y: number, strength: number = 0.3): void {
    this.points.push({ x, y, strength, age: 0 });

    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
  }

  decayAll(): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].age++;
      this.points[i].strength -= this.decayRate;

      if (this.points[i].strength < 0.01) {
        this.points.splice(i, 1);
      }
    }
  }

  getPoints(): PheromonePoint[] {
    return this.points;
  }

  getAverageStrength(): number {
    if (this.points.length === 0) return 0;
    let total = 0;
    for (const point of this.points) {
      total += point.strength;
    }
    return Math.min(1, total / this.points.length);
  }

  getHeatmap(gridSize: number = 20, canvasWidth: number = 800, canvasHeight: number = 600): number[][] {
    const cols = Math.ceil(canvasWidth / gridSize);
    const rows = Math.ceil(canvasHeight / gridSize);
    const heatmap: number[][] = [];

    for (let i = 0; i < rows; i++) {
      heatmap[i] = [];
      for (let j = 0; j < cols; j++) {
        heatmap[i][j] = 0;
      }
    }

    for (const point of this.points) {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);

      if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
        heatmap[gridY][gridX] += point.strength;
      }
    }

    let maxHeat = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (heatmap[i][j] > maxHeat) {
          maxHeat = heatmap[i][j];
        }
      }
    }

    if (maxHeat > 0) {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          heatmap[i][j] = Math.min(1, heatmap[i][j] / maxHeat);
        }
      }
    }

    return heatmap;
  }

  sampleConcentration(x: number, y: number, radius: number = 15): number {
    let total = 0;
    let count = 0;

    for (const point of this.points) {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        total += point.strength * (1 - dist / radius);
        count++;
      }
    }

    return count > 0 ? total / count : 0;
  }

  clear(): void {
    this.points = [];
  }

  getCount(): number {
    return this.points.length;
  }
}
