import { useState, useEffect, useRef, useCallback } from 'react'
import type { Island } from './islandSystem'
import { generateIslands, checkCollision, mergeIslands, resetIslands } from './islandSystem'
import type { Crystal, Particle } from './crystalSystem'
import { spawnCrystals, collectCrystal, explodeParticles } from './crystalSystem'
import type { DragState } from './toolInteraction'
import { startDrag, updateDrag, endDrag } from './toolInteraction'

const DAMPING = 0.95
const ELASTICITY = 0.3
const MERGE_DISTANCE = 40
const INITIAL_CROWBAR_USES = 5
const CRYSTALS_PER_CROWBAR = 5

export default function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [canvasSize, setCanvasSize] = useState({ w: 1000, h: 700 })
  const [islands, setIslands] = useState<Island[]>([])
  const [crystals, setCrystals] = useState<Crystal[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    islandId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    crowbarAngle: 0
  })
  const [crystalCount, setCrystalCount] = useState(0)
  const [crowbarUses, setCrowbarUses] = useState(INITIAL_CROWBAR_USES)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const updateSize = () => {
      const isMobile = window.innerWidth < 768
      const w = isMobile ? window.innerWidth : window.innerWidth * 0.8
      const h = window.innerHeight * 0.85
      setCanvasSize({ w, h })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (canvasSize.w > 0 && canvasSize.h > 0) {
      const newIslands = generateIslands(canvasSize.w, canvasSize.h)
      setIslands(newIslands)
      setCrystals(spawnCrystals(newIslands))
    }
  }, [canvasSize.w, canvasSize.h])

  const getSVGCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleReset = useCallback(() => {
    setIslands(prev => {
      const reset = resetIslands(prev)
      setCrystals(spawnCrystals(reset))
      return reset
    })
    setParticles([])
    setSelectedIslandId(null)
    setDragState({
      isDragging: false,
      islandId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      crowbarAngle: 0
    })
    setCrystalCount(0)
    setCrowbarUses(INITIAL_CROWBAR_USES)
  }, [])

  const handleIslandClick = useCallback((islandId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragState.isDragging) return
    setSelectedIslandId(prev => (prev === islandId ? null : islandId))
  }, [dragState.isDragging])

  const handleCrystalClick = useCallback((crystalId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const result = collectCrystal(crystals, crystalId)
    if (result.collectedCrystal) {
      const island = islands.find(i => i.id === result.collectedCrystal!.islandId)
      if (island) {
        const px = island.x + result.collectedCrystal.offsetX
        const py = island.y + result.collectedCrystal.offsetY
        setParticles(prev => [...prev, ...explodeParticles(px, py, 'crystal-shard')])
      }
      setCrystals(result.updatedCrystals)
      setCrystalCount(prev => {
        const next = prev + 1
        if (next % CRYSTALS_PER_CROWBAR === 0) {
          setCrowbarUses(u => u + 1)
        }
        return next
      })
    }
  }, [crystals, islands])

  const handleMouseDown = useCallback((islandId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (crowbarUses <= 0) return
    const { x, y } = getSVGCoords(e.clientX, e.clientY)
    setDragState(prev => startDrag(prev, islandId, x, y))
    setCrowbarUses(prev => prev - 1)
  }, [crowbarUses, getSVGCoords])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging) return
      const { x, y } = getSVGCoords(e.clientX, e.clientY)
      setDragState(prevState => {
        const { state, updatedIslands } = updateDrag(prevState, x, y, islands)
        if (updatedIslands !== islands) {
          setIslands(updatedIslands)
        }
        return state
      })
    }
    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.isDragging) return
      setDragState(prevState => {
        const { state, updatedIslands } = endDrag(prevState, islands, DAMPING)
        if (updatedIslands !== islands) {
          setIslands(updatedIslands)
        }
        return state
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState.isDragging, islands, getSVGCoords])

  useEffect(() => {
    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      setIslands(prevIslands => {
        let updated = prevIslands.map(island => {
          if (dragState.isDragging && island.id === dragState.islandId) {
            return { ...island, x: island.x + island.vx * dt, y: island.y + island.vy * dt }
          }
          const nx = island.x + island.vx * dt
          const ny = island.y + island.vy * dt
          const nvx = island.vx * DAMPING
          const nvy = island.vy * DAMPING
          let fx = nx
          let fy = ny
          let fvx = nvx
          let fvy = nvy
          if (nx - island.radius < 0) { fx = island.radius; fvx = -nvx * ELASTICITY }
          if (nx + island.radius > canvasSize.w) { fx = canvasSize.w - island.radius; fvx = -nvx * ELASTICITY }
          if (ny - island.radius < 0) { fy = island.radius; fvy = -nvy * ELASTICITY }
          if (ny + island.radius > canvasSize.h) { fy = canvasSize.h - island.radius; fvy = -nvy * ELASTICITY }
          return { ...island, x: fx, y: fy, vx: fvx, vy: fvy }
        })

        const shockwavesToAdd: Particle[] = []
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const col = checkCollision(updated[i], updated[j])
            if (col.collided) {
              const a = updated[i]
              const b = updated[j]
              const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
              const overlap = a.radius + b.radius - dist
              if (overlap > 0 && dist > 0) {
                const pushX = col.pushDirX * overlap * 0.5
                const pushY = col.pushDirY * overlap * 0.5
                updated[i] = { ...updated[i], x: a.x - pushX, y: a.y - pushY, vx: a.vx - col.pushDirX * 30, vy: a.vy - col.pushDirY * 30 }
                updated[j] = { ...updated[j], x: b.x + pushX, y: b.y + pushY, vx: b.vx + col.pushDirX * 30, vy: b.vy + col.pushDirY * 30 }
                const speed = Math.sqrt((a.vx - b.vx) ** 2 + (a.vy - b.vy) ** 2)
                if (speed > 20) {
                  shockwavesToAdd.push(...explodeParticles(col.contactX, col.contactY, 'shockwave'))
                }
              }
              const finalDist = Math.sqrt((updated[j].x - updated[i].x) ** 2 + (updated[j].y - updated[i].y) ** 2)
              if (finalDist < MERGE_DISTANCE) {
                updated = mergeIslands(updated, updated[i].id, updated[j].id)
              }
            }
          }
        }
        if (shockwavesToAdd.length > 0) {
          setParticles(p => [...p, ...shockwavesToAdd])
        }
        return updated
      })

      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            life: p.life - dt * 1000,
            size: p.type === 'shockwave' ? p.size + dt * 25 : p.size
          }))
          .filter(p => p.life > 0)
      )

      setTick(t => t + 1)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [canvasSize, dragState.isDragging, dragState.islandId])

  const getNeighborIslands = useCallback((islandId: string): Island[] => {
    const current = islands.find(i => i.id === islandId)
    if (!current) return []
    return islands
      .filter(i => i.id !== islandId)
      .map(i => ({ island: i, dist: Math.sqrt((i.x - current.x) ** 2 + (i.y - current.y) ** 2) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(x => x.island)
  }, [islands])

  const selectedIsland = islands.find(i => i.id === selectedIslandId) || null
  const neighborIslands = selectedIsland ? getNeighborIslands(selectedIslandId!) : []
  const pulseOpacity = 0.3 + 0.5 * Math.abs(Math.sin(tick * 0.05))

  return (
    <div style={styles.container}>
      <div style={styles.gameWrapper}>
        <svg
          ref={svgRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={styles.svg}
          onClick={() => setSelectedIslandId(null)}
        >
          <defs>
            <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="100%" stopColor="#f0f8ff" />
            </linearGradient>
            <radialGradient id="grassGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#6fa85a" />
              <stop offset="100%" stopColor="#4a7c3f" />
            </radialGradient>
            <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#ff8c00" />
            </linearGradient>
            <radialGradient id="pathGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <filter id="glowGold">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x={0} y={0} width={canvasSize.w} height={canvasSize.h} fill="url(#skyGradient)" />

          {[...Array(6)].map((_, i) => (
            <ellipse
              key={`cloud-${i}`}
              cx={50 + (i * (canvasSize.w - 100)) / 5 + Math.sin(tick * 0.005 + i) * 10}
              cy={80 + (i % 3) * 60}
              rx={60 + (i % 2) * 20}
              ry={22 + (i % 2) * 8}
              fill="#ffffff"
              opacity={0.55}
            />
          ))}

          {selectedIsland && neighborIslands.map(neighbor => {
            const mx = (selectedIsland.x + neighbor.x) / 2
            const my = (selectedIsland.y + neighbor.y) / 2
            return (
              <g key={`path-${selectedIsland.id}-${neighbor.id}`}>
                <line
                  x1={selectedIsland.x}
                  y1={selectedIsland.y}
                  x2={neighbor.x}
                  y2={neighbor.y}
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  strokeDasharray="8 6"
                  opacity={0.85}
                />
                <circle cx={neighbor.x} cy={neighbor.y} r={28} fill="url(#pathGlow)" opacity={pulseOpacity} />
                <circle cx={mx} cy={my} r={18} fill="url(#pathGlow)" opacity={pulseOpacity * 0.6} />
              </g>
            )
          })}

          {islands.map(island => {
            const isSelected = island.id === selectedIslandId
            const isBeingDragged = dragState.isDragging && dragState.islandId === island.id
            const points: string[] = []
            const segs = 28
            for (let k = 0; k < segs; k++) {
              const a = (k / segs) * Math.PI * 2
              const wobble = 1 + Math.sin(a * 3 + island.id.charCodeAt(0)) * 0.05
              const rr = island.radius * wobble
              points.push(`${island.x + Math.cos(a) * rr},${island.y + Math.sin(a) * rr}`)
            }
            return (
              <g
                key={island.id}
                onClick={(e) => handleIslandClick(island.id, e)}
                onMouseDown={(e) => handleMouseDown(island.id, e)}
                style={{ cursor: crowbarUses > 0 ? 'grab' : 'not-allowed' }}
              >
                <polygon
                  points={points.join(' ')}
                  fill="#8b5e3c"
                  stroke="#5a3e26"
                  strokeWidth={2}
                />
                <circle
                  cx={island.x}
                  cy={island.y - island.radius * 0.1}
                  r={island.radius * 0.82}
                  fill="url(#grassGradient)"
                />
                {[...Array(8)].map((_, k) => (
                  <circle
                    key={`grass-${island.id}-${k}`}
                    cx={island.x + Math.cos(k * 0.8 + island.id.charCodeAt(0)) * island.radius * 0.5}
                    cy={island.y - island.radius * 0.1 + Math.sin(k * 0.8 + island.id.charCodeAt(0)) * island.radius * 0.5}
                    r={3 + (k % 3)}
                    fill="#5a8f48"
                    opacity={0.7}
                  />
                ))}
                {isSelected && (
                  <circle
                    cx={island.x}
                    cy={island.y}
                    r={island.radius + 8}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={3}
                    strokeDasharray="6 4"
                    opacity={0.9}
                  />
                )}
                {isBeingDragged && (
                  <CrowbarSVG
                    islandX={island.x}
                    islandY={island.y}
                    islandRadius={island.radius}
                    targetX={dragState.currentX}
                    targetY={dragState.currentY}
                    angle={dragState.crowbarAngle}
                  />
                )}
                {island.mergedWith.length > 0 && (
                  <text x={island.x} y={island.y - island.radius - 12} textAnchor="middle" fill="#ffffff" fontSize={14} fontWeight="bold">
                    已连接
                  </text>
                )}
              </g>
            )
          })}

          {crystals.filter(c => !c.collected).map(crystal => {
            const island = islands.find(i => i.id === crystal.islandId)
            if (!island) return null
            const cx = island.x + crystal.offsetX
            const cy = island.y + crystal.offsetY
            const breath = 1 + 0.1 * Math.sin(tick * 0.05)
            const rot = tick * 0.8
            const hexa = (size: number) => {
              const pts: string[] = []
              for (let k = 0; k < 6; k++) {
                const a = (k / 6) * Math.PI * 2 + (rot * Math.PI) / 180
                pts.push(`${cx + Math.cos(a) * size},${cy + Math.sin(a) * size}`)
              }
              return pts.join(' ')
            }
            return (
              <g key={crystal.id} style={{ cursor: 'pointer' }} onClick={(e) => handleCrystalClick(crystal.id, e)}>
                <circle cx={cx} cy={cy} r={22 * breath} fill="#ffd700" opacity={0.18} />
                <polygon points={hexa(14 * breath)} fill="url(#crystalGradient)" opacity={0.85} stroke="#ffaa00" strokeWidth={1.2} />
                <polygon points={hexa(8 * breath)} fill="#fff8dc" opacity={0.55} />
              </g>
            )
          })}

          {particles.map(p => {
            const alpha = Math.max(0, p.life / p.maxLife)
            if (p.type === 'shockwave') {
              return (
                <circle key={p.id} cx={p.x} cy={p.y} r={p.size} fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={alpha * 0.8} />
              )
            }
            return (
              <circle key={p.id} cx={p.x} cy={p.y} r={p.size} fill={p.color} opacity={alpha} />
            )
          })}
        </svg>

        <div style={styles.statusBar}>
          <div style={styles.statusItem}>
            <span style={styles.crystalIcon}>💎</span>
            <span style={styles.crystalCount}>{crystalCount}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.crowbarIcon}>🔧</span>
            <span style={styles.crowbarCount}>{crowbarUses}</span>
          </div>
          <button style={styles.resetBtn} onClick={handleReset}>重置</button>
        </div>

        {window.innerWidth < 768 && (
          <div style={styles.mobileCounter}>
            <span style={styles.crowbarCount}>🔧 {crowbarUses}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { text-shadow: 0 0 6px #ffd700, 0 0 12px #ffaa00; }
          50% { text-shadow: 0 0 12px #ffd700, 0 0 24px #ffaa00; }
        }
      `}</style>
    </div>
  )
}

function CrowbarSVG({
  islandX,
  islandY,
  islandRadius,
  targetX,
  targetY,
  angle
}: {
  islandX: number
  islandY: number
  islandRadius: number
  targetX: number
  targetY: number
  angle: number
}) {
  const dx = targetX - islandX
  const dy = targetY - islandY
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const edgeX = islandX + (dx / dist) * islandRadius
  const edgeY = islandY + (dy / dist) * islandRadius
  const baseAngle = (Math.atan2(dy, dx) * 180) / Math.PI
  const displayAngle = baseAngle + angle

  return (
    <g transform={`translate(${edgeX}, ${edgeY}) rotate(${displayAngle})`}>
      <rect x={-80} y={-4} width={55} height={8} rx={3} fill="#8b5a2b" stroke="#5c3a1a" strokeWidth={1.2} />
      <rect x={-78} y={-3} width={50} height={2} fill="#a67242" opacity={0.7} />
      <rect x={-30} y={-14} width={8} height={28} rx={2} fill="#6b4423" opacity={0.6} />
      <path
        d={`M -25 -5 L 5 -5 L 12 0 L 5 5 L -25 5 Z`}
        fill="#c0c4cc"
        stroke="#6e7278"
        strokeWidth={1.2}
      />
      <path d={`M 5 -5 L 12 0 L 5 5`} fill="#e5e8ed" />
    </g>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a2a3a 0%, #0f1a24 100%)',
    fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  gameWrapper: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45), 0 0 0 2px rgba(135,206,235,0.25)'
  },
  svg: {
    display: 'block',
    borderRadius: 14
  },
  statusBar: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 22,
    padding: '10px 22px',
    background: 'rgba(15, 25, 40, 0.78)',
    backdropFilter: 'blur(10px)',
    borderRadius: 30,
    border: '1px solid rgba(135,206,235,0.3)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  crystalIcon: {
    fontSize: 20
  },
  crystalCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffd700',
    animation: 'glowPulse 2s ease-in-out infinite',
    letterSpacing: 1
  },
  crowbarIcon: {
    fontSize: 20
  },
  crowbarCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4da6ff',
    textShadow: '0 0 8px rgba(77,166,255,0.6)',
    letterSpacing: 1
  },
  resetBtn: {
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5253 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(238,82,83,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  mobileCounter: {
    position: 'absolute',
    top: 14,
    left: 14,
    padding: '6px 14px',
    background: 'rgba(15, 25, 40, 0.78)',
    borderRadius: 20,
    border: '1px solid rgba(135,206,235,0.3)'
  }
}
