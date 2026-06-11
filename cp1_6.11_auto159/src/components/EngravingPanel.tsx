import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { store, DrawingPath, PathPoint } from '../store'
import { StrokeSettingsContext } from '../App'

const CANVAS_W = 300
const CANVAS_H = 400

export default function EngravingPanel() {
  const snap = useSnapshot(store)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heatmapRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const currentPathRef = useRef<PathPoint[]>([])

  useEffect(() => {
    redrawCanvas()
  }, [snap.drawingPaths])

  useEffect(() => {
    if (snap.engravingDepth && showHeatmap) {
      drawHeatmap()
    }
  }, [snap.engravingDepth, showHeatmap])

  function redrawCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    if (snap.engravingDepth) {
      drawEngraved(ctx, snap.engravingDepth)
    } else {
      snap.drawingPaths.forEach(path => {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-CANVAS_W, 0)
        ctx.beginPath()
        ctx.strokeStyle = path.color
        ctx.lineWidth = path.strokeWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        path.points.forEach((p, i) => {
          const px = CANVAS_W - p.x
          const py = p.y
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.restore()
      })
    }
  }

  function drawEngraved(ctx: CanvasRenderingContext2D, depth: number[][]) {
    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const d = depth[y][x]
        if (d > 0) {
          const base = 196 - d * 100
          const g = Math.max(80, Math.round(base))
          ctx.fillStyle = `rgb(${Math.round(g * 0.75)}, ${Math.round(g * 0.55)}, ${Math.round(g * 0.35)})`
          ctx.fillRect(x, y, 1, 1)

          if (d > 0.3) {
            ctx.fillStyle = `rgba(0,0,0,${d * 0.3})`
            ctx.fillRect(x + 1, y + 1, 1, 1)
          }
          if (d > 0.1) {
            ctx.fillStyle = `rgba(255,240,200,${d * 0.15})`
            if (x > 0) ctx.fillRect(x - 1, y - 1, 1, 1)
          }
        }
      }
    }
  }

  function drawHeatmap() {
    const canvas = heatmapRef.current
    if (!canvas || !snap.engravingDepth) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const depth = snap.engravingDepth

    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const d = depth[y][x]
        if (d > 0) {
          const r = Math.round(212 - d * 282)
          const g = Math.round(167 - d * 222)
          const b = Math.round(106 - d * 133)
          ctx.fillStyle = `rgba(${Math.max(62, r)}, ${Math.max(39, g)}, ${Math.max(35, b)}, 0.85)`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  function getPos(e: React.MouseEvent): PathPoint {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (snap.engravingDepth) return
    setIsDrawing(true)
    const p = getPos(e)
    currentPathRef.current = [p]
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing || snap.engravingDepth) return
    const p = getPos(e)
    currentPathRef.current.push(p)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pts = currentPathRef.current
    if (pts.length >= 2) {
      const prev = pts[pts.length - 2]
      const curr = pts[pts.length - 1]
      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-CANVAS_W, 0)
      ctx.beginPath()
      ctx.strokeStyle = StrokeSettingsContext.color
      ctx.lineWidth = StrokeSettingsContext.strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(CANVAS_W - prev.x, prev.y)
      ctx.lineTo(CANVAS_W - curr.x, curr.y)
      ctx.stroke()
      ctx.restore()
    }
  }

  function handleMouseUp() {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPathRef.current.length > 1) {
      const newPath: DrawingPath = {
        points: [...currentPathRef.current],
        strokeWidth: StrokeSettingsContext.strokeWidth,
        color: StrokeSettingsContext.color
      }
      store.drawingPaths = [...snap.drawingPaths, newPath]
    }
    currentPathRef.current = []
  }

  function handleEngrave() {
    if (snap.drawingPaths.length === 0) return
    const depth = computeDepthMap(snap.drawingPaths as DrawingPath[])
    store.engravingDepth = depth
    setShowHeatmap(true)
  }

  function handleReset() {
    store.engravingDepth = null
    setShowHeatmap(false)
  }

  function computeDepthMap(paths: DrawingPath[]): number[][] {
    const depth: number[][] = Array.from({ length: CANVAS_H }, () =>
      new Array(CANVAS_W).fill(0)
    )

    const offscreen = document.createElement('canvas')
    offscreen.width = CANVAS_W
    offscreen.height = CANVAS_H
    const octx = offscreen.getContext('2d')!

    paths.forEach(path => {
      octx.beginPath()
      octx.strokeStyle = '#ffffff'
      octx.lineWidth = path.strokeWidth
      octx.lineCap = 'round'
      octx.lineJoin = 'round'
      path.points.forEach((p, i) => {
        if (i === 0) octx.moveTo(p.x, p.y)
        else octx.lineTo(p.x, p.y)
      })
      octx.stroke()
    })

    const imgData = octx.getImageData(0, 0, CANVAS_W, CANVAS_H)
    const data = imgData.data

    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const idx = (y * CANVAS_W + x) * 4
        if (data[idx] > 128) {
          depth[y][x] = Math.min(1, data[idx] / 255 + 0.2)

          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < CANVAS_W && ny >= 0 && ny < CANVAS_H) {
                const dist = Math.sqrt(dx * dx + dy * dy)
                const falloff = Math.max(0, 1 - dist / 3) * 0.5
                depth[ny][nx] = Math.min(1, depth[ny][nx] + falloff)
              }
            }
          }
        }
      }
    }

    return depth
  }

  return (
    <div>
      <p className="hint-text letterpress-text" style={{ marginBottom: '16px', textAlign: 'center' }}>
        在梨木雕版上绘制图案（自动反写）
      </p>
      <div className="canvas-container">
        <div className="woodblock">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="engraving-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          {showHeatmap && snap.engravingDepth && (
            <canvas
              ref={heatmapRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="heatmap-overlay"
            />
          )}
        </div>
      </div>
      <div className="tools-row" style={{ marginTop: '20px' }}>
        {!snap.engravingDepth ? (
          <button className="seal-btn" onClick={handleEngrave}>
            刻版
          </button>
        ) : (
          <>
            <button className="seal-btn" onClick={() => setShowHeatmap(!showHeatmap)}>
              {showHeatmap ? '隐藏热力图' : '显示热力图'}
            </button>
            <button className="seal-btn" onClick={handleReset}>
              重新绘稿
            </button>
          </>
        )}
      </div>
    </div>
  )
}
