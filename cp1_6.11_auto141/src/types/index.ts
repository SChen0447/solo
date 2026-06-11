export interface FlowerItem {
  id: string
  name: string
  color: string
  petalCount: number
  stemMin: number
  stemMax: number
  meaning: string
}

export interface PlacedFlower {
  id: string
  flowerType: string
  stemHeight: number
  position: { x: number; z: number }
  rotation: number
}

export type VaseType = 'round' | 'square' | 'long'

export interface GalleryWork {
  id: string
  name: string
  flowers: PlacedFlower[]
  vaseType: VaseType
  timestamp: number
  thumbnail: string
  author: string
}

export interface AppState {
  flowers: PlacedFlower[]
  vaseType: VaseType
  selectedFlowerId: string | null
  viewMode: 'normal' | 'top'
  history: AppSnapshot[]
  historyIndex: number
  currentView: 'editor' | 'gallery'
  workName: string
}

export interface AppSnapshot {
  flowers: PlacedFlower[]
  vaseType: VaseType
}
