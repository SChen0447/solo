export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'steam' | 'ripple' | 'glint' | 'foam';
}

export type TeaSetType = 'bowl' | 'teapot' | 'whisk';

export interface DeformState {
  type: TeaSetType;
  vertexIndex: number;
  offsetX: number;
  offsetY: number;
  startTime: number;
  duration: number;
}

export interface WaterPour {
  active: boolean;
  startTime: number;
  duration: number;
}

export interface Whirlpool {
  active: boolean;
  startTime: number;
  duration: number;
  rotationSpeed: number;
  foamShape: Vec2[];
  foamStartTime: number;
}

export interface TeaSessionReport {
  id: string;
  date: string;
  totalScore: number;
  deformationCount: number;
  pourCount: number;
  averageResponseTime: number;
  scoreHistory: Array<{ timestamp: number; score: number }>;
}

export const POETIC_EVALUATIONS = [
  { min: 0, max: 50, text: '初入茶道，心尚浮动' },
  { min: 51, max: 100, text: '一碗春水，初品禅心' },
  { min: 101, max: 150, text: '茶香绕指，光影婆娑' },
  { min: 151, max: 200, text: '半盏清茶，静观浮沉' },
  { min: 201, max: 250, text: '千重翠影，万物归一' },
  { min: 251, max: 300, text: '茶禅一味，光影同尘' },
];

export function getPoeticEvaluation(score: number): string {
  for (const e of POETIC_EVALUATIONS) {
    if (score >= e.min && score <= e.max) return e.text;
  }
  return '茶禅一味，光影同尘';
}

export function getScoreColor(score: number): string {
  if (score <= 100) return '#795548';
  if (score <= 200) return '#4e342e';
  return '#3e2723';
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutElastic(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
