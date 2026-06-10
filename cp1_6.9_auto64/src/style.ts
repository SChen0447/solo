import p5 from 'p5';

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export const BG_COLOR_START: ColorRGB = { r: 10, g: 10, b: 42 };
export const BG_COLOR_END: ColorRGB = { r: 42, g: 0, b: 26 };

export const PARTICLE_COLOR_DEFAULT: ColorRGB = { r: 238, g: 238, b: 255 };

export const NEBULA_COLORS: ColorRGB[] = [
  { r: 238, g: 238, b: 255 },
  { r: 255, g: 68, b: 136 },
  { r: 68, g: 136, b: 255 },
  { r: 255, g: 204, b: 68 },
  { r: 136, g: 255, b: 170 },
  { r: 204, g: 136, b: 255 }
];

export const NEBULA_COLOR_NAMES: string[] = [
  '银白',
  '星云红',
  '星云蓝',
  '星云金',
  '星云绿',
  '星云紫'
];

export const STAMP_COLORS: ColorRGB[] = [
  { r: 255, g: 170, b: 68 },
  { r: 68, g: 170, b: 255 },
  { r: 255, g: 102, b: 170 }
];

export const PARTICLE_SIZE_MIN = 0.5;
export const PARTICLE_SIZE_START_MIN = 3;
export const PARTICLE_SIZE_START_MAX = 6;
export const PARTICLE_LIFETIME = 2000;
export const TRAIL_LENGTH_MIN = 15;
export const TRAIL_LENGTH_MAX = 25;
export const ANGLE_OFFSET_MAX = 15;

export const SETTLE_DURATION = 1500;
export const SETTLE_FALL_SPEED_MIN = 0.2;
export const SETTLE_FALL_SPEED_MAX = 0.5;
export const SPOT_RADIUS_MIN = 20;
export const SPOT_RADIUS_MAX = 30;
export const SPOT_OPACITY = 0.4;
export const SPOT_MERGE_RADIUS_INCREMENT = 5;
export const SPOT_MERGE_DURATION = 600;

export const INK_BTN_BG = 'rgba(255,255,255,0.1)';
export const INK_BTN_BORDER = 'rgba(255,255,255,0.2)';
export const INK_BTN_BORDER_RADIUS = 10;
export const INK_BTN_HOVER_BRIGHTNESS = 1.2;
export const INK_BTN_HOVER_TRANSITION = 300;

export const STAMP_RADIUS_MIN = 15;
export const STAMP_RADIUS_MAX = 25;
export const STAMP_DURATION = 2000;
export const STAMP_ATTRACTION_DURATION = 5000;
export const STAMP_ATTRACTION_COUNT = 5;

export const EXPLOSION_PARTICLE_MIN = 10;
export const EXPLOSION_PARTICLE_MAX = 15;
export const EXPLOSION_DURATION = 800;
export const EXPLOSION_SOUND_FREQ = 440;
export const EXPLOSION_SOUND_DURATION = 0.2;
export const SPOT_FLASH_DURATION = 300;
export const SPOT_FLASH_BRIGHTNESS = 1.5;

export const COLOR_TRANSITION_DURATION = 400;

export const PARTICLE_SPAWN_RATE_MIN = 200;
export const PARTICLE_SPAWN_RATE_MAX = 600;

export const MAX_PARTICLES = 2000;

export const PAUSE_THRESHOLD = 500;

export function lerpColor(c1: ColorRGB, c2: ColorRGB, t: number): ColorRGB {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t
  };
}

export function colorToRGBString(c: ColorRGB, alpha: number = 1): string {
  return `rgba(${Math.floor(c.r)},${Math.floor(c.g)},${Math.floor(c.b)},${alpha})`;
}

export function colorToP5Color(p: p5, c: ColorRGB, alpha: number = 255): p5.Color {
  return p.color(c.r, c.g, c.b, alpha);
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
