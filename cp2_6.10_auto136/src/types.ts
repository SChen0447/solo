export type AnimationStatus = 'playing' | 'paused' | 'stopped'

export type EasingType =
  | 'linear'
  | 'ease'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier(0.68,-0.55,0.27,1.55)'

export interface PathNode {
  id: string
  x: number
  y: number
}

export interface AnimationElement {
  id: string
  name: string
  color: string
  pathNodes: PathNode[]
  duration: number
  delay: number
  iterationCount: number | 'infinite'
  easing: EasingType
  status: AnimationStatus
}

export interface AppState {
  elements: AnimationElement[]
  selectedElementId: string | null
  splitScreen: boolean
  isPlaying: boolean
  currentTime: number
  selectedNodeId: string | null
}

export const EASING_OPTIONS: EasingType[] = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier(0.68,-0.55,0.27,1.55)'
]

export const SCENE_WIDTH = 750
export const SCENE_HEIGHT = 450
export const GRID_SIZE = 50
