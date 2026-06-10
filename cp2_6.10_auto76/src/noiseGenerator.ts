import { createNoise2D } from 'simplex-noise';

export interface NoiseOptions {
  seed: number;
  scale: number;
  width: number;
  height: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
}

export type NoiseMap = Float32Array;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    t ^= t ^ (t >>> 14);
    return ((t >>> 0) % 1000000) / 1000000;
  };
}

export function generateNoiseMap(options: NoiseOptions): NoiseMap {
  const {
    seed, scale, width, height,
    octaves = 4,
    persistence = 0.5,
    lacunarity = 2.0
  } = options;

  const noise2D = createNoise2D(mulberry32(seed));
  const noiseMap = new Float32Array(width * height);

  let minNoise = Infinity;
  let maxNoise = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amplitude = 1;
      let frequency = 1;
      let noiseHeight = 0;
      let maxAmplitude = 0;

      for (let o = 0; o < octaves; o++) {
        const sampleX = (x / width) * scale * frequency;
        const sampleY = (y / height) * scale * frequency;

        const noiseVal = noise2D(sampleX, sampleY);
        noiseHeight += noiseVal * amplitude;

        maxAmplitude += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      const idx = y * width + x;
      noiseMap[idx] = noiseHeight;

      if (noiseHeight < minNoise) minNoise = noiseHeight;
      if (noiseHeight > maxNoise) maxNoise = noiseHeight;
    }
  }

  const range = maxNoise - minNoise;
  if (range === 0) {
    for (let i = 0; i < noiseMap.length; i++) {
      noiseMap[i] = 0.5;
    }
  } else {
    for (let i = 0; i < noiseMap.length; i++) {
      noiseMap[i] = (noiseMap[i] - minNoise) / range;
    }
  }

  return noiseMap;
}

export function getNoiseAt(noiseMap: NoiseMap, width: number, x: number, y: number): number {
  return noiseMap[y * width + x];
}
