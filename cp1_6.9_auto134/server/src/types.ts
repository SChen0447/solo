export type Mood = 'happy' | 'sad' | 'calm' | 'excited' | 'melancholy' | 'warm';

export type BottleStatus = 'active' | 'sealed';

export interface Appearance {
  color: string;
  texture: 'dots' | 'stripes' | 'waves' | 'snowflakes';
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

export interface CreateBottleRequest {
  content: string;
  emoji: string;
  mood: Mood;
  appearance: Appearance;
}

export interface ReplyBottleRequest {
  content: string;
  mood: Mood;
}

export const MAX_REPLIES = 5;
