export type NoteType = 'top' | 'middle' | 'base'

export interface Ingredient {
  id: string
  name: string
  nameEn: string
  noteType: NoteType
  color: string
  icon: string
}

export interface PerfumeRecipe {
  id: string
  name: string
  createdAt: string
  ingredients: Ingredient[]
}

export interface Ripple {
  id: string
  color: string
  x: number
  y: number
}
