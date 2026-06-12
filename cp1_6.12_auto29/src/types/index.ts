export type AnnotationCategory = 'problem' | 'suggestion' | 'confirmation'

export interface Annotation {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  category: AnnotationCategory
  comment: string
  createdAt: number
}

export interface ToolbarState {
  color: string
  category: AnnotationCategory
}

export interface ImageInfo {
  file: File | null
  url: string
  width: number
  height: number
  name: string
}
