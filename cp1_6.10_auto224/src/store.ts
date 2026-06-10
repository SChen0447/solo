import { AppState, AppAction } from './types';

const STORAGE_KEY = 'inspiration-sketch-state';

export const initialState: AppState = {
  cards: [],
  deleteCount: 0,
  selectedCardId: null,
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_CARDS':
      return {
        ...state,
        cards: [...state.cards, ...action.payload],
      };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? { ...card, ...action.payload.updates } : card
        ),
      };
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload),
        deleteCount: state.deleteCount + 1,
      };
    case 'ARCHIVE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload ? { ...card, archived: true } : card
        ),
      };
    case 'ADD_TAG':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.cardId && card.tags.length < 3
            ? { ...card, tags: [...card.tags, action.payload.tag] }
            : card
        ),
      };
    case 'RESET':
      return initialState;
    case 'SELECT_CARD':
      return {
        ...state,
        selectedCardId: action.payload,
      };
    case 'PLACE_ON_CANVAS':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id
            ? { ...card, placedOnCanvas: true, x: action.payload.x, y: action.payload.y }
            : card
        ),
      };
    case 'UPDATE_CANVAS_POSITION':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id
            ? { ...card, x: action.payload.x, y: action.payload.y }
            : card
        ),
      };
    case 'HYDRATE':
      return action.payload;
    default:
      return state;
  }
}

export function saveToStorage(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state:', e);
  }
}

export function loadFromStorage(): AppState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  } catch (e) {
    console.error('Failed to load state:', e);
    return null;
  }
}
