import { proxy } from 'valtio'

export interface PathPoint {
  x: number
  y: number
}

export interface DrawingPath {
  points: PathPoint[]
  strokeWidth: number
  color: string
}

export interface AgingParams {
  yellowing: number
  wormholes: number
  waterStains: number
  inkFading: number
}

export type BindingStyle = 'scroll' | 'booklet' | 'mirror'

export interface AppState {
  drawingPaths: DrawingPath[]
  engravingDepth: number[][] | null
  inkConcentration: number
  inkingCoverage: number[][] | null
  printImage: string | null
  bindingStyle: BindingStyle
  agingParams: AgingParams
  step: number
  artworkId: string | null
}

export const store = proxy<AppState>({
  drawingPaths: [],
  engravingDepth: null,
  inkConcentration: 20,
  inkingCoverage: null,
  printImage: null,
  bindingStyle: 'scroll',
  agingParams: {
    yellowing: 0,
    wormholes: 0,
    waterStains: 0,
    inkFading: 0
  },
  step: 0,
  artworkId: null
})

export function resetStore() {
  store.drawingPaths = []
  store.engravingDepth = null
  store.inkConcentration = 20
  store.inkingCoverage = null
  store.printImage = null
  store.bindingStyle = 'scroll'
  store.agingParams = {
    yellowing: 0,
    wormholes: 0,
    waterStains: 0,
    inkFading: 0
  }
  store.step = 0
  store.artworkId = null
}
