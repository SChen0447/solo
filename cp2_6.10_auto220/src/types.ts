export interface ChallengeCard {
  id: string;
  themeId: string;
  recipeName: string;
  ingredients: string[];
  description: string;
  nickname: string;
  likes: number;
  likedByUser: boolean;
  comments: Comment[];
  createdAt: number;
}

export interface Comment {
  id: string;
  nickname: string;
  content: string;
  createdAt: number;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
}

export interface RankingItem {
  id: string;
  recipeName: string;
  nickname: string;
  likes: number;
  rank: number;
}
