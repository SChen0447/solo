import { forwardRef, useState, useRef, useCallback, useEffect } from 'react'
import ChartCard from './ChartCard'
import { ChartConfig, ChartType } from '../types'

interface CanvasProps {
  charts: ChartConfig[]
  theme: {
    canvasBg: string
    gridLine: string
    text: string
    textSecondary: string
    chartBorder: string
    modalBg: string
  }
  isDarkTheme: boolean
  onUpdateChart: (id: string, updates: Partial<ChartConfig>) => void
  onDeleteChart: (id: string) => void
  onAddChart: (type: ChartType, x?: number, y?: number) => void
}

const Canvas = forwardRef<HTMLDivElement, CanvasProps>(({
  charts,
  theme,
  isDarkTheme,
  onUpdateChart,
  onDeleteChart,
  onAddChart
}, ref) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const chartType = e.dataTransfer.getData('chartType') as ChartType
    if (chartType && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - 200
      const y = e.clientY - rect.top - 150
      onAddChart(chartType, Math.max(0, x), Math.max(0, y))
    }
  }

  const handleCardMouseDown = useCallback((e: React.MouseEvent, chart: ChartConfig) => {
    if ((e.target as HTMLElement).closest('.chart-delete-btn') ||
        (e.target as HTMLElement).closest('.chart-config-btn') ||
        (e.target as HTMLElement).closest('.chart-no-drag')) {
      return
    }
    e.preventDefault()
    setDraggingId(chart.id)
    setDragOffset({
      x: e.clientX - chart.x,
      y: e.clientY - chart.y
    })
  }, [])

  useEffect(() => {
    if (!draggingId) return

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y
      onUpdateChart(draggingId, {
        x: Math.max(0, newX),
        y: Math.max(0, newY)
      })
    }

    const handleMouseUp = () => {
      setDraggingId(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingId, dragOffset, onUpdateChart])

  const handleWheel = useCallback((e: React.WheelEvent, chartId: string) => {
    e.preventDefault()
    const chart = charts.find(c => c.id === chartId)
    if (!chart) return
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.min(2, Math.max(0.5, chart.scale + delta))
    onUpdateChart(chartId, { scale: parseFloat(newScale.toFixed(2)) })
  }, [charts, onUpdateChart])

  const gridBackgroundStyle = {
    backgroundImage: `
      linear-gradient(${theme.gridLine} 1px, transparent 1px),
      linear-gradient(90deg, ${theme.gridLine} 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px'
  }

  return (
    <div
      ref={(el) => {
        canvasRef.current = el
        if (typeof ref === 'function') {
          ref(el)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement>).current = el
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: theme.canvasBg,
        overflow: 'auto',
        ...gridBackgroundStyle,
        outline: isDragOver ? `2px dashed #00bcd4` : 'none',
        outlineOffset: -4,
        transition: 'outline 0.2s ease'
      }}
    >
      {charts.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: theme.textSecondary
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📊</div>
          <div style={{ fontSize: 18, marginBottom: 8 }}>画布为空</div>
          <div style={{ fontSize: 13 }}>从左侧拖拽图表组件到此处开始构建看板</div>
        </div>
      )}

      {charts.map(chart => (
        <ChartCard
          key={chart.id}
          chart={chart}
          theme={theme}
          isDarkTheme={isDarkTheme}
          isDragging={draggingId === chart.id}
          onMouseDown={(e) => handleCardMouseDown(e, chart)}
          onWheel={(e) => handleWheel(e, chart.id)}
          onUpdate={(updates) => onUpdateChart(chart.id, updates)}
          onDelete={() => onDeleteChart(chart.id)}
        />
      ))}
    </div>
  )
})

Canvas.displayName = 'Canvas'

export default Canvas
