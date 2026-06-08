export interface HSL {
  h: number
  s: number
  l: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export interface ColorItem {
  id: string
  hex: string
  name: string
  locked: boolean
  hsl: HSL
}

export interface Palette {
  id: string
  name: string
  colors: ColorItem[]
  tags: string[]
  createdAt: number
}

export type HarmonyRule = 
  | 'monochromatic'
  | 'complementary'
  | 'split-complementary'
  | 'triadic'
  | 'tetradic'

export const HARMONY_RULES: { key: HarmonyRule; label: string }[] = [
  { key: 'monochromatic', label: '单色' },
  { key: 'complementary', label: '互补' },
  { key: 'split-complementary', label: '分裂互补' },
  { key: 'triadic', label: '三色' },
  { key: 'tetradic', label: '四色' }
]
