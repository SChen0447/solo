import { useEffect, useRef, useState, useCallback } from 'react'
import { ColorStop, generateGradientCSS } from '../types'

interface GradientCanvasProps {
  angle: number
  colorStops: ColorStop[]
  blurRadius: number
  onColorStopMove?: (index: number, position: number) => void
}

const GradientCanvas = ({ angle, colorStops, blurRadius, onColorStopMove }: GradientCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [localStops, setLocalStops] = useState<ColorStop[]>(colorStops)

  useEffect(() => {
    setLocalStops(colorStops)
  }, [colorStops])

  const gradient = generateGradientCSS(angle, localStops)

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (index === 0 || index === localStops.length - 1) return
    setDraggingIndex(index)
  }, [localStops.length])

  useEffect(() => {
    if (draggingIndex === null) return

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        if (!barRef.current) return
        const rect = barRef.current.getBoundingClientRect()
        let position = ((e.clientX - rect.left) / rect.width) * 100
        position = Math.max(0, Math.min(100, position))
        setLocalStops(prev => {
          const updated = [...prev]
          updated[draggingIndex] = { ...updated[draggingIndex], position }
          return updated
        })
        onColorStopMove?.(draggingIndex, position)
      })
    }

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setDraggingIndex(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingIndex, onColorStopMove])

  const sortedStops = [...localStops].sort((a, b) => a.position - b.position)

  return (
    <div style={styles.wrapper}>
      <div
        ref={canvasRef}
        style={{
          ...styles.canvas,
          background: gradient,
          filter: blurRadius > 0 ? `blur(${blurRadius}px)` : 'none',
        }}
      />
      <div ref={barRef} style={styles.gradientBar}>
        <div style={{ ...styles.barFill, background: gradient }} />
        {sortedStops.map((stop, idx) => {
          const originalIndex = localStops.findIndex(s => s === stop)
          const isEdge = originalIndex === 0 || originalIndex === localStops.length - 1
          const isDragging = draggingIndex === originalIndex
          return (
            <div
              key={idx}
              onMouseDown={handleMouseDown(originalIndex)}
              style={{
                ...styles.stopHandle,
                left: `${stop.position}%`,
                width: isDragging ? 16 : 12,
                height: isDragging ? 16 : 12,
                background: stop.color,
                cursor: isEdge ? 'default' : 'grab',
                boxShadow: isDragging
                  ? '0 4px 12px rgba(0,0,0,0.4)'
                  : '0 2px 4px rgba(0,0,0,0.3)',
                border: `2px solid ${isEdge ? '#ffffff' : 'transparent'}`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  canvas: {
    width: 600,
    maxWidth: '100%',
    height: 400,
    borderRadius: 12,
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.2)',
    transition: 'filter 0.1s linear',
  },
  gradientBar: {
    position: 'relative',
    width: 600,
    maxWidth: '100%',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    height: '100%',
  },
  stopHandle: {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '50%',
    transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease',
    boxSizing: 'content-box',
  },
}

export default GradientCanvas
