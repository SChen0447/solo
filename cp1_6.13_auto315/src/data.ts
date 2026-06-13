import type { Lighthouse } from './lighthouse';
import type { Particle } from './particle';

export const BEAM_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#a29bfe'] as const;

export type BeamColor = typeof BEAM_COLORS[number];

export const BACKGROUND_PRESETS = [
  { name: '深空蓝紫', gradient: ['#0a0a2e', '#1a1042'] },
  { name: '银河黑曜', gradient: ['#0d0d1a', '#1a1a2e'] },
  { name: '星云湖绿', gradient: ['#0a1a2e', '#10423a'] },
  { name: '日落橙粉', gradient: ['#2e1a0a', '#42203a'] }
] as const;

export interface GlobalState {
  lighthouses: Lighthouse[];
  particles: Particle[];
  pulseFactor: number;
  pulseSpeed: number;
  backgroundIndex: number;
  canvasWidth: number;
  canvasHeight: number;
  centerX: number;
  centerY: number;
  circleRadius: number;
  lighthouseCount: number;
  isDragging: boolean;
  dragSource: Lighthouse | null;
  dragCurrentX: number;
  dragCurrentY: number;
  hoveredLighthouse: Lighthouse | null;
}

export const state: GlobalState = {
  lighthouses: [],
  particles: [],
  pulseFactor: 0.6,
  pulseSpeed: 1.0,
  backgroundIndex: 0,
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,
  centerX: window.innerWidth / 2,
  centerY: window.innerHeight / 2,
  circleRadius: 300,
  lighthouseCount: 8,
  isDragging: false,
  dragSource: null,
  dragCurrentX: 0,
  dragCurrentY: 0,
  hoveredLighthouse: null
};

export function updatePulseFactor(deltaTime: number): void {
  const basePeriod = 4000;
  const period = basePeriod / state.pulseSpeed;
  const time = performance.now();
  const progress = (time % period) / period;
  state.pulseFactor = 0.6 + 0.4 * Math.sin(progress * Math.PI * 2) * 0.5 + 0.2;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r * ratio + c2.r * (1 - ratio));
  const g = Math.round(c1.g * ratio + c2.g * (1 - ratio));
  const b = Math.round(c1.b * ratio + c2.b * (1 - ratio));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function getRandomBeamColor(): BeamColor {
  return BEAM_COLORS[Math.floor(Math.random() * BEAM_COLORS.length)];
}
