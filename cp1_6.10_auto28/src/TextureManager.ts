import * as THREE from 'three';

const TEXTURE_SIZE = 2048;

const GRASS_MIN = 0;
const GRASS_MAX = 0.30;
const ROCK_MIN = 0.30;
const ROCK_MAX = 0.70;
const SNOW_MIN = 0.70;
const SNOW_MAX = 1.0;
const BLEND_ZONE = 0.05;

interface RGB {
  r: number;
  g: number;
  b: number;
}

export class TextureManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private noiseData: Uint8Array;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = TEXTURE_SIZE;
    this.canvas.height = TEXTURE_SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.anisotropy = 8;
    this.noiseData = this.generateNoise(TEXTURE_SIZE);
  }

  private generateNoise(size: number): Uint8Array {
    const data = new Uint8Array(size * size);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.floor(Math.random() * 255);
    }
    return data;
  }

  public getTexture(): THREE.CanvasTexture {
    return this.texture;
  }

  public update(
    heights: Float32Array, gridSize: number, maxHeight: number
  ): void {
    const imgData = this.ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
    const data = imgData.data;
    const texToGrid = gridSize / TEXTURE_SIZE;

    for (let ty = 0; ty < TEXTURE_SIZE; ty++) {
      for (let tx = 0; tx < TEXTURE_SIZE; tx++) {
        const gx = Math.min(gridSize - 1, Math.floor(tx * texToGrid));
        const gz = Math.min(gridSize - 1, Math.floor(ty * texToGrid));
        const hIdx = gz * gridSize + gx;
        const heightNorm = Math.max(0, Math.min(1, heights[hIdx] / maxHeight));

        const noiseIdx = ty * TEXTURE_SIZE + tx;
        const noiseVal = this.noiseData[noiseIdx] / 255;

        const color = this.getZoneColor(heightNorm, noiseVal, tx, ty);

        const pixelIdx = (ty * TEXTURE_SIZE + tx) * 4;
        data[pixelIdx] = color.r;
        data[pixelIdx + 1] = color.g;
        data[pixelIdx + 2] = color.b;
        data[pixelIdx + 3] = 255;
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
    this.texture.needsUpdate = true;
  }

  private getZoneColor(h: number, noise: number, tx: number, ty: number): RGB {
    const grass = this.getGrassColor(h, noise, tx, ty);
    const rock = this.getRockColor(h, noise, tx, ty);
    const snow = this.getSnowColor(h, noise, tx, ty);

    if (h <= GRASS_MAX - BLEND_ZONE) {
      return grass;
    } else if (h <= GRASS_MAX + BLEND_ZONE) {
      const t = (h - (GRASS_MAX - BLEND_ZONE)) / (BLEND_ZONE * 2);
      return this.lerpColor(grass, rock, t);
    } else if (h <= ROCK_MAX - BLEND_ZONE) {
      return rock;
    } else if (h <= ROCK_MAX + BLEND_ZONE) {
      const t = (h - (ROCK_MAX - BLEND_ZONE)) / (BLEND_ZONE * 2);
      return this.lerpColor(rock, snow, t);
    } else {
      return snow;
    }
  }

  private getGrassColor(h: number, noise: number, tx: number, ty: number): RGB {
    const baseR = 60 + (noise * 30;
    const baseG = 120 + (noise * 50);
    const baseB = 40 + (noise * 20);

    const spotNoise = this.spotNoise(tx, ty, 60);
    const yellowBlend = Math.pow(spotNoise, 3);
    const r = Math.floor(
      baseR * (1 - yellowBlend * 0.3) + 200 * yellowBlend * 0.9);
    const g = Math.floor(
      baseG * (1 - yellowBlend * 0.1) + 190 * yellowBlend * 0.9);
    const b = Math.floor(
      baseB * (1 - yellowBlend * 0.2) + 60 * yellowBlend * 0.9);

    return { r, g, b };
  }

  private getRockColor(h: number, noise: number, tx: number, ty: number): RGB {
    const baseR = 100 + (noise * 60 - 30);
    const baseG = 90 + (noise * 50 - 25);
    const baseB = 75 + (noise * 40 - 20);

    const fineNoise = this.spotNoise(tx, ty, 40);
    const variation = fineNoise * 30 - 15;

    return {
      r: Math.max(0, Math.min(255, Math.floor(baseR + variation)),
      g: Math.max(0, Math.min(255, Math.floor(baseG + variation * 0.8)),
      b: Math.max(0, Math.min(255, Math.floor(baseB + variation * 0.6))),
    };
  }

  private getSnowColor(h: number, noise: number, tx: number, ty: number): RGB {
    const baseR = 235 + (noise * 20 - 10);
    const baseG = 240 + (noise * 15 - 7);
    const baseB = 250;

    const shadowNoise = this.spotNoise(tx, ty, 80);
    const shadowAmount = Math.pow(shadowNoise, 4) * 40;

    return {
      r: Math.max(0, Math.min(255, Math.floor(baseR - shadowAmount * 0.5)),
      g: Math.max(0, Math.min(255, Math.floor(baseG - shadowAmount * 0.6)),
      b: Math.max(0, Math.min(255, Math.floor(baseB - shadowAmount)),
    };
  }

  private lerpColor(a: RGB, b: RGB, t: number): RGB {
    return {
      r: Math.floor(a.r + (b.r - a.r) * t),
      g: Math.floor(a.g + (b.g - a.g) * t),
      b: Math.floor(a.b + (b.b - a.b) * t),
    };
  }

  private spotNoise(tx: number, ty: number, scale: number): number {
    const sx = tx / scale;
    const sy = ty / scale;
    const n =
      Math.sin(sx * 2.1 + sy * 1.7) * 0.5 +
      Math.sin(sx * 3.3 - sy * 2.9) * 0.3 +
      Math.sin(sx * 5.7 + sy * 4.1) * 0.2;
    return Math.max(0, Math.min(1, (n + 1) / 2);
  }

  public dispose(): void {
    this.texture.dispose();
  }
}
