export interface Card {
  id: string;
  title: string;
  description: string;
  color: string;
  tags: string[];
  imageUrl: string;
  linkUrl: string;
  order: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'grid' | 'list';

export interface CardFormData {
  title: string;
  description: string;
  color: string;
  tags: string[];
  imageUrl: string;
  linkUrl: string;
}
