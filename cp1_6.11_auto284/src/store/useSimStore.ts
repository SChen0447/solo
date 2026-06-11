import { create } from 'zustand';
import { z } from 'zod';
import type { GreeneryConfig, SimStats, ArrangementType } from '@/types';

const configSchema = z.object({
  greenArea: z.number().min(50).max(500),
  treeHeight: z.number().min(5).max(30),
  arrangement: z.enum(['array', 'staggered', 'cluster']),
});

interface SimState {
  config: GreeneryConfig;
  stats: SimStats;
  isPlaying: boolean;
  setConfig: (config: Partial<GreeneryConfig>) => void;
  setStats: (stats: Partial<SimStats>) => void;
  togglePlay: () => void;
  resetConfig: () => void;
}

const defaultConfig: GreeneryConfig = {
  greenArea: 200,
  treeHeight: 15,
  arrangement: 'array',
};

const defaultStats: SimStats = {
  totalConcentration: 120,
  captureEfficiency: 0,
  totalParticles: 500,
  capturedParticles: 0,
};

export const useSimStore = create<SimState>((set, get) => ({
  config: defaultConfig,
  stats: defaultStats,
  isPlaying: true,

  setConfig: (partial) => {
    const newConfig = { ...get().config, ...partial };
    const result = configSchema.safeParse(newConfig);
    if (result.success) {
      set({ config: result.data });
    }
  },

  setStats: (stats) => {
    set((state) => ({ stats: { ...state.stats, ...stats } }));
  },

  togglePlay: () => {
    set((state) => ({ isPlaying: !state.isPlaying }));
  },

  resetConfig: () => {
    set({ config: defaultConfig });
  },
}));

export type { ArrangementType };
