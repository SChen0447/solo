import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { store } from '../store'

const CANVAS_W = 300
const CANVAS_H = 400

export default function InkingPanel() {
  const snap = useSnapshot(store)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const coverageCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isGrinding, setIsGrinding] = useState(false)
  const [isBrushing, setIsBrushing] = useState(false)
  const [brushActive, setBrushActive] = useState(false)
  const lastAngleRef = useRef<number | null>(null)
  const totalRotationRef = useRef(0)
  const lastGrindTimeRef = useRef(0)
  const coverageRef = useRef<number[][] | null>(null)

  useEffect(() => {
    redrawEngraving()
    if (!coverageRef.current) {
      coverageRef.current = Array.from({ length: CANVAS_H }, () => new Array(CANVAS_W).fill(0))
    }
    drawCoverage()
  }, [])

  function redrawEngraving() {
    const canvas = canvasRef.current
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

  function drawCoverage() {
    const canvas = coverageCanvasRef.current
    if (!canvas || !coverageRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    const cov = coverageRef.current
    const inkAlpha = Math.min(1, snap.inkConcentration / 100)

    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        const c = cov[y][x]
        if (c > 0) {
          ctx.fillStyle = `rgba(26, 26, 26, ${c * inkAlpha * 0.7})`
          ctx.fillRect(x, y, 1, 1)
        }
      }
    }
  }

  function getAngle(e: React.MouseEvent, rect: DOMRect): number {
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(e.clientY - cy, e.clientX - cx)
  }

  function handleGrindStart(e: React.MouseEvent) {
    setIsGrinding(true)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    lastAngleRef.current = getAngle(e, rect)
    lastGrindTimeRef.current = Date.now()
  }

  function handleGrindMove(e: React.MouseEvent) {
    if (!isGrinding) return
    const target = e.currentTarget as HTMLElement
    if (target.dataset.role !== 'inkstone') {
      const stoneEl = document.querySelector('[data-role="inkstone"]') as HTMLElement | null
      if (!stoneEl) return
      const rect = stoneEl.getBoundingClientRect()
    } else {
      const rect = target.getBoundingClientRect()
    }

    const stoneEl = document.querySelector('[data-role="inkstone"]') as HTMLElement | null
    if (!stoneEl) return
    const rect = stoneEl.getBoundingClientRect()
    const angle = getAngle(e, rect)

    if (lastAngleRef.current !== null) {
      let delta = angle - lastAngleRef.current
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      totalRotationRef.current += Math.abs(delta)

      const now = Date.now()
      const dt = (now - lastGrindTimeRef.current) / 1000
      if (dt > 0) {
        const rps = Math.abs(delta) / (2 * Math.PI) / dt
        const increase = Math.min(2, rps * dt * 15)
        store.inkConcentration = Math.min(100, snap.inkConcentration + increase)
      }
      lastGrindTimeRef.current = now
    }
    lastAngleRef.current = angle
  }

  function handleGrindEnd() {
    setIsGrinding(false)
    lastAngleRef.current = null
  }

  function handleBrushPick() {
    if (snap.inkConcentration < 40) {
      alert('墨汁浓度不足，请先研墨！')
      return
    }
    setBrushActive(true)
  }

  function getBlockPos(e: React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_H
    }
  }

  function handleBlockMouseDown(e: React.MouseEvent) {
    if (!brushActive) return
    setIsBrushing(true)
    applyInk(e)
  }

  function handleBlockMouseMove(e: React.MouseEvent) {
    if (!isBrushing || !brushActive) return
    applyInk(e)
  }

  function handleBlockMouseUp() {
    setIsBrushing(false)
  }

  function applyInk(e: React.MouseEvent) {
    if (!coverageRef.current) return
    const pos = getBlockPos(e)
    const brushRadius = 15

    let changed = false
    for (let dy = -brushRadius; dy <= brushRadius; dy++) {
      for (let dx = -brushRadius; dx <= brushRadius; dx++) {
        const nx = Math.round(pos.x) + dx
        const ny = Math.round(pos.y) + dy
        if (nx >= 0 && nx < CANVAS_W && ny >= 0 && ny < CANVAS_H) {
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= brushRadius) {
            const add = (1 - dist / brushRadius) * 0.15
            const prev = coverageRef.current[ny][nx]
            const newVal = Math.min(1, prev + add)
            if (newVal !== prev) {
              coverageRef.current[ny][nx] = newVal
              changed = true
            }
          }
        }
      }
    }

    if (changed) {
      store.inkingCoverage = coverageRef.current.map(row => [...row])
      drawCoverage()
    }
  }

  function getCoveragePercent(): number {
    if (!coverageRef.current || !snap.engravingDepth) return 0
    let totalEngraved = 0
    let covered = 0
    for (let y = 0; y < CANVAS_H; y++) {
      for (let x = 0; x < CANVAS_W; x++) {
        if (snap.engravingDepth[y][x] > 0) {
          totalEngraved++
          if (coverageRef.current[y][x] > 0.3) covered++
        }
      }
    }
    return totalEngraved > 0 ? Math.round((covered / totalEngraved) * 100) : 0
  }

  function handleResetInking() {
    if (coverageRef.current) {
      coverageRef.current = Array.from({ length: CANVAS_H }, () => new Array(CANVAS_W).fill(0))
      store.inkingCoverage = null
      drawCoverage()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p className="hint-text letterpress-text">研墨区</p>
          <div
            className="inkstone"
            data-role="inkstone"
            onMouseDown={handleGrindStart}
            onMouseMove={handleGrindMove}
            onMouseUp={handleGrindEnd}
            onMouseLeave={handleGrindEnd}
          >
            <div className="ink-surface" style={{
              background: `radial-gradient(circle,
                hsl(0, 0%, ${Math.max(5, 30 - snap.inkConcentration * 0.25)}%) 0%,
                hsl(0, 0%, ${Math.max(2, 15 - snap.inkConcentration * 0.13)}%) 100%)`
            }} />
          </div>
          <div className="concentration-display letterpress-text">
            浓度 {Math.round(snap.inkConcentration)}%
          </div>
          <p className="hint-text letterpress-text" style={{ fontSize: '12px' }}>
            按住并绕圈移动研墨
          </p>

          <div style={{ marginTop: '20px' }}>
            <div
              className={`ink-brush ${brushActive ? 'draggable' : ''}`}
              onClick={handleBrushPick}
              style={{ cursor: brushActive ? 'grabbing' : 'pointer', opacity: brushActive ? 1 : 0.8 }}
            />
            <p className="hint-text letterpress-text" style={{ fontSize: '12px' }}>
              {brushActive ? '墨刷已取，在雕版上涂刷' : '点击取墨刷'}
            </p>
            {brushActive && (
              <div className="tools-row">
                <button className="seal-btn" onClick={() => setBrushActive(false)}>
                  放回墨刷
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p className="hint-text letterpress-text">上墨区</p>
          <div className="canvas-container">
            <div className="woodblock">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{ position: 'absolute', top: 0, left: 0 }}
              />
              <canvas
                ref={coverageCanvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: brushActive ? 'auto' : 'none',
                  cursor: brushActive ? 'crosshair' : 'default'
                }}
                onMouseDown={handleBlockMouseDown}
                onMouseMove={handleBlockMouseMove}
                onMouseUp={handleBlockMouseUp}
                onMouseLeave={handleBlockMouseUp}
              />
            </div>
          </div>
          <div className="coverage-display letterpress-text">
            上墨覆盖率：{getCoveragePercent()}%
          </div>
          <div className="tools-row">
            <button className="seal-btn" onClick={handleResetInking}>
              清除上墨
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
