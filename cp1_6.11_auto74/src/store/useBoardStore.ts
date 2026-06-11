import { create } from 'zustand';
import type { Card, Board, ViewMode, CardFormData } from '../types';
import { boardApi, cardApi } from '../api';

interface BoardState {
  boards: Board[];
  cards: Card[];
  currentBoardId: string | null;
  viewMode: ViewMode;
  searchQuery: string;
  activeTags: string[];
  isLoading: boolean;
  isEditorOpen: boolean;
  editingCard: Card | null;

  setBoards: (boards: Board[]) => void;
  setCards: (cards: Card[]) => void;
  setCurrentBoardId: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  setIsLoading: (loading: boolean) => void;
  openEditor: (card?: Card | null) => void;
  closeEditor: () => void;

  fetchBoards: () => Promise<void>;
  fetchCards: (boardId: string) => Promise<void>;
  createBoard: (name: string) => Promise<void>;
  addCard: (data: CardFormData & { boardId: string }) => Promise<void>;
  updateCard: (id: string, data: Partial<CardFormData>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reorderCard: (id: string, newOrder: number) => Promise<void>;

  getFilteredCards: () => Card[];
  getAllTags: () => string[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  cards: [],
  currentBoardId: null,
  viewMode: 'grid',
  searchQuery: '',
  activeTags: [],
  isLoading: false,
  isEditorOpen: false,
  editingCard: null,

  setBoards: (boards) => set({ boards }),
  setCards: (cards) => set({ cards }),
  setCurrentBoardId: (id) => set({ currentBoardId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  toggleTag: (tag) => {
    const { activeTags } = get();
    if (activeTags.includes(tag)) {
      set({ activeTags: activeTags.filter(t => t !== tag) });
    } else {
      set({ activeTags: [...activeTags, tag] });
    }
  },

  clearTags: () => set({ activeTags: [] }),
  setIsLoading: (loading) => set({ isLoading: loading }),

  openEditor: (card = null) => {
    set({ isEditorOpen: true, editingCard: card });
  },

  closeEditor: () => {
    set({ isEditorOpen: false, editingCard: null });
  },

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const boards = await boardApi.getAll();
      set({ boards });
      if (boards.length > 0 && !get().currentBoardId) {
        set({ currentBoardId: boards[0].id });
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCards: async (boardId) => {
    set({ isLoading: true });
    try {
      const cards = await boardApi.getCards(boardId);
      set({ cards });
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createBoard: async (name) => {
    try {
      const newBoard = await boardApi.create(name);
      set((state) => ({ boards: [...state.boards, newBoard] }));
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  },

  addCard: async (data) => {
    try {
      const newCard = await cardApi.create(data);
      set((state) => ({ cards: [...state.cards, newCard] }));
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  },

  updateCard: async (id, data) => {
    try {
      const updatedCard = await cardApi.update(id, data);
      set((state) => ({
        cards: state.cards.map(c => c.id === id ? updatedCard : c),
      }));
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  },

  deleteCard: async (id) => {
    try {
      await cardApi.remove(id);
      set((state) => ({
        cards: state.cards.filter(c => c.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  },

  reorderCard: async (id, newOrder) => {
    try {
      await cardApi.reorder(id, newOrder);
      const { cards } = get();
      const card = cards.find(c => c.id === id);
      if (!card) return;

      const boardCards = cards
        .filter(c => c.boardId === card.boardId && c.id !== id)
        .sort((a, b) => a.order - b.order);

      const newOrderNum = Math.max(0, Math.min(newOrder, boardCards.length));
      boardCards.splice(newOrderNum, 0, { ...card, order: newOrderNum });

      const updatedCards = cards.map(c => {
        const idx = boardCards.findIndex(bc => bc.id === c.id);
        if (idx !== -1) {
          return { ...c, order: idx };
        }
        return c;
      });

      set({ cards: updatedCards });
    } catch (error) {
      console.error('Failed to reorder card:', error);
    }
  },

  getFilteredCards: () => {
    const { cards, searchQuery, activeTags, currentBoardId } = get();
    const boardCards = cards.filter(c => c.boardId === currentBoardId);
    
    let filtered = boardCards;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card =>
        card.title.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query)
      );
    }

    if (activeTags.length > 0) {
      filtered = filtered.filter(card =>
        activeTags.some(tag => card.tags.includes(tag))
      );
    }

    return filtered.sort((a, b) => a.order - b.order);
  },

  getAllTags: () => {
    const { cards, currentBoardId } = get();
    const boardCards = cards.filter(c => c.boardId === currentBoardId);
    const tags = new Set<string>();
    boardCards.forEach(card => {
      card.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  },
}));
