export type Mood = 'happy' | 'sad' | 'calm' | 'excited' | 'melancholy' | 'warm';

export type BottleStatus = 'active' | 'sealed';

export type Texture = 'dots' | 'stripes' | 'waves' | 'snowflakes';

export interface Appearance {
  color: string;
  texture: Texture;
}

export interface Reply {
  id: string;
  content: string;
  mood: Mood;
  createdAt: string;
}

export interface Bottle {
  id: string;
  content: string;
  emoji: string;
  mood: Mood;
  appearance: Appearance;
  replies: Reply[];
  status: BottleStatus;
  createdAt: string;
}

export type Page = 'home' | 'deposit' | 'retrieve';

export const MOOD_COLORS: Record<Mood, string> = {
  happy: '#ffcc00',
  sad: '#6688cc',
  calm: '#88cc88',
  excited: '#ff6688',
  melancholy: '#9966cc',
  warm: '#ffaa44',
};

export const MOOD_LABELS: Record<Mood, string> = {
  happy: '快乐',
  sad: '悲伤',
  calm: '平静',
  excited: '兴奋',
  melancholy: '忧郁',
  warm: '温暖',
};

export const BOTTLE_COLORS = [
  { name: '天空蓝', value: '#66ccff' },
  { name: '森林绿', value: '#88dd88' },
  { name: '夕阳橙', value: '#ffaa66' },
  { name: '樱花粉', value: '#ff66aa' },
  { name: '星光紫', value: '#aa88ff' },
];

export const TEXTURE_OPTIONS: { name: string; value: Texture }[] = [
  { name: '透明圆点', value: 'dots' },
  { name: '细条纹', value: 'stripes' },
  { name: '波浪纹', value: 'waves' },
  { name: '雪花纹', value: 'snowflakes' },
];

export const EMOJI_OPTIONS = [
  '😊', '😂', '🥰', '😍', '😎', '🤔', '😢', '😭',
  '🥺', '😴', '🤩', '😇', '🤗', '😋', '🥳', '😌',
  '🌸', '🌺', '🌻', '🌹', '🌊', '⭐', '🌈', '☀️',
  '🌙', '❤️', '💙', '💚', '💛', '💜', '🎵', '🎶',
  '📖', '✏️', '🎨', '🏠', '🌳', '🌴', '⛰️', '🏖️',
  '🎁', '🍀', '🦋', '🐚', '🌠', '🎐', '🕯️', '🎀',
  '🍃', '☕'
];

export const MAX_REPLIES = 5;
