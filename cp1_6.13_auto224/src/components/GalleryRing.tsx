import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import type { Painting, StampCounts } from '../App'
import StampPanel from './StampPanel'

interface GalleryRingProps {
  paintings: Painting[]
  selectedPainting: Painting | null
  onSelectPainting: (painting: Painting) => void
  onCloseDetail: () => void
  onUpdateStamps: (paintingId: string, counts: StampCounts) => void
}

const GalleryRing: React.FC<GalleryRingProps> = ({
  paintings,
  selectedPainting,
  onSelectPainting,
  onCloseDetail,
  onUpdateStamps
}) => {
  const ringRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const haloAnimationRef = useRef<number | null>(null)

  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  })

  const dragState = useRef({
    startX: 0,
    startY: 0,
    startRotation: 0,
    currentX: 0,
    currentY: 0,
    moved: false
  })

  const velocity = useRef(0)
  const lastAngle = useRef(0)
  const lastTime = useRef(0)
  const targetRotation = useRef(0)
  const easeProgress = useRef(0)
  const easingStartRotation = useRef(0)

  const responsiveConfig = useMemo(() => {
    const isMobile = viewportSize.width < 768
    const thumbW = isMobile ? 100 : 120
    const thumbH = isMobile ? 66 : 80
    const ringDiameterPercent = isMobile ? 0.85 : 0.65
    const minDiameter = 600
    const ringDiameter = Math.max(
      Math.min(viewportSize.width, viewportSize.height) * ringDiameterPercent,
      minDiameter
    )
    const radius = ringDiameter / 2

    return {
      isMobile,
      thumbW,
      thumbH,
      ringDiameter,
      radius,
      angleStep: 360 / Math.max(paintings.length, 1)
    }
  }, [viewportSize, paintings.length])

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getAngleFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!ringRef.current) return 0
    const rect = ringRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    return Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI)
  }, [])

  const animateEasing = useCallback(() => {
    if (easeProgress.current >= 1) {
      animationFrameRef.current = null
      return
    }

    easeProgress.current += (1 / 60) * (1 / 0.5)
    const t = Math.min(easeProgress.current, 1)
    const eased = 1 - Math.pow(1 - t, 3)

    const currentRot = easingStartRotation.current +
      (targetRotation.current - easingStartRotation.current) * eased

    setRotation(currentRot)
    animationFrameRef.current = requestAnimationFrame(animateEasing)
  }, [])

  const animateMomentum = useCallback(() => {
    if (Math.abs(velocity.current) < 0.01) {
      animationFrameRef.current = null
      return
    }

    setRotation(prev => {
      const next = prev + velocity.current
      velocity.current *= 0.95
      return next
    })

    animationFrameRef.current = requestAnimationFrame(animateMomentum)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (selectedPainting) return

    const target = e.target as HTMLElement
    if (target.closest('.painting-thumbnail')) return

    setIsDragging(true)
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRotation: rotation,
      currentX: e.clientX,
      currentY: e.clientY,
      moved: false
    }
    lastAngle.current = getAngleFromEvent(e.clientX, e.clientY)
    lastTime.current = performance.now()
    velocity.current = 0
    easeProgress.current = 1

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [rotation, selectedPainting, getAngleFromEvent])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return

    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.current.moved = true
    }

    const currentAngle = getAngleFromEvent(e.clientX, e.clientY)
    const now = performance.now()
    const dt = Math.max(now - lastTime.current, 1)

    let deltaAngle = currentAngle - lastAngle.current
    if (deltaAngle > 180) deltaAngle -= 360
    if (deltaAngle < -180) deltaAngle += 360

    velocity.current = deltaAngle / dt * 16

    setRotation(prev => prev + deltaAngle)

    lastAngle.current = currentAngle
    lastTime.current = now
    dragState.current.currentX = e.clientX
    dragState.current.currentY = e.clientY
  }, [isDragging, getAngleFromEvent])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch (_) {
      // ignore
    }

    if (Math.abs(velocity.current) > 0.1) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      animationFrameRef.current = requestAnimationFrame(animateMomentum)
    }
  }, [isDragging, animateMomentum])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (haloAnimationRef.current) {
        cancelAnimationFrame(haloAnimationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedPainting || !canvasRef.current) {
      if (haloAnimationRef.current) {
        cancelAnimationFrame(haloAnimationRef.current)
        haloAnimationRef.current = null
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const haloSize = 400
    canvas.width = haloSize
    canvas.height = haloSize

    const layers = 4 + Math.floor(Math.random() * 2)
    const layerConfigs = Array.from({ length: layers }, (_, i) => ({
      offsetX: (Math.random() - 0.5) * 60,
      offsetY: (Math.random() - 0.5) * 60,
      baseRadius: 120 + Math.random() * 60,
      baseOpacity: 0.3 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.4
    }))

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 102, g: 126, b: 234 }
    }

    const colors = [
      hexToRgb(selectedPainting.dominantColor),
      hexToRgb(selectedPainting.secondaryColor),
      hexToRgb(selectedPainting.accentColor)
    ]

    const startTime = performance.now()

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000
      ctx.clearRect(0, 0, haloSize, haloSize)

      const cx = haloSize / 2
      const cy = haloSize / 2

      for (let i = 0; i < layerConfigs.length; i++) {
        const config = layerConfigs[i]
        const color = colors[i % colors.length]
        const t = (elapsed * config.speed + config.phase) % (2 * Math.PI)
        const pulse = 1 + Math.sin(t) * 0.15
        const radius = config.baseRadius * pulse
        const opacity = config.baseOpacity * (0.8 + Math.sin(t) * 0.2)

        const lx = cx + config.offsetX * (1 + Math.sin(t * 0.7) * 0.3)
        const ly = cy + config.offsetY * (1 + Math.cos(t * 0.5) * 0.3)

        const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius)
        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`)
        gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.4})`)
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(lx, ly, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      haloAnimationRef.current = requestAnimationFrame(render)
    }

    haloAnimationRef.current = requestAnimationFrame(render)

    return () => {
      if (haloAnimationRef.current) {
        cancelAnimationFrame(haloAnimationRef.current)
        haloAnimationRef.current = null
      }
    }
  }, [selectedPainting])

  const handleThumbnailClick = useCallback((painting: Painting, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragState.current.moved) {
      dragState.current.moved = false
      return
    }
    onSelectPainting(painting)
  }, [onSelectPainting])

  const handleDetailImageClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCloseDetail()
  }, [onCloseDetail])

  const { thumbW, thumbH, ringDiameter, radius, angleStep } = responsiveConfig

  return (
    <>
      <div
        ref={ringRef}
        className="gallery-ring"
        style={{
          width: `${ringDiameter}px`,
          height: `${ringDiameter}px`,
          transform: `rotate(${rotation}deg)`
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {paintings.map((painting, index) => {
          const angleDeg = index * angleStep - 90
          const angleRad = (angleDeg * Math.PI) / 180
          const x = Math.cos(angleRad) * radius - thumbW / 2
          const y = Math.sin(angleRad) * radius - thumbH / 2
          const isDimmed = selectedPainting !== null && selectedPainting.id !== painting.id

          return (
            <div
              key={painting.id}
              className={`painting-item${isDimmed ? ' dimmed' : ''}`}
              style={{
                transform: `translate(${x}px, ${y}px) rotate(${-rotation}deg)`
              }}
            >
              <div
                className="painting-thumbnail"
                style={{
                  width: `${thumbW}px`,
                  height: `${thumbH}px`
                }}
                onClick={(e) => handleThumbnailClick(painting, e)}
              >
                <img src={painting.thumbnail} alt={painting.title} draggable={false} />
              </div>
            </div>
          )
        })}
      </div>

      {selectedPainting && (
        <div className="detail-overlay">
          <canvas
            ref={canvasRef}
            className="halo-canvas"
            style={{
              width: `${responsiveConfig.isMobile ? 320 : 400}px`,
              height: `${responsiveConfig.isMobile ? 320 : 400}px`
            }}
          />
          <div className="detail-content">
            <div
              className="detail-image-wrapper"
              style={{
                animation: 'imageZoomIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              }}
            >
              <img
                src={selectedPainting.thumbnail}
                alt={selectedPainting.title}
                className="detail-image"
                style={{
                  width: `${responsiveConfig.isMobile ? 240 : 300}px`,
                  height: `${responsiveConfig.isMobile ? 160 : 200}px`
                }}
                onClick={handleDetailImageClick}
                draggable={false}
              />
              <div className="close-hint">点击图片关闭 · Click to close</div>
            </div>
            <div className="detail-info">
              <h2 className="detail-title">{selectedPainting.title}</h2>
              <p className="detail-artist">作者 · {selectedPainting.artist}</p>
              <p className="detail-description">{selectedPainting.description}</p>
            </div>
            <StampPanel
              paintingId={selectedPainting.id}
              stamps={selectedPainting.stamps}
              onUpdateStamps={onUpdateStamps}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes imageZoomIn {
          0% {
            transform: scale(1);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}

export default GalleryRing
