import { Turbine } from './turbine';

export interface WakeConnection {
  fromIndex: number;
  toIndex: number;
  attenuation: number;
  color: string;
  label: string;
}

export interface WakeResult {
  effectiveSpeeds: number[];
  connections: WakeConnection[];
  heatmapData: number[][];
}

const HEATMAP_SIZE = 128;
const TERRAIN_SIZE = 100;
const WIND_DIRECTION = { x: 1, z: 0 };

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function getAttenuationColor(attenuation: number): string {
  if (attenuation <= 0.05) {
    return '#00ff00';
  } else if (attenuation >= 0.30) {
    return '#ff0000';
  } else {
    const t = (attenuation - 0.05) / (0.30 - 0.05);
    return lerpColor('#00ff00', '#ff0000', t);
  }
}

function calculateSingleWakeAttenuation(
  upstreamX: number,
  upstreamZ: number,
  downstreamX: number,
  downstreamZ: number,
  bladeRadius: number,
  towerHeight: number
): number {
  const dx = downstreamX - upstreamX;
  const dz = downstreamZ - upstreamZ;

  const windDot = dx * WIND_DIRECTION.x + dz * WIND_DIRECTION.z;
  if (windDot <= 0) return 0;

  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 1) return 0;

  const k = 0.075;
  const rotorDiameter = bladeRadius * 2;
  const wakeWidth = rotorDiameter + 2 * k * distance;

  const crossDist = Math.abs(
    dz * WIND_DIRECTION.x - dx * WIND_DIRECTION.z
  );

  if (crossDist > wakeWidth / 2) return 0;

  const heightRatio = 80 / towerHeight;
  const baseAttenuation = (rotorDiameter / (rotorDiameter + 2 * k * distance)) ** 2;
  const attenuation = baseAttenuation * 0.5 * heightRatio;

  return Math.max(0, Math.min(0.5, attenuation));
}

export function calculateWakeEffects(
  turbines: Turbine[],
  baseWindSpeed: number
): WakeResult {
  const n = turbines.length;
  const effectiveSpeeds: number[] = new Array(n).fill(baseWindSpeed);
  const connections: WakeConnection[] = [];

  for (let i = 0; i < n; i++) {
    let totalAttenuation = 0;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const upstream = turbines[j];
      const downstream = turbines[i];

      const attenuation = calculateSingleWakeAttenuation(
        upstream.params.position.x,
        upstream.params.position.z,
        downstream.params.position.x,
        downstream.params.position.z,
        upstream.params.bladeRadius,
        upstream.params.towerHeight
      );

      if (attenuation > 0.001) {
        totalAttenuation += attenuation;
        connections.push({
          fromIndex: j,
          toIndex: i,
          attenuation,
          color: getAttenuationColor(attenuation),
          label: `${(attenuation * 100).toFixed(1)}%`
        });
      }
    }

    totalAttenuation = Math.min(totalAttenuation, 0.8);
    effectiveSpeeds[i] = baseWindSpeed * (1 - totalAttenuation);
  }

  const heatmapData = generateHeatmapData(turbines, baseWindSpeed);

  return {
    effectiveSpeeds,
    connections,
    heatmapData
  };
}

function generateHeatmapData(
  turbines: Turbine[],
  baseWindSpeed: number
): number[][] {
  const data: number[][] = [];
  const halfSize = TERRAIN_SIZE / 2;
  const cellSize = TERRAIN_SIZE / HEATMAP_SIZE;

  for (let row = 0; row < HEATMAP_SIZE; row++) {
    data[row] = [];
    for (let col = 0; col < HEATMAP_SIZE; col++) {
      const worldX = -halfSize + col * cellSize;
      const worldZ = -halfSize + row * cellSize;

      let totalAttenuation = 0;

      for (const turbine of turbines) {
        const attenuation = calculateSingleWakeAttenuation(
          turbine.params.position.x,
          turbine.params.position.z,
          worldX,
          worldZ,
          turbine.params.bladeRadius,
          turbine.params.towerHeight
        );
        totalAttenuation += attenuation;
      }

      totalAttenuation = Math.min(totalAttenuation, 0.9);
      const windRatio = 1 - totalAttenuation;
      data[row][col] = windRatio;
    }
  }

  return data;
}

export function heatmapDataToCanvas(
  data: number[][],
  targetCanvas: HTMLCanvasElement
): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const size = data.length;
  targetCanvas.width = size;
  targetCanvas.height = size;

  const imageData = ctx.createImageData(size, size);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const value = data[row][col];
      const { r, g, b } = heatmapColor(value);
      const idx = (row * size + col) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = 180;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function heatmapColor(value: number): { r: number; g: number; b: number } {
  const low = { r: 0, g: 0, b: 51 };
  const midLow = { r: 0, g: 100, b: 200 };
  const midHigh = { r: 0, g: 200, b: 100 };
  const high = { r: 255, g: 51, b: 0 };

  if (value < 0.33) {
    const t = value / 0.33;
    return {
      r: Math.round(low.r + (midLow.r - low.r) * t),
      g: Math.round(low.g + (midLow.g - low.g) * t),
      b: Math.round(low.b + (midLow.b - low.b) * t)
    };
  } else if (value < 0.66) {
    const t = (value - 0.33) / 0.33;
    return {
      r: Math.round(midLow.r + (midHigh.r - midLow.r) * t),
      g: Math.round(midLow.g + (midHigh.g - midLow.g) * t),
      b: Math.round(midLow.b + (midHigh.b - midLow.b) * t)
    };
  } else {
    const t = (value - 0.66) / 0.34;
    return {
      r: Math.round(midHigh.r + (high.r - midHigh.r) * t),
      g: Math.round(midHigh.g + (high.g - midHigh.g) * t),
      b: Math.round(midHigh.b + (high.b - midHigh.b) * t)
    };
  }
}

export function lerpHeatmapData(
  fromData: number[][],
  toData: number[][],
  t: number
): number[][] {
  const size = fromData.length;
  const result: number[][] = [];
  for (let row = 0; row < size; row++) {
    result[row] = [];
    for (let col = 0; col < size; col++) {
      result[row][col] = fromData[row][col] + (toData[row][col] - fromData[row][col]) * t;
    }
  }
  return result;
}
