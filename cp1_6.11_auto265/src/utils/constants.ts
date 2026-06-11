export interface EnvironmentParams {
  temperature: number;
  ph: number;
  sulfide: number;
}

export interface Shrimp {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  baseSpeed: number;
  bodyLength: number;
  bodyWidth: number;
  color: string;
  colorPhase: number;
  glowIntensity: number;
  bacteriaColor: string | null;
  bacteriaColorRGB: { r: number; g: number; b: number } | null;
  bacteriaSize: number;
  maxBacteriaSize: number;
  isMarked: boolean;
  trail: { x: number; y: number; age: number }[];
  onPatchTime: number;
  currentPatchId: string | null;
  hasBacteria: boolean;
  antennaPhase: number;
}

export interface BacteriaPatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  baseRadius: number;
  color: string;
  colorRGB: { r: number; g: number; b: number };
  glowIntensity: number;
  growthRate: number;
  hue: number;
}

export interface SmokeParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };
}

export interface ExchangeParticle {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  particles: {
    angle: number;
    distance: number;
    speed: number;
    size: number;
    color: string;
  }[];
}

export interface SimulationStats {
  shrimpCount: number;
  bacteriaCoverage: number;
  symbiosisCount: number;
  bacteriaWithShrimp: number;
}

export interface CameraState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const ENV_DEFAULTS: EnvironmentParams = {
  temperature: 45,
  ph: 5.0,
  sulfide: 2.0,
};

export const ENV_RANGES = {
  temperature: { min: 5, max: 95 },
  ph: { min: 2.0, max: 9.0 },
  sulfide: { min: 0.1, max: 5.0 },
};

export const OPTIMAL_ZONE = {
  temperature: { min: 30, max: 60 },
  ph: { min: 4.0, max: 6.0 },
};

export const COLORS = {
  deepSeaBlack: '#0a0f1c',
  ventBlue: '#1a3a5c',
  smokeWhite: '#ffffff',
  smokeGrayBlue: '#5c8a8a',
  bacteriaPurple: '#6a1b9a',
  bacteriaGreen: '#00e676',
  shrimpPink: '#f8bbd0',
  shrimpCream: '#fff9c4',
  glowCyan: '#00e5ff',
  panelBg: 'rgba(0, 0, 0, 0.7)',
  sliderTrack: '#37474f',
  textGray: '#b0bec5',
  trailYellow: 'rgba(255, 235, 59, 0.5)',
};

export const SHRIMP_CONFIG = {
  count: 20,
  bodyLength: 12,
  bodyWidth: 4,
  baseSpeed: 0.8,
  speedBoost: 1.2,
  glowBoost: 1.5,
  turnSpeed: 0.05,
  randomTurnChance: 0.02,
  trailMaxLength: 100,
  bacteriaGrowTime: 3000,
  maxBacteriaMultiplier: 2,
};

export const PATCH_CONFIG = {
  count: 15,
  minRadius: 15,
  maxRadius: 25,
  glowMin: 0.2,
  glowMax: 1.0,
  minGrowthRate: -0.3,
  maxGrowthRate: 0.5,
  spreadRadius: 200,
};

export const VENT_CONFIG = {
  diameter: 100,
  smokeRate: 8,
  smokeMaxLife: 120,
  smokeStartSize: 8,
  smokeEndSize: 30,
  smokeSpeed: 1.5,
};

export const EXCHANGE_CONFIG = {
  maxRadius: 60,
  duration: 1500,
  particleCount: 20,
};

export const CAMERA_CONFIG = {
  minZoom: 0.5,
  maxZoom: 3,
  zoomSpeed: 0.001,
};

export const BACTERIA_COLORS = [
  { r: 106, g: 27, b: 154 },
  { r: 74, g: 20, b: 140 },
  { r: 123, g: 31, b: 162 },
  { r: 0, g: 230, b: 118 },
  { r: 0, g: 200, b: 83 },
  { r: 46, g: 255, b: 140 },
  { r: 0, g: 188, b: 212 },
  { r: 0, g: 150, b: 136 },
  { r: 255, g: 152, b: 0 },
  { r: 255, g: 87, b: 34 },
  { r: 233, g: 30, b: 99 },
  { r: 156, g: 39, b: 176 },
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
