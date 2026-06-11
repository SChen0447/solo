import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CraterRenderer, Crater, Particle, Rune, Crack } from './CraterRenderer'
import UIOverlay from './UIOverlay'
import { v4 as uuidv4 } from 'uuid'

interface DebrisFlightState {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
  trailTimer: number
}

const CraterGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CraterRenderer | null>(null)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const [score, setScore] = useState(0)
  const [impactCount, setImpactCount] = useState(0)
  const [angle, setAngle] = useState(45)
  const [power, setPower] = useState(5)
  const [splashCoeff, setSplashCoeff] = useState(0.5)
  const [isAiming, setIsAiming] = useState(false)
  const [aimPos, setAimPos] = useState({ x: 0, y: 0 })
  const [isLaunched, setIsLaunched] = useState(false)
  const [craters, setCraters] = useState<Crater[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
  const [runesActive, setRunesActive] = useState(false)
  const [runeClickOrder, setRuneClickOrder] = useState<string[]>([])
  const [runeCorrectOrder, setRuneCorrectOrder] = useState<string[]>([])
  const [punishmentActive, setPunishmentActive] = useState(false)
  const [goldRainActive, setGoldRainActive] = useState(false)

  const debrisRef = useRef<DebrisFlightState>({
    x: 0, y: 0, vx: 0, vy: 0, active: false, trailTimer: 0,
  })

  const GRAVITY = 500
  const DEBRIS_SPEED = 500

  useEffect(() => {
    if (!canvasRef.current) return

    const renderer = new CraterRenderer(canvasRef.current)
    rendererRef.current = renderer

    const size = renderer.getCanvasSize()
    setCanvasSize(size)
    setCraters(renderer.getState().craters)
    
    const defaultAimX = size.width * 0.6
    const defaultAimY = size.height * 0.5
    setAimPos({ x: defaultAimX, y: defaultAimY })
    renderer.setAimPosition(defaultAimX, defaultAimY, false, true)

    renderer.start()

    const handleResize = () => {
      renderer.handleResize()
      const newSize = renderer.getCanvasSize()
      setCanvasSize(newSize)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      renderer.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!rendererRef.current) return
    setCraters([...rendererRef.current.getState().craters])
  }, [impactCount])

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e.clientX, e.clientY)
    setAimPos(coords)
    if (rendererRef.current) {
      rendererRef.current.setAimPosition(coords.x, coords.y, isAiming || true)
    }
  }, [getCanvasCoords, isAiming])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    if (isLaunched) return

    const coords = getCanvasCoords(e.clientX, e.clientY)

    if (rendererRef.current && runesActive) {
      const clickedRune = rendererRef.current.checkRuneClick(coords.x, coords.y)
      if (clickedRune) {
        handleRuneClick(clickedRune)
        return
      }
    }

    setIsAiming(true)
    setAimPos(coords)
    if (rendererRef.current) {
      rendererRef.current.setAimPosition(coords.x, coords.y, true)
    }
  }, [getCanvasCoords, isLaunched, runesActive])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    if (!isAiming || isLaunched) {
      setIsAiming(false)
      return
    }

    const coords = getCanvasCoords(e.clientX, e.clientY)
    launchDebris(coords.x, coords.y)
    setIsAiming(false)
  }, [isAiming, isLaunched, getCanvasCoords])

  const handleMouseLeave = useCallback(() => {
    setIsAiming(false)
    if (rendererRef.current) {
      rendererRef.current.setAimPosition(aimPos.x, aimPos.y, false, false)
    }
  }, [aimPos])

  const handleRuneClick = (rune: Rune) => {
    if (rune.clicked) return

    setRuneClickOrder(prev => {
      const newOrder = [...prev, rune.id]
      
      const state = rendererRef.current?.getState()
      if (state) {
        state.runes = state.runes.map(r => 
          r.id === rune.id ? { ...r, clicked: true } : r
        )
      }

      if (newOrder.length === runeCorrectOrder.length) {
        const isCorrect = newOrder.every((id, idx) => id === runeCorrectOrder[idx])
        
        setTimeout(() => {
          if (isCorrect) {
            handleRunesSolved()
          } else {
            handleRunesFailed()
          }
        }, 300)
      }
      
      return newOrder
    })
  }

  const handleRunesSolved = () => {
    setScore(prev => prev + 1000)
    setGoldRainActive(true)
    if (rendererRef.current) {
      rendererRef.current.setGoldRainActive(true)
      rendererRef.current.setRunes([])
    }
    setRunesActive(false)
    setRuneClickOrder([])
    setRuneCorrectOrder([])

    setTimeout(() => {
      setGoldRainActive(false)
      if (rendererRef.current) {
        rendererRef.current.setGoldRainActive(false)
      }
    }, 2000)
  }

  const handleRunesFailed = () => {
    setPunishmentActive(true)
    triggerPunishmentSmoke()
    
    setTimeout(() => {
      if (rendererRef.current) {
        rendererRef.current.setRunes([])
      }
      setRunesActive(false)
      setRuneClickOrder([])
      setRuneCorrectOrder([])
      setPunishmentActive(false)
    }, 1500)
  }

  const triggerPunishmentSmoke = () => {
    if (!rendererRef.current) return
    
    const state = rendererRef.current.getState()
    const randomCrater = state.craters[Math.floor(Math.random() * state.craters.length)]
    
    if (randomCrater) {
      for (let i = 0; i < 15; i++) {
        const particle: Particle = {
          id: uuidv4(),
          x: randomCrater.x + (Math.random() - 0.5) * randomCrater.radius,
          y: randomCrater.y,
          vx: (Math.random() - 0.5) * 30,
          vy: -20 - Math.random() * 40,
          size: 8 + Math.random() * 4,
          colorStart: '#424242',
          colorEnd: '#212121',
          life: 3000,
          maxLife: 3000,
          type: 'smoke',
        }
        rendererRef.current.addParticle(particle)
      }
    }
  }

  const launchDebris = (targetX: number, targetY: number) => {
    if (!rendererRef.current) return
    if (isLaunched) return

    setIsLaunched(true)

    const state = rendererRef.current.getState()
    const startX = state.launchPadX
    const startY = state.launchPadY - 30

    const angleRad = (angle * Math.PI) / 180
    const speed = DEBRIS_SPEED * (0.5 + power * 0.05)

    const dx = targetX - startX
    const dy = targetY - startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const dirX = dx / dist
    const dirY = dy / dist

    const vx = dirX * speed
    const vy = dirY * speed - speed * Math.sin(angleRad) * 0.3

    debrisRef.current = {
      x: startX,
      y: startY,
      vx,
      vy,
      active: true,
      trailTimer: 0,
    }

    rendererRef.current.launchDebris(targetX, targetY, angle, power)

    lastTimeRef.current = performance.now()
    gameLoop()
  }

  const gameLoop = useCallback(() => {
    if (!rendererRef.current) return
    if (!debrisRef.current.active) return

    const now = performance.now()
    const dt = Math.min(now - lastTimeRef.current, 33)
    lastTimeRef.current = now

    const debris = debrisRef.current

    debris.vy += GRAVITY * dt / 1000
    debris.x += debris.vx * dt / 1000
    debris.y += debris.vy * dt / 1000

    debris.trailTimer += dt
    if (debris.trailTimer > 16) {
      debris.trailTimer = 0
      addTrailParticle(debris.x, debris.y)
    }

    const state = rendererRef.current.getState()
    const canvasHeight = rendererRef.current.getCanvasSize().height
    const groundY = canvasHeight * 0.9

    if (debris.y >= groundY - 10) {
      debris.active = false
      handleImpact(debris.x, groundY)
      setIsLaunched(false)
      return
    }

    if (debris.x < 0 || debris.x > canvasSize.width) {
      debris.active = false
      setIsLaunched(false)
      return
    }

    updateDebrisVisual(debris.x, debris.y)

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [canvasSize.width])

  const addTrailParticle = (x: number, y: number) => {
    if (!rendererRef.current) return

    const particle: Particle = {
      id: uuidv4(),
      x: x + (Math.random() - 0.5) * 5,
      y: y + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      size: 2 + Math.random() * 2,
      colorStart: '#ffff00',
      colorEnd: '#ff6f00',
      life: 500,
      maxLife: 500,
      type: 'trail',
    }
    rendererRef.current.addParticle(particle)
  }

  const updateDebrisVisual = (x: number, y: number) => {
    if (!rendererRef.current) return
    const state = rendererRef.current.getState()
    if (state.currentDebris) {
      state.currentDebris.x = x
      state.currentDebris.y = y
      state.currentDebris.rotation += 0.1
    }
  }

  const handleImpact = (x: number, y: number) => {
    if (!rendererRef.current) return

    rendererRef.current.resetDebris()
    createExplosion(x, y)

    const radius = 20 + Math.random() * 20 + power * 2
    const depth = power / 10

    const newCrater: Crater = {
      id: uuidv4(),
      x,
      y: y - radius * 0.3,
      radius,
      depth,
      isPreset: false,
      radiationRays: Math.floor(5 + power),
      age: 0,
    }

    const state = rendererRef.current.getState()
    let merged = false

    for (const existingCrater of state.craters) {
      const dist = Math.sqrt(
        (newCrater.x - existingCrater.x) ** 2 +
        (newCrater.y - existingCrater.y) ** 2
      )
      const edgeDist = dist - existingCrater.radius

      if (edgeDist > 0 && edgeDist < existingCrater.radius * 0.4) {
        merged = true
        createCollapseAnimation(existingCrater, newCrater)
        newCrater.merged = true
        newCrater.mergePartnerId = existingCrater.id
        break
      }
    }

    if (!merged) {
      createEjectaColumn(newCrater)
      createEjectaLayer(newCrater)
    }

    rendererRef.current.addCrater(newCrater)
    setImpactCount(prev => prev + 1)
    setScore(prev => prev + Math.floor(power * 10))

    setTimeout(() => {
      checkCraterChain()
    }, 100)
  }

  const createExplosion = (x: number, y: number) => {
    if (!rendererRef.current) return

    const particleCount = 20
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3
      const speed = 50 + Math.random() * 70
      const dist = 50 + Math.random() * 70

      const particle: Particle = {
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 3 + Math.random() * 4,
        colorStart: '#ff8f00',
        colorEnd: '#d84315',
        life: 300,
        maxLife: 300,
        type: 'explosion',
      }
      rendererRef.current.addParticle(particle)
    }
  }

  const createCollapseAnimation = (crater1: Crater, crater2: Crater) => {
    if (!rendererRef.current) return

    const crackCount = 8
    const midX = (crater1.x + crater2.x) / 2
    const midY = (crater1.y + crater2.y) / 2

    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.5
      const length = 30 + Math.random() * 30

      const crack: Crack = {
        id: uuidv4(),
        startX: midX + Math.cos(angle) * 10,
        startY: midY + Math.sin(angle) * 10,
        endX: midX + Math.cos(angle) * length,
        endY: midY + Math.sin(angle) * length,
        width: 2 + Math.random() * 2,
        color: '#424242',
        life: 1000,
        maxLife: 1000,
      }
      rendererRef.current.addCrack(crack)
    }
  }

  const createEjectaColumn = (crater: Crater) => {
    if (!rendererRef.current) return

    const particleCount = 20 + Math.floor(Math.random() * 10)
    for (let i = 0; i < particleCount; i++) {
      const spread = (Math.random() - 0.5) * crater.radius * 0.5
      const speed = 150 + Math.random() * 100

      const particle: Particle = {
        id: uuidv4(),
        x: crater.x + spread,
        y: crater.y,
        vx: (Math.random() - 0.5) * 60,
        vy: -speed,
        size: 2 + Math.random() * 3,
        colorStart: '#fff9c4',
        colorEnd: '#8d6e63',
        life: 800,
        maxLife: 800,
        type: 'ejecta',
      }
      rendererRef.current.addParticle(particle)
    }
  }

  const createEjectaLayer = (crater: Crater) => {
    if (!rendererRef.current) return

    const layerRadius = crater.radius * (1.5 + splashCoeff)
    const thickness = 5 + splashCoeff * 10

    rendererRef.current.addEjectaLayer({
      id: uuidv4(),
      x: crater.x,
      y: crater.y,
      radius: layerRadius,
      thickness,
      color: '#6d4c41',
      alpha: 0.6,
    })
  }

  const checkCraterChain = () => {
    if (!rendererRef.current) return

    const state = rendererRef.current.getState()
    const recentCraters = state.craters.filter(c => !c.isPreset).slice(-3)

    if (recentCraters.length < 3) return

    const sortedByX = [...recentCraters].sort((a, b) => a.x - b.x)
    
    const angle1 = Math.atan2(
      sortedByX[1].y - sortedByX[0].y,
      sortedByX[1].x - sortedByX[0].x
    )
    const angle2 = Math.atan2(
      sortedByX[2].y - sortedByX[1].y,
      sortedByX[2].x - sortedByX[1].x
    )
    
    const angleDiff = Math.abs(angle1 - angle2) * (180 / Math.PI)
    const normalizedDiff = Math.min(angleDiff, 360 - angleDiff)
    
    if (normalizedDiff > 5) return

    const dist1 = Math.sqrt(
      (sortedByX[1].x - sortedByX[0].x) ** 2 +
      (sortedByX[1].y - sortedByX[0].y) ** 2
    )
    const dist2 = Math.sqrt(
      (sortedByX[2].x - sortedByX[1].x) ** 2 +
      (sortedByX[2].y - sortedByX[1].y) ** 2
    )

    if (dist1 < 80 || dist1 > 160 || dist2 < 80 || dist2 > 160) return

    triggerRuneEvent(sortedByX)
  }

  const triggerRuneEvent = (craterChain: Crater[]) => {
    if (!rendererRef.current) return
    if (runesActive) return

    setRunesActive(true)
    setRuneClickOrder([])

    const midX = (craterChain[0].x + craterChain[2].x) / 2
    const midY = (craterChain[0].y + craterChain[2].y) / 2

    const crackCount = 12
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.3
      const length = 200 + Math.random() * 200

      const crack: Crack = {
        id: uuidv4(),
        startX: midX,
        startY: midY,
        endX: midX + Math.cos(angle) * length,
        endY: midY + Math.sin(angle) * length,
        width: 3 + Math.random() * 2,
        color: '#bcaaa4',
        life: 1200,
        maxLife: 1200,
      }
      rendererRef.current.addCrack(crack)
    }

    setTimeout(() => {
      spawnRunes(midX, midY, craterChain)
    }, 400)
  }

  const spawnRunes = (centerX: number, centerY: number, craterChain: Crater[]) => {
    if (!rendererRef.current) return

    const symbols: Rune['symbol'][] = ['triangle', 'hexagon', 'spiral', 'parallel', 'crescent']
    
    const sortedByRadius = [...craterChain].sort((a, b) => a.radius - b.radius)
    
    const runeCount = 5
    const runes: Rune[] = []
    const correctOrder: string[] = []

    const shuffledIndices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5)

    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2 - Math.PI / 2
      const radius = 80
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const rune: Rune = {
        id: uuidv4(),
        symbol: symbols[shuffledIndices[i]],
        x,
        y,
        size: 30,
        pulsePhase: Math.random() * Math.PI * 2,
        orderIndex: shuffledIndices[i],
        clicked: false,
      }
      runes.push(rune)
    }

    const sortedRunes = [...runes].sort((a, b) => a.orderIndex - b.orderIndex)
    for (const rune of sortedRunes) {
      correctOrder.push(rune.id)
    }

    rendererRef.current.setRunes(runes)
    setRuneCorrectOrder(correctOrder)
  }

  const handleLaunchButton = () => {
    if (isLaunched) return
    if (!rendererRef.current) return

    const state = rendererRef.current.getState()
    const targetX = state.aimX || canvasSize.width / 2
    const targetY = state.aimY || canvasSize.height / 2

    launchDebris(targetX, targetY)
  }

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      <UIOverlay
        score={score}
        impactCount={impactCount}
        angle={angle}
        power={power}
        splashCoeff={splashCoeff}
        craters={craters}
        canvasWidth={canvasSize.width}
        canvasHeight={canvasSize.height}
        onAngleChange={setAngle}
        onPowerChange={setPower}
        onSplashCoeffChange={setSplashCoeff}
        onLaunch={handleLaunchButton}
        isLaunched={isLaunched}
      />
    </div>
  )
}

export default CraterGame
