export interface TasteDimensions {
  artistic: number
  commercial: number
  rhythm: number
  plotComplexity: number
  visualStyle: number
  emotionalImpact: number
}

export type TasteDimensionKey = keyof TasteDimensions

export interface Movie {
  id: number
  title: string
  year: number
  gradient: string
  scores: TasteDimensions
}

export interface UserChoice {
  movieId: number
  liked: boolean
}

export interface AnalysisResult {
  dimensions: TasteDimensions
  topDimension: TasteDimensionKey
  summary: string
}

export const DIMENSION_LABELS: Record<TasteDimensionKey, string> = {
  artistic: '文艺性',
  commercial: '商业性',
  rhythm: '节奏感',
  plotComplexity: '情节复杂度',
  visualStyle: '视觉风格',
  emotionalImpact: '情绪感染力'
}

export const DIMENSION_COLORS: Record<TasteDimensionKey, string> = {
  artistic: '#4ecdc4',
  commercial: '#ff6b6b',
  rhythm: '#feca57',
  plotComplexity: '#a29bfe',
  visualStyle: '#fd79a8',
  emotionalImpact: '#74b9ff'
}
