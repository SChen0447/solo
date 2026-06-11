import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { store } from '../store'

const CANVAS_W = 300
const CANVAS_H = 400
const PAPER_W = 320
const PAPER_H = 420

export default function PrintingPanel() {
  const snap = useSnapshot(store)
  const blockCanvasRef = useRef<HTMLCanvasElement>(null)
  const inkCanvasRef = useRef<HTMLCanvasElement>(null)
  const paperCanvasRef = useRef<HTMLCanvasElement>(null)
  const [paperPos, setPaperPos] = useState({ x: -380, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [paperOnBlock, setPaperOnBlock] = useState(false)
  const [isPressing, setIsPressing] = useState(false)
  const [pressProgress, setPressProgress] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    drawBlock()
    drawInk()
  }, [])

  function drawBlock() {
    const canvas = blockCanvasRef.current
    if (!canvas || !snap.engravingDepth) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const depth = snap.engravingDepth

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
        }
      }
    }
  }

  function drawInk() {
    const canvas = inkCanvasRef.current
    if (!canvas || !snap.inkingCoverage) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const cov = snap.inkingCoverage
    const inkAlpha = Math.min(1, snap.inkConcentration / 100)

    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const c = cov[y][x]
        if (c > 0) {
          ctx.fillStyle = `rgba(26, 26, 26, ${c * inkAlpha * 0.85})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  function handlePaperMouseDown(e: React.MouseEvent) {
    if (isPressing || snap.printImage) return
    setIsDragging(true)
    const paperEl = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - paperEl.left,
      y: e.clientY - paperEl.top
    })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    const container = document.querySelector('.workspace') as HTMLElement
    if (!container) return
    const rect = container.getBoundingClientRect()

    const newX = e.clientX - rect.left - dragOffset.x
    const newY = e.clientY - rect.top - dragOffset.y

    setPaperPos({ x: newX, y: newY })

    const blockCenterX = PAPER_W / 2 - 10
    const blockCenterY = PAPER_H / 2 - 10
    const dist = Math.sqrt(
      Math.pow(newX + PAPER_W / 2 - blockCenterX, 2) +
      Math.pow(newY + PAPER_H / 2 - blockCenterY, 2)
    )
    setPaperOnBlock(dist < 60)
  }

  function handleMouseUp() {
    setIsDragging(false)
  }

  function alignPaper() {
    setPaperPos({ x: -10, y: -10 })
    setPaperOnBlock(true)
  }

  function handlePress() {
    if (!paperOnBlock || isPressing || snap.printImage) return
    setIsPressing(true)
    setPressProgress(0)

    const startTime = performance.now()
    const duration = 2000

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      setPressProgress(progress)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        doPrint()
        setIsPressing(false)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }

  function doPrint() {
    const offscreen = document.createElement('canvas')
    offscreen.width = PAPER_W
    offscreen.height = PAPER_H
    const ctx = offscreen.getContext('2d')!

    ctx.fillStyle = '#faf3e0'
    ctx.fillRect(0, 0, PAPER_W, PAPER_H)

    if (snap.engravingDepth && snap.inkingCoverage) {
      const offsetX = 10
      const offsetY = 10
      const inkAlpha = Math.min(1, snap.inkConcentration / 100)

      for (let y = 0; y < CANVAS_H; y++) {
        for (let x = 0; x < CANVAS_W; x++) {
          const d = snap.engravingDepth[y][x]
          if (d > 0) {
            const coverage = snap.inkingCoverage[y][x]
            if (coverage > 0) {
              const intensity = d * coverage * inkAlpha
              const alpha = Math.min(0.95, intensity * 1.2)
              const gray = Math.max(10, Math.round(60 - intensity * 50))
              ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`

              const px = offsetX + (CANVAS_W - 1 - x)
              const py = offsetY + y
              ctx.fillRect(px, py, 1, 1)

              if (d > 0.5) {
                ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha * 0.3})`
                for (let dy = -1; dy <= 1; dy++) {
                  for (let dx = -1; dx <= 1; dx++) {
                    if (dx !== 0 || dy !== 0) {
                      const npx = px + dx
                      const npy = py + dy
                      if (npx >= 0 && npx < PAPER_W && npy >= 0 && npy < PAPER_H) {
                        ctx.fillRect(npx, npy, 1, 1)
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const base64 = offscreen.toDataURL('image/png')
    store.printImage = base64
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const paperStyle: React.CSSProperties = {
    position: 'absolute',
    left: paperPos.x,
    top: paperPos.y,
    transition: isDragging ? 'none' : 'left 0.3s ease, top 0.3s ease',
    opacity: snap.printImage ? 1 : 0.85 + pressProgress * 0.1,
    transform: `scale(${1 + pressProgress * 0.02})`,
    zIndex: snap.printImage ? 10 : 5,
    cursor: isDragging ? 'grabbing' : 'grab'
  }

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ position: 'relative', width: PAPER_W + 60, height: PAPER_H + 120 }}>
        <div style={{ position: 'absolute', left: 40, top: 60 }}>
          <p className="hint-text letterpress-text" style={{ textAlign: 'center', marginBottom: '8px' }}>
            雕版（上墨后）
          </p>
          <div className="woodblock">
            <canvas
              ref={blockCanvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <canvas
              ref={inkCanvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />
          </div>
        </div>

        {!snap.printImage && (
          <div
            style={paperStyle}
            className="rice-paper draggable"
            onMouseDown={handlePaperMouseDown}
          >
            <canvas
              ref={paperCanvasRef}
              width={PAPER_W}
              height={PAPER_H}
              style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
            />
          </div>
        )}

        {snap.printImage && (
          <div style={{ ...paperStyle, left: -10, top: -10, position: 'absolute' }}>
            <div className="rice-paper">
              <img
                src={snap.printImage}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                alt="拓印结果"
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center' }}>
        {!snap.printImage && (
          <>
            <div className="tools-row">
              <button className="seal-btn" onClick={alignPaper} disabled={isPressing}>
                对齐宣纸
              </button>
              <button
                className={`seal-btn ${paperOnBlock ? '' : ''}`}
                onClick={handlePress}
                disabled={!paperOnBlock || isPressing}
                style={{ opacity: paperOnBlock ? 1 : 0.6 }}
              >
                {isPressing ? `拓印中 ${Math.round(pressProgress * 100)}%` : '按压拓印'}
              </button>
            </div>
            <p className="hint-text letterpress-text">
              {!paperOnBlock
                ? '将宣纸拖拽到雕版上方'
                : isPressing
                ? '正在进行拓印...'
                : '位置已对齐，点击"按压拓印"'}
            </p>
          </>
        )}
        {snap.printImage && (
          <p className="hint-text letterpress-text" style={{ color: '#c0392b' }}>
            拓印完成！可进入下一步进行装帧与老化。
          </p>
        )}
      </div>
    </div>
  )
}
