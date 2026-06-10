export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Material {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  color: string;
  rarityColor: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  materials: string[];
  resultPotion: {
    name: string;
    effect: string;
    color: string;
    rarity: Rarity;
    basePrice: number;
  };
}

export interface Bid {
  id: string;
  bidderId: string;
  bidderName: string;
  price: number;
  timestamp: number;
}

export interface Potion {
  id: string;
  name: string;
  effect: string;
  color: string;
  rarity: Rarity;
  volume: number;
  recipeId: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  listed: boolean;
  price?: number;
  bidHistory: Bid[];
}

export interface ExchangeOffer {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredRecipeId: string;
  requestedRecipeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface BrewRequest {
  materials: string[];
  userId: string;
}

export interface BrewResponse {
  success: boolean;
  potion?: Potion;
  recipe?: Recipe;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface User {
  id: string;
  name: string;
}
