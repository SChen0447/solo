import React, { useState, useRef, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { SceneElement, ElementType, WeatherType, ELEMENT_CONFIGS, MAX_ELEMENTS, WARNING_THRESHOLD } from './types'

interface SandboxProps {
  elements: SceneElement[]
  setElements: React.Dispatch<React.SetStateAction<SceneElement[]>>
  weather: WeatherType
  showWarning: boolean
  setShowWarning: (v: boolean) => void
  onExceedLimit: () => boolean
}

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const SANDBOX_WIDTH = 1200
const SANDBOX_HEIGHT = 800
const GRID_SIZE = 40
const SNAP_THRESHOLD = 10

const Sandbox: React.FC<SandboxProps> = ({
  elements,
  setElements,
  weather,
  showWarning,
  setShowWarning,
  onExceedLimit,
}) => {
  const sandboxRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const particleIdRef = useRef(0)
  const animFrameRef = useRef<number>(0)

  const snapToGrid = useCallback((value: number): number => {
    const mod = value % GRID_SIZE
    if (mod < SNAP_THRESHOLD) return value - mod
    if (mod > GRID_SIZE - SNAP_THRESHOLD) return value - mod + GRID_SIZE
    return value
  }, [])

  const addElement = useCallback((type: ElementType, x: number, y: number) => {
    if (elements.length >= MAX_ELEMENTS) {
      return false
    }
    if (elements.length >= WARNING_THRESHOLD) {
      const shouldContinue = onExceedLimit()
      if (!shouldContinue) return false
    }

    const config = ELEMENT_CONFIGS[type]
    const newElement: SceneElement = {
      id: uuidv4(),
      type,
      x: snapToGrid(x - config.width / 2),
      y: snapToGrid(y - config.height / 2),
      rotation: 0,
      scale: 1.0,
    }
    setElements((prev) => [...prev, newElement])
    return true
  }, [elements.length, setElements, snapToGrid, onExceedLimit])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('elementType') as ElementType
    if (!type || !sandboxRef.current) return

    const rect = sandboxRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    addElement(type, x, y)
  }, [addElement])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleElementMouseDown = useCallback((e: React.MouseEvent, element: SceneElement) => {
    if (e.button !== 0) return
    e.stopPropagation()

    setSelectedId(element.id)

    if (!sandboxRef.current) return
    const rect = sandboxRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setDraggingId(element.id)
    setDragOffset({
      x: mouseX - element.x,
      y: mouseY - element.y,
    })
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !sandboxRef.current) return

    const rect = sandboxRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const config = elements.find((el) => el.id === draggingId)
    if (!config) return

    const elemConfig = ELEMENT_CONFIGS[config.type]
    let newX = mouseX - dragOffset.x
    let newY = mouseY - dragOffset.y

    newX = Math.max(0, Math.min(SANDBOX_WIDTH - elemConfig.width * config.scale, newX))
    newY = Math.max(0, Math.min(SANDBOX_HEIGHT - elemConfig.height * config.scale, newY))

    newX = snapToGrid(newX)
    newY = snapToGrid(newY)

    setElements((prev) =>
      prev.map((el) => (el.id === draggingId ? { ...el, x: newX, y: newY } : el))
    )
  }, [draggingId, dragOffset, elements, setElements, snapToGrid])

  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  const handleSandboxClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null)
      setContextMenu(null)
    }
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(elementId)
    if (!sandboxRef.current) return
    const rect = sandboxRef.current.getBoundingClientRect()
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      elementId,
    })
  }, [])

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id))
    if (selectedId === id) setSelectedId(null)
    setContextMenu(null)
  }, [setElements, selectedId])

  const rotateElement = useCallback((id: string) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, rotation: (el.rotation + 45) % 360 } : el))
    )
    setContextMenu(null)
  }, [setElements])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return
      const moveAmount = 5
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== selectedId) return el
          let { x, y } = el
          switch (e.key) {
            case 'ArrowUp':
              y = Math.max(0, y - moveAmount)
              break
            case 'ArrowDown':
              y = Math.min(SANDBOX_HEIGHT - 1, y + moveAmount)
              break
            case 'ArrowLeft':
              x = Math.max(0, x - moveAmount)
              break
            case 'ArrowRight':
              x = Math.min(SANDBOX_WIDTH - 1, x + moveAmount)
              break
            case 'Delete':
            case 'Backspace':
              return null as unknown as SceneElement
            default:
              return el
          }
          return { ...el, x, y }
        }).filter((el): el is SceneElement => el !== null)
      )
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setSelectedId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, setElements])

  useEffect(() => {
    if (weather === 'rainy') {
      const initParticles: Particle[] = []
      for (let i = 0; i < 100; i++) {
        initParticles.push({
          id: particleIdRef.current++,
          x: Math.random() * SANDBOX_WIDTH,
          y: Math.random() * SANDBOX_HEIGHT,
          vx: 0,
          vy: 3 + Math.random() * 2,
          size: 10,
          opacity: 0.4,
        })
      }
      setParticles(initParticles)
    } else if (weather === 'snowy') {
      const initParticles: Particle[] = []
      for (let i = 0; i < 50; i++) {
        initParticles.push({
          id: particleIdRef.current++,
          x: Math.random() * SANDBOX_WIDTH,
          y: Math.random() * SANDBOX_HEIGHT,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 1 + Math.random() * 0.5,
          size: 3 + Math.random() * 3,
          opacity: 0.6,
        })
      }
      setParticles(initParticles)
    } else {
      setParticles([])
    }
  }, [weather])

  useEffect(() => {
    if (weather !== 'rainy' && weather !== 'snowy') return

    const animate = () => {
      setParticles((prev) =>
        prev.map((p) => {
          let newX = p.x + p.vx
          let newY = p.y + p.vy
          if (newY > SANDBOX_HEIGHT) {
            newY = -p.size
            newX = Math.random() * SANDBOX_WIDTH
          }
          if (newX > SANDBOX_WIDTH + 10) newX = -10
          if (newX < -10) newX = SANDBOX_WIDTH + 10
          return { ...p, x: newX, y: newY }
        })
      )
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [weather])

  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => setShowWarning(false), 300)
      return () => clearTimeout(timer)
    }
  }, [showWarning, setShowWarning])

  const getWeatherFilter = (): string => {
    switch (weather) {
      case 'sunny':
        return 'none'
      case 'rainy':
        return 'brightness(0.75) hue-rotate(-10deg) saturate(0.9)'
      case 'snowy':
        return 'brightness(1.15) saturate(0.85) hue-rotate(5deg)'
      case 'cloudy':
        return 'saturate(0.7) brightness(0.8)'
      default:
        return 'none'
    }
  }

  const renderElement = (element: SceneElement) => {
    const config = ELEMENT_CONFIGS[element.type]
    const isSelected = selectedId === element.id
    const isDragging = draggingId === element.id

    return (
      <div
        key={element.id}
        className={isSelected ? 'selected-element' : ''}
        onMouseDown={(e) => handleElementMouseDown(e, element)}
        onContextMenu={(e) => handleContextMenu(e, element.id)}
        style={{
          position: 'absolute',
          left: element.x,
          top: element.y,
          width: config.width * element.scale,
          height: config.height * element.scale,
          transform: `rotate(${element.rotation}deg) scale(${isDragging ? 1.05 : 1})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: isSelected ? 10 : 1,
          userSelect: 'none',
        }}
      >
        <ElementVisual type={element.type} color={config.color} scale={element.scale} />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div
        ref={sandboxRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleSandboxClick}
        className={showWarning ? 'flash-warning' : ''}
        style={{
          ...styles.sandbox,
          filter: getWeatherFilter(),
          transition: 'filter 0.5s ease',
        }}
      >
        <svg style={styles.gridSvg} width={SANDBOX_WIDTH} height={SANDBOX_HEIGHT}>
          {Array.from({ length: Math.floor(SANDBOX_WIDTH / GRID_SIZE) + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i * GRID_SIZE}
              y1={0}
              x2={i * GRID_SIZE}
              y2={SANDBOX_HEIGHT}
              stroke="rgba(180, 170, 150, 0.3)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: Math.floor(SANDBOX_HEIGHT / GRID_SIZE) + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * GRID_SIZE}
              x2={SANDBOX_WIDTH}
              y2={i * GRID_SIZE}
              stroke="rgba(180, 170, 150, 0.3)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {elements.map(renderElement)}

        {particles.map((p) =>
          weather === 'rainy' ? (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: '2px',
                height: `${p.size}px`,
                backgroundColor: `rgba(200, 220, 255, ${p.opacity})`,
                transform: 'rotate(15deg)',
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: `${p.size}px`,
                height: `${p.size}px`,
                borderRadius: '50%',
                backgroundColor: `rgba(255, 255, 255, ${p.opacity})`,
                pointerEvents: 'none',
                boxShadow: '0 0 2px rgba(255,255,255,0.5)',
              }}
            />
          )
        )}

        {contextMenu && (
          <div
            style={{
              ...styles.contextMenu,
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button style={styles.menuItem} onClick={() => rotateElement(contextMenu.elementId)}>
              🔄 旋转 45°
            </button>
            <button style={{ ...styles.menuItem, color: '#ff6b6b' }} onClick={() => deleteElement(contextMenu.elementId)}>
              🗑️ 删除
            </button>
          </div>
        )}
      </div>

      <div style={styles.counter}>
        <span style={styles.counterText}>
          元素：{elements.length} / {MAX_ELEMENTS}
        </span>
      </div>
    </div>
  )
}

const ElementVisual: React.FC<{ type: ElementType; color: string; scale: number }> = ({ type, color }) => {
  const darker = adjustColor(color, -30)
  const lighter = adjustColor(color, 30)

  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
  }

  switch (type) {
    case 'pine':
      return (
        <svg viewBox="0 0 40 60" style={commonStyle}>
          <polygon points="20,2 6,28 14,28 2,48 12,48 12,58 28,58 28,48 38,48 26,28 34,28" fill={color} />
          <rect x="17" y="54" width="6" height="6" fill={darker} />
          <polygon points="20,8 14,22 26,22" fill={lighter} opacity="0.4" />
        </svg>
      )
    case 'oak':
      return (
        <svg viewBox="0 0 50 55" style={commonStyle}>
          <circle cx="25" cy="22" r="16" fill={color} />
          <circle cx="14" cy="28" r="9" fill={lighter} />
          <circle cx="36" cy="28" r="9" fill={lighter} />
          <circle cx="25" cy="12" r="8" fill={lighter} />
          <rect x="21" y="36" width="8" height="18" fill={darker} />
        </svg>
      )
    case 'cabin':
      return (
        <svg viewBox="0 0 60 50" style={commonStyle}>
          <polygon points="30,5 5,28 55,28" fill="#6b4423" />
          <rect x="8" y="28" width="44" height="20" fill={color} />
          <rect x="24" y="35" width="12" height="13" fill={darker} />
          <rect x="12" y="32" width="8" height="8" fill="#f9d71c" />
          <rect x="40" y="32" width="8" height="8" fill="#f9d71c" />
          <rect x="40" y="10" width="6" height="10" fill="#8b5e3c" />
        </svg>
      )
    case 'lighthouse':
      return (
        <svg viewBox="0 0 35 70" style={commonStyle}>
          <rect x="12" y="18" width="11" height="42" fill={color} />
          <rect x="9" y="56" width="17" height="8" fill={darker} />
          <polygon points="10,18 25,18 22,8 13,8" fill="#d9534f" />
          <circle cx="17.5" cy="13" r="4" fill="#f9d71c" />
          <rect x="15" y="26" width="5" height="5" fill="#4a90d9" />
          <rect x="15" y="36" width="5" height="5" fill="#4a90d9" />
          <rect x="15" y="46" width="5" height="5" fill="#4a90d9" />
          <rect x="10" y="22" width="15" height="2" fill="#d9534f" />
          <rect x="10" y="32" width="15" height="2" fill="#d9534f" />
          <rect x="10" y="42" width="15" height="2" fill="#d9534f" />
          <rect x="10" y="52" width="15" height="2" fill="#d9534f" />
        </svg>
      )
    case 'bridge':
      return (
        <svg viewBox="0 0 80 30" style={commonStyle}>
          <rect x="2" y="12" width="76" height="8" fill={color} />
          <rect x="2" y="6" width="6" height="6" fill={darker} />
          <rect x="17" y="6" width="6" height="6" fill={darker} />
          <rect x="32" y="6" width="6" height="6" fill={darker} />
          <rect x="47" y="6" width="6" height="6" fill={darker} />
          <rect x="62" y="6" width="6" height="6" fill={darker} />
          <rect x="72" y="6" width="6" height="6" fill={darker} />
          <path d="M2 20 Q40 32 78 20" fill="none" stroke={darker} strokeWidth="3" />
        </svg>
      )
    case 'lake':
      return (
        <svg viewBox="0 0 100 60" style={commonStyle}>
          <ellipse cx="50" cy="32" rx="46" ry="26" fill={color} />
          <ellipse cx="50" cy="30" rx="38" ry="20" fill={lighter} opacity="0.5" />
          <path d="M18 28 Q28 24 38 28" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <path d="M55 34 Q65 30 75 34" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
          <path d="M25 40 Q35 37 45 40" fill="none" stroke="#fff" strokeWidth="1" opacity="0.4" />
        </svg>
      )
    default:
      return null
  }
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount))
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    padding: '20px',
    overflow: 'auto',
  },
  sandbox: {
    position: 'relative',
    width: SANDBOX_WIDTH,
    height: SANDBOX_HEIGHT,
    backgroundColor: '#f0e6d3',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  gridSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
  },
  counter: {
    position: 'absolute',
    top: '30px',
    right: '30px',
    backgroundColor: 'rgba(45, 62, 79, 0.9)',
    padding: '8px 16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  counterText: {
    color: '#f1f1f1',
    fontSize: '14px',
    fontWeight: 600,
  },
  contextMenu: {
    position: 'absolute',
    backgroundColor: '#2d3e4f',
    borderRadius: '8px',
    padding: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuItem: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#f1f1f1',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
}

export default Sandbox
