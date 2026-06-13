export interface DataPoint {
  id: number;
  dimensions: [number, number, number, number, number, number];
  category: string;
}

const CATEGORIES = ['星云', '流火', '深渊', '极光', '镇魂'] as const;
export type Category = typeof CATEGORIES[number];

const POINT_COUNT = 200;
const DIMENSION_COUNT = 6;

export class DataLoader {
  private data: DataPoint[] = [];

  constructor() {
    this.generateData();
  }

  generateData(): DataPoint[] {
    const points: DataPoint[] = [];
    const clusterCenters: Record<Category, number[]> = {};

    for (const cat of CATEGORIES) {
      clusterCenters[cat] = Array.from({ length: DIMENSION_COUNT }, () => Math.random());
    }

    for (let i = 0; i < POINT_COUNT; i++) {
      const category = CATEGORIES[i % CATEGORIES.length];
      const center = clusterCenters[category];
      const spread = 0.35;

      const dimensions: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
      for (let d = 0; d < DIMENSION_COUNT; d++) {
        const noise = (Math.random() - 0.5) * spread;
        const trend = Math.sin(i * 0.05 + d * 0.7) * 0.1;
        dimensions[d] = this.clamp(center[d] + noise + trend, 0, 1);
      }

      if (i % 23 === 0) {
        for (let d = 0; d < DIMENSION_COUNT; d++) {
          dimensions[d] = Math.random();
        }
      }

      points.push({
        id: i,
        dimensions,
        category
      });
    }

    this.data = points;
    return this.data;
  }

  sampleData(count: number): DataPoint[] {
    if (count >= this.data.length) {
      return [...this.data];
    }
    const indices = new Set<number>();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * this.data.length));
    }
    return this.data.filter((_, i) => indices.has(i));
  }

  getData(): DataPoint[] {
    return [...this.data];
  }

  getCategories(): readonly string[] {
    return CATEGORIES;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
