export const GRID_SIZE = 300
export const CELL_SIZE = 12
export const CELL_GAP = 1

export const CANDY_COLORS = [
  '#FF6B6B', '#FF8E8E', '#FFB4B4', '#FFD93D',
  '#FFE66D', '#F7DC6F', '#6BCB77', '#48C9B0',
  '#4ECDC4', '#95E1D3', '#4D96FF', '#A8D8EA',
  '#845EC2', '#AA96DA', '#FF6B9D', '#FCBAD3'
]

export interface User {
  id: string
  name: string
  color: string
  joinedAt: number
}

export interface PixelUpdate {
  x: number
  y: number
  color: string
  userId: string
  timestamp: number
}

export interface AppState {
  grid: string[]
  selectedColor: string
  users: User[]
  currentUser: User | null
  isPlaying: boolean
  playbackTime: number
  startTime: number
  hoveredCell: { x: number; y: number } | null
  paletteCollapsed: boolean
  recentPixels: Map<string, number>
}

export type AppAction =
  | { type: 'SET_GRID'; grid: string[] }
  | { type: 'SET_PIXEL'; x: number; y: number; color: string }
  | { type: 'SELECT_COLOR'; color: string }
  | { type: 'SET_USERS'; users: User[] }
  | { type: 'ADD_USER'; user: User }
  | { type: 'REMOVE_USER'; userId: string }
  | { type: 'SET_CURRENT_USER'; user: User }
  | { type: 'SET_HOVERED'; cell: { x: number; y: number } | null }
  | { type: 'TOGGLE_PALETTE' }
  | { type: 'SET_PLAYBACK'; time: number }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_START_TIME'; time: number }
  | { type: 'ADD_RECENT_PIXEL'; key: string; time: number }
  | { type: 'CLEAN_RECENT_PIXELS'; now: number }
