export interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface Line {
  id: string;
  star1Id: string;
  star2Id: string;
  color: string;
}

export type Emotion = 'happy' | 'sad' | 'calm' | 'excited' | 'melancholy';

export interface LightMessage {
  id: string;
  content: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface Constellation {
  id: string;
  nickname: string;
  text: string;
  emotion: Emotion;
  stars: Star[];
  lines: Line[];
  lightMessages: LightMessage[];
  createdAt: number;
}

export const EMOTION_INTERVALS: Record<Emotion, number> = {
  happy: 0.3,
  sad: 0.6,
  calm: 0.8,
  excited: 0.2,
  melancholy: 0.7
};

export const EMOTION_LABELS: Record<Emotion, string> = {
  happy: '快乐',
  sad: '悲伤',
  calm: '平静',
  excited: '兴奋',
  melancholy: '忧郁'
};
