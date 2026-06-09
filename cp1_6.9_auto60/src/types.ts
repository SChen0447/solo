export interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  thickness: number
  userId: string
}

export interface StickyNote {
  id: string
  x: number
  y: number
  text: string
  userId: string
}

export interface User {
  id: string
  name: string
  color: string
}

export interface ViewState {
  offsetX: number
  offsetY: number
  scale: number
}

export const COLORS = [
  '#ff4444',
  '#ff9800',
  '#ffeb3b',
  '#4caf50',
  '#2196f3',
  '#9c27b0',
  '#000000',
  '#ffffff',
]

export const DEFAULT_COLOR = '#ff4444'
export const DEFAULT_THICKNESS = 4
export const MIN_THICKNESS = 2
export const MAX_THICKNESS = 20
export const MIN_SCALE = 0.5
export const MAX_SCALE = 3
export const MAX_NOTE_CHARS = 100
