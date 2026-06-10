export type TerrainType = 'mountain' | 'plain' | 'basin';
export type ErosionType = 'rainfall' | 'weathering' | 'tectonic';

export interface ErosionStats {
  elapsedTime: number;
  maxHeight: number;
  minHeight: number;
  totalErodedVolume: number;
  rainfallContribution: number;
  weatheringContribution: number;
  tectonicContribution: number;
}

export interface ErosionUpdateResult {
  heights: Float32Array;
  previousHeights: Float32Array;
  changeRates: Float32Array;
  waterFlow: Float32Array;
  stats: ErosionStats;
  isTransitioning: boolean;
  transitionProgress: number;
}

class SimplexNoise {
  private perm: Uint8Array;

  constructor(seed: number = Math.random()) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = Math.floor(seed * 2147483647);
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      this.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

export class ErosionController {
  private resolution: number;
  private heights: Float32Array;
  private previousHeights: Float32Array;
  private targetHeights: Float32Array;
  private sourceHeights: Float32Array;
  private changeRates: Float32Array;
  private waterFlow: Float32Array;
  private noise: SimplexNoise;

  private activeErosions: Set<ErosionType> = new Set();
  private speed: number = 1.0;
  private paused: boolean = false;

  private elapsedTime: number = 0;
  private initialVolume: number = 0;
  private rainfallVolume: number = 0;
  private weatheringVolume: number = 0;
  private tectonicVolume: number = 0;

  private isTransitioning: boolean = false;
  private transitionProgress: number = 1.0;
  private transitionDuration: number = 0.8;
  private transitionTime: number = 0;

  private currentTerrainType: TerrainType = 'mountain';

  constructor(resolution: number = 128) {
    this.resolution = resolution;
    const size = resolution * resolution;
    this.heights = new Float32Array(size);
    this.previousHeights = new Float32Array(size);
    this.targetHeights = new Float32Array(size);
    this.sourceHeights = new Float32Array(size);
    this.changeRates = new Float32Array(size);
    this.waterFlow = new Float32Array(size);
    this.noise = new SimplexNoise(42);

    this.generateTerrain('mountain');
    this.previousHeights.set(this.heights);
    this.initialVolume = this.calculateTotalVolume();
  }

  setResolution(resolution: number): void {
    this.resolution = resolution;
    const size = resolution * resolution;
    this.heights = new Float32Array(size);
    this.previousHeights = new Float32Array(size);
    this.targetHeights = new Float32Array(size);
    this.sourceHeights = new Float32Array(size);
    this.changeRates = new Float32Array(size);
    this.waterFlow = new Float32Array(size);
    this.generateTerrain(this.currentTerrainType);
    this.previousHeights.set(this.heights);
    this.initialVolume = this.calculateTotalVolume();
  }

  private idx(x: number, y: number): number {
    return y * this.resolution + x;
  }

  private generateMountainTerrain(): void {
    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const nx = x / this.resolution;
        const ny = y / this.resolution;
        let h = this.noise.fbm(nx * 3, ny * 3, 6, 0.55);
        const ridge = 1 - Math.abs(this.noise.fbm(nx * 2 + 100, ny * 2 + 100, 4, 0.5));
        h = h * 0.6 + ridge * ridge * 2.0;
        const cx = nx - 0.5;
        const cy = ny - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        h *= (1 - dist * 0.3);
        h = h * 3.5 - 0.5;
        h = Math.max(-1, Math.min(4, h));
        this.heights[this.idx(x, y)] = h;
      }
    }
  }

  private generatePlainTerrain(): void {
    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const nx = x / this.resolution;
        const ny = y / this.resolution;
        let h = this.noise.fbm(nx * 2, ny * 2, 3, 0.5) * 0.4;
        h += this.noise.fbm(nx * 6, ny * 6, 2, 0.5) * 0.15;
        h = h + 0.5;
        h = Math.max(-0.5, Math.min(1.5, h));
        this.heights[this.idx(x, y)] = h;
      }
    }
  }

  private generateBasinTerrain(): void {
    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const nx = x / this.resolution;
        const ny = y / this.resolution;
        const cx = nx - 0.5;
        const cy = ny - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        let h = this.noise.fbm(nx * 2, ny * 2, 4, 0.5);
        const basinShape = (dist * dist * 4 - 0.5) * 2.5;
        h = h * 0.5 + basinShape;
        h = Math.max(-1, Math.min(3, h));
        this.heights[this.idx(x, y)] = h;
      }
    }
  }

  generateTerrain(type: TerrainType): void {
    this.currentTerrainType = type;
    this.sourceHeights.set(this.heights);

    switch (type) {
      case 'mountain':
        this.generateMountainTerrain();
        break;
      case 'plain':
        this.generatePlainTerrain();
        break;
      case 'basin':
        this.generateBasinTerrain();
        break;
    }

    this.targetHeights.set(this.heights);
    this.heights.set(this.sourceHeights);
    this.isTransitioning = true;
    this.transitionTime = 0;
    this.transitionProgress = 0;
  }

  getCurrentTerrainType(): TerrainType {
    return this.currentTerrainType;
  }

  toggleErosion(type: ErosionType, active: boolean): void {
    if (active) {
      this.activeErosions.add(type);
    } else {
      this.activeErosions.delete(type);
    }
  }

  isErosionActive(type: ErosionType): boolean {
    return this.activeErosions.has(type);
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(2.0, speed));
  }

  getSpeed(): number {
    return this.speed;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private applyRainfallErosion(dt: number): number {
    const erosionStrength = 0.8 * dt * this.speed;
    let totalEroded = 0;
    this.waterFlow.fill(0);

    for (let y = 1; y < this.resolution - 1; y++) {
      for (let x = 1; x < this.resolution - 1; x++) {
        const idx = this.idx(x, y);
        const h = this.heights[idx];
        if (h < 0.5) continue;

        const neighbors = [
          { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
          { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
          { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
        ];

        let maxDrop = 0;
        let steepestIdx = -1;
        for (const n of neighbors) {
          const nIdx = this.idx(x + n.dx, y + n.dy);
          const drop = h - this.heights[nIdx];
          if (drop > maxDrop) {
            maxDrop = drop;
            steepestIdx = nIdx;
          }
        }

        if (maxDrop > 0.05 && steepestIdx >= 0) {
          const erosionAmount = erosionStrength * maxDrop * Math.min(1, h * 0.3);
          this.heights[idx] -= erosionAmount;
          this.heights[steepestIdx] += erosionAmount * 0.3;
          this.changeRates[idx] += erosionAmount;
          this.waterFlow[idx] = Math.max(this.waterFlow[idx], maxDrop);
          totalEroded += erosionAmount;
        }
      }
    }
    return totalEroded;
  }

  private applyWeatheringErosion(dt: number): number {
    const smoothStrength = 0.6 * dt * this.speed;
    const lowerStrength = 0.15 * dt * this.speed;
    let totalEroded = 0;
    const temp = new Float32Array(this.heights.length);

    for (let y = 1; y < this.resolution - 1; y++) {
      for (let x = 1; x < this.resolution - 1; x++) {
        const idx = this.idx(x, y);
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += this.heights[this.idx(x + dx, y + dy)];
            count++;
          }
        }
        const avg = sum / count;
        const diff = avg - this.heights[idx];
        temp[idx] = this.heights[idx] + diff * smoothStrength;
        temp[idx] -= lowerStrength * Math.max(0, this.heights[idx]);
        this.changeRates[idx] += Math.abs(diff * smoothStrength) + lowerStrength * Math.max(0, this.heights[idx]);
        totalEroded += lowerStrength * Math.max(0, this.heights[idx]);
      }
    }

    for (let i = 0; i < this.heights.length; i++) {
      this.heights[i] = temp[i];
    }
    return totalEroded;
  }

  private applyTectonicErosion(dt: number): number {
    const upliftStrength = 0.4 * dt * this.speed;
    let totalEroded = 0;
    const noiseOffset = this.elapsedTime * 0.02;

    for (let y = 0; y < this.resolution; y++) {
      for (let x = 0; x < this.resolution; x++) {
        const idx = this.idx(x, y);
        const nx = x / this.resolution;
        const tilt = (nx - 0.5) * 2;
        const wave = this.noise.fbm(nx * 2 + noiseOffset, y / this.resolution * 2, 3, 0.5);
        const change = (tilt * 0.5 + wave * 0.5) * upliftStrength;
        this.heights[idx] += change;
        this.changeRates[idx] += Math.abs(change);
        totalEroded += Math.abs(change) * 0.5;
      }
    }
    return totalEroded;
  }

  private calculateTotalVolume(): number {
    let volume = 0;
    const cellSize = (20 / this.resolution) * (20 / this.resolution);
    for (let i = 0; i < this.heights.length; i++) {
      volume += Math.max(0, this.heights[i]) * cellSize;
    }
    return volume;
  }

  update(dt: number): ErosionUpdateResult {
    this.previousHeights.set(this.heights);
    this.changeRates.fill(0);

    if (this.isTransitioning) {
      this.transitionTime += dt;
      this.transitionProgress = Math.min(1, this.transitionTime / this.transitionDuration);
      const t = this.easeInOutCubic(this.transitionProgress);
      for (let i = 0; i < this.heights.length; i++) {
        this.heights[i] = this.sourceHeights[i] + (this.targetHeights[i] - this.sourceHeights[i]) * t;
      }
      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
      }
    }

    if (!this.paused && !this.isTransitioning) {
      this.elapsedTime += dt;

      if (this.activeErosions.has('rainfall')) {
        const eroded = this.applyRainfallErosion(dt);
        this.rainfallVolume += eroded;
      }
      if (this.activeErosions.has('weathering')) {
        const eroded = this.applyWeatheringErosion(dt);
        this.weatheringVolume += eroded;
      }
      if (this.activeErosions.has('tectonic')) {
        const eroded = this.applyTectonicErosion(dt);
        this.tectonicVolume += eroded;
      }
    }

    let maxH = -Infinity;
    let minH = Infinity;
    for (let i = 0; i < this.heights.length; i++) {
      maxH = Math.max(maxH, this.heights[i]);
      minH = Math.min(minH, this.heights[i]);
    }

    const totalEroded = this.rainfallVolume + this.weatheringVolume + this.tectonicVolume;
    let rainfallPct = 0, weatheringPct = 0, tectonicPct = 0;
    if (totalEroded > 0) {
      rainfallPct = this.rainfallVolume / totalEroded;
      weatheringPct = this.weatheringVolume / totalEroded;
      tectonicPct = this.tectonicVolume / totalEroded;
    }

    return {
      heights: this.heights,
      previousHeights: this.previousHeights,
      changeRates: this.changeRates,
      waterFlow: this.waterFlow,
      stats: {
        elapsedTime: this.elapsedTime,
        maxHeight: maxH,
        minHeight: minH,
        totalErodedVolume: totalEroded * (20 / this.resolution) * (20 / this.resolution),
        rainfallContribution: rainfallPct,
        weatheringContribution: weatheringPct,
        tectonicContribution: tectonicPct
      },
      isTransitioning: this.isTransitioning,
      transitionProgress: this.transitionProgress
    };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  reset(): void {
    this.elapsedTime = 0;
    this.rainfallVolume = 0;
    this.weatheringVolume = 0;
    this.tectonicVolume = 0;
    this.changeRates.fill(0);
    this.waterFlow.fill(0);
    this.generateTerrain(this.currentTerrainType);
  }
}
