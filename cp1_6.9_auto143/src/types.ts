export type FlowerSpecies = 'rose' | 'iris' | 'sunflower';

export interface Flower {
  _id: string;
  species: FlowerSpecies;
  name: string;
  meaning: string;
  color: string;
  progress: number;
  health: number;
  unlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
  ownerName: string;
}

export interface Specimen {
  _id: string;
  flowerId: string;
  flowerName: string;
  flowerMeaning: string;
  flowerColor: string;
  serialNumber: string;
  imageBase64: string;
  favorite: boolean;
  shareToken: string;
  createdAt: string;
}

export interface PaginatedFlowers {
  data: Flower[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CareAction = 'water' | 'fertilize' | 'light';
