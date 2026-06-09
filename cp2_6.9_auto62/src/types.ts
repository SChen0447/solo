export type EmotionLabel = 'joy' | 'anger' | 'sadness' | 'fear' | 'calm' | 'neutral';

export interface SentenceResult {
  index: number;
  sentence: string;
  score: number;
  label: EmotionLabel;
  matchedWords: string[];
}

export interface AnalysisSummary {
  totalSentences: number;
  averageScore: number;
  labelDistribution: Record<EmotionLabel, number>;
}

export interface AnalysisResult {
  results: SentenceResult[];
  summary: AnalysisSummary;
}

export interface ProgressMessage {
  type: 'progress';
  progress: number;
  current: number;
  total: number;
}

export interface CompleteMessage {
  type: 'complete';
  results: SentenceResult[];
  summary: AnalysisSummary;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WSMessage = ProgressMessage | CompleteMessage | ErrorMessage;

export const LABEL_INFO: Record<EmotionLabel, { name: string; color: string }> = {
  joy: { name: '喜悦', color: '#38A169' },
  anger: { name: '愤怒', color: '#E53E3E' },
  sadness: { name: '悲伤', color: '#4299E1' },
  fear: { name: '恐惧', color: '#805AD5' },
  calm: { name: '平静', color: '#38B2AC' },
  neutral: { name: '中性', color: '#A0AEC0' },
};
