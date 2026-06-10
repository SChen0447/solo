export interface TeaScores {
  floral: number
  fruity: number
  woody: number
  honey: number
}

export interface Tea {
  id: string
  name: string
  type: string
  origin: string
  scores: TeaScores
  brewTemp: string
  brewTime: string
  reportUrl: string
  description: string
}

export interface MatchedTea extends Tea {
  matchScore: number
  distance: number
}

export type DimensionKey = 'floral' | 'fruity' | 'woody' | 'honey'
