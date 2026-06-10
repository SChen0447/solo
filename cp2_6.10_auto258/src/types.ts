export type YarnCategory = 'warm' | 'cool' | 'neutral' | 'monochrome'

export interface Yarn {
  id: string
  name: string
  color: string
  hexCode: string
  grams: number
  batch: string
  category: YarnCategory
  brand?: string
  purchaseLink?: string
  usageHistory?: string[]
}

export interface Palette {
  id: string
  name: string
  note: string
  colors: Yarn[]
  createdAt: number
}
