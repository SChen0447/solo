export type EmotionType = 'positive' | 'neutral' | 'negative';

export interface InspirationCard {
  id: string;
  keyword: string;
  phrase: string;
  emotion: EmotionType;
  color: string;
  rotation: number;
  tags: string[];
  archived: boolean;
  x?: number;
  y?: number;
  placedOnCanvas: boolean;
  createdAt: number;
}

export interface AppState {
  cards: InspirationCard[];
  deleteCount: number;
  selectedCardId: string | null;
}

export type AppAction =
  | { type: 'ADD_CARDS'; payload: InspirationCard[] }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<InspirationCard> } }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'ARCHIVE_CARD'; payload: string }
  | { type: 'ADD_TAG'; payload: { cardId: string; tag: string } }
  | { type: 'RESET' }
  | { type: 'SELECT_CARD'; payload: string | null }
  | { type: 'PLACE_ON_CANVAS'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_CANVAS_POSITION'; payload: { id: string; x: number; y: number } }
  | { type: 'HYDRATE'; payload: AppState };
