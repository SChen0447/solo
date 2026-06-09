export interface Plant {
  id: string;
  name: string;
  imageUrl: string;
  careCount: number;
  variety: string | null;
  bloomCount: number;
  createdAt: string;
}

export interface CareResponse {
  plant: Plant;
  bloomed: boolean;
  bloomData: {
    variety: string;
    bloomCount: number;
  } | null;
}

export type CareType = 'water' | 'fertilize';
