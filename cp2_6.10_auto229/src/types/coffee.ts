export type FlavorDimension = 'floral' | 'fruit' | 'chocolate' | 'nutty' | 'caramel' | 'spice'

export interface FlavorProfile {
  floral: number
  fruit: number
  chocolate: number
  nutty: number
  caramel: number
  spice: number
}

export interface FlavorNote {
  dimension: FlavorDimension
  intensity: number
  note: string
}

export interface CoffeeBean {
  id: string
  name: string
  origin: string
  roastLevel: 'Light' | 'Medium' | 'Medium-Dark' | 'Dark'
  process: 'Washed' | 'Natural' | 'Honey' | 'Anaerobic'
  flavor: FlavorProfile
  notes?: Partial<Record<FlavorDimension, string>>
  color?: string
}

export interface DimensionDiff {
  dimension: FlavorDimension
  label: string
  diffPercent: number
  baseValue: number
  compareValue: number
}

export const FLAVOR_DIMENSIONS: { key: FlavorDimension; label: string; color: string }[] = [
  { key: 'floral', label: '花香', color: '#e8a0bf' },
  { key: 'fruit', label: '水果', color: '#ff6b6b' },
  { key: 'chocolate', label: '巧克力', color: '#8b5a2b' },
  { key: 'nutty', label: '坚果', color: '#c4956a' },
  { key: 'caramel', label: '焦糖', color: '#d4a574' },
  { key: 'spice', label: '香料', color: '#c44d58' }
]

export const ROAST_LEVELS = ['Light', 'Medium', 'Medium-Dark', 'Dark'] as const
export const PROCESSES = ['Washed', 'Natural', 'Honey', 'Anaerobic'] as const
