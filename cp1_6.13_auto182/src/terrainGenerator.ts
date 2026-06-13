import SimplexNoise from 'simplex-noise';

export interface TerrainData {
  heightMap: number[][];
  size: number;
  resolution: number;
}

export class TerrainGenerator {
  private noise: SimplexNoise;
  private resolution: number;
  private size: number;

  constructor(seed: number = Math.random(), resolution: number = 128, size: number = 300) {
    this.noise = new SimplexNoise(seed);
    this.resolution = resolution;
    this.size = size;
  }

  public generateHeightMap(): TerrainData {
    const heightMap: number[][] = [];
    const halfSize = this.size / 2;
    const step = this.size / (this.resolution - 1);

    for (let i = 0; i < this.resolution; i++) {
      heightMap[i] = [];
      for (let j = 0; j < this.resolution; j++) {
        const x = -halfSize + i * step;
        const y = -halfSize + j * step;

        const centerDist = Math.sqrt(x * x + y * y) / halfSize;
        const falloff = Math.max(0, 1 - Math.pow(centerDist, 1.5));

        const noiseScale = 0.012;
        const noiseVal = this.noise.noise2D(x * noiseScale, y * noiseScale) * 0.5 + 0.5;

        const detailNoise = this.noise.noise2D(x * noiseScale * 3, y * noiseScale * 3) * 0.25 + 0.25;

        const baseHeight = 20;
        const noiseHeight = (noiseVal * 0.7 + detailNoise * 0.3) * 40;
        const height = (baseHeight + noiseHeight) * falloff;

        heightMap[i][j] = Math.max(0, height);
      }
    }

    return {
      heightMap,
      size: this.size,
      resolution: this.resolution
    };
  }

  public getHeightAt(x: number, z: number, terrainData: TerrainData): number {
    const halfSize = terrainData.size / 2;
    const step = terrainData.size / (terrainData.resolution - 1);

    const gridX = (x + halfSize) / step;
    const gridZ = (z + halfSize) / step;

    const x0 = Math.floor(Math.max(0, Math.min(terrainData.resolution - 2, gridX)));
    const z0 = Math.floor(Math.max(0, Math.min(terrainData.resolution - 2, gridZ)));

    const fx = gridX - x0;
    const fz = gridZ - z0;

    const h00 = terrainData.heightMap[x0][z0];
    const h10 = terrainData.heightMap[x0 + 1][z0];
    const h01 = terrainData.heightMap[x0][z0 + 1];
    const h11 = terrainData.heightMap[x0 + 1][z0 + 1];

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;

    return h0 * (1 - fz) + h1 * fz;
  }
}
