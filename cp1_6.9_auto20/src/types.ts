export interface User {
  id: string
  username: string
  avatar: string
}

export interface Crack {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  repaired: boolean
}

export interface Stroke {
  id: string
  tool: string
  color: string
  points: { x: number; y: number; z: number }[]
  timestamp: number
}

export interface Comment {
  id: string
  userId: string
  username: string
  content: string
  createdAt: string
}

export interface Antique {
  id: string
  name: string
  dynasty: string
  type: string
  baseColor: string
  userId: string
  username: string
  cracks: Crack[]
  strokes: Stroke[]
  originalThumbnail: string
  restoredThumbnail: string
  status: 'pending' | 'completed'
  createdAt: string
  completedAt?: string
  ratings: { userId: string; rating: number }[]
  comments: Comment[]
}

export interface FeedItem {
  id: string
  userId: string
  username: string
  avatar: string
  antiqueId: string
  antiqueName: string
  thumbnail: string
  likes: string[]
  createdAt: string
}

export type ToolType = 'fill' | 'paint' | 'gold' | 'smooth' | 'undo' | null
