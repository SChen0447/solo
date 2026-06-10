export type ChartType = 'line' | 'bar' | 'pie' | 'heatmap'

export type RefreshInterval = '1s' | '5s' | '10s' | 'manual'

export interface ColorScheme {
  name: string
  colors: string[]
}

export interface ChartConfig {
  id: string
  type: ChartType
  title: string
  x: number
  y: number
  width: number
  height: number
  scale: number
  dataSource: string
  refreshInterval: RefreshInterval
  colorSchemeIndex: number
  data: DataPoint[]
}

export interface DataPoint {
  label: string
  value: number
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { name: '蓝紫渐变', colors: ['#667eea', '#764ba2'] },
  { name: '绿橙渐变', colors: ['#11998e', '#38ef7d'] },
  { name: '红金渐变', colors: ['#f12711', '#f5af19'] },
  { name: '粉蓝渐变', colors: ['#ff6b6b', '#4ecdc4'] },
  { name: '黑白灰渐变', colors: ['#333333', '#cccccc'] }
]

export const CHART_ICONS: Record<ChartType, { color: string; name: string }> = {
  line: { color: '#4fc3f7', name: '折线图' },
  bar: { color: '#ff8a65', name: '柱状图' },
  pie: { color: '#81c784', name: '饼图' },
  heatmap: { color: '#ce93d8', name: '热力图' }
}

export const generateMockData = (count: number = 100): DataPoint[] => {
  const data: DataPoint[] = []
  const now = Date.now()
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now - i * 1000)
    data.push({
      label: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`,
      value: Math.floor(Math.random() * 101)
    })
  }
  return data
}

export const getIntervalMs = (interval: RefreshInterval): number => {
  switch (interval) {
    case '1s': return 1000
    case '5s': return 5000
    case '10s': return 10000
    default: return 0
  }
}
