import type { TeaCategory, TeaCategoryConfig } from '../types/tea'

export const TEA_CATEGORY_CONFIG: Record<TeaCategory, TeaCategoryConfig> = {
  green: {
    label: '绿茶',
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 50%, #5b8c5a 100%)',
    badgeColor: '#3d6b3c',
    accentColor: '#5b8c5a',
  },
  white: {
    label: '白茶',
    gradient: 'linear-gradient(135deg, #fafaf5 0%, #e8e4c9 50%, #c9c9b0 100%)',
    badgeColor: '#9a9a70',
    accentColor: '#c9c9b0',
  },
  yellow: {
    label: '黄茶',
    gradient: 'linear-gradient(135deg, #fffde7 0%, #fff59d 50%, #c9a227 100%)',
    badgeColor: '#a07d1c',
    accentColor: '#c9a227',
  },
  oolong: {
    label: '青茶',
    gradient: 'linear-gradient(135deg, #f1f8e9 0%, #aed581 50%, #2e7d32 100%)',
    badgeColor: '#1b5e20',
    accentColor: '#2e7d32',
  },
  red: {
    label: '红茶',
    gradient: 'linear-gradient(135deg, #fff3e0 0%, #ffab91 50%, #bf360c 100%)',
    badgeColor: '#8d2a09',
    accentColor: '#bf360c',
  },
  black: {
    label: '黑茶',
    gradient: 'linear-gradient(135deg, #efebe9 0%, #8d6e63 50%, #3e2723 100%)',
    badgeColor: '#2c1810',
    accentColor: '#3e2723',
  },
}

export const ALL_TEA_CATEGORIES: TeaCategory[] = ['green', 'white', 'yellow', 'oolong', 'red', 'black']

export function getCategoryConfig(category: TeaCategory): TeaCategoryConfig {
  return TEA_CATEGORY_CONFIG[category]
}

export function getCategoryLabel(category: TeaCategory): string {
  return TEA_CATEGORY_CONFIG[category].label
}
