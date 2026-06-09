export type StyleType = 'formal' | 'concise' | 'vivid';

export interface SummaryCard {
  index: number;
  sentence: string;
  score: number;
  styledSentence?: string;
  charStart: number;
  charEnd: number;
}

export interface SummarizeRequest {
  text: string;
  style?: StyleType;
  fileName?: string;
}

export interface SummarizeResponse {
  summaries: SummaryCard[];
  sentences: string[];
  wordCount: number;
}

export interface SentencePosition {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}
