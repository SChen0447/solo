import { create } from 'zustand'
import type { ScentNote, CandleState, SaveData, ScentPercentage } from './types'

interface WorkshopStore {
  scentNotes: ScentNote[];
  candles: CandleState[];
  selectedCandleId: string | null;
  savedRecipes: SaveData[];
  setScentNotes: (notes: ScentNote[]) => void;
  setCandles: (candles: CandleState[]) => void;
  selectCandle: (id: string | null) => void;
  toggleBurning: (id: string) => void;
  updateBurnTime: (id: string, delta: number) => void;
  updateMeltLevel: (id: string, level: number) => void;
  updateCurrentColor: (id: string, color: string) => void;
  updateScentPercentage: (candleId: string, noteId: string, percentage: number) => void;
  saveRecipe: (data: SaveData) => void;
  loadRecipes: () => void;
  deleteRecipe: (id: string) => void;
  restoreFromRecipe: (recipe: SaveData) => void;
}

const STORAGE_KEY = 'candle-workshop-recipes'

export const useWorkshopStore = create<WorkshopStore>((set, get) => ({
  scentNotes: [],
  candles: [],
  selectedCandleId: null,
  savedRecipes: [],

  setScentNotes: (notes) => set({ scentNotes: notes }),

  setCandles: (candles) => set({ candles }),

  selectCandle: (id) => set({ selectedCandleId: id }),

  toggleBurning: (id) =>
    set((state) => ({
      candles: state.candles.map((c) =>
        c.id === id ? { ...c, isBurning: !c.isBurning } : c
      ),
    })),

  updateBurnTime: (id, delta) =>
    set((state) => ({
      candles: state.candles.map((c) =>
        c.id === id ? { ...c, burnTime: c.burnTime + delta } : c
      ),
    })),

  updateMeltLevel: (id, level) =>
    set((state) => ({
      candles: state.candles.map((c) =>
        c.id === id ? { ...c, meltLevel: level } : c
      ),
    })),

  updateCurrentColor: (id, color) =>
    set((state) => ({
      candles: state.candles.map((c) =>
        c.id === id ? { ...c, currentColor: color } : c
      ),
    })),

  updateScentPercentage: (candleId, noteId, percentage) =>
    set((state) => ({
      candles: state.candles.map((c) => {
        if (c.id !== candleId) return c;
        const existing = c.scents.find((s) => s.noteId === noteId);
        let newScents: ScentPercentage[];
        if (existing) {
          newScents = c.scents.map((s) =>
            s.noteId === noteId ? { ...s, percentage } : s
          );
        } else {
          newScents = [...c.scents, { noteId, percentage }];
        }
        const total = newScents.reduce((sum, s) => sum + s.percentage, 0);
        if (total > 100) return c;
        return { ...c, scents: newScents };
      }),
    })),

  saveRecipe: (data) => {
    const recipes = [...get().savedRecipes];
    const existingIdx = recipes.findIndex((r) => r.id === data.id);
    if (existingIdx >= 0) {
      recipes[existingIdx] = data;
    } else {
      recipes.push(data);
    }
    set({ savedRecipes: recipes });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch {}
  },

  loadRecipes: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const recipes = JSON.parse(stored) as SaveData[];
        set({ savedRecipes: recipes });
      }
    } catch {}
  },

  deleteRecipe: (id) => {
    const recipes = get().savedRecipes.filter((r) => r.id !== id);
    set({ savedRecipes: recipes });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch {}
  },

  restoreFromRecipe: (recipe) => {
    set((state) => ({
      candles: state.candles.map((c) =>
        c.id === recipe.id
          ? {
              ...c,
              scents: recipe.scents,
              burnTime: recipe.burnDuration,
              currentColor: recipe.currentColor,
              waxColor: recipe.waxColor,
              name: recipe.name,
            }
          : c
      ),
    }));
  },
}))
