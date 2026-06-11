export interface DrawPoint {
  x: number
  y: number
  timestamp: number
  speed: number
  width: number
  color: string
}

export interface Particle {
  id: number
  x: number
  y: number
  pathIndex: number
  progress: number
  color: string
  size: number
  speed: number
  alpha: number
  trail: { x: number; y: number; alpha: number }[]
}

export interface FilterConfig {
  blur: { enabled: boolean; radius: number }
  glow: { enabled: boolean; intensity: number }
  mosaic: { enabled: boolean; blockSize: number }
  pixelate: { enabled: boolean; levels: number }
  neonEdge: { enabled: boolean }
}

export interface RecordingFrame {
  timestamp: number
  points: DrawPoint[]
  filters: FilterConfig
}

export interface RecordingSegment {
  startTime: number
  endTime: number
  frames: RecordingFrame[]
}

export type ToolbarAction =
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_WIDTH'; width: number }
  | { type: 'TOGGLE_FILTER'; filter: keyof FilterConfig }
  | { type: 'UPDATE_FILTER'; filter: keyof FilterConfig; key: string; value: number }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'SAVE_CANVAS' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'START_PLAYBACK'; speed: number }
  | { type: 'STOP_PLAYBACK' }
  | { type: 'PAUSE_PLAYBACK' }
  | { type: 'RESUME_PLAYBACK' }

export const NEON_COLORS = [
  '#ff00ff',
  '#00ffff',
  '#ff0080',
  '#00ff80',
  '#ffff00',
  '#ff4500',
  '#9d00ff',
  '#00bfff'
]
