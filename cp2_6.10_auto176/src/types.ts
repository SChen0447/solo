export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
  cover: string;
  description: string;
  tags: string[];
  rating: number;
}

export interface RecommendedBook extends Book {
  matchScore: number;
}

export type RatingMap = Record<string, number>;
