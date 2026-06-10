export type WaveformType = 'sine' | 'square';

export interface Note {
  frequency: number;
  duration: number;
  startTime: number;
}

export interface MelodyParams {
  type: WaveformType;
  notes: Note[];
  totalDuration: number;
}

export type PixelData = string[][];

export type MoodTag = '兴奋' | '平静' | '忧郁' | '怀旧' | '迷幻';

export interface Capsule {
  id: string;
  melodyParams: MelodyParams;
  pixelData: PixelData;
  text: string;
  mood: MoodTag;
  timestamp: number;
  likes: number;
  likedBy: string[];
}

export const NEON_COLORS: string[] = [
  '#ff0066',
  '#00ff88',
  '#66ccff',
  '#ffcc00',
  '#ff66cc',
  '#00ffff'
];

export const MOOD_TAGS: MoodTag[] = ['兴奋', '平静', '忧郁', '怀旧', '迷幻'];
