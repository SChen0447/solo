export type WaveformType = 'bar' | 'curve' | 'circular';

export type FilterType = 'none' | 'neon' | 'vintage' | 'watercolor' | 'liquid' | 'pixel';

export interface ParticleConfig {
  count: number;
  size: number;
  speed: number;
}

export interface Keyframe {
  id: string;
  time: number;
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
}

export interface AudioMetadata {
  fileId: string;
  filename: string;
  size: number;
  url: string;
  mimeType: string;
  duration?: number;
}

export interface Template {
  id: string;
  name: string;
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
  description: string;
}

export interface VisualizerState {
  waveformType: WaveformType;
  filterType: FilterType;
  particleConfig: ParticleConfig;
  keyframes: Keyframe[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isExporting: boolean;
  exportProgress: number;
}

export interface FrequencyColor {
  low: string;
  mid: string;
  high: string;
}
