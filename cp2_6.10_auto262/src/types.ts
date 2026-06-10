export interface TextStyle {
  fontSize: number
  offsetX: number
  offsetY: number
  color: string
  colorPresetId: string
}

export interface FormState {
  title: string
  subtitle: string
  guest: string
  date: string
  backgroundType: 'gradient' | 'image'
  gradientId: string
  backgroundImage: string | null
  textStyle: TextStyle
}

export interface HistoryItem {
  id: string
  timestamp: number
  thumbnail: string
  formState: FormState
}

export interface CanvasSize {
  id: 'square' | 'story' | 'banner'
  name: string
  width: number
  height: number
  ratio: string
}

export interface GradientPreset {
  id: string
  name: string
  colors: string[]
}

export interface ColorPreset {
  id: string
  name: string
  textColor: string
  accentColor: string
}

export type AppAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: unknown }
  | { type: 'SET_TEXT_STYLE'; field: keyof TextStyle; value: number | string }
  | { type: 'RESTORE_STATE'; formState: FormState }
  | { type: 'ADD_HISTORY'; item: HistoryItem }

export interface AppState {
  formState: FormState
  history: HistoryItem[]
}

export const CANVAS_SIZES: CanvasSize[] = [
  { id: 'square', name: '正方形', width: 1080, height: 1080, ratio: '1:1' },
  { id: 'story', name: '故事', width: 1080, height: 1920, ratio: '9:16' },
  { id: 'banner', name: '横幅', width: 1920, height: 1080, ratio: '16:9' }
]

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'g1', name: '温暖橙黄', colors: ['#ff6b6b', '#feca57'] },
  { id: 'g2', name: '深邃蓝紫', colors: ['#2b2d42', '#8d99ae'] },
  { id: 'g3', name: '清新薄荷', colors: ['#a8e6cf', '#dcedc1'] },
  { id: 'g4', name: '玫瑰金粉', colors: ['#ff8a80', '#ffd1dc'] },
  { id: 'g5', name: '暗夜星空', colors: ['#0f0c29', '#302b63', '#24243e'] },
  { id: 'g6', name: '日落海滩', colors: ['#ff7e5f', '#feb47b'] },
  { id: 'g7', name: '森林晨雾', colors: ['#134e5e', '#71b280'] },
  { id: 'g8', name: '薰衣草田', colors: ['#c471f5', '#fa71cd'] },
  { id: 'g9', name: '极简黑白', colors: ['#434343', '#000000'] },
  { id: 'g10', name: '海洋深蓝', colors: ['#2193b0', '#6dd5ed'] }
]

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'c1', name: '珊瑚红+白', textColor: '#ffffff', accentColor: '#ff6b6b' },
  { id: 'c2', name: '深夜蓝+柔和白', textColor: '#edf2f4', accentColor: '#2b2d42' },
  { id: 'c3', name: '明黄+深灰', textColor: '#2d2d2d', accentColor: '#feca57' },
  { id: 'c4', name: '青绿+白', textColor: '#ffffff', accentColor: '#1abc9c' },
  { id: 'c5', name: '纯白+深灰', textColor: '#2d2d2d', accentColor: '#ffffff' },
  { id: 'c6', name: '纯黑+米白', textColor: '#f5f5dc', accentColor: '#000000' },
  { id: 'c7', name: '粉紫+白', textColor: '#ffffff', accentColor: '#c471f5' },
  { id: 'c8', name: '金色+深蓝', textColor: '#2b2d42', accentColor: '#f39c12' }
]

export const isDarkGradient = (colors: string[]): boolean => {
  const avg = colors.reduce((sum, hex) => {
    const c = hex.replace('#', '')
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    return sum + (r + g + b) / 3
  }, 0) / colors.length
  return avg < 128
}

export const getDefaultTextColor = (gradientId: string): string => {
  const preset = GRADIENT_PRESETS.find(g => g.id === gradientId)
  if (!preset) return '#2d2d2d'
  return isDarkGradient(preset.colors) ? '#ffffff' : '#2d2d2d'
}

export const initialFormState: FormState = {
  title: '深度对话：独立记者的前沿观察',
  subtitle: '第12期 · 每月深度访谈',
  guest: '嘉宾：李明远',
  date: '2026年6月10日',
  backgroundType: 'gradient',
  gradientId: 'g1',
  backgroundImage: null,
  textStyle: {
    fontSize: 32,
    offsetX: 0,
    offsetY: 0,
    color: '#ffffff',
    colorPresetId: 'c1'
  }
}
