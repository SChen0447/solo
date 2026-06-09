export interface Idea {
  id: string;
  name: string;
  description: string;
  scores: Scores;
}

export interface Scores {
  feasibility: number;
  innovation: number;
  marketPotential: number;
  cost: number;
}

export interface Weights {
  feasibility: number;
  innovation: number;
  marketPotential: number;
  cost: number;
}

export interface Session {
  id: string;
  title: string;
  ideas: Idea[];
  weights: Weights;
  createdAt: number;
}

export interface IdeaResult extends Idea {
  totalScore: number;
  rank: number;
}

export interface ResultResponse {
  sessionId: string;
  title: string;
  weights: Weights;
  results: IdeaResult[];
}

export type DimensionKey = keyof Scores;

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  feasibility: '可行性',
  innovation: '创新性',
  marketPotential: '市场潜力',
  cost: '成本投入',
};

export const COLOR_PALETTE = [
  '#4A90D9',
  '#5DAE8B',
  '#E8A838',
  '#D96C6C',
  '#9B7ED9',
  '#5CC0D9',
  '#D99B4A',
  '#6CD9A8',
  '#D96CA8',
  '#A8D96C',
];
