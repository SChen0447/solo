export type TeaCategory = 'green' | 'white' | 'yellow' | 'oolong' | 'red' | 'black'

export interface TeaEntry {
  id: string
  name: string
  origin: string
  year: number
  category: TeaCategory
  temperature: number
  teaAmount: number
  brewTime: number
  rating: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface TeaCategoryConfig {
  label: string
  gradient: string
  badgeColor: string
  accentColor: string
}

export type RatingEmoji = '😖' | '😕' | '😐' | '🙂' | '😊' | '😋' | '😌' | '😇' | '🥰' | '😍'

export const RATING_EMOJIS: RatingEmoji[] = [
  '😖', '😕', '😐', '🙂', '😊',
  '😋', '😌', '😇', '🥰', '😍',
]
