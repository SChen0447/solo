export interface PaperTextureData {
  width: number;
  height: number;
  fiberData: Float32Array;
  roughnessData: Float32Array;
  textureCanvas: HTMLCanvasElement;
}

class PerlinNoise {
  private permutation: number[] = [];

  constructor(seed: number = Math.random() * 10000) {
    this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): void {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = this.permutation[i + 256] = p[i];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.permutation[X] + Y;
    const B = this.permutation[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    );
  }

  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return value / maxValue;
  }
}

export class PaperTexture {
  private width: number = 0;
  private height: number = 0;
  private fiberData: Float32Array = new Float32Array();
  private roughnessData: Float32Array = new Float32Array();
  private textureCanvas: HTMLCanvasElement = document.createElement('canvas');

  generate(width: number, height: number): PaperTextureData {
    this.width = width;
    this.height = height;
    const pixelCount = width * height;

    this.fiberData = new Float32Array(pixelCount);
    this.roughnessData = new Float32Array(pixelCount);

    const seed = Math.random() * 100000;
    const noise = new PerlinNoise(seed);
    const noise2 = new PerlinNoise(seed + 999);
    const noise3 = new PerlinNoise(seed + 555);

    const fiberScale = 0.008;
    const roughnessScale = 0.02;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        const nx = x * fiberScale;
        const ny = y * fiberScale;
        let fiberVal = noise.fbm(nx, ny, 5, 0.5, 2.1);
        fiberVal += noise2.fbm(nx * 3.5 + 100, ny * 3.5 + 50, 3, 0.4, 2.2) * 0.4;
        fiberVal = (fiberVal + 1) * 0.5;

        const streaks = Math.abs(noise3.noise2D(x * 0.015 + y * 0.003, y * 0.004 - x * 0.002));
        fiberVal = Math.min(1, fiberVal + streaks * 0.3);

        this.fiberData[idx] = fiberVal;

        const rx = x * roughnessScale;
        const ry = y * roughnessScale;
        let roughVal = noise2.fbm(rx * 2 + 50, ry * 2 + 30, 3, 0.55, 2);
        roughVal = (roughVal + 1) * 0.5;
        roughVal = 0.3 + roughVal * 0.7;
        this.roughnessData[idx] = roughVal;
      }
    }

    this.buildTextureCanvas();

    return {
      width: this.width,
      height: this.height,
      fiberData: this.fiberData,
      roughnessData: this.roughnessData,
      textureCanvas: this.textureCanvas
    };
  }

  private buildTextureCanvas(): void {
    this.textureCanvas.width = this.width;
    this.textureCanvas.height = this.height;
    const ctx = this.textureCanvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(this.width, this.height);
    const data = imgData.data;

    for (let i = 0; i < this.width * this.height; i++) {
      const fiber = this.fiberData[i];
      const base = 245;
      const variation = Math.floor(fiber * 18);
      const r = base - variation + Math.floor(Math.random() * 3);
      const g = base - 8 - variation + Math.floor(Math.random() * 3);
      const b = base - 18 - variation + Math.floor(Math.random() * 3);

      const pi = i * 4;
      data[pi] = r;
      data[pi + 1] = g;
      data[pi + 2] = b;
      data[pi + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }

  getFiberAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0.5;
    return this.fiberData[y * this.width + x];
  }

  getRoughnessAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0.5;
    return this.roughnessData[y * this.width + x];
  }

  getTextureCanvas(): HTMLCanvasElement {
    return this.textureCanvas;
  }
}

export const PAPER_BACKGROUND = '#FDF5E6';
