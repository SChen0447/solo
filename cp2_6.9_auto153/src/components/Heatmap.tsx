import { useEffect, useRef, useState } from 'react'

const CATEGORIES = ['水果', '蔬菜', '主食', '蛋白质', '零食', '饮品']

const HEATMAP_COLORS = ['#E0E0E0', '#C8E6C9', '#81C784', '#388E3C']
const getHeatmapColor = (count: number) => {
  if (count <= 0) return HEATMAP_COLORS[0]
  if (count === 1) return HEATMAP_COLORS[1]
  if (count === 2) return HEATMAP_COLORS[2]
  return HEATMAP_COLORS[3]
}

const PIE_COLORS: Record<string, string> = {
  '精力好': '#81C784',
  '胀气': '#FFB74D',
  '不舒服': '#E57373',
  '无感': '#90A4AE'
}

interface HeatmapProps {
  dates: string[]
  data: Record<string, number[]>
}

interface FeelingStats {
  stats: Record<string, number>
  total: number
}

interface Props {
  heatmapData: HeatmapProps
  feelingStats: FeelingStats
}

interface HoverInfo {
  visible: boolean
  x: number
  y: number
  date: string
  category: string
  count: number
}

function Heatmap({ heatmapData, feelingStats }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pieCanvasRef = useRef<HTMLCanvasElement>(null)
  const [hoverInfo, setHoverInfo] = useState<HoverInfo>({ visible: false, x: 0, y: 0, date: '', category: '', count: 0 })
  const [pieHover, setPieHover] = useState<{ visible: boolean; x: number; y: number; label: string; percent: string }>({ visible: false, x: 0, y: 0, label: '', percent: '' })

  const CELL_SIZE = 28
  const CELL_GAP = 4
  const ROW_HEADER_WIDTH = 60
  const COL_HEADER_HEIGHT = 60
  const PADDING = 16

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const totalWidth = ROW_HEADER_WIDTH + 28 * (CELL_SIZE + CELL_GAP) + PADDING * 2
    const totalHeight = COL_HEADER_HEIGHT + CATEGORIES.length * (CELL_SIZE + CELL_GAP) + PADDING * 2

    canvas.width = totalWidth * dpr
    canvas.height = totalHeight * dpr
    canvas.style.width = `${totalWidth}px`
    canvas.style.height = `${totalHeight}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, totalWidth, totalHeight)

    ctx.fillStyle = '#666'
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < 28; i++) {
      if (i % 7 === 0) {
        const dateStr = heatmapData.dates[i]
        const d = new Date(dateStr)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        const x = ROW_HEADER_WIDTH + PADDING + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
        ctx.fillText(label, x, COL_HEADER_HEIGHT / 2)
      }
    }

    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    CATEGORIES.forEach((cat, i) => {
      const y = COL_HEADER_HEIGHT + PADDING + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2
      ctx.fillText(cat, ROW_HEADER_WIDTH + PADDING - 8, y)
    })

    CATEGORIES.forEach((cat, row) => {
      const counts = heatmapData.data[cat] || []
      for (let col = 0; col < 28; col++) {
        const count = counts[col] || 0
        const x = ROW_HEADER_WIDTH + PADDING + col * (CELL_SIZE + CELL_GAP)
        const y = COL_HEADER_HEIGHT + PADDING + row * (CELL_SIZE + CELL_GAP)

        ctx.fillStyle = getHeatmapColor(count)
        ctx.beginPath()
        const radius = 4
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + CELL_SIZE - radius, y)
        ctx.quadraticCurveTo(x + CELL_SIZE, y, x + CELL_SIZE, y + radius)
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - radius)
        ctx.quadraticCurveTo(x + CELL_SIZE, y + CELL_SIZE, x + CELL_SIZE - radius, y + CELL_SIZE)
        ctx.lineTo(x + radius, y + CELL_SIZE)
        ctx.quadraticCurveTo(x, y + CELL_SIZE, x, y + CELL_SIZE - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()
        ctx.fill()
      }
    })
  }, [heatmapData])

  useEffect(() => {
    const canvas = pieCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 200
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, size, size)

    const centerX = size / 2
    const centerY = size / 2
    const radius = 80

    const total = feelingStats.total
    if (total === 0) {
      ctx.fillStyle = '#E0E0E0'
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#999'
      ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('暂无感受数据', centerX, centerY)
      return
    }

    let startAngle = -Math.PI / 2
    const labels: { label: string; percent: number; midAngle: number }[] = []

    Object.entries(feelingStats.stats).forEach(([label, count]) => {
      if (count === 0) return
      const percent = count / total
      const endAngle = startAngle + percent * Math.PI * 2
      const midAngle = (startAngle + endAngle) / 2

      ctx.fillStyle = PIE_COLORS[label]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fill()

      labels.push({ label, percent, midAngle })
      startAngle = endAngle
    })

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    labels.forEach(({ label, percent, midAngle }) => {
      if (percent < 0.05) return
      const labelRadius = radius * 0.65
      const lx = centerX + Math.cos(midAngle) * labelRadius
      const ly = centerY + Math.sin(midAngle) * labelRadius
      ctx.fillText(`${(percent * 100).toFixed(0)}%`, lx, ly)
    })
  }, [feelingStats])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const col = Math.floor((x - ROW_HEADER_WIDTH - PADDING) / (CELL_SIZE + CELL_GAP))
    const row = Math.floor((y - COL_HEADER_HEIGHT - PADDING) / (CELL_SIZE + CELL_GAP))

    if (col >= 0 && col < 28 && row >= 0 && row < CATEGORIES.length) {
      const cellX = ROW_HEADER_WIDTH + PADDING + col * (CELL_SIZE + CELL_GAP)
      const cellY = COL_HEADER_HEIGHT + PADDING + row * (CELL_SIZE + CELL_GAP)
      if (x >= cellX && x < cellX + CELL_SIZE && y >= cellY && y < cellY + CELL_SIZE) {
        const category = CATEGORIES[row]
        const date = heatmapData.dates[col]
        const count = (heatmapData.data[category] || [])[col] || 0
        setHoverInfo({
          visible: true,
          x: e.clientX - rect.left + 10,
          y: e.clientY - rect.top - 30,
          date,
          category,
          count
        })
        return
      }
    }
    setHoverInfo(h => ({ ...h, visible: false }))
  }

  const handlePieMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = pieCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left - 100
    const y = e.clientY - rect.top - 100
    const dist = Math.sqrt(x * x + y * y)

    if (dist < 80 && dist > 0 && feelingStats.total > 0) {
      let angle = Math.atan2(y, x)
      if (angle < -Math.PI / 2) angle += Math.PI * 2

      let startAngle = -Math.PI / 2
      let found = false
      for (const [label, count] of Object.entries(feelingStats.stats)) {
        if (count === 0) continue
        const percent = count / feelingStats.total
        const endAngle = startAngle + percent * Math.PI * 2
        let checkAngle = angle
        if (startAngle < -Math.PI / 2 && checkAngle > Math.PI) checkAngle -= Math.PI * 2
        if (checkAngle >= startAngle && checkAngle < endAngle) {
          setPieHover({
            visible: true,
            x: e.clientX - rect.left + 10,
            y: e.clientY - rect.top - 30,
            label,
            percent: `${(percent * 100).toFixed(1)}%`
          })
          found = true
          break
        }
        startAngle = endAngle
      }
      if (!found) setPieHover(h => ({ ...h, visible: false }))
    } else {
      setPieHover(h => ({ ...h, visible: false }))
    }
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      padding: '24px'
    }}>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>
        摄入热力图（最近28天）
      </h2>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { color: '#E0E0E0', label: '0次' },
          { color: '#C8E6C9', label: '1次' },
          { color: '#81C784', label: '2次' },
          { color: '#388E3C', label: '3次及以上' }
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              backgroundColor: item.color
            }} />
            <span style={{ fontSize: '12px', color: '#666' }}>{item.label}</span>
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        style={{
          overflowX: 'auto',
          overflowY: 'hidden',
          position: 'relative',
          marginBottom: '32px',
          paddingBottom: '8px'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(h => ({ ...h, visible: false }))}
          style={{ display: 'block', cursor: 'pointer' }}
        />
        {hoverInfo.visible && (
          <div style={{
            position: 'absolute',
            left: hoverInfo.x,
            top: hoverInfo.y,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            {hoverInfo.date} · {hoverInfo.category}: {hoverInfo.count}次
          </div>
        )}
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333', textAlign: 'center' }}>
        身体感受统计
      </h3>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={pieCanvasRef}
            onMouseMove={handlePieMouseMove}
            onMouseLeave={() => setPieHover(h => ({ ...h, visible: false }))}
            style={{ display: 'block', cursor: 'pointer' }}
          />
          {pieHover.visible && (
            <div style={{
              position: 'absolute',
              left: pieHover.x,
              top: pieHover.y,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10
            }}>
              {pieHover.label}: {pieHover.percent}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
          {Object.entries(PIE_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                backgroundColor: color
              }} />
              <span style={{ fontSize: '13px', color: '#555' }}>
                {label} ({feelingStats.stats[label] || 0})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Heatmap
