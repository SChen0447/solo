export enum MaterialType {
  CONCRETE = 'concrete',
  GLASS = 'glass',
  BRICK = 'brick',
  ABSORBER = 'absorber'
}

export const MATERIAL_ABSORPTION: Record<MaterialType, number> = {
  [MaterialType.CONCRETE]: 0.05,
  [MaterialType.GLASS]: 0.1,
  [MaterialType.BRICK]: 0.15,
  [MaterialType.ABSORBER]: 0.8
}

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  [MaterialType.CONCRETE]: '混凝土 (α=0.05)',
  [MaterialType.GLASS]: '玻璃 (α=0.1)',
  [MaterialType.BRICK]: '砖墙 (α=0.15)',
  [MaterialType.ABSORBER]: '吸音板 (α=0.8)'
}

export interface Vec2 {
  x: number
  z: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Wall {
  id: string
  start: Vec2
  end: Vec2
  normal: Vec2
  material: MaterialType
}

export interface Building {
  id: string
  name: string
  position: Vec2
  rotation: number
  dimensions: { width: number; depth: number; height: number }
  walls: {
    front: MaterialType
    back: MaterialType
    left: MaterialType
    right: MaterialType
  }
  color: string
}

export interface SoundSource {
  position: Vec3
  frequency: number
  soundPressureLevel: number
}

export interface AcousticRay {
  id: string
  color: string
  points: Vec3[]
  pathLength: number
  delayMs: number
  soundPressureLevel: number
  isDirect: boolean
  reflectionOrder: number
}

export interface FieldSample {
  position: Vec2
  soundPressureLevel: number
}

export interface ProbeInfo {
  position: Vec2
  totalSPL: number
  rays: AcousticRay[]
}

export type ViewMode = 'topdown' | 'firstperson'

export interface SceneSnapshot {
  version: string
  timestamp: number
  buildings: Building[]
  soundSource: SoundSource
  probePosition: Vec2 | null
}

export const STREET_WIDTH = 30
export const STREET_DEPTH = 20
export const GRID_SIZE = 50
export const CELL_SPACING = 0.4
export const SOUND_SPEED = 343
export const MAX_REFLECTIONS = 6
