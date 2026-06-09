export interface Reply {
  id: string;
  content: string;
  type: 'continue' | 'refute';
  likes: number;
  createdAt: number;
}

export interface Idea {
  id: string;
  content: string;
  replies: Reply[];
  createdAt: number;
}

export interface IdeasResponse {
  data: Idea[];
  total: number;
  hasMore: boolean;
}

export interface IdeaResponse {
  data: Idea;
}
