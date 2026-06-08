export interface Node {
  id: number
  row: number
  col: number
  x: number
  y: number
  color: string
}

export interface PathSegment {
  from: number
  to: number
  progress: number
}

export interface GestureConfig {
  nodeSize: number
  lineWidth: number
  lineColor: string
  bgType: 'gradient' | 'grid' | 'stars'
  bgGradientStart: string
  bgGradientEnd: string
}

export interface HistoryItem {
  id: string
  timestamp: number
  nodeColors: Record<number, string>
  path: number[]
  config: GestureConfig
}

export const COLOR_PALETTE = [
  '#e94560', '#ff6b6b', '#ffa502', '#ff7f50',
  '#ffd93d', '#f9ca24', '#6bcb77', '#26de81',
  '#4d96ff', '#5f27cd', '#9b59b6', '#e056fd',
  '#ffffff', '#bdc3c7', '#95a5a6', '#34495e'
]

export const DEFAULT_CONFIG: GestureConfig = {
  nodeSize: 20,
  lineWidth: 4,
  lineColor: '#e94560',
  bgType: 'gradient',
  bgGradientStart: '#1a1a2e',
  bgGradientEnd: '#16213e'
}
