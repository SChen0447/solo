export interface User {
  id: string;
  username: string;
}

export interface Star {
  id: string;
  userId: string;
  x: number;
  y: number;
  color: string;
  size: number;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
}

export interface ShareData {
  star: {
    id: string;
    content: string;
    color: string;
    size: number;
    createdAt: number;
  };
  author: { username: string } | null;
}
