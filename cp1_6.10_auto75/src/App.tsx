import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas'
import { ChartType, ChartConfig, generateMockData } from './types'
import { v4 as uuidv4 } from 'uuid'

declare const html2canvas: any

const STORAGE_KEY = 'dashboard-charts'
const THEME_KEY = 'dashboard-theme'

const App = () => {
  const [charts, setCharts] = useState<ChartConfig[]>([])
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setCharts(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load charts', e)
      }
    }
    const theme = localStorage.getItem(THEME_KEY)
    if (theme) {
      setIsDarkTheme(theme === 'dark')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts))
  }, [charts])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDarkTheme ? 'dark' : 'light')
  }, [isDarkTheme])

  const addChart = useCallback((type: ChartType, x?: number, y?: number) => {
    const newChart: ChartConfig = {
      id: uuidv4(),
      type,
      title: `${type === 'line' ? '折线图' : type === 'bar' ? '柱状图' : type === 'pie' ? '饼图' : '热力图'}`,
      x: x ?? 50 + Math.random() * 100,
      y: y ?? 50 + Math.random() * 100,
      width: 400,
      height: 300,
      scale: 1,
      dataSource: 'mock',
      refreshInterval: '1s',
      colorSchemeIndex: 0,
      data: generateMockData(100)
    }
    setCharts(prev => [...prev, newChart])
  }, [])

  const updateChart = useCallback((id: string, updates: Partial<ChartConfig>) => {
    setCharts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [])

  const deleteChart = useCallback((id: string) => {
    setCharts(prev => prev.filter(c => c.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    if (confirm('确定要清除所有图表吗？')) {
      setCharts([])
    }
  }, [])

  const exportSnapshot = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: null,
        useCORS: true
      })
      const link = document.createElement('a')
      link.download = `dashboard-snapshot-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (e) {
      console.error('Export failed', e)
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDarkTheme(prev => !prev)
  }, [])

  const theme = {
    bg: isDarkTheme ? '#1a1a2e' : '#f5f5f5',
    sidebarBg: isDarkTheme ? '#1e1e2e' : '#ffffff',
    toolbarBg: isDarkTheme ? '#1a1a2e' : '#ffffff',
    divider: isDarkTheme ? '#2d2d3f' : '#e0e0e0',
    canvasBg: isDarkTheme ? '#2d2d3f' : '#f5f5f5',
    gridLine: isDarkTheme ? '#3a3a4f' : '#e0e0e0',
    text: isDarkTheme ? '#ffffff' : '#333333',
    textSecondary: isDarkTheme ? '#aaaaaa' : '#666666',
    modalBg: isDarkTheme ? '#252535' : '#ffffff',
    chartBorder: isDarkTheme ? '#4a4a5f' : '#dddddd'
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: theme.bg, color: theme.text }}>
      <div style={{
        height: 50,
        backgroundColor: theme.toolbarBg,
        borderBottom: `1px solid ${theme.divider}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0
      }}>
        <span style={{ fontSize: 16, fontWeight: 600, marginRight: 20 }}>数据可视化看板</span>
        <button
          onClick={() => {
            const types: ChartType[] = ['line', 'bar', 'pie', 'heatmap']
            addChart(types[Math.floor(Math.random() * types.length)])
          }}
          style={{
            backgroundColor: '#667eea',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a6fd6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#667eea')}
        >
          添加图表
        </button>
        <button
          onClick={clearAll}
          style={{
            backgroundColor: '#e74c3c',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d63031')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e74c3c')}
        >
          清除全部
        </button>
        <button
          onClick={exportSnapshot}
          style={{
            backgroundColor: '#2ecc71',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#27ae60')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2ecc71')}
        >
          导出快照
        </button>
        <button
          onClick={toggleTheme}
          style={{
            backgroundColor: '#9b59b6',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8e44ad')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#9b59b6')}
        >
          {isDarkTheme ? '切换浅色' : '切换深色'}
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: theme.textSecondary }}>
          图表数量: {charts.length}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(prev => !prev)}
          theme={theme}
          onDragStart={addChart}
        />
        <Canvas
          ref={canvasRef}
          charts={charts}
          theme={theme}
          isDarkTheme={isDarkTheme}
          onUpdateChart={updateChart}
          onDeleteChart={deleteChart}
          onAddChart={addChart}
        />
      </div>
    </div>
  )
}

export default App
