import React, { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { createPotteryScene, PotteryScene } from './scene'
import {
  ProfilePoint,
  GlazeLayer,
  GLAZE_TYPES,
  generateCrackPattern,
  mixGlazeColors,
} from './utils'

interface SavedPottery {
  id: string
  thumbnail: string
  profile: ProfilePoint[]
  glazeLayers: GlazeLayer[]
  timestamp: number
  rpm: number
}

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<PotteryScene | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; heightIndex: number } | null>(null)
  const isDraggingPotteryRef = useRef(false)
  const isDraggingSpeedRef = useRef(false)
  const draggedGlazeRef = useRef<string | null>(null)

  const [rpm, setRpm] = useState(60)
  const [pressure, setPressure] = useState(30)
  const [glazeLayers, setGlazeLayers] = useState<GlazeLayer[]>([])
  const [isFiring, setIsFiring] = useState(false)
  const [isFired, setIsFired] = useState(false)
  const [fireProgress, setFireProgress] = useState(0)
  const [temperature, setTemperature] = useState(25)
  const [showCracks, setShowCracks] = useState(false)
  const [crackPattern, setCrackPattern] = useState('')
  const [gallery, setGallery] = useState<SavedPottery[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || window.innerHeight > window.innerWidth)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!canvasContainerRef.current) return
    const scene = createPotteryScene(canvasContainerRef.current)
    sceneRef.current = scene
    scene.updatePressure(pressure)

    const handleResize = () => scene.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateRPM(rpm)
    }
  }, [rpm])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updatePressure(pressure)
    }
  }, [pressure])

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.updateGlaze(glazeLayers, !isFired)
    }
  }, [glazeLayers, isFired])

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isFiring) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    if (sceneRef.current) {
      const result = sceneRef.current.raycast(clientX, clientY)
      if (result.hit) {
        isDraggingPotteryRef.current = true
        dragStartRef.current = { x: clientX, y: clientY, heightIndex: result.heightIndex }
        gsap.to(sceneRef.current.potteryGroup.scale, {
          x: 1.02,
          y: 1.02,
          z: 1.02,
          duration: 0.2,
          ease: 'power2.out',
        })
      } else {
        isDraggingSpeedRef.current = true
        dragStartRef.current = { x: clientX, y: clientY, heightIndex: -1 }
      }
    }
  }, [isFiring])

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStartRef.current) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStartRef.current.x
    const deltaY = clientY - dragStartRef.current.y

    if (isDraggingPotteryRef.current && sceneRef.current && dragStartRef.current.heightIndex >= 0) {
      const direction = deltaY < 0 ? 'up' : 'down'
      sceneRef.current.updateShape(dragStartRef.current.heightIndex, direction)
      dragStartRef.current = { x: clientX, y: clientY, heightIndex: dragStartRef.current.heightIndex }
    } else if (isDraggingSpeedRef.current) {
      const newRpm = Math.max(0, Math.min(300, rpm + deltaX * 0.5))
      setRpm(newRpm)
      const newPressure = Math.max(0, Math.min(100, pressure - deltaY * 0.3))
      setPressure(newPressure)
      dragStartRef.current = { x: clientX, y: clientY, heightIndex: -1 }
    }
  }, [rpm, pressure])

  const handleMouseUp = useCallback(() => {
    if (sceneRef.current && isDraggingPotteryRef.current) {
      gsap.to(sceneRef.current.potteryGroup.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.2,
        ease: 'elastic.out(1, 0.3)',
      })
    }
    dragStartRef.current = null
    isDraggingPotteryRef.current = false
    isDraggingSpeedRef.current = false
  }, [])

  const handleGlazeDragStart = (glazeType: string) => {
    draggedGlazeRef.current = glazeType
  }

  const handleGlazeDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleGlazeDrop = () => {
    if (!draggedGlazeRef.current || isFired) return
    if (glazeLayers.length >= 3) return

    const glaze = GLAZE_TYPES[draggedGlazeRef.current]
    const newLayer: GlazeLayer = {
      type: draggedGlazeRef.current,
      ratio: 100 / (glazeLayers.length + 1),
      color: glaze.color,
    }

    const newLayers = [...glazeLayers.map(l => ({ ...l, ratio: 100 / (glazeLayers.length + 1) })), newLayer]
    setGlazeLayers(newLayers)
    draggedGlazeRef.current = null
  }

  const handleRatioChange = (index: number, newRatio: number) => {
    const newLayers = [...glazeLayers]
    newLayers[index] = { ...newLayers[index], ratio: newRatio }
    setGlazeLayers(newLayers)
  }

  const handleRemoveLayer = (index: number) => {
    const newLayers = glazeLayers.filter((_, i) => i !== index)
    if (newLayers.length > 0) {
      const ratio = 100 / newLayers.length
      newLayers.forEach(l => l.ratio = ratio)
    }
    setGlazeLayers(newLayers)
  }

  const handleFire = () => {
    if (isFiring || isFired) return
    if (glazeLayers.length === 0) return

    setIsFiring(true)
    setFireProgress(0)
    setTemperature(25)

    const newParticles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      y: 20 + Math.random() * 60,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)

    if (sceneRef.current) {
      sceneRef.current.firePottery(
        (temp) => {
          setTemperature(temp)
          setFireProgress((temp - 25) / 1275)
        },
        () => {
          setIsFiring(false)
          setIsFired(true)
          setShowCracks(true)
          setCrackPattern(generateCrackPattern(0.05 + Math.random() * 0.1))
          setParticles([])
          if (sceneRef.current) {
            sceneRef.current.updateGlaze(glazeLayers, false)
          }
        }
      )
    }
  }

  const handleReset = () => {
    if (sceneRef.current) {
      sceneRef.current.reset()
    }
    setRpm(60)
    setPressure(30)
    setGlazeLayers([])
    setIsFired(false)
    setIsFiring(false)
    setShowCracks(false)
    setFireProgress(0)
    setTemperature(25)
    setParticles([])
  }

  const handleSave = () => {
    if (!sceneRef.current || !canvasContainerRef.current) return

    const canvas = sceneRef.current.getCanvas()
    const thumbnail = canvas.toDataURL('image/png', 0.8)

    const saved: SavedPottery = {
      id: Date.now().toString(),
      thumbnail,
      profile: [...sceneRef.current.profile.map(p => ({ ...p }))],
      glazeLayers: [...glazeLayers.map(l => ({ ...l }))],
      timestamp: Date.now(),
      rpm,
    }

    setGallery(prev => [...prev, saved])
  }

  const handleLoad = (item: SavedPottery) => {
    if (!sceneRef.current) return
    handleReset()

    setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.profile.forEach((p, i) => {
          if (item.profile[i]) {
            p.y = item.profile[i].y
            p.radius = item.profile[i].radius
          }
        })
        sceneRef.current.updateShape(0, 'up')
        sceneRef.current.updateShape(0, 'down')
        setGlazeLayers(item.glazeLayers)
        setRpm(item.rpm)
      }
    }, 50)
  }

  const handleButtonPress = (e: React.MouseEvent, callback: () => void) => {
    const target = e.currentTarget as HTMLElement
    gsap.to(target, {
      scale: 0.95,
      duration: 0.1,
      ease: 'power2.in',
      onComplete: () => {
        callback()
        gsap.to(target, {
          scale: 1,
          duration: 0.15,
          ease: 'power2.out',
        })
      },
    })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const finalColor = mixGlazeColors(glazeLayers)

  return (
    <div className={`app-container ${isMobile ? 'mobile' : ''}`}>
      {isFiring && (
        <div className="fire-overlay">
          {particles.map(p => (
            <div
              key={p.id}
              className="fire-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="toolbar">
        <button
          className="toolbar-btn"
          onClick={(e) => handleButtonPress(e, handleReset)}
          title="重置"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={(e) => handleButtonPress(e, handleSave)}
          title="保存"
          disabled={isFiring}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
        </button>
        <button
          className="toolbar-btn fire-btn"
          onClick={(e) => handleButtonPress(e, handleFire)}
          title="烧制"
          disabled={isFiring || isFired || glazeLayers.length === 0}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          <span className="btn-text">烧制</span>
        </button>
        <div className="toolbar-spacer" />
        <div className="rpm-display">
          <span className="rpm-value">{Math.round(rpm)}</span>
          <span className="rpm-label">RPM</span>
        </div>
      </div>

      <div className="main-content">
        <div
          className="canvas-container"
          ref={canvasContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onDragOver={handleGlazeDragOver}
          onDrop={handleGlazeDrop}
        >
          <div className="pressure-ring" style={{ opacity: pressure / 100 * 0.6 }}>
            <svg viewBox="0 0 100 100" className="pressure-svg">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255, 100, 100, 0.5)"
                strokeWidth={2 + pressure / 20}
              />
            </svg>
          </div>

          <div className="speedometer">
            <svg viewBox="0 0 100 60" className="speedometer-svg">
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="50" cy="50" r="4" fill="#5d3a1a" />
              <line
                x1="50"
                y1="50"
                x2={50 + 35 * Math.cos((Math.PI * (rpm / 300)) - Math.PI)}
                y2={50 + 35 * Math.sin((Math.PI * (rpm / 300)) - Math.PI)}
                stroke="#5d3a1a"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {isFiring && (
            <div className="temperature-bar">
              <div className="temp-label">
                {Math.round(temperature)}°C
              </div>
              <div className="temp-track">
                <div
                  className="temp-fill"
                  style={{ width: `${fireProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {showCracks && (
            <div className="crack-overlay">
              <svg viewBox="0 0 100 100" className="crack-svg">
                <path
                  d={crackPattern}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.15)"
                  strokeWidth="0.3"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="glaze-panel">
          <h3 className="panel-title">釉料配方</h3>
          <div className="glaze-grid">
            {Object.entries(GLAZE_TYPES).map(([key, glaze]) => (
              <div
                key={key}
                className="glaze-card"
                draggable={!isFired}
                onDragStart={() => handleGlazeDragStart(key)}
                title={glaze.name}
              >
                <div
                  className="glaze-swatch"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${glaze.previewColor}, ${glaze.color})`,
                  }}
                />
                <span className="glaze-name">{glaze.name}</span>
              </div>
            ))}
          </div>

          {glazeLayers.length > 0 && (
            <div className="layers-section">
              <h4 className="layers-title">釉层配比</h4>
              {glazeLayers.map((layer, index) => (
                <div key={index} className="layer-item">
                  <div
                    className="layer-color"
                    style={{ backgroundColor: layer.color }}
                  />
                  <div className="layer-controls">
                    <span className="layer-name">{GLAZE_TYPES[layer.type]?.name || layer.type}</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={layer.ratio}
                      onChange={(e) => handleRatioChange(index, Number(e.target.value))}
                      className="ratio-slider"
                      disabled={isFired}
                    />
                    <span className="ratio-value">{Math.round(layer.ratio)}%</span>
                  </div>
                  {!isFired && (
                    <button
                      className="remove-layer-btn"
                      onClick={() => handleRemoveLayer(index)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div className="final-preview">
                <span className="preview-label">最终釉色</span>
                <div
                  className="final-color"
                  style={{ backgroundColor: finalColor }}
                />
              </div>
            </div>
          )}

          {glazeLayers.length === 0 && !isFired && (
            <p className="hint-text">拖拽釉料至陶罐上方叠加</p>
          )}
          {isFired && (
            <p className="hint-text fired-hint">烧制完成！釉色已固定</p>
          )}
        </div>
      </div>

      {gallery.length > 0 && (
        <div className="gallery">
          <div className="gallery-scroll">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="gallery-card"
                onClick={() => handleLoad(item)}
              >
                <img src={item.thumbnail} alt="陶罐缩略图" className="card-thumbnail" />
                <div className="card-info">
                  <span className="card-time">{formatTime(item.timestamp)}</span>
                  <span className="card-rpm">{Math.round(item.rpm)} RPM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pressure-indicator">
        <div className="pressure-label">指压</div>
        <div className="pressure-bar">
          <div
            className="pressure-fill"
            style={{
              height: `${pressure}%`,
              background: `linear-gradient(to top, #3b82f6, #ef4444)`,
            }}
          />
        </div>
        <div className="pressure-value">{Math.round(pressure)}</div>
      </div>
    </div>
  )
}

export default App
