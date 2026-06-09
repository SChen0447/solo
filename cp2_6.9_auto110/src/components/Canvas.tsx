import { useRef, useEffect, useCallback } from 'react'
import { GRID_SIZE, CELL_SIZE, CELL_GAP } from '../types'

interface CanvasProps {
  grid: string[]
  selectedColor: string
  hoveredCell: { x: number; y: number } | null
  recentPixels: Map<string, number>
  onPixelClick: (x: number, y: number, color: string) => void
  onHover: (cell: { x: number; y: number } | null) => void
}

const TOTAL_CELL = CELL_SIZE + CELL_GAP
const CANVAS_SIZE = GRID_SIZE * TOTAL_CELL - CELL_GAP

export default function Canvas({
  grid,
  selectedColor,
  hoveredCell,
  recentPixels,
  onPixelClick,
  onHover
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastHovered = useRef<string | null>(null)

  const drawCell = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    animate: boolean = false
  ) => {
    const px = x * TOTAL_CELL
    const py = y * TOTAL_CELL

    if (color) {
      ctx.fillStyle = color
      if (animate) {
        const inset = 1
        ctx.fillRect(px + inset, py + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2)
      } else {
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.fillRect(px, py, CELL_SIZE, 1)
      ctx.fillRect(px, py, 1, CELL_SIZE)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(px, py + CELL_SIZE - 1, CELL_SIZE, 1)
      ctx.fillRect(px + CELL_SIZE - 1, py, 1, CELL_SIZE)
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
    }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x
        const color = grid[idx]
        const key = `${x},${y}`
        const isRecent = recentPixels.has(key)
        drawCell(ctx, x, y, color, isRecent)
      }
    }

    if (hoveredCell) {
      const { x, y } = hoveredCell
      const px = x * TOTAL_CELL
      const py = y * TOTAL_CELL
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = 2
      ctx.strokeRect(px - 1, py - 1, CELL_SIZE + 2, CELL_SIZE + 2)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
      const text = `${x}, ${y} | ${selectedColor}`
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
      const textWidth = ctx.measureText(text).width
      const tooltipW = textWidth + 16
      const tooltipH = 22
      let tooltipX = px + CELL_SIZE / 2 - tooltipW / 2
      let tooltipY = py - tooltipH - 6
      if (tooltipX < 0) tooltipX = 4
      if (tooltipX + tooltipW > CANVAS_SIZE) tooltipX = CANVAS_SIZE - tooltipW - 4
      if (tooltipY < 0) tooltipY = py + CELL_SIZE + 6

      const radius = 4
      ctx.beginPath()
      ctx.moveTo(tooltipX + radius, tooltipY)
      ctx.lineTo(tooltipX + tooltipW - radius, tooltipY)
      ctx.quadraticCurveTo(tooltipX + tooltipW, tooltipY, tooltipX + tooltipW, tooltipY + radius)
      ctx.lineTo(tooltipX + tooltipW, tooltipY + tooltipH - radius)
      ctx.quadraticCurveTo(tooltipX + tooltipW, tooltipY + tooltipH, tooltipX + tooltipW - radius, tooltipY + tooltipH)
      ctx.lineTo(tooltipX + radius, tooltipY + tooltipH)
      ctx.quadraticCurveTo(tooltipX, tooltipY + tooltipH, tooltipX, tooltipY + tooltipH - radius)
      ctx.lineTo(tooltipX, tooltipY + radius)
      ctx.quadraticCurveTo(tooltipX, tooltipY, tooltipX + radius, tooltipY)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'white'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, tooltipX + 8, tooltipY + tooltipH / 2)
    }
  }, [grid, hoveredCell, selectedColor, recentPixels, drawCell])

  useEffect(() => {
    redraw()
  }, [redraw])

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TOTAL_CELL)
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TOTAL_CELL)
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y }
    }
    return null
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e)
    if (cell) {
      onPixelClick(cell.x, cell.y, selectedColor)
    }
  }

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e)
    const key = cell ? `${cell.x},${cell.y}` : null
    if (key !== lastHovered.current) {
      lastHovered.current = key
      onHover(cell)
    }
  }

  const handleLeave = () => {
    if (lastHovered.current !== null) {
      lastHovered.current = null
      onHover(null)
    }
  }

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="pixel-canvas"
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          display: 'block',
          imageRendering: 'pixelated',
          cursor: 'crosshair',
          borderRadius: '8px'
        }}
      />
    </div>
  )
}
