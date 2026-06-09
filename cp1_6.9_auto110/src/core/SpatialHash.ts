import * as THREE from 'three';

interface HashEntry {
  point: THREE.Vector3;
  data: unknown;
}

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, HashEntry[]>;

  constructor(cellSize: number = 1) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  private getKey(x: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cz}`;
  }

  clear(): void {
    this.grid.clear();
  }

  insert(point: THREE.Vector3, data: unknown): void {
    const key = this.getKey(point.x, point.z);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push({ point, data });
  }

  queryRadius(point: THREE.Vector3, radius: number): HashEntry[] {
    const results: HashEntry[] = [];
    const minX = Math.floor((point.x - radius) / this.cellSize);
    const maxX = Math.floor((point.x + radius) / this.cellSize);
    const minZ = Math.floor((point.z - radius) / this.cellSize);
    const maxZ = Math.floor((point.z + radius) / this.cellSize);
    const radiusSq = radius * radius;

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const key = `${cx},${cz}`;
        const cell = this.grid.get(key);
        if (!cell) continue;
        for (const entry of cell) {
          const dx = entry.point.x - point.x;
          const dz = entry.point.z - point.z;
          if (dx * dx + dz * dz <= radiusSq) {
            results.push(entry);
          }
        }
      }
    }
    return results;
  }
}
