import { create } from 'zustand'

export interface CardData {
  id: string
  userId: string
  type: 'image' | 'text' | 'audio'
  title: string
  content: string
  tags: string[]
  positionX: number
  positionY: number
  createdAt: string
  fileUrl?: string
}

interface AppState {
  user: { id: string; username: string } | null
  token: string | null
  cards: CardData[]
  filterTag: string | null
  selectedCard: CardData | null
  leftPanelOpen: boolean
  tagBarOpen: boolean
  isCreating: boolean

  setUser: (user: { id: string; username: string } | null, token: string | null) => void
  setCards: (cards: CardData[]) => void
  addCard: (card: CardData) => void
  updateCard: (id: string, updates: Partial<CardData>) => void
  removeCard: (id: string) => void
  setFilterTag: (tag: string | null) => void
  setSelectedCard: (card: CardData | null) => void
  setLeftPanelOpen: (open: boolean) => void
  setTagBarOpen: (open: boolean) => void
  setIsCreating: (creating: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: null,
  cards: [],
  filterTag: null,
  selectedCard: null,
  leftPanelOpen: true,
  tagBarOpen: true,
  isCreating: false,

  setUser: (user, token) => set({ user, token }),
  setCards: (cards) => set({ cards }),
  addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeCard: (id) =>
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
    })),
  setFilterTag: (tag) => set({ filterTag: tag }),
  setSelectedCard: (card) => set({ selectedCard: card }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setTagBarOpen: (open) => set({ tagBarOpen: open }),
  setIsCreating: (creating) => set({ isCreating: creating }),
}))
