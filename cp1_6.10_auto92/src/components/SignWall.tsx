import { useRef, useState, useEffect, useCallback } from 'react'
import type { SignItem, BrushSize, BrushColor } from '../types'
import { BRUSH_COLORS } from '../types'

interface SignWallProps {
  signs: SignItem[]
  onAddSign: (sign: SignItem) => void
  isMobile: boolean
}

interface Stroke {
  points: { x: number; y: number }[]
  color: BrushColor
  size: BrushSize
}

const THUMB_SIZE = 150
const THUMB_GAP = 20
const CELL_SIZE = THUMB_SIZE + THUMB_GAP

const SignWall = ({ signs, onAddSign, isMobile }: SignWallProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [brushColor, setBrushColor] = useState<BrushColor>('#ffffff')
  const [brushSize, setBrushSize] = useState<BrushSize>(5)
  const [nickname, setNickname] = useState('')
  const [positions, setPositions] = useState<{ cols: number; rows: number }>({ cols: 4, rows: 3 })
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  const [isDraggingPanel, setIsDraggingPanel] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const lastSignCount = useRef(signs.length)

  const canvasWidth = isMobile ? window.innerWidth * 0.95 : window.innerWidth * 0.8
  const canvasHeight = isMobile ? window.innerHeight * 0.5 : window.innerHeight * 0.7

  useEffect(() => {
    const cols = Math.max(2, Math.floor(canvasWidth / CELL_SIZE))
    const rows = Math.max(2, Math.floor(canvasHeight / CELL_SIZE))
    setPositions({ cols, rows })
  }, [canvasWidth, canvasHeight])

  const computeLayout = useCallback((items: SignItem[]) => {
    const { cols, rows } = positions
    const total = cols * rows
    const count = Math.min(items.length, total)
    const result: { x: number; y: number }[] = []
    for (let i = 0; i < count; i++) {
      void i
      const displayIdx = Math.floor(Math.random() * total)
      const col = displayIdx % cols
      const row = Math.floor(displayIdx / cols)
      const x = (canvasWidth - cols * CELL_SIZE) / 2 + col * CELL_SIZE + (THUMB_GAP / 2)
      const y = (canvasHeight - rows * CELL_SIZE) / 2 + row * CELL_SIZE + (THUMB_GAP / 2)
      result.push({ x, y })
    }
    return result
  }, [positions, canvasWidth, canvasHeight])

  useEffect(() => {
    if (signs.length < lastSignCount.current && signs.length > 0) {
      const removed = lastSignCount.current - signs.length
      const ids = signs.slice(0, removed).map(s => s.id)
      setExitingIds(new Set(ids))
      setTimeout(() => setExitingIds(new Set()), 500)
    }
    lastSignCount.current = signs.length
  }, [signs])

  useEffect(() => {
    if (strokes.length === 0 && !currentStroke) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of strokes) {
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      if (stroke.points.length === 1) {
        ctx.beginPath()
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = stroke.color
        ctx.fill()
      } else if (stroke.points.length > 1) {
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
        ctx.stroke()
      }
    }
    if (currentStroke && currentStroke.points.length > 0) {
      ctx.strokeStyle = currentStroke.color
      ctx.lineWidth = currentStroke.size
      if (currentStroke.points.length === 1) {
        ctx.beginPath()
        ctx.arc(currentStroke.points[0].x, currentStroke.points[0].y, currentStroke.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = currentStroke.color
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
        for (let i = 1; i < currentStroke.points.length; i++) {
          ctx.lineTo(currentStroke.points[i].x, currentStroke.points[i].y)
        }
        ctx.stroke()
      }
    }
  }, [strokes, currentStroke])

  useEffect(() => {
    const interval = setInterval(() => {
      if (signs.length === 0) return
      setPositions(p => ({ ...p, cols: p.cols + 0 }))
    }, 2000)
    return () => clearInterval(interval)
  }, [signs.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        setStrokes(prev => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const getPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    setIsDrawing(true)
    setCurrentStroke({ points: [pos], color: brushColor, size: brushSize })
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke) return
    const pos = getPos(e)
    setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, pos] } : null)
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentStroke && currentStroke.points.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setStrokes([])
    setCurrentStroke(null)
  }

  const generateThumbnail = (): string => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    const off = document.createElement('canvas')
    off.width = THUMB_SIZE
    off.height = THUMB_SIZE
    const ctx = off.getContext('2d')
    if (!ctx) return ''
    ctx.fillStyle = '#1c1c2e'
    ctx.fillRect(0, 0, THUMB_SIZE, THUMB_SIZE)
    const scale = Math.min(THUMB_SIZE / canvas.width, THUMB_SIZE / canvas.height) * 0.9
    ctx.translate(THUMB_SIZE / 2, THUMB_SIZE / 2)
    ctx.scale(scale, scale)
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
    let data = off.toDataURL('image/jpeg', 0.7)
    if (data.length > 500 * 1024) {
      data = off.toDataURL('image/jpeg', 0.4)
    }
    return data
  }

  const handleSubmit = () => {
    if (strokes.length === 0) {
      alert('请先在画布上涂鸦！')
      return
    }
    const name = nickname.trim() || '匿名'
    if (name.length > 8) {
      alert('昵称不能超过8个字符')
      return
    }
    const image = generateThumbnail()
    if (!image) return
    const { cols, rows } = positions
    const total = cols * rows
    const displayIdx = Math.floor(Math.random() * total)
    const col = displayIdx % cols
    const row = Math.floor(displayIdx / cols)
    const sign: SignItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      nickname: name,
      image,
      timestamp: Date.now(),
      rotation: (Math.random() * 20 - 10),
      x: (canvasWidth - cols * CELL_SIZE) / 2 + col * CELL_SIZE + (THUMB_GAP / 2),
      y: (canvasHeight - rows * CELL_SIZE) / 2 + row * CELL_SIZE + (THUMB_GAP / 2)
    }
    onAddSign(sign)
    setStrokes([])
    setCurrentStroke(null)
    setNickname('')
  }

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return
    setIsDraggingPanel(true)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  useEffect(() => {
    if (!isDraggingPanel) return
    const handleMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const panelW = isMobile ? 0 : 180
      const panelH = isMobile ? 0 : 280
      let x = e.clientX - rect.left - dragOffset.current.x
      let y = e.clientY - rect.top - dragOffset.current.y
      x = Math.max(10, Math.min(x, rect.width - panelW - 10))
      y = Math.max(10, Math.min(y, rect.height - panelH - 10))
      setPanelPos({ x, y })
    }
    const handleUp = () => setIsDraggingPanel(false)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDraggingPanel, isMobile])

  const layoutPositions = computeLayout(signs)
  const totalCapacity = positions.cols * positions.rows
  const displaySigns = signs.slice(-totalCapacity)
  const isNewSign = (idx: number) => idx === displaySigns.length - 1 && signs.length > 1

  return (
    <div
      ref={containerRef}
      className="brick-wall"
      style={{
        position: 'absolute',
        top: isMobile ? '5%' : '15%',
        left: isMobile ? '2.5%' : '10%',
        width: isMobile ? '95vw' : '80vw',
        height: isMobile ? '50vh' : '70vh',
        borderRadius: 12,
        overflow: 'hidden'
      }}
    >
      {displaySigns.map((sign, i) => {
        const pos = layoutPositions[i] || { x: sign.x, y: sign.y }
        const isExiting = exitingIds.has(sign.id)
        const isHovered = hoveredId === sign.id
        const scale = isHovered ? 1.5 : 1
        return (
          <div
            key={sign.id}
            className={isExiting ? 'thumbnail-exit' : isNewSign(i) ? 'thumbnail-enter' : ''}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              transform: `rotate(${sign.rotation}deg) scale(${scale})`,
              transformOrigin: 'center center',
              border: '2px solid #fff',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              background: '#1c1c2e',
              overflow: 'hidden',
              zIndex: isHovered ? 50 : 10,
              transition: 'transform 0.3s ease, z-index 0s',
              ['--rot' as any]: `${sign.rotation}deg`,
              cursor: 'pointer'
            }}
            onMouseEnter={() => setHoveredId(sign.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <img src={sign.image} alt={sign.nickname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '4px 6px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {sign.nickname}
            </div>
          </div>
        )
      })}

      <canvas
        ref={canvasRef}
        width={canvasWidth * 2}
        height={canvasHeight * 2}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />

      <div
        onMouseDown={handlePanelMouseDown}
        style={{
          position: 'absolute',
          left: isMobile ? '50%' : (panelPos?.x ?? 20),
          top: isMobile ? 'auto' : (panelPos?.y ?? 20),
          bottom: isMobile ? 10 : 'auto',
          transform: isMobile ? 'translateX(-50%)' : 'none',
          background: 'rgba(30, 30, 50, 0.9)',
          border: '1px solid #3a3a5a',
          borderRadius: 16,
          padding: 16,
          zIndex: 40,
          cursor: isDraggingPanel ? 'grabbing' : (isMobile ? 'default' : 'grab'),
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: 16,
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>颜色</div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 8 }}>
            {BRUSH_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  border: 'none',
                  background: color,
                  cursor: 'pointer',
                  boxShadow: brushColor === color ? `0 0 0 3px #fff, 0 0 12px ${color}` : 'none',
                  transition: 'transform 0.15s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#aaa', fontWeight: 500 }}>粗细</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: brushSize * 4,
              height: brushSize * 4,
              borderRadius: '50%',
              background: brushColor,
              transition: 'all 0.2s'
            }} />
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value) as BrushSize)}
              style={{
                width: isMobile ? 80 : 100,
                accentColor: brushColor
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>{brushSize}px</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleUndo}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #555',
              background: 'rgba(60, 60, 80, 0.8)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.15s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = 'rgba(80, 80, 100, 0.8)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(60, 60, 80, 0.8)'
            }}
          >
            ↶ 撤销
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #555',
              background: 'rgba(60, 60, 80, 0.8)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.15s'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.background = 'rgba(80, 80, 100, 0.8)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.background = 'rgba(60, 60, 80, 0.8)'
            }}
          >
            清空
          </button>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        right: 20,
        bottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        zIndex: 40
      }}>
        <input
          type="text"
          placeholder="输入昵称(最多8字)"
          value={nickname}
          onChange={e => setNickname(e.target.value.slice(0, 8))}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #4a4a6a',
            background: 'rgba(30, 30, 50, 0.9)',
            color: '#fff',
            fontSize: 14,
            outline: 'none',
            width: 160
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            border: 'none',
            background: '#4ecdc4',
            color: '#1c1c2e',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 0.15s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.filter = 'brightness(1.1)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.filter = 'brightness(1)'
          }}
        >
          🎨 上墙
        </button>
      </div>

      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        pointerEvents: 'none'
      }}>
        已签到 {signs.length} 人 · Ctrl+Z 撤销
      </div>
    </div>
  )
}

export default SignWall
