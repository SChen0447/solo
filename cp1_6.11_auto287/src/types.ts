export type FillMode = 'point' | 'warp' | 'weft' | 'drag'

export interface LoomState {
  gridSize: number
  warpColors: string[]
  weftColors: string[]
  tension: number
  intersectionColors: string[][]
  selectedColor: string
  fillMode: FillMode
}

export interface HistoryEntry {
  intersectionColors: string[][]
  warpColors: string[]
  weftColors: string[]
}

export interface RippleEffect {
  x: number
  y: number
  startTime: number
}
