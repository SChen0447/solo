export interface WordResponse {
  gameOver: boolean;
  currentLevel?: number;
  totalLevels?: number;
  lives?: number;
  score?: number;
  word?: string;
  meaning?: string;
  level?: 'CET-4' | 'CET-6' | 'KAOYAN';
  totalQuestions?: number;
  correctAnswers?: number;
}

export interface SubmitResponse {
  correct: boolean;
  correctWord: string;
  gameOver: boolean;
  currentLevel?: number;
  totalLevels?: number;
  lives?: number;
  score?: number;
  nextWord?: string;
  nextMeaning?: string;
  nextLevel?: 'CET-4' | 'CET-6' | 'KAOYAN';
  totalQuestions?: number;
  correctAnswers?: number;
}

const API_BASE = '/api';

export const WordService = {
  async getWord(): Promise<WordResponse> {
    const response = await fetch(`${API_BASE}/get-word`);
    if (!response.ok) {
      throw new Error('Failed to get word');
    }
    return response.json();
  },

  async submitAnswer(answer: string): Promise<SubmitResponse> {
    const response = await fetch(`${API_BASE}/submit-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answer }),
    });
    if (!response.ok) {
      throw new Error('Failed to submit answer');
    }
    return response.json();
  },

  async resetGame(): Promise<WordResponse> {
    const response = await fetch(`${API_BASE}/reset-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to reset game');
    }
    return response.json();
  },
};
