export type ElementType = 'fire' | 'water' | 'wind' | 'earth'

export interface ElementRatio {
  fire: number
  water: number
  wind: number
  earth: number
}

export interface PlantData {
  id: string
  userId: string
  ratio: ElementRatio
  growthTime: number
  likes: number
  createdAt: number
  name: string
}

export interface SeedState {
  id: string
  droplets: ElementType[]
  stage: 'seed' | 'sprouting' | 'growing' | 'mature'
  plantId?: string
  position: { x: number; z: number }
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff3300',
  water: '#0066ff',
  wind: '#33cc33',
  earth: '#cc8833'
}

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '土'
}

export function generatePlantName(ratio: ElementRatio): string {
  const names: Record<ElementType, string[]> = {
    fire: ['烈焰', '赤焰', '炎心', '烈阳'],
    water: ['冰霜', '碧波', '海心', '月影'],
    wind: ['清风', '翠叶', '灵风', '云霄'],
    earth: ['岩心', '金辉', '琥珀', '瑰玉']
  }
  const primary = (Object.keys(ratio) as ElementType[]).reduce((a, b) => 
    ratio[a] >= ratio[b] ? a : b
  )
  const suffix = ['藤', '花', '兰', '树', '草']
  const primaryNames = names[primary]
  return primaryNames[Math.floor(Math.random() * primaryNames.length)] + 
         suffix[Math.floor(Math.random() * suffix.length)]
}
