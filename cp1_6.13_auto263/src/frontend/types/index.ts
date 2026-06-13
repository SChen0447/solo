export interface Painting {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  imageUrl: string;
  thumbnailUrl: string;
  category: 'landscape' | 'floral' | 'abstract';
  width: number;
  height: number;
}

export interface User {
  username: string;
  favorites: string[];
}

export type CategoryType = 'landscape' | 'floral' | 'abstract';
