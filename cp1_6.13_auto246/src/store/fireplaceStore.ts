import { create } from 'zustand'

export type EmotionType = 'joy' | 'sadness' | 'anger' | 'serenity'

export interface ActiveEmber {
  id: string
  emotion: EmotionType
  remainingMs: number
}

interface FireplaceStore {
  embers: ActiveEmber[]
  addEmber: (emotion: EmotionType) => Promise<void>
  updateEmbers: (embers: ActiveEmber[]) => void
  isDormant: () => boolean
  setEmbers: (embers: ActiveEmber[]) => void
}

export const useFireplaceStore = create<FireplaceStore>((set, get) => ({
  embers: [],
  addEmber: async (emotion: EmotionType) => {
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion }),
      })
      if (res.ok) {
        const data = await res.json()
        set((state) => ({
          embers: [...state.embers, { id: data.id, emotion: data.emotion, remainingMs: data.remainingMs }],
        }))
      }
    } catch (e) {
      console.error('Failed to add ember:', e)
    }
  },
  updateEmbers: (embers: ActiveEmber[]) => {
    set({ embers })
  },
  isDormant: () => get().embers.length === 0,
  setEmbers: (embers: ActiveEmber[]) => set({ embers }),
}))
