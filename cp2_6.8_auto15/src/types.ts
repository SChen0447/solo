export interface Recipe {
  id: string
  name: string
  category: string
  ingredients: string[]
  steps: string[]
  cookTime: number
  image: string
}

export interface RecipeWithMatch extends Recipe {
  matchCount: number
  matchRatio: number
}

export interface Note {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface UserData {
  favorites: string[]
  notes: Record<string, Note[]>
}
