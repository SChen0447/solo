export interface CardData {
  id: string;
  imageDataUrl: string;
  originalWidth: number;
  originalHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  note: string;
  createdAt: number;
}

export interface AppState {
  cards: CardData[];
  selectedCardId: string | null;
}

type Listener = (state: AppState) => void;

const STORAGE_KEY = 'moodboard_state_v1';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadFromStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppState;
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
  }
  return { cards: [], selectedCardId: null };
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveToStorage(state: AppState): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, 100);
}

class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = loadFromStorage();
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  private setState(partial: Partial<AppState> | ((prev: AppState) => Partial<AppState>)): void {
    const next = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = { ...this.state, ...next };
    saveToStorage(this.state);
    this.notify();
  }

  addCard(imageDataUrl: string, originalWidth: number, originalHeight: number, x?: number, y?: number): void {
    const maxWidth = 280;
    const scale = Math.min(1, maxWidth / originalWidth);
    const width = originalWidth * scale;
    const height = originalHeight * scale;
    const card: CardData = {
      id: generateId(),
      imageDataUrl,
      originalWidth,
      originalHeight,
      x: x ?? 80 + Math.random() * 120,
      y: y ?? 80 + Math.random() * 120,
      width,
      height,
      rotation: 0,
      label: '',
      note: '',
      createdAt: Date.now(),
    };
    this.setState((prev) => ({ cards: [...prev.cards, card], selectedCardId: card.id }));
  }

  updateCard(id: string, patch: Partial<CardData>): void {
    this.setState((prev) => ({
      cards: prev.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  deleteCard(id: string): void {
    this.setState((prev) => ({
      cards: prev.cards.filter((c) => c.id !== id),
      selectedCardId: prev.selectedCardId === id ? null : prev.selectedCardId,
    }));
  }

  resetCardSize(id: string): void {
    const card = this.state.cards.find((c) => c.id === id);
    if (!card) return;
    const maxWidth = 280;
    const scale = Math.min(1, maxWidth / card.originalWidth);
    this.updateCard(id, {
      width: card.originalWidth * scale,
      height: card.originalHeight * scale,
      rotation: 0,
    });
  }

  selectCard(id: string | null): void {
    this.setState({ selectedCardId: id });
  }

  clearAll(): void {
    this.setState({ cards: [], selectedCardId: null });
  }
}

export const store = new Store();

export function useStore<T>(selector: (state: AppState) => T): T;
export function useStore(): AppState;
export function useStore<T>(selector?: (state: AppState) => T): T | AppState {
  const React = require('react');
  const sel = selector ?? ((s: AppState) => s);
  const [value, setValue] = React.useState(() => sel(store.getState()));
  React.useEffect(() => {
    return store.subscribe((s) => setValue(sel(s)));
  }, [selector]);
  return value;
}
