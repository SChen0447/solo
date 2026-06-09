export interface Movie {
  id: string
  title: string
  year: number
  rating: number
  watchDate: string
  tags: string[]
  createdAt: number
}

export type SortKey = 'ratingDesc' | 'yearAsc' | 'watchDateDesc'

export interface FilterState {
  ratingMin: number
  ratingMax: number
  tags: string[]
  yearMin: number | null
  yearMax: number | null
  sortKey: SortKey
}
