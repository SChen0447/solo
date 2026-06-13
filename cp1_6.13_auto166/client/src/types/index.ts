export interface Plant {
  id: string
  name: string
  stage: 'seedling' | 'mature' | 'flowering'
  imageUrl: string
  thumbnailUrl: string
  createdAt: string
}

export interface HybridResult {
  id: string
  parent1Id: string
  parent2Id: string
  hybridImageUrl: string
  similarityScore: number
  description: string
  votes: number
  createdAt: string
  parent1Name: string
  parent2Name: string
}

export interface HistoryItem {
  id: string
  type: 'upload' | 'hybrid'
  plantId?: string
  hybridId?: string
  imageUrl: string
  name: string
  date: string
}

export type StageType = 'seedling' | 'mature' | 'flowering'

export const STAGE_LABELS: Record<StageType, string> = {
  seedling: '幼苗',
  mature: '成株',
  flowering: '开花'
}

export const STAGE_COLORS: Record<StageType, string> = {
  seedling: '#8bc34a',
  mature: '#4caf50',
  flowering: '#e91e63'
}
