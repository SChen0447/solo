export type MoodMode = 'calm' | 'excited' | 'melancholy' | 'joyful' | null;

export interface Particle {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseColor: string;
  hue: number;
  opacity: number;
  baseOpacity: number;
  blur: number;
  angle: number;
  angularSpeed: number;
  explosionOffsetX: number;
  explosionOffsetY: number;
  explosionProgress: number;
}

export interface CanvasConfig {
  hueOffset: number;
  speedMultiplier: number;
  particleCount: number;
  mood: MoodMode;
}

export interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  isDragging: boolean;
  moveSpeed: number;
}

export type PerformanceLevel = 'high' | 'reduced';

export const PRESET_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];

export const MOOD_COLORS: Record<string, string[]> = {
  calm: ['#4d96ff', '#6bcb77'],
  excited: ['#ff6b6b', '#ffd93d'],
  melancholy: ['#9b59b6', '#4d96ff'],
  joyful: PRESET_COLORS,
};

export const MOOD_NAMES: Record<string, string> = {
  calm: '平静',
  excited: '激昂',
  melancholy: '忧郁',
  joyful: '欢快',
};

export const MOOD_SPEEDS: Record<string, number> = {
  calm: 0.3,
  excited: 3,
  melancholy: 0.5,
  joyful: 1,
};
