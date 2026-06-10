export interface SignItem {
  id: string
  nickname: string
  image: string
  timestamp: number
  rotation: number
  x: number
  y: number
}

export interface DrawRecord {
  id: string
  winnerNickname: string
  winnerImage: string
  participantCount: number
  timestamp: number
}

export type BrushSize = 2 | 5 | 10

export const BRUSH_COLORS = ['#ff6b6b', '#4ecdc4', '#ffd93d', '#6c5ce7', '#ffffff'] as const
export type BrushColor = typeof BRUSH_COLORS[number]
