export interface CellPosition {
  row: number;
  col: number;
}

export interface TouchEvent {
  id: string;
  position: CellPosition;
  timestamp: number;
  velocity: number;
  type: 'click' | 'drag';
}

export interface TrailPoint {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  createdAt: number;
}

export interface CellState {
  position: CellPosition;
  color: string;
  scale: number;
  glowColor: string;
  glowSize: number;
  isActive: boolean;
  isHovered: boolean;
}

export interface NoteInfo {
  name: string;
  frequency: number;
  octave: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  events: TouchEvent[];
  playbackSpeed: number;
  recordingStartTime: number;
}

export type PlaybackSpeed = 0.5 | 1 | 2;

export const GRID_SIZE = 6;
export const CELL_DIAMETER = 40;
export const CELL_GAP_DESKTOP = 10;
export const CELL_GAP_TABLET = 10;
export const CELL_GAP_MOBILE = 6;

export const COLORS = {
  bgStart: '#0f0c29',
  bgMid: '#1a1a2e',
  bgEnd: '#16213e',
  cellDefault: '#b76e79',
  cellHoverGlow: '#b39eb5',
  cellActive: '#ffffff',
  trailStart: '#f4d03f',
  trailEnd: '#e67e22',
  buttonGoldStart: '#d4af37',
  buttonGoldEnd: '#f5d76e',
} as const;

export const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'sine', 'triangle', 'sine', 'triangle'];
