import { useRef, useEffect, useState, useCallback } from 'react'
import { Stroke, StickyNote as StickyNoteType, ViewState, MIN_SCALE, MAX_SCALE } from '../types'
import StickyNote from './StickyNote'

interface CanvasProps {
  strokes: Stroke[]
  stickyNotes: StickyNoteType[]
  color: string
  thickness: number
  viewState: ViewState
  onViewStateChange: (state: ViewState) => void
  onDrawStroke: (points: { x: number; y: number }[]) => void
  onUpdateStickyNote: (noteId: string, updates: Partial<StickyNoteType>) => void
  onDeleteStickyNote: (noteId: string) => void
}

function Canvas({
  strokes,
  stickyNotes,
  color,
  thickness,
  viewState,
  onViewStateChange,
  onDrawStroke,
  onUpdateStickyNote,
  onDeleteStickyNote,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const isPanningRef = useRef(false)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])
  const panStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 })
  const [, forceUpdate] = useState(0)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(viewState.offsetX, viewState.offsetY)
    ctx.scale(viewState.scale, viewState.scale)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.thickness
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
      }
      ctx.stroke()
    })

    if (isDrawingRef.current && currentPointsRef.current.length > 1) {
      const pts = currentPointsRef.current
      ctx.strokeStyle = color
      ctx.lineWidth = thickness
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y)
      }
      ctx.stroke()
    }

    ctx.restore()
    forceUpdate((n) => n + 1)
  }, [strokes, color, thickness, viewState])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      redraw()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  const screenToWorld = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - viewState.offsetX) / viewState.scale
    const y = (screenY - rect.top - viewState.offsetY) / viewState.scale
    return { x, y }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: viewState.offsetX,
        offsetY: viewState.offsetY,
      }
      e.preventDefault()
      return
    }

    if (e.button !== 0) return

    isDrawingRef.current = true
    const worldPos = screenToWorld(e.clientX, e.clientY)
    currentPointsRef.current = [worldPos]
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      onViewStateChange({
        ...viewState,
        offsetX: panStartRef.current.offsetX + dx,
        offsetY: panStartRef.current.offsetY + dy,
      })
      return
    }

    if (!isDrawingRef.current) return

    const worldPos = screenToWorld(e.clientX, e.clientY)
    currentPointsRef.current.push(worldPos)
    redraw()
  }

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false
      return
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false
      if (currentPointsRef.current.length > 1) {
        onDrawStroke([...currentPointsRef.current])
      }
      currentPointsRef.current = []
      redraw()
    }
  }

  const handleMouseLeave = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      if (currentPointsRef.current.length > 1) {
        onDrawStroke([...currentPointsRef.current])
      }
      currentPointsRef.current = []
      redraw()
    }
    isPanningRef.current = false
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewState.scale + delta))

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const scaleChange = newScale / viewState.scale
    const newOffsetX = mouseX - (mouseX - viewState.offsetX) * scaleChange
    const newOffsetY = mouseY - (mouseY - viewState.offsetY) * scaleChange

    onViewStateChange({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      scale: newScale,
    })
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
  }

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      <canvas ref={canvasRef} style={styles.canvas} />
      {stickyNotes.map((note) => (
        <StickyNote
          key={note.id}
          note={note}
          viewScale={viewState.scale}
          viewOffsetX={viewState.offsetX}
          viewOffsetY={viewState.offsetY}
          onUpdate={onUpdateStickyNote}
          onDelete={onDeleteStickyNote}
        />
      ))}
      <div style={styles.scaleIndicator}>
        {Math.round(viewState.scale * 100)}%
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    cursor: 'crosshair',
    backgroundImage:
      'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'block',
  },
  scaleIndicator: {
    position: 'absolute',
    bottom: '100px',
    right: '24px',
    padding: '6px 12px',
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#999',
    fontFamily: 'monospace',
    border: '1px solid rgba(255,255,255,0.1)',
    userSelect: 'none',
    zIndex: 100,
    transition: 'all 0.2s ease',
  },
}

export default Canvas
