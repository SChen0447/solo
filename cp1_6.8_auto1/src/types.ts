export type PixelColor = string | null

export interface PixelGrid {
  width: number
  height: number
  pixels: PixelColor[][]
}

export interface HistoryRecord {
  id: string
  thumbnail: string
  timestamp: number
  themeName: string
  grid: PixelGrid
  palette: string[]
}

export type ThemeId = 'retro' | 'cyber' | 'classic'

export interface ThemeOption {
  id: ThemeId
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  border: string
}

export type ToolType = 'brush' | 'eraser'

export type GridSize = 16 | 32

export type ZoomLevel = 1 | 2 | 4

export type RotationAngle = 0 | 90 | 180 | 270
