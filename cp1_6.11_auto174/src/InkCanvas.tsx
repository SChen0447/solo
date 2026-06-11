import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { applyNoiseToPaper, applyAgingTint, generateFoldLines, perlinNoise2D, generateHashTable } from './EffectProcessor'

export interface InkCanvasHandle {
  startDryingAnimation: () => void
  applyAgingEffect: () => void
  exportScroll: () => Promise<Blob | null>
}

interface InkCanvasProps {
  inkLevel: number
  nibSize: number
  onInkConsume: (amount: number) => void
}

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 400
const EXPORT_WIDTH = 1800
const EXPORT_HEIGHT = 800

interface Point {
  x: number
  y: number
  pressure: number
  angle: number
}

const InkCanvas = forwardRef<InkCanvasHandle, InkCanvasProps>(({ inkLevel, nibSize, onInkConsume }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paperLayerRef = useRef<HTMLCanvasElement | null>(null)
  const inkLayerRef = useRef<HTMLCanvasElement | null>(null)
  const effectLayerRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; angle: number; visible: boolean }>({
    x: 0,
    y: 0,
    angle: 0,
    visible: false,
  })
  const dryingAnimatingRef = useRef(false)
  const agedRef = useRef(false)

  const initializeCanvases = useCallback(() => {
    const paper = document.createElement('canvas')
    paper.width = CANVAS_WIDTH
    paper.height = CANVAS_HEIGHT
    paperLayerRef.current = paper

    const ink = document.createElement('canvas')
    ink.width = CANVAS_WIDTH
    ink.height = CANVAS_HEIGHT
    inkLayerRef.current = ink

    const effect = document.createElement('canvas')
    effect.width = CANVAS_WIDTH
    effect.height = CANVAS_HEIGHT
    effectLayerRef.current = effect

    const pctx = paper.getContext('2d')!
    const gradient = pctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      50,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.7
    )
    gradient.addColorStop(0, '#f5e6c8')
    gradient.addColorStop(1, '#e8d5a8')
    pctx.fillStyle = gradient
    pctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    applyNoiseToPaper(pctx, CANVAS_WIDTH, CANVAS_HEIGHT)

    redraw()
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !paperLayerRef.current || !inkLayerRef.current || !effectLayerRef.current) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.drawImage(paperLayerRef.current, 0, 0)
    ctx.drawImage(inkLayerRef.current, 0, 0)
    ctx.drawImage(effectLayerRef.current, 0, 0)
  }, [])

  const generateTornEdgeClipPath = (): string => {
    const points: string[] = []
    const steps = 40
    const margin = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = t * 100
      const jitter = (Math.random() - 0.5) * 1.5
      points.push(`${x}% ${margin + jitter}%`)
    }
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = t * 100
      const jitter = (Math.random() - 0.5) * 1.5
      points.push(`${100 - margin + jitter}% ${y}%`)
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const x = t * 100
      const jitter = (Math.random() - 0.5) * 1.5
      points.push(`${x}% ${100 - margin + jitter}%`)
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const y = t * 100
      const jitter = (Math.random() - 0.5) * 1.5
      points.push(`${margin + jitter}% ${y}%`)
    }
    return `polygon(${points.join(', ')})`
  }

  const [clipPath] = useState(generateTornEdgeClipPath)

  useEffect(() => {
    initializeCanvases()
  }, [initializeCanvases])

  const drawQuillBrush = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, pressure: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)

      const actualSize = size * (0.6 + pressure * 0.8)
      const inkLow = inkLevel < 20
      const skipChance = inkLow ? (1 - inkLevel / 20) * 0.6 : 0

      if (skipChance > 0 && Math.random() < skipChance * 0.5) {
        ctx.restore()
        return
      }

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, actualSize)
      const baseAlpha = 0.85 - skipChance * 0.5
      grad.addColorStop(0, `rgba(10, 10, 30, ${baseAlpha})`)
      grad.addColorStop(0.4, `rgba(20, 15, 45, ${baseAlpha * 0.7})`)
      grad.addColorStop(0.7, `rgba(30, 25, 60, ${baseAlpha * 0.3})`)
      grad.addColorStop(1, 'rgba(30, 25, 60, 0)')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(0, 0, actualSize * 1.2, actualSize * 0.6, 0, 0, Math.PI * 2)
      ctx.fill()

      const featherCount = 5
      for (let f = 0; f < featherCount; f++) {
        const fAngle = ((f - (featherCount - 1) / 2) / featherCount) * Math.PI * 0.4
        const fLen = actualSize * (0.8 + Math.random() * 0.4)
        ctx.save()
        ctx.rotate(fAngle)
        const fGrad = ctx.createLinearGradient(0, 0, fLen, 0)
        fGrad.addColorStop(0, `rgba(15, 15, 35, ${baseAlpha * 0.6})`)
        fGrad.addColorStop(1, 'rgba(15, 15, 35, 0)')
        ctx.strokeStyle = fGrad
        ctx.lineWidth = actualSize * 0.08
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        const ctrlX = fLen * 0.5
        const ctrlY = (Math.random() - 0.5) * actualSize * 0.3
        ctx.quadraticCurveTo(ctrlX, ctrlY, fLen, (Math.random() - 0.5) * actualSize * 0.15)
        ctx.stroke()
        ctx.restore()
      }

      if (pressure > 0.7) {
        const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, actualSize * 1.8)
        blobGrad.addColorStop(0, `rgba(5, 5, 20, ${0.3 + pressure * 0.3})`)
        blobGrad.addColorStop(0.5, `rgba(10, 10, 35, 0.15)`)
        blobGrad.addColorStop(1, 'rgba(10, 10, 35, 0)')
        ctx.fillStyle = blobGrad
        ctx.beginPath()
        ctx.arc(0, 0, actualSize * 1.8, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    },
    [inkLevel]
  )

  const drawStrokeSegment = useCallback(
    (from: Point, to: Point) => {
      const inkCtx = inkLayerRef.current?.getContext('2d')
      if (!inkCtx) return

      const dx = to.x - from.x
      const dy = to.y - from.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const steps = Math.max(1, Math.ceil(dist / 2))

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = from.x + dx * t
        const y = from.y + dy * t
        const pressure = from.pressure + (to.pressure - from.pressure) * t
        const angle = Math.atan2(dy, dx)
        drawQuillBrush(inkCtx, x, y, nibSize, angle, pressure)
      }

      const inkUsed = dist * 0.02 * nibSize
      onInkConsume(inkUsed)
    },
    [drawQuillBrush, nibSize, onInkConsume]
  )

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    const movement = Math.sqrt(e.movementX * e.movementX + e.movementY * e.movementY)
    const pressure = Math.min(1, movement / 15 + 0.3)
    const angle = Math.atan2(e.movementY, e.movementX)
    return { x, y, pressure, angle }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (inkLevel <= 0 || dryingAnimatingRef.current) return
    const point = getCanvasCoords(e)
    if (!point) return
    isDrawingRef.current = true
    lastPointRef.current = point
    setCursorPos({ x: e.clientX, y: e.clientY, angle: point.angle, visible: true })

    const inkCtx = inkLayerRef.current?.getContext('2d')
    if (inkCtx) {
      drawQuillBrush(inkCtx, point.x, point.y, nibSize, point.angle, point.pressure)
      redraw()
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoords(e)
    if (!point) return
    setCursorPos({ x: e.clientX, y: e.clientY, angle: point.angle, visible: true })

    if (!isDrawingRef.current || !lastPointRef.current || inkLevel <= 0) return

    drawStrokeSegment(lastPointRef.current, point)
    lastPointRef.current = point
    redraw()
  }

  const handleMouseUp = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const handleMouseLeave = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
    setCursorPos((p) => ({ ...p, visible: false }))
  }

  useImperativeHandle(
    ref,
    () => ({
      startDryingAnimation: () => {
        if (dryingAnimatingRef.current) return
        dryingAnimatingRef.current = true

        const inkCanvas = inkLayerRef.current
        if (!inkCanvas) return
        const ctx = inkCanvas.getContext('2d')!
        const hashTable = generateHashTable()

        const originalData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        const duration = 1500
        const startTime = performance.now()

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime
          const progress = Math.min(1, elapsed / duration)
          const waveProgress = progress * Math.PI * 2
          const alphaFactor = 1 - 0.15 * Math.sin(waveProgress)

          const imageData = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT)
          const dst = imageData.data
          const src = originalData.data

          for (let i = 0; i < src.length; i += 4) {
            const px = (i / 4) % CANVAS_WIDTH
            const py = Math.floor(i / 4 / CANVAS_WIDTH)
            const noise = perlinNoise2D(px * 0.02, py * 0.02 + progress * 2, hashTable)
            const edgeFactor = Math.min(
              1,
              Math.min(px, CANVAS_WIDTH - px, py, CANVAS_HEIGHT - py) / 30
            )
            const progressFactor = progress * (1 - edgeFactor * 0.5)
            const alphaMod = alphaFactor * (1 + noise * 0.1 * (1 - progressFactor))

            dst[i] = src[i]
            dst[i + 1] = src[i + 1]
            dst[i + 2] = src[i + 2]
            dst[i + 3] = Math.min(255, src[i + 3] * alphaMod)
          }

          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
          ctx.putImageData(imageData, 0, 0)
          redraw()

          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            dryingAnimatingRef.current = false
          }
        }

        requestAnimationFrame(animate)
      },

      applyAgingEffect: () => {
        if (agedRef.current) return
        agedRef.current = true
        const effectCanvas = effectLayerRef.current
        if (!effectCanvas) return
        const ctx = effectCanvas.getContext('2d')!
        applyAgingTint(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
        generateFoldLines(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
        redraw()
      },

      exportScroll: async (): Promise<Blob | null> => {
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = EXPORT_WIDTH
        exportCanvas.height = EXPORT_HEIGHT
        const ctx = exportCanvas.getContext('2d')!

        const bgGrad = ctx.createRadialGradient(
          EXPORT_WIDTH / 2,
          EXPORT_HEIGHT / 2,
          100,
          EXPORT_WIDTH / 2,
          EXPORT_HEIGHT / 2,
          Math.max(EXPORT_WIDTH, EXPORT_HEIGHT) * 0.7
        )
        bgGrad.addColorStop(0, '#f5e6c8')
        bgGrad.addColorStop(1, '#e8d5a8')
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)

        if (paperLayerRef.current) {
          ctx.drawImage(paperLayerRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
        }

        if (inkLayerRef.current) {
          ctx.drawImage(inkLayerRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
        }

        if (effectLayerRef.current) {
          ctx.drawImage(effectLayerRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
        }

        if (!agedRef.current) {
          const noiseImageData = ctx.getImageData(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT)
          const data = noiseImageData.data
          for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * 0.03
            data[i] = Math.min(255, Math.max(0, data[i] + noise))
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
          }
          ctx.putImageData(noiseImageData, 0, 0)
        }

        return new Promise((resolve) => {
          exportCanvas.toBlob((blob) => resolve(blob), 'image/png')
        })
      },
    }),
    [drawQuillBrush, redraw]
  )

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        style={{
          position: 'absolute',
          inset: '-20px',
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          clipPath: clipPath,
          cursor: 'none',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        }}
      />
      {cursorPos.visible && (
        <div
          style={{
            position: 'fixed',
            left: cursorPos.x,
            top: cursorPos.y,
            width: '60px',
            height: '60px',
            pointerEvents: 'none',
            transform: `translate(-10px, -50px) rotate(${cursorPos.angle + Math.PI / 4}rad)`,
            transformOrigin: '10px 50px',
            zIndex: 1000,
            transition: 'transform 0.05s linear',
          }}
        >
          <svg viewBox="0 0 60 60" width="60" height="60">
            <defs>
              <linearGradient id="quillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2a2a3a" />
                <stop offset="50%" stopColor="#d4d4e0" />
                <stop offset="100%" stopColor="#8a8aa0" />
              </linearGradient>
            </defs>
            <path
              d="M5,30 L20,25 L45,20 L55,25 L50,30 L55,35 L45,40 L20,35 Z"
              fill="url(#quillGrad)"
              stroke="#1a1a2a"
              strokeWidth="0.5"
            />
            <path d="M5,30 L15,30" stroke="#1a1a2a" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M20,25 L45,20 M20,27 L45,23 M20,29 L45,27 M20,31 L45,33 M20,33 L45,37 M20,35 L45,40"
              stroke="#6a6a80"
              strokeWidth="0.5"
              fill="none"
            />
            <ellipse cx="5" cy="30" rx="3" ry="4" fill="#1a1a2a" />
          </svg>
        </div>
      )}
    </div>
  )
})

InkCanvas.displayName = 'InkCanvas'

export default InkCanvas
