import React, { useState, useEffect, useRef, useCallback } from 'react'
import ShadowPart from './components/ShadowPart'
import DetailCard from './components/DetailCard'
import { partsData, PartData } from './data/partsData'

const TOUR_DURATION = 30000

function cubicBezier(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  const mt = 1 - t
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  }
}

function buildTourPath(w: number, h: number) {
  const cx = w / 2
  const cy = h / 2
  const rx = w * 0.38
  const ry = h * 0.32
  return [
    { x: cx - rx, y: cy - ry },
    { x: cx + rx * 0.2, y: cy - ry * 1.2 },
    { x: cx + rx, y: cy - ry },
    { x: cx + rx * 1.2, y: cy },
    { x: cx + rx, y: cy + ry },
    { x: cx - rx * 0.1, y: cy + ry * 1.1 },
    { x: cx - rx, y: cy + ry },
    { x: cx - rx * 1.15, y: cy },
  ]
}

const App: React.FC = () => {
  const [spotlight, setSpotlight] = useState({ x: -9999, y: -9999 })
  const [revealAll, setRevealAll] = useState(false)
  const [selectedPart, setSelectedPart] = useState<PartData | null>(null)
  const [cardVisible, setCardVisible] = useState(false)
  const [isTouring, setIsTouring] = useState(false)
  const [glowPos, setGlowPos] = useState({ x: -9999, y: -9999 })

  const targetSpot = useRef({ x: -9999, y: -9999 })
  const currentSpot = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef<number | null>(null)
  const tourStartRef = useRef<number>(0)
  const touringRef = useRef(false)
  const tourPathRef = useRef<Array<{ x: number; y: number }>>([])

  const smoothSpotlight = useCallback(() => {
    const ease = 0.18
    currentSpot.current.x += (targetSpot.current.x - currentSpot.current.x) * ease
    currentSpot.current.y += (targetSpot.current.y - currentSpot.current.y) * ease
    setSpotlight({ x: currentSpot.current.x, y: currentSpot.current.y })
    setGlowPos({ x: currentSpot.current.x, y: currentSpot.current.y })
    rafRef.current = requestAnimationFrame(smoothSpotlight)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(smoothSpotlight)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [smoothSpotlight])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (touringRef.current) return
    targetSpot.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touringRef.current) return
    if (e.touches.length > 0) {
      targetSpot.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handleMouseMove, handleTouchMove])

  const runTour = useCallback(() => {
    if (!touringRef.current) return
    const elapsed = performance.now() - tourStartRef.current
    const t = Math.min(elapsed / TOUR_DURATION, 1)
    const path = tourPathRef.current
    if (path.length >= 8) {
      const segments = [
        [path[0], path[1], path[2], path[3]],
        [path[3], path[4], path[5], path[6]],
        [path[6], path[7], path[0], path[1]],
      ]
      const totalSeg = segments.length
      const segT = t * totalSeg
      const segIdx = Math.min(Math.floor(segT), totalSeg - 1)
      const localT = segT - segIdx
      const seg = segments[segIdx]
      const pos = cubicBezier(localT, seg[0], seg[1], seg[2], seg[3])
      targetSpot.current = { x: pos.x, y: pos.y }
    }
    if (t >= 1) {
      touringRef.current = false
      setIsTouring(false)
      return
    }
    requestAnimationFrame(runTour)
  }, [])

  const handleRevealAll = () => {
    touringRef.current = false
    setIsTouring(false)
    setRevealAll(true)
  }

  const handleResetDark = () => {
    touringRef.current = false
    setIsTouring(false)
    setRevealAll(false)
  }

  const handleAutoTour = () => {
    if (isTouring) {
      touringRef.current = false
      setIsTouring(false)
      return
    }
    setRevealAll(false)
    touringRef.current = true
    setIsTouring(true)
    tourPathRef.current = buildTourPath(window.innerWidth, window.innerHeight)
    tourStartRef.current = performance.now()
    requestAnimationFrame(runTour)
  }

  const handlePartClick = (part: PartData) => {
    setSelectedPart(part)
    setCardVisible(true)
  }

  const handleCloseCard = () => {
    setCardVisible(false)
    setTimeout(() => setSelectedPart(null), 500)
  }

  return (
    <div className={`app-container ${revealAll ? 'reveal-all' : ''}`}>
      <div className="page-title">古 建 筑 图 鉴</div>
      <div className="page-hint">移动鼠标 · 探索隐于黑暗中的千年匠心</div>

      <div
        className="spotlight-glow"
        style={{
          left: `${glowPos.x}px`,
          top: `${glowPos.y}px`,
          opacity: revealAll ? 0 : 1,
          transition: 'opacity 1.5s ease-out',
        }}
      />

      <div className="parts-grid">
        {partsData.map((part) => (
          <ShadowPart
            key={part.id}
            part={part}
            spotlightX={spotlight.x}
            spotlightY={spotlight.y}
            revealAll={revealAll}
            onPartClick={handlePartClick}
          />
        ))}
      </div>

      <div className="control-panel">
        <button
          className={`control-btn ${revealAll ? 'active' : ''}`}
          onClick={handleRevealAll}
        >
          全部显示
        </button>
        <button
          className={`control-btn ${!revealAll && !isTouring ? 'active' : ''}`}
          onClick={handleResetDark}
        >
          重置黑暗
        </button>
        <button
          className={`control-btn ${isTouring ? 'active' : ''}`}
          onClick={handleAutoTour}
        >
          {isTouring ? '停止巡游' : '自动巡游'}
        </button>
      </div>

      <DetailCard
        part={selectedPart}
        visible={cardVisible}
        onClose={handleCloseCard}
      />
    </div>
  )
}

export default App
