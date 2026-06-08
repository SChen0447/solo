import { useEffect, useRef, useState } from 'react'
import type { AsciiMatrix } from './ImageProcessor'

interface AsciiRendererProps {
  matrix: AsciiMatrix | null
  colored?: boolean
  showGrid?: boolean
  fontSize?: number
}

const FONT_FAMILY = '"Source Code Pro", monospace'

export default function AsciiRenderer({
  matrix,
  colored = false,
  showGrid = true,
  fontSize = 14
}: AsciiRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayMatrix, setDisplayMatrix] = useState<AsciiMatrix | null>(null)
  const [opacity, setOpacity] = useState(1)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    if (!matrix) return

    setOpacity(0)
    setDisplayMatrix(matrix)

    const startTime = performance.now()
    const duration = 200

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setOpacity(eased)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [matrix])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !displayMatrix) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const charWidth = fontSize * 0.6
    const lineHeight = fontSize * 1.2

    const canvasWidth = Math.ceil(displayMatrix.width * charWidth)
    const canvasHeight = Math.ceil(displayMatrix.height * lineHeight)

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasWidth * dpr
    canvas.height = canvasHeight * dpr
    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (showGrid) {
      ctx.strokeStyle = '#2a2a4e'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= displayMatrix.width; x++) {
        ctx.beginPath()
        ctx.moveTo(x * charWidth, 0)
        ctx.lineTo(x * charWidth, canvasHeight)
        ctx.stroke()
      }
      for (let y = 0; y <= displayMatrix.height; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * lineHeight)
        ctx.lineTo(canvasWidth, y * lineHeight)
        ctx.stroke()
      }
    }

    ctx.globalAlpha = opacity
    ctx.font = `${fontSize}px ${FONT_FAMILY}`
    ctx.textBaseline = 'top'

    for (let y = 0; y < displayMatrix.height; y++) {
      const row = displayMatrix.cells[y]
      for (let x = 0; x < displayMatrix.width; x++) {
        const cell = row[x]
        if (colored && cell.color) {
          ctx.fillStyle = cell.color
        } else {
          ctx.fillStyle = '#ffffff'
        }
        ctx.fillText(cell.char, x * charWidth, y * lineHeight + 1)
      }
    }

    ctx.globalAlpha = 1
  }, [displayMatrix, colored, showGrid, fontSize, opacity])

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}
    >
      {displayMatrix ? (
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          minHeight: '300px',
          color: '#6b7280',
          fontFamily: FONT_FAMILY,
          fontSize: '14px'
        }}>
          上传图片以生成ASCII艺术
        </div>
      )}
    </div>
  )
}
