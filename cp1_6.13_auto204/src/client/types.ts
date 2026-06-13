export interface Capsule {
  id: string
  title: string
  color: ColorKey
  audioUrl: string
  createdAt: number
}

export type ColorKey =
  | 'amber'
  | 'starBlue'
  | 'rose'
  | 'emerald'
  | 'lavender'
  | 'moonlight'
  | 'flame'

export const COLOR_PALETTES: Record<ColorKey, { from: string; to: string; name: string }> = {
  amber: { from: '#ffb347', to: '#ff7e5f', name: '琥珀' },
  starBlue: { from: '#4facfe', to: '#00f2fe', name: '星蓝' },
  rose: { from: '#ff758c', to: '#ff7eb3', name: '玫红' },
  emerald: { from: '#11998e', to: '#38ef7d', name: '翡翠' },
  lavender: { from: '#a18cd1', to: '#ffb6c1', name: '薰衣草' },
  moonlight: { from: '#f5f7fa', to: '#c3cfe2', name: '月光' },
  flame: { from: '#f12711', to: '#f5af19', name: '火焰' }
}
