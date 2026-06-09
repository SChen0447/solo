export interface EmotionRecord {
  id: string;
  date: string;
  gradientStart: string;
  gradientEnd: string;
  emotionLabel: string;
  diary: string;
  image: string | null;
  likes: number;
  comments: string[];
  createdAt: string;
}

export interface NewRecordData {
  date?: string;
  gradientStart: string;
  gradientEnd: string;
  emotionLabel: string;
  diary: string;
  image: string | null;
}
