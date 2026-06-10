import { BuildingData } from './CityGrid';

export interface WindVector {
  x: number;
  z: number;
  speed: number;
}

export interface WindFieldData {
  direction: number;
  baseSpeed: number;
  gridSize: number;
  worldSize: number;
  vectors: WindVector[][];
}

export class WindField {
  private data: WindFieldData;
  private readonly resolution = 64;
  private baseSpeed = 2.5;
  private direction = 0;
  private buildings: BuildingData[] = [];

  constructor(worldSize: number) {
    this.data = {
      direction: 0,
      baseSpeed: this.baseSpeed,
      gridSize: this.resolution,
      worldSize,
      vectors: this.createEmptyVectors()
    };
    this.computeField();
  }

  private createEmptyVectors(): WindVector[][] {
    const grid: WindVector[][] = [];
    for (let i = 0; i < this.resolution; i++) {
      grid[i] = [];
      for (let j = 0; j < this.resolution; j++) {
        grid[i][j] = { x: 0, z: 0, speed: 0 };
      }
    }
    return grid;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public setDirection(radians: number): void {
    this.direction = radians;
    this.data.direction = radians;
    this.computeField();
  }

  public getDirection(): number {
    return this.direction;
  }

  public setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
    this.data.baseSpeed = speed;
    this.computeField();
  }

  public setBuildings(buildings: BuildingData[]): void {
    this.buildings = buildings;
    this.computeField();
  }

  public getData(): WindFieldData {
    return this.data;
  }

  private worldToGrid(wx: number, wz: number): { gx: number; gz: number } {
    const half = this.data.worldSize / 2;
    const gx = ((wx + half) / this.data.worldSize) * this.resolution;
    const gz = ((wz + half) / this.data.worldSize) * this.resolution;
    return { gx, gz };
  }

  public sample(wx: number, wz: number): WindVector {
    const { gx, gz } = this.worldToGrid(wx, wz);
    const x0 = Math.max(0, Math.min(this.resolution - 2, Math.floor(gx)));
    const z0 = Math.max(0, Math.min(this.resolution - 2, Math.floor(gz)));
    const x1 = x0 + 1;
    const z1 = z0 + 1;
    const tx = gx - x0;
    const tz = gz - z0;

    const v00 = this.data.vectors[z0][x0];
    const v10 = this.data.vectors[z0][x1];
    const v01 = this.data.vectors[z1][x0];
    const v11 = this.data.vectors[z1][x1];

    const x = this.bilerp(v00.x, v10.x, v01.x, v11.x, tx, tz);
    const z = this.bilerp(v00.z, v10.z, v01.z, v11.z, tx, tz);
    const speed = Math.sqrt(x * x + z * z);

    return { x, z, speed };
  }

  private bilerp(v00: number, v10: number, v01: number, v11: number, tx: number, tz: number): number {
    const a = v00 + (v10 - v00) * tx;
    const b = v01 + (v11 - v01) * tx;
    return a + (b - a) * tz;
  }

  public getAverageSpeed(): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < this.resolution; i += 2) {
      for (let j = 0; j < this.resolution; j += 2) {
        sum += this.data.vectors[i][j].speed;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }

  private computeField(): void {
    const halfWorld = this.data.worldSize / 2;
    const cellSize = this.data.worldSize / this.resolution;

    const dirX = Math.sin(this.direction);
    const dirZ = Math.cos(this.direction);

    for (let gz = 0; gz < this.resolution; gz++) {
      for (let gx = 0; gx < this.resolution; gx++) {
        const wx = -halfWorld + (gx + 0.5) * cellSize;
        const wz = -halfWorld + (gz + 0.5) * cellSize;

        let vx = dirX * this.baseSpeed;
        let vz = dirZ * this.baseSpeed;
        let speedMult = 1;

        for (const b of this.buildings) {
          const dx = wx - b.position.x;
          const dz = wz - b.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          const bRadius = 7;
          const influenceRadius = bRadius + Math.max(8, b.height * 0.15);

          if (dist < influenceRadius) {
            const heightFactor = Math.min(1, b.height / 60);

            if (dist < bRadius) {
              const overlap = (bRadius - dist) / bRadius;
              speedMult *= Math.max(0.05, 1 - overlap * 0.95);

              const nx = dist > 0.001 ? dx / dist : 1;
              const nz = dist > 0.001 ? dz / dist : 0;

              const dot = vx * nx + vz * nz;
              if (dot < 0) {
                vx -= dot * nx * 1.2;
                vz -= dot * nz * 1.2;
              }

              const tangentX = -nz;
              const tangentZ = nx;
              const tangentStrength = (1 - overlap) * heightFactor * 0.8;
              vx += tangentX * this.baseSpeed * tangentStrength;
              vz += tangentZ * this.baseSpeed * tangentStrength;
            } else {
              const t = (dist - bRadius) / (influenceRadius - bRadius);
              const decay = 1 - t;

              const frontDot = (dirX * dx + dirZ * dz);
              if (frontDot < 0) {
                const wakeFactor = Math.max(0, -frontDot / (dist + 0.1)) * decay * heightFactor * 0.6;
                speedMult *= Math.max(0.2, 1 - wakeFactor);
              } else {
                const accel = decay * heightFactor * 0.15;
                speedMult *= 1 + accel;
              }
            }
          }
        }

        for (let i = 0; i < this.buildings.length; i++) {
          for (let j = i + 1; j < this.buildings.length; j++) {
            const b1 = this.buildings[i];
            const b2 = this.buildings[j];
            const gap = this.getVenturiEffect(b1, b2, wx, wz, dirX, dirZ);
            speedMult *= gap;
          }
        }

        vx *= speedMult;
        vz *= speedMult;

        const speed = Math.sqrt(vx * vx + vz * vz);
        this.data.vectors[gz][gx] = { x: vx, z: vz, speed };
      }
    }
  }

  private getVenturiEffect(b1: BuildingData, b2: BuildingData, wx: number, wz: number, dirX: number, dirZ: number): number {
    const dx = b2.position.x - b1.position.x;
    const dz = b2.position.z - b1.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 10 || dist > 30) return 1;

    const ndx = dx / dist;
    const ndz = dz / dist;

    const alignment = Math.abs(ndx * dirX + ndz * dirZ);
    if (alignment < 0.4) return 1;

    const avgHeight = (b1.height + b2.height) / 2;
    if (avgHeight < 30) return 1;

    const midX = (b1.position.x + b2.position.x) / 2;
    const midZ = (b1.position.z + b2.position.z) / 2;

    const toMidX = wx - midX;
    const toMidZ = wz - midZ;

    const alongDist = toMidX * ndx + toMidZ * ndz;
    const perpDist = Math.abs(toMidX * (-ndz) + toMidZ * ndx);

    const halfLen = dist / 2 + 5;
    const perpThresh = dist / 2;

    if (Math.abs(alongDist) < halfLen && perpDist < perpThresh) {
      const alongT = 1 - Math.abs(alongDist) / halfLen;
      const perpT = 1 - perpDist / perpThresh;
      const heightT = Math.min(1, avgHeight / 80);
      const distT = 1 - Math.max(0, dist - 10) / 20;

      const boost = 1 + alongT * perpT * heightT * distT * alignment * 0.9;
      return boost;
    }

    return 1;
  }
}
