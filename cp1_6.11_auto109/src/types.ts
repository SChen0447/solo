export type ElementType = 'pine' | 'oak' | 'cabin' | 'lighthouse' | 'bridge' | 'lake'

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'cloudy'

export interface SceneElement {
  id: string
  type: ElementType
  x: number
  y: number
  rotation: number
  scale: number
}

export interface ElementConfig {
  type: ElementType
  name: string
  color: string
  width: number
  height: number
}

export const ELEMENT_CONFIGS: Record<ElementType, ElementConfig> = {
  pine: { type: 'pine', name: '松树', color: '#2d6a4f', width: 40, height: 60 },
  oak: { type: 'oak', name: '橡树', color: '#588157', width: 50, height: 55 },
  cabin: { type: 'cabin', name: '小屋', color: '#8b5e3c', width: 60, height: 50 },
  lighthouse: { type: 'lighthouse', name: '灯塔', color: '#e0e1dd', width: 35, height: 70 },
  bridge: { type: 'bridge', name: '石桥', color: '#7b8c9e', width: 80, height: 30 },
  lake: { type: 'lake', name: '湖泊', color: '#457b9d', width: 100, height: 60 },
}

export const MAX_ELEMENTS = 128
export const WARNING_THRESHOLD = 100
