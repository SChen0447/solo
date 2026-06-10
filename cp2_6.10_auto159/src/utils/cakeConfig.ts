import { v4 as uuidv4 } from 'uuid'

export type CakeSize = 6 | 8 | 10

export type CakeFlavor = 'vanilla' | 'chocolate' | 'strawberry'

export type FrostingStyle = 'smooth' | 'wave' | 'star'

export type FruitType = 'strawberry' | 'blueberry' | 'cherry'

export interface FruitSelection {
  strawberry: number
  blueberry: number
  cherry: number
}

export interface CakeConfig {
  size: CakeSize
  flavor: CakeFlavor
  frostingColor: string
  frostingStyle: FrostingStyle
  decorationText: string
  fruits: FruitSelection
  candleCount: number
}

export interface SavedOrder extends CakeConfig {
  id: string
  timestamp: number
}

export const CAKE_SIZES: CakeSize[] = [6, 8, 10]

export const SIZE_HEIGHT_RATIO: Record<CakeSize, number> = {
  6: 1.0,
  8: 1.15,
  10: 1.3
}

export const FLAVOR_OPTIONS: { value: CakeFlavor; label: string; color: string }[] = [
  { value: 'vanilla', label: '香草', color: '#f5e6c8' },
  { value: 'chocolate', label: '巧克力', color: '#8b4513' },
  { value: 'strawberry', label: '草莓', color: '#ff9999' }
]

export const FROSTING_COLORS: { name: string; value: string }[] = [
  { name: '白色', value: '#ffffff' },
  { name: '粉色', value: '#ffb6c1' },
  { name: '蓝色', value: '#add8e6' },
  { name: '绿色', value: '#98fb98' }
]

export const FROSTING_STYLES: { value: FrostingStyle; label: string }[] = [
  { value: 'smooth', label: '平滑' },
  { value: 'wave', label: '波纹' },
  { value: 'star', label: '星形' }
]

export const FRUIT_OPTIONS: { value: FruitType; label: string; color: string }[] = [
  { value: 'strawberry', label: '草莓', color: '#e74c3c' },
  { value: 'blueberry', label: '蓝莓', color: '#3498db' },
  { value: 'cherry', label: '樱桃', color: '#c0392b' }
]

export const MAX_FRUIT_PER_TYPE = 3
export const MAX_CANDLES = 5
export const MAX_TEXT_LENGTH = 20

export const DEFAULT_CAKE_CONFIG: CakeConfig = {
  size: 6,
  flavor: 'vanilla',
  frostingColor: '#ffffff',
  frostingStyle: 'smooth',
  decorationText: '',
  fruits: {
    strawberry: 0,
    blueberry: 0,
    cherry: 0
  },
  candleCount: 0
}

export function getFlavorColor(flavor: CakeFlavor): string {
  const option = FLAVOR_OPTIONS.find((f) => f.value === flavor)
  return option ? option.color : '#f5e6c8'
}

export function createSavedOrder(config: CakeConfig): SavedOrder {
  return {
    ...config,
    id: uuidv4(),
    timestamp: Date.now()
  }
}

const STORAGE_KEY = 'cake-customizer-drafts'

export function saveDraft(order: SavedOrder): void {
  const drafts = loadDrafts()
  drafts.unshift(order)
  const trimmed = drafts.slice(0, 10)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function loadDrafts(): SavedOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

export function getFlavorLabel(flavor: CakeFlavor): string {
  const option = FLAVOR_OPTIONS.find((f) => f.value === flavor)
  return option ? option.label : '香草'
}
