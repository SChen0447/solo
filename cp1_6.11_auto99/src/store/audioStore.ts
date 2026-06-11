import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type WaveMode = 'bars' | 'lines' | 'particles';

export interface TrackState {
  id: string;
  loaded: boolean;
  playing: boolean;
  gain: number;
  pan: number;
  fileName: string;
  fingerprint: number[];
  dominantBand: 'low' | 'mid' | 'high';
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  glow: string;
}

interface AudioStore {
  tracks: TrackState[];
  themeColors: ThemeColors;
  waveMode: WaveMode;
  isPlaying: boolean;
  masterVolume: number;

  setTrackGain: (index: number, db: number) => void;
  setTrackPan: (index: number, angle: number) => void;
  setWaveMode: (mode: WaveMode) => void;
  setGlobalPlaying: (playing: boolean) => void;
  setTrackLoaded: (index: number, fileName: string, fingerprint: number[], dominantBand: 'low' | 'mid' | 'high') => void;
  setTrackPlaying: (index: number, playing: boolean) => void;
  setThemeColors: (colors: ThemeColors) => void;
  setMasterVolume: (vol: number) => void;
}

const defaultTracks: TrackState[] = Array.from({ length: 4 }, () => ({
  id: uuidv4(),
  loaded: false,
  playing: false,
  gain: -6,
  pan: 0,
  fileName: '',
  fingerprint: [],
  dominantBand: 'mid',
}));

export const useAudioStore = create<AudioStore>((set) => ({
  tracks: defaultTracks,
  themeColors: {
    primary: '#33ff99',
    secondary: '#66b3ff',
    glow: '#33ff9940',
  },
  waveMode: 'bars',
  isPlaying: false,
  masterVolume: 0.8,

  setTrackGain: (index, db) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) => (i === index ? { ...t, gain: db } : t)),
    })),

  setTrackPan: (index, angle) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) => (i === index ? { ...t, pan: angle } : t)),
    })),

  setWaveMode: (mode) => set({ waveMode: mode }),

  setGlobalPlaying: (playing) =>
    set((state) => ({
      isPlaying: playing,
      tracks: state.tracks.map((t) => (t.loaded ? { ...t, playing } : t)),
    })),

  setTrackLoaded: (index, fileName, fingerprint, dominantBand) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) =>
        i === index ? { ...t, loaded: true, fileName, fingerprint, dominantBand } : t
      ),
    })),

  setTrackPlaying: (index, playing) =>
    set((state) => ({
      tracks: state.tracks.map((t, i) => (i === index ? { ...t, playing } : t)),
    })),

  setThemeColors: (colors) => set({ themeColors: colors }),

  setMasterVolume: (vol) => set({ masterVolume: vol }),
}));
