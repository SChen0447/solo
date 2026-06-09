export type Emotion = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface Capsule {
  id: string;
  text: string;
  image: string;
  emotion: Emotion;
  createdAt: string;
}

export interface CreateCapsuleDto {
  text: string;
  image: string;
  emotion: Emotion;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export const EMOTION_COLORS: Record<Emotion, string> = {
  red: '#ff6b6b',
  orange: '#ffa94d',
  yellow: '#ffd43b',
  green: '#69db7c',
  blue: '#4dabf7',
  purple: '#9775fa',
};

export const EMOTION_LABELS: Record<Emotion, string> = {
  red: '热情',
  orange: '温暖',
  yellow: '喜悦',
  green: '宁静',
  blue: '思念',
  purple: '梦幻',
};

export const EMOTION_LIST: Emotion[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
