export type EmotionType = 'joy' | 'melancholy' | 'fantasy' | 'serenity' | 'passion';

export interface EmotionConfig {
  name: string;
  emoji: string;
  gradient: [string, string];
  glowColor: string;
  textShadow: string;
}

export interface DiaryEntry {
  id: string;
  content: string;
  emotion: EmotionType;
  createdAt: number;
  updatedAt: number;
}

export interface DiaryCreateInput {
  content: string;
  emotion: EmotionType;
}

export interface DiaryUpdateInput {
  content?: string;
  emotion?: EmotionType;
}

export const EMOTION_MAP: Record<EmotionType, EmotionConfig> = {
  joy: {
    name: '喜悦',
    emoji: '😊',
    gradient: ['#fde68a', '#ffedd5'],
    glowColor: '#fbbf24',
    textShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
  },
  melancholy: {
    name: '忧郁',
    emoji: '😔',
    gradient: ['#60a5fa', '#a5b4fc'],
    glowColor: '#818cf8',
    textShadow: '0 0 8px rgba(129, 140, 248, 0.6)',
  },
  fantasy: {
    name: '狂想',
    emoji: '✨',
    gradient: ['#c084fc', '#f0abfc'],
    glowColor: '#d946ef',
    textShadow: '0 0 8px rgba(217, 70, 239, 0.6)',
  },
  serenity: {
    name: '宁静',
    emoji: '🌙',
    gradient: ['#67e8f9', '#a5f3fc'],
    glowColor: '#22d3ee',
    textShadow: '0 0 8px rgba(34, 211, 238, 0.6)',
  },
  passion: {
    name: '激昂',
    emoji: '🔥',
    gradient: ['#fb7185', '#fda4af'],
    glowColor: '#f43f5e',
    textShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
  },
};

export const EMOTION_LIST: EmotionType[] = ['joy', 'melancholy', 'fantasy', 'serenity', 'passion'];
