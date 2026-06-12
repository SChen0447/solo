export interface CardData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  category: string;
  votes: number;
  votedByUser: boolean;
  isPinned: boolean;
  isEditing: boolean;
  zIndex: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export type Action =
  | { type: 'ADD_CARD'; payload: { x: number; y: number; color: string; id: string } }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<CardData> } }
  | { type: 'DELETE_CARD'; payload: { id: string } }
  | { type: 'MOVE_CARD'; payload: { id: string; x: number; y: number } }
  | { type: 'SET_CATEGORY'; payload: { cardId: string; categoryId: string } }
  | { type: 'TOGGLE_VOTE'; payload: { cardId: string } }
  | { type: 'SET_ACTIVE_CATEGORY'; payload: { categoryId: string | null } }
  | { type: 'BRING_TO_FRONT'; payload: { id: string } };

export interface AppState {
  cards: CardData[];
  categories: Category[];
  activeCategory: string | null;
  maxZIndex: number;
}
