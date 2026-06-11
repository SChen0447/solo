import { create } from 'zustand';

export interface DatingResult {
  success: boolean;
  requestId: string;
  patternImage: string;
  dating: {
    startYear: number;
    endYear: number;
    midYear: number;
    startYearLabel: string;
    endYearLabel: string;
    midYearLabel: string;
    confidence: number;
    description: string;
  };
  params: {
    temperature: number;
    duration: number;
    carbonizationLevel: number;
  };
}

interface AppState {
  imageBase64: string | null;
  temperature: number;
  duration: number;
  knifeSize: number;
  isCarbonizing: boolean;
  carbonizationProgress: number;
  datingResult: DatingResult | null;
  isAnalyzing: boolean;
  error: string | null;
  setImageBase64: (data: string | null) => void;
  setTemperature: (t: number) => void;
  setDuration: (d: number) => void;
  setKnifeSize: (s: number) => void;
  setIsCarbonizing: (v: boolean) => void;
  setCarbonizationProgress: (p: number) => void;
  setDatingResult: (r: DatingResult | null) => void;
  setIsAnalyzing: (v: boolean) => void;
  setError: (e: string | null) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  imageBase64: null,
  temperature: 300,
  duration: 20,
  knifeSize: 3,
  isCarbonizing: false,
  carbonizationProgress: 0,
  datingResult: null,
  isAnalyzing: false,
  error: null,
  setImageBase64: (data) => set({ imageBase64: data }),
  setTemperature: (t) => set({ temperature: t }),
  setDuration: (d) => set({ duration: d }),
  setKnifeSize: (s) => set({ knifeSize: s }),
  setIsCarbonizing: (v) => set({ isCarbonizing: v }),
  setCarbonizationProgress: (p) => set({ carbonizationProgress: p }),
  setDatingResult: (r) => set({ datingResult: r }),
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setError: (e) => set({ error: e }),
  resetAll: () =>
    set({
      imageBase64: null,
      temperature: 300,
      duration: 20,
      knifeSize: 3,
      isCarbonizing: false,
      carbonizationProgress: 0,
      datingResult: null,
      isAnalyzing: false,
      error: null,
    }),
}));
