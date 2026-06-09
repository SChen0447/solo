export type Rarity = 'common' | 'rare' | 'epic';

export interface Material {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  rarity: Rarity;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Artwork {
  id: string;
  userId: string;
  name: string;
  description: string;
  thumbnailColors: string[];
  materials: string[];
  createdAt: string;
  listed: boolean;
}

export interface MarketListing {
  id: string;
  artworkId: string;
  sellerId: string;
  sellerName: string;
  artworkName: string;
  thumbnailColors: string[];
  price: number;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  coins: number;
  remainingBoxes: number;
  materialCount?: number;
  artworkCount?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OpenBoxResponse {
  materials: Material[];
  remainingBoxes: number;
}

export interface CraftResponse {
  success: boolean;
  artwork?: Artwork;
  message?: string;
}

export interface TradeBuyResponse {
  success: boolean;
  artwork?: Artwork;
  message?: string;
}

export interface MaterialTemplate {
  id: string;
  name: string;
  rarity: Rarity;
  icon: string;
  color: string;
  weight: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  requiredMaterials: string[];
}
