export interface ColorItem {
  hex: string
  locked: boolean
  h: number
  s: number
  l: number
}

export type TemplateType = 'blog' | 'product' | 'login'

export interface PaletteState {
  colors: ColorItem[]
  template: TemplateType
  schemeName: string
  isFullscreen: boolean
}
