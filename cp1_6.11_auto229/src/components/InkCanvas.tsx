import { useRef, useEffect, useCallback, useState, useImperativeHandle, forwardRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ToolType, Stroke, InkPoint } from '../utils/inkEngine'
import {
  createInkPoint,
  generateBezierInkPoints,
  generateBezierControl,
  generateFiberParticles,
  generateRingParticles,
  addParticlesToPool,
  updateParticles,
  getParticlePool,
  generateFiberTexture,
  clearParticlePool,
} from '../utils/inkEngine'

interface InkCanvasProps {
  currentTool: ToolType
  strokes: Stroke[]
  onStrokesChange: (strokes: Stroke[]) => void
  onPointCountChange: (count: number) => void
  onCoordsChange: (x: number, y: number) => void
}

export interface InkCanvasHandle {
  getCanvasSize: () => { width: number; height: number }
}

const InkCanvas = forwardRef<InkCanvasHandle, InkCanvasProps>(({
  currentTool,
  strokes,
  onStrokesChange,
  onPointCountChange,
  onCoordsChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })

  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const lastPointRef = useRef<InkPoint | null>(null)
  const prevPointRef = useRef<InkPoint | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const holdCountRef = useRef(0)
  const holdPositionRef = useRef<{ x: number; y: number } | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const strokesRef = useRef<Stroke[]>(strokes)

  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useImperativeHandle(ref, () => ({
    getCanvasSize: () => canvasSize,
  }))

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth * 0.8, 1600)
      const h = 600
      setCanvasSize({ width: Math.floor(w), height: h })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#f5f0e0')
    gradient.addColorStop(1, '#e8dcc8')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    generateFiberTexture(ctx, w, h)
  }, [])

  const drawInkPoint = useCallback((ctx: CanvasRenderingContext2D, p: InkPoint) => {
    ctx.beginPath()
    ctx.globalAlpha = p.opacity
    ctx.fillStyle = p.color
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawBackground(ctx, canvasSize.width, canvasSize.height)

    for (const stroke of strokesRef.current) {
      for (const p of stroke.points) {
        drawInkPoint(ctx, p)
      }
    }

    if (currentStrokeRef.current) {
      for (const p of currentStrokeRef.current.points) {
        drawInkPoint(ctx, p)
      }
    }

    const particles = getParticlePool()
    for (const p of particles) {
      ctx.beginPath()
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, [canvasSize, drawBackground, drawInkPoint])

  useEffect(() => {
    const animate = () => {
      updateParticles()
      render()
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    animationFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [render])

  const getPressure = (e: PointerEvent | React.PointerEvent): number => {
    if ('pointerType' in e && e.pointerType === 'pen' && e.pressure > 0) {
      return e.pressure
    }
    return 0.5
  }

  const startHoldTimer = useCallback((x: number, y: number) => {
    stopHoldTimer()
    holdPositionRef.current = { x, y }
    holdCountRef.current = 0
    const tick = () => {
      holdCountRef.current += 1
      if (currentStrokeRef.current && holdPositionRef.current) {
        const { x, y } = holdPositionRef.current
        const lastIdx = currentStrokeRef.current.points.length - 1
        const lastP = currentStrokeRef.current.points[lastIdx]
        if (lastP) {
          const newRadius = Math.min(25, lastP.radius + 1)
          const darkenFactor = Math.min(1, holdCountRef.current * 0.15)
          const gray = Math.floor(26 - darkenFactor * 26)
          const color = `#${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}`
          const newPoint: InkPoint = {
            ...lastP,
            id: uuidv4(),
            x, y,
            radius: newRadius,
            color,
            opacity: Math.min(1, lastP.opacity + 0.05),
            timestamp: Date.now(),
          }
          currentStrokeRef.current.points.push(newPoint)
          const fiberParticles = generateFiberParticles(x, y, newRadius, currentTool)
          addParticlesToPool(fiberParticles)
          if (holdCountRef.current % 2 === 0) {
            const ring = generateRingParticles(x, y, newRadius)
            currentStrokeRef.current.points.push(...ring)
            for (const rp of ring) {
              const rf = generateFiberParticles(rp.x, rp.y, rp.radius, currentTool)
              addParticlesToPool(rf)
            }
          }
          const total = strokesRef.current.reduce((s, st) => s + st.points.length, 0)
            + currentStrokeRef.current.points.length
          onPointCountChange(total)
        }
      }
      holdTimerRef.current = window.setTimeout(tick, 300)
    }
    holdTimerRef.current = window.setTimeout(tick, 300)
  }, [currentTool, onPointCountChange])

  const stopHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    holdPositionRef.current = null
    holdCountRef.current = 0
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const pressure = getPressure(e)

    isDrawingRef.current = true
    prevPointRef.current = null
    const point = createInkPoint(x, y, pressure, currentTool)
    lastPointRef.current = point

    const stroke: Stroke = {
      id: uuidv4(),
      tool: currentTool,
      points: [point],
      particles: [],
      createdAt: Date.now(),
    }
    currentStrokeRef.current = stroke

    const fiberParticles = generateFiberParticles(x, y, point.radius, currentTool)
    addParticlesToPool(fiberParticles)

    if (currentTool === 'dropper') {
      const dropperPoint = createInkPoint(x, y, 0.8, currentTool, 3, 0.9)
      stroke.points.push(dropperPoint)
      const bigParticles = generateFiberParticles(x, y, 30, currentTool)
      addParticlesToPool(bigParticles)
    }

    const total = strokesRef.current.reduce((s, st) => s + st.points.length, 0) + stroke.points.length
    onPointCountChange(total)
    startHoldTimer(x, y)
  }, [currentTool, onPointCountChange, startHoldTimer])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    onCoordsChange(Math.round(x), Math.round(y))

    if (!isDrawingRef.current || !currentStrokeRef.current || !lastPointRef.current) {
      return
    }

    const pressure = getPressure(e)
    const newPoint = createInkPoint(x, y, pressure, currentTool)

    const control = generateBezierControl(prevPointRef.current, lastPointRef.current, newPoint)
    const interpolated = generateBezierInkPoints(lastPointRef.current, newPoint, control, 1.5, currentTool)

    if (interpolated.length > 0) {
      currentStrokeRef.current.points.push(...interpolated)
      for (const p of interpolated) {
        const fp = generateFiberParticles(p.x, p.y, p.radius, currentTool)
        addParticlesToPool(fp)
      }
    }

    prevPointRef.current = lastPointRef.current
    lastPointRef.current = newPoint

    if (holdPositionRef.current) {
      startHoldTimer(x, y)
    }

    const total = strokesRef.current.reduce((s, st) => s + st.points.length, 0)
      + currentStrokeRef.current.points.length
    onPointCountChange(total)
  }, [currentTool, onCoordsChange, onPointCountChange, startHoldTimer])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    stopHoldTimer()

    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      const newStrokes = [...strokesRef.current, currentStrokeRef.current]
      if (newStrokes.length > 50) {
        newStrokes.splice(0, newStrokes.length - 50)
      }
      onStrokesChange(newStrokes)
    }

    currentStrokeRef.current = null
    lastPointRef.current = null
    prevPointRef.current = null
  }, [onStrokesChange, stopHoldTimer])

  useEffect(() => {
    return () => {
      stopHoldTimer()
      clearParticlePool()
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [stopHoldTimer])

  return (
    <div
      ref={containerRef}
      style={{
        width: '80%',
        maxWidth: 1600,
        height: 600,
        margin: '80px auto 40px auto',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={(e) => {
          if (isDrawingRef.current) handlePointerUp(e)
        }}
        style={{
          width: '100%',
          height: 600,
          cursor: currentTool === 'dropper' ? 'crosshair' : 'crosshair',
          touchAction: 'none',
          borderRadius: 4,
          boxShadow: '0 4px 24px rgba(74, 59, 50, 0.2)',
        }}
      />
    </div>
  )
})

InkCanvas.displayName = 'InkCanvas'

export default InkCanvas
