export interface Card {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  nextReview: string;
  interval: number;
  repetitions: number;
}

export interface CardDeck {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface ReviewRecord {
  date: string;
  cardId: string;
  deckId: string;
  grade: ReviewGrade;
}

export type ReviewGrade = 'hard' | 'normal' | 'easy';

export type PageView = 'list' | 'review' | 'stats';

export interface AppState {
  decks: CardDeck[];
  cards: Record<string, Card[]>;
  selectedDeckId: string | null;
  currentView: PageView;
  reviewRecords: ReviewRecord[];
}

export type AppAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'ADD_DECK'; payload: CardDeck }
  | { type: 'DELETE_DECK'; payload: string }
  | { type: 'UPDATE_DECK'; payload: CardDeck }
  | { type: 'ADD_CARD'; payload: { deckId: string; card: Card } }
  | { type: 'UPDATE_CARD'; payload: { deckId: string; card: Card } }
  | { type: 'DELETE_CARD'; payload: { deckId: string; cardId: string } }
  | { type: 'SET_SELECTED_DECK'; payload: string | null }
  | { type: 'SET_VIEW'; payload: PageView }
  | { type: 'ADD_REVIEW_RECORD'; payload: ReviewRecord };
