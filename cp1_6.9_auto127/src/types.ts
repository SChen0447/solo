export interface WaveformData {
  samples: number[];
  sampleRate: number;
}

export interface Clip {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  color: string;
  waveform: WaveformData;
}

export type TrackControlState = 'normal' | 'mute' | 'solo' | 'record';

export interface Track {
  id: string;
  name: string;
  controlState: TrackControlState;
  color: string;
}

export interface Project {
  tracks: Track[];
  clips: Clip[];
  bpm: number;
  globalVolume: number;
}

export interface UserCursor {
  id: string;
  x: number;
  y: number;
  color: string;
  name: string;
  trail: { x: number; y: number }[];
}

export const USER_COLORS = [
  '#e91e63',
  '#4caf50',
  '#2196f3',
  '#ffeb3b',
  '#9c27b0',
  '#00bcd4',
  '#ff5722',
  '#e91e63',
];
