export type ScentCategory = 'flower' | 'food' | 'nature' | 'city' | 'other'

export interface Comment {
  id: string
  username: string
  content: string
  createdAt: string
}

export interface Marker {
  id: string
  lat: number
  lng: number
  name: string
  description: string
  username: string
  category: ScentCategory
  likes: number
  likedBy: string[]
  comments: Comment[]
  createdAt: string
}

export interface CreateMarkerRequest {
  lat: number
  lng: number
  name: string
  description?: string
  username: string
  category: ScentCategory
}

export interface CreateCommentRequest {
  username: string
  content: string
}
