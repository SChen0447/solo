export type EmotionType = 'happy' | 'sad' | 'calm' | 'tense';

export type BackgroundType = 'forest' | 'castle' | 'desert' | 'ocean' | 'mountain' | 'city' | 'starry' | 'garden';

export interface Scene {
  id: string;
  index: number;
  text: string;
  backgroundType: BackgroundType;
  emotion: EmotionType;
  bgColor: string;
  textSpeed: number;
  volume: number;
}

export interface ProjectSettings {
  globalVolume: number;
  defaultTextSpeed: number;
}

export interface StoryProject {
  id: string;
  title: string;
  text: string;
  scenes: Scene[];
  settings: ProjectSettings;
  createdAt: number;
  updatedAt: number;
}

export interface SaveProjectResponse {
  success: boolean;
  id?: string;
  message: string;
}

export interface LoadProjectResponse {
  success: boolean;
  project?: StoryProject;
  message: string;
}

export const COLOR_PALETTE = [
  '#E68A6E',
  '#E8A87C',
  '#F0D78C',
  '#A8D5BA',
  '#7FB069',
  '#5B8C85',
  '#7A8B99',
  '#6B7B8C',
  '#8B7A99',
  '#B07A9A',
  '#D48A8A',
  '#C49B6A',
];

export const EMOTION_COLORS: Record<EmotionType, { primary: string; secondary: string; accent: string }> = {
  happy: { primary: '#FFE4B5', secondary: '#FFD700', accent: '#FF8C00' },
  sad: { primary: '#6B7B8C', secondary: '#8B7A99', accent: '#4A5568' },
  calm: { primary: '#A8D5BA', secondary: '#7FB069', accent: '#5B8C85' },
  tense: { primary: '#D48A8A', secondary: '#B07A9A', accent: '#8B4513' },
};

export const BACKGROUND_TYPES: BackgroundType[] = ['forest', 'castle', 'desert', 'ocean', 'mountain', 'city', 'starry', 'garden'];
