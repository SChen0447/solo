export interface User {
  id: string;
  username: string;
  createdAt: number;
}

export interface Exhibition {
  id: string;
  ownerId: string;
  name: string;
  themeColor: string;
  likes: number;
  visitors: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Exhibit {
  id: string;
  exhibitionId: string;
  name: string;
  description: string;
  x: number;
  y: number;
  lightType: 'pulse' | 'rotate' | 'ripple';
  glowColor: string;
  createdAt: number;
}

export interface LightTrail {
  id: string;
  exhibitId: string;
  visitorId: string;
  points: { x: number; y: number }[];
  color: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
