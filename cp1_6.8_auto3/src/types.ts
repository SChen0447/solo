export type Difficulty = 'easy' | 'normal' | 'hard';
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';
export type JudgeResult = 'perfect' | 'good' | 'miss' | null;

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  lives: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
  vy: number;
}

export interface BackgroundParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  hue: number;
}
