import React, { useRef, useEffect, useCallback, useState } from 'react'
import { useLoomStore } from './store'
import { PRESET_COLORS, DEFAULT_WARP_COLOR, DEFAULT_WEFT_COLOR } from './colors'
import type { FillMode, RippleEffect } from './types'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

function blendColors(color1: string, color2: string): string {
  if (!color1 && !color2) return ''
  if (!color1) return color2
  if (!color2) return color1
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(
    (c1.r + c2.r) / 2,
    (c1.g + c2.g) / 2,
    (c1.b + c2.b) / 2
  )
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const MARGIN = 30

interface Props {
  fillMode: FillMode
  onFillPoint: (row: number, col: number) => void
  onFillWarp: (col: number) => void
  onFillWeft: (row: number) => void
  onFillDrag: (startRow: number, startCol: number, endRow: number, endCol: number) => void
}

export default function LoomCanvas({
  fillMode,
  onFillPoint,
  onFillWarp,
  onFillWeft,
  onFillDrag,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const { loomState } = useLoomStore()
  const { gridSize, warpColors, weftColors, tension, intersectionColors } = loomState

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null)
  const [ripples, setRipples] = useState<RippleEffect[]>([])
  const [animatedTension, setAnimatedTension] = useState(tension)
  const tensionRef = useRef(tension)
  const animFrameRef = useRef<number>(0)

  const cellWidth = (CANVAS_WIDTH - MARGIN * 2) / gridSize
  const cellHeight = (CANVAS_HEIGHT - MARGIN * 2) / gridSize

  useEffect(() => {
    const startTension = tensionRef.current
    const endTension = tension
    const duration = 300
    const startTime = performance.now()

    function animate(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const currentTension = startTension + (endTension - startTension) * eased
      setAnimatedTension(currentTension)
      tensionRef.current = currentTension
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        tensionRef.current = endTension
      }
    }

    cancelAnimationFrame(animFrameRef.current)
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [tension])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = '#f5f0e8'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const currentTension = animatedTension
    const yarnWidth = 2 + currentTension * 0.5
    const bendOffset = currentTension * 1.5

    for (let col = 0; col < gridSize; col++) {
      const x = MARGIN + col * cellWidth + cellWidth / 2
      const warpColor = col < warpColors.length ? warpColors[col] : DEFAULT_WARP_COLOR
      ctx.strokeStyle = warpColor
      ctx.lineWidth = yarnWidth
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(x, MARGIN)
      for (let row = 0; row < gridSize; row++) {
        const y = MARGIN + row * cellHeight + cellHeight / 2
        const nextY =
          row < gridSize - 1
            ? MARGIN + (row + 1) * cellHeight + cellHeight / 2
            : y + cellHeight / 2
        const cpY = (y + nextY) / 2
        const isWarpOver = row % 2 === col % 2
        const offset = isWarpOver ? -bendOffset : bendOffset
        ctx.quadraticCurveTo(x + offset * 0.3, cpY, x, nextY)
      }
      ctx.stroke()
    }

    for (let row = 0; row < gridSize; row++) {
      const y = MARGIN + row * cellHeight + cellHeight / 2
      const weftColor = row < weftColors.length ? weftColors[row] : DEFAULT_WEFT_COLOR
      ctx.strokeStyle = weftColor
      ctx.lineWidth = yarnWidth
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(MARGIN, y)
      for (let col = 0; col < gridSize; col++) {
        const x = MARGIN + col * cellWidth + cellWidth / 2
        const nextX =
          col < gridSize - 1
            ? MARGIN + (col + 1) * cellWidth + cellWidth / 2
            : x + cellWidth / 2
        const cpX = (x + nextX) / 2
        const isWeftOver = row % 2 !== col % 2
        const offset = isWeftOver ? -bendOffset : bendOffset
        ctx.quadraticCurveTo(cpX, y + offset * 0.3, nextX, y)
      }
      ctx.stroke()
    }

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = MARGIN + col * cellWidth + cellWidth / 2
        const y = MARGIN + row * cellHeight + cellHeight / 2
        const customColor = intersectionColors[row]?.[col]
        const isWarpOver = row % 2 === col % 2
        const topColor = isWarpOver
          ? (col < warpColors.length ? warpColors[col] : DEFAULT_WARP_COLOR)
          : (row < weftColors.length ? weftColors[row] : DEFAULT_WEFT_COLOR)
        const bottomColor = isWarpOver
          ? (row < weftColors.length ? weftColors[row] : DEFAULT_WEFT_COLOR)
          : (col < warpColors.length ? warpColors[col] : DEFAULT_WARP_COLOR)

        const displayColor = customColor || blendColors(topColor, bottomColor)
        if (!displayColor) continue

        const radiusX = Math.max(1, cellWidth * 0.3 + currentTension * 0.5)
        const radiusY = Math.max(1, cellHeight * 0.15 + currentTension * 0.3)

        ctx.fillStyle = displayColor
        ctx.beginPath()
        ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2)
        ctx.fill()

        const highlightAlpha = 0.15 + currentTension * 0.02
        ctx.fillStyle = `rgba(255,255,255,${highlightAlpha})`
        ctx.beginPath()
        ctx.ellipse(x, y - radiusY * 0.3, radiusX * 0.7, radiusY * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()

        const shadowAlpha = 0.1 + currentTension * 0.02
        ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`
        ctx.beginPath()
        ctx.ellipse(x, y + radiusY * 0.3, radiusX * 0.8, radiusY * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (isDragging && dragStart && dragEnd) {
      const minRow = Math.min(dragStart.row, dragEnd.row)
      const maxRow = Math.max(dragStart.row, dragEnd.row)
      const minCol = Math.min(dragStart.col, dragEnd.col)
      const maxCol = Math.max(dragStart.col, dragEnd.col)
      ctx.strokeStyle = 'rgba(100,150,255,0.6)'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.strokeRect(
        MARGIN + minCol * cellWidth,
        MARGIN + minRow * cellHeight,
        (maxCol - minCol + 1) * cellWidth,
        (maxRow - minRow + 1) * cellHeight
      )
      ctx.setLineDash([])
    }

    const now = performance.now()
    const activeRipples = ripples.filter((r) => now - r.startTime < 500)
    for (const ripple of activeRipples) {
      const age = (now - ripple.startTime) / 500
      const radius = age * Math.max(cellWidth, cellHeight) * 1.5
      const alpha = 0.3 * (1 - age)
      ctx.strokeStyle = `rgba(100,150,255,${alpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (activeRipples.length !== ripples.length) {
      setRipples(activeRipples)
    }

    const previewCanvas = previewCanvasRef.current
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d')
      if (pCtx) {
        const pSize = 200
        pCtx.clearRect(0, 0, pSize, pSize)
        const pCellW = pSize / gridSize
        const pCellH = pSize / gridSize
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const customColor = intersectionColors[row]?.[col]
            const isWarpOver = row % 2 === col % 2
            const topColor = isWarpOver
              ? (col < warpColors.length ? warpColors[col] : DEFAULT_WARP_COLOR)
              : (row < weftColors.length ? weftColors[row] : DEFAULT_WEFT_COLOR)
            const bottomColor = isWarpOver
              ? (row < weftColors.length ? weftColors[row] : DEFAULT_WEFT_COLOR)
              : (col < warpColors.length ? warpColors[col] : DEFAULT_WARP_COLOR)
            const displayColor = customColor || blendColors(topColor, bottomColor)
            if (displayColor) {
              pCtx.fillStyle = displayColor
            } else {
              pCtx.fillStyle = '#e8e0d0'
            }
            pCtx.fillRect(col * pCellW, row * pCellH, pCellW - 0.5, pCellH - 0.5)
          }
        }
      }
    }
  }, [gridSize, warpColors, weftColors, animatedTension, intersectionColors, isDragging, dragStart, dragEnd, ripples])

  const getGridPos = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      const col = Math.floor((x - MARGIN) / cellWidth)
      const row = Math.floor((y - MARGIN) / cellHeight)
      if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
        return { row, col }
      }
      return null
    },
    [cellWidth, cellHeight, gridSize]
  )

  const handleInteraction = useCallback(
    (clientX: number, clientY: number) => {
      const pos = getGridPos(clientX, clientY)
      if (!pos) return

      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const scaleX = CANVAS_WIDTH / rect.width
        const scaleY = CANVAS_HEIGHT / rect.height
        const canvasX = (clientX - rect.left) * scaleX
        const canvasY = (clientY - rect.top) * scaleY
        setRipples((prev) => [...prev.slice(-5), { x: canvasX, y: canvasY, startTime: performance.now() }])
      }

      if (fillMode === 'point') {
        onFillPoint(pos.row, pos.col)
      } else if (fillMode === 'warp') {
        onFillWarp(pos.col)
      } else if (fillMode === 'weft') {
        onFillWeft(pos.row)
      }
    },
    [fillMode, getGridPos, onFillPoint, onFillWarp, onFillWeft]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (fillMode === 'drag') {
        const pos = getGridPos(e.clientX, e.clientY)
        if (pos) {
          setIsDragging(true)
          setDragStart(pos)
          setDragEnd(pos)
        }
      } else {
        handleInteraction(e.clientX, e.clientY)
      }
    },
    [fillMode, getGridPos, handleInteraction]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && fillMode === 'drag') {
        const pos = getGridPos(e.clientX, e.clientY)
        if (pos) {
          setDragEnd(pos)
        }
      }
    },
    [isDragging, fillMode, getGridPos]
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && dragEnd) {
      onFillDrag(dragStart.row, dragStart.col, dragEnd.row, dragEnd.col)
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, onFillDrag])

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'jacquard-loom-pattern.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="loom-canvas border-4 border-amber-900 rounded-lg shadow-2xl cursor-crosshair max-w-full h-auto"
        style={{
          imageRendering: 'auto',
          boxShadow: '0 8px 32px rgba(78,52,46,0.4), inset 0 0 0 2px rgba(139,90,43,0.3)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <canvas
        ref={previewCanvasRef}
        width={200}
        height={200}
        className="hidden"
        id="preview-canvas"
      />
      <button
        onClick={handleExportPNG}
        className="export-png-btn mt-3 px-4 py-2 rounded-lg text-sm font-medium text-amber-100 transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #5d4037 0%, #8d6e63 100%)',
          boxShadow: '0 2px 8px rgba(78,52,46,0.3)',
        }}
      >
        导出 PNG
      </button>
    </div>
  )
}

export function getPreviewDataURL(): string | null {
  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement | null
  if (!canvas) return null
  return canvas.toDataURL('image/png')
}
