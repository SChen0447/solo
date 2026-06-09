import { useRef, useEffect, useCallback } from 'react'

interface RadarChartProps {
  values: number[]
  size?: number
  animated?: boolean
  labels?: string[]
}

const DEFAULT_LABELS = ['酸度', '甜度', '苦味', '香气', '余韵']
const GRID_COLOR = '#D0D0D0'
const STROKE_COLOR = '#5C3317'
const GRADIENT_START = '#C77D43'
const GRADIENT_END = '#F4A460'
const STROKE_WIDTH = 2
const ANIMATION_DURATION = 300
const GRID_LEVELS = 5

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function RadarChart({
  values,
  size = 300,
  animated = false,
  labels = DEFAULT_LABELS
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const displayValuesRef = useRef<number[]>([...values])
  const targetValuesRef = useRef<number[]>([...values])
  const animationStartRef = useRef<number>(0)

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, currentValues: number[]) => {
      const centerX = size / 2
      const centerY = size / 2
      const radius = size * 0.38
      const sides = labels.length
      const angleStep = (Math.PI * 2) / sides
      const startAngle = -Math.PI / 2

      ctx.clearRect(0, 0, size, size)

      for (let level = 1; level <= GRID_LEVELS; level++) {
        const levelRadius = (radius * level) / GRID_LEVELS
        ctx.beginPath()
        ctx.strokeStyle = GRID_COLOR
        ctx.lineWidth = 1
        for (let i = 0; i <= sides; i++) {
          const angle = startAngle + i * angleStep
          const x = centerX + Math.cos(angle) * levelRadius
          const y = centerY + Math.sin(angle) * levelRadius
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.closePath()
        ctx.stroke()
      }

      for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep
        ctx.beginPath()
        ctx.strokeStyle = GRID_COLOR
        ctx.lineWidth = 1
        ctx.moveTo(centerX, centerY)
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
        ctx.stroke()
      }

      ctx.beginPath()
      for (let i = 0; i <= sides; i++) {
        const idx = i % sides
        const angle = startAngle + idx * angleStep
        const value = Math.max(0, Math.min(10, currentValues[idx] || 0))
        const pointRadius = (radius * value) / 10
        const x = centerX + Math.cos(angle) * pointRadius
        const y = centerY + Math.sin(angle) * pointRadius
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.closePath()

      const gradient = ctx.createLinearGradient(
        centerX - radius,
        centerY - radius,
        centerX + radius,
        centerY + radius
      )
      gradient.addColorStop(0, GRADIENT_START)
      gradient.addColorStop(1, GRADIENT_END)
      ctx.fillStyle = gradient
      ctx.globalAlpha = 0.75
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH
      ctx.lineJoin = 'round'
      ctx.stroke()

      for (let i = 0; i < sides; i++) {
        const angle = startAngle + i * angleStep
        const value = Math.max(0, Math.min(10, currentValues[i] || 0))
        const pointRadius = (radius * value) / 10
        const x = centerX + Math.cos(angle) * pointRadius
        const y = centerY + Math.sin(angle) * pointRadius
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = STROKE_COLOR
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (size >= 240) {
        ctx.fillStyle = STROKE_COLOR
        ctx.font = `${Math.max(12, size * 0.04)}px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (let i = 0; i < sides; i++) {
          const angle = startAngle + i * angleStep
          const labelRadius = radius + size * 0.08
          const x = centerX + Math.cos(angle) * labelRadius
          const y = centerY + Math.sin(angle) * labelRadius
          ctx.fillText(labels[i], x, y)
        }
      }
    },
    [size, labels]
  )

  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const elapsed = timestamp - animationStartRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
      const easedProgress = easeOutCubic(progress)

      const currentValues = displayValuesRef.current.map((startVal, i) => {
        const targetVal = targetValuesRef.current[i]
        return startVal + (targetVal - startVal) * easedProgress
      })

      draw(ctx, currentValues)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        displayValuesRef.current = [...targetValuesRef.current]
        animationRef.current = null
      }
    },
    [draw]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)

    targetValuesRef.current = [...values]

    if (animated) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      animationStartRef.current = performance.now()
      animationRef.current = requestAnimationFrame(animate)
    } else {
      displayValuesRef.current = [...values]
      draw(ctx, values)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [values, size, animated, draw, animate])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export default RadarChart
