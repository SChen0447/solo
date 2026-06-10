export interface Point {
  x: number
  y: number
}

export interface Room {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  bgColor: string
}

export interface Exhibit {
  id: string
  name: string
  era: string
  material: string
  size: string
  description: string
  thumbnailColor: string
  gradientStart: string
  gradientEnd: string
}

export interface Pin {
  id: string
  roomId: string
  x: number
  y: number
  exhibit: Exhibit
}

export interface HistoryState {
  rooms: Room[]
  pins: Pin[]
}

export interface RouteItem {
  pinId: string
}

export type ToolType = 'select' | 'room' | 'pin'
