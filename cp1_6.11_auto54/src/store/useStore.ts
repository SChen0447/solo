import { create } from 'zustand';
import type { Card, Connection, User, ConflictMessageData } from '../types';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface WhiteboardState {
  cards: Card[];
  connections: Connection[];
  users: User[];
  currentUserId: string | null;
  selectedCardId: string | null;
  scale: number;
  offsetX: number;
  offsetY: number;
  toasts: Toast[];
  isDraggingCanvas: boolean;
  isConnecting: boolean;
  connectingFrom: string | null;
  connectingStartX: number;
  connectingStartY: number;
  connectingCurrentX: number;
  connectingCurrentY: number;

  setCurrentUserId: (id: string) => void;
  setCards: (cards: Card[]) => void;
  setConnections: (connections: Connection[]) => void;
  setUsers: (users: User[]) => void;
  addCard: (card: Card) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  updateCardPosition: (id: string, x: number, y: number) => void;
  deleteCard: (id: string) => void;
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: string) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUserCursor: (userId: string, x: number, y: number) => void;
  setSelectedCardId: (id: string | null) => void;
  setScale: (scale: number) => void;
  setOffset: (x: number, y: number) => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  setIsDraggingCanvas: (dragging: boolean) => void;
  startConnecting: (fromCardId: string, x: number, y: number) => void;
  updateConnectingLine: (x: number, y: number) => void;
  endConnecting: () => void;
  showConflict: (data: ConflictMessageData) => void;
  setCardEditingBy: (cardId: string, userId: string | undefined) => void;
}

export const useStore = create<WhiteboardState>((set, get) => ({
  cards: [],
  connections: [],
  users: [],
  currentUserId: null,
  selectedCardId: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  toasts: [],
  isDraggingCanvas: false,
  isConnecting: false,
  connectingFrom: null,
  connectingStartX: 0,
  connectingStartY: 0,
  connectingCurrentX: 0,
  connectingCurrentY: 0,

  setCurrentUserId: (id) => set({ currentUserId: id }),

  setCards: (cards) => set({ cards }),

  setConnections: (connections) => set({ connections }),

  setUsers: (users) => set({ users }),

  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),

  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  updateCardPosition: (id, x, y) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
    })),

  deleteCard: (id) =>
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
      connections: state.connections.filter((c) => c.fromCardId !== id && c.toCardId !== id),
      selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
    })),

  addConnection: (connection) =>
    set((state) => ({
      connections: [...state.connections, connection],
    })),

  deleteConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),

  addUser: (user) =>
    set((state) => ({
      users: state.users.some((u) => u.id === user.id)
        ? state.users
        : [...state.users, user],
    })),

  removeUser: (userId) =>
    set((state) => ({
      users: state.users.filter((u) => u.id !== userId),
      cards: state.cards.map((c) =>
        c.editingBy === userId ? { ...c, editingBy: undefined } : c
      ),
    })),

  updateUserCursor: (userId, x, y) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, cursorX: x, cursorY: y } : u
      ),
    })),

  setSelectedCardId: (id) => set({ selectedCardId: id }),

  setScale: (scale) => set({ scale }),

  setOffset: (x, y) => set({ offsetX: x, offsetY: y }),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  setIsDraggingCanvas: (dragging) => set({ isDraggingCanvas: dragging }),

  startConnecting: (fromCardId, x, y) =>
    set({
      isConnecting: true,
      connectingFrom: fromCardId,
      connectingStartX: x,
      connectingStartY: y,
      connectingCurrentX: x,
      connectingCurrentY: y,
    }),

  updateConnectingLine: (x, y) =>
    set({
      connectingCurrentX: x,
      connectingCurrentY: y,
    }),

  endConnecting: () =>
    set({
      isConnecting: false,
      connectingFrom: null,
    }),

  showConflict: (data) => {
    get().addToast(data.message, 'warning');
  },

  setCardEditingBy: (cardId, userId) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, editingBy: userId } : c
      ),
    })),
}));
