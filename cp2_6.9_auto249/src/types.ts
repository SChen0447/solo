export interface Book {
  id: string
  title: string
  author: string
  description: string
  coverUrl: string
  color: string
}

export interface Note {
  id: string
  bookId: string
  content: string
  likes: number
  createdAt: number
  rotation: number
  offsetX: number
  offsetY: number
}
