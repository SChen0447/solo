export interface User {
  id: string
  email: string
  username: string
  avatarColor: string
  favorites: string[]
  createdAt: string
}

export interface Ingredient {
  name: string
  amount: string
}

export interface Step {
  description: string
  imageUrl?: string
}

export interface Recipe {
  id: string
  title: string
  ingredients: Ingredient[]
  steps: Step[]
  cookTime: number
  difficulty: '简单' | '中等' | '困难'
  authorId: string
  thumbnail?: string
  likes: string[]
  createdAt: string
  updatedAt: string
  author?: {
    id: string
    username: string
    avatarColor: string
    email: string
  }
}

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
}
