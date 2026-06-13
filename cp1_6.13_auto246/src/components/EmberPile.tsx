import { useRef, useEffect, useCallback } from 'react'
import { useFireplaceStore, type EmotionType } from '@/store/fireplaceStore'

interface Particle {
  x: number
  y: number
  size: number
  color: string
  opacity: number
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
  emotion: EmotionType
  phase: number
  flickerPhase: number
}

interface EmberPileProps {
  onDrop?: (emotion: EmotionType) => void
}

const EMOTION_CONFIG: Record<EmotionType, {
  colors: [string, string]
  countRange: [number, number]
  sizeRange: [number, number]
  speedRange: [number, number]
  driftAngle: number
  baseOpacity: number
  special: 'none' | 'flicker' | 'sine'
}> = {
  joy: {
    colors: ['#ffd700', '#ff8c00'],
    countRange: [40, 60],
    sizeRange: [6, 12],
    speedRange: [0.5, 1.0],
    driftAngle: 15,
    baseOpacity: 0.6,
    special: 'none',
  },
  sadness: {
    colors: ['#4a90d9', '#6b7b8d'],
    countRange: [20, 30],
    sizeRange: [4, 8],
    speedRange: [0.3, 0.5],
    driftAngle: 8,
    baseOpacity: 0.5,
    special: 'none',
  },
  anger: {
    colors: ['#ff4500', '#dc143c'],
    countRange: [50, 80],
    sizeRange: [8, 16],
    speedRange: [1.0, 1.5],
    driftAngle: 25,
    baseOpacity: 0.7,
    special: 'flicker',
  },
  serenity: {
    colors: ['#98d8c8', '#c4e0d9'],
    countRange: [15, 25],
    sizeRange: [3, 6],
    speedRange: [0.2, 0.4],
    driftAngle: 10,
    baseOpacity: 0.4,
    special: 'sine',
  },
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16)
  const bh = parseInt(b.slice(1), 16)
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff
  const rr = Math.round(ar + (br - ar) * t)
  const rg = Math.round(ag + (bg - ag) * t)
  const rb = Math.round(ab + (bb - ab) * t)
  return `rgb(${rr},${rg},${rb})`
}

export default function EmberPile({ onDrop }: EmberPileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const charcoalsRef = useRef<Array<{ x: number; y: number; r: number; opacity: number }>>([])
  const prevEmberIdsRef = useRef<Set<string>>(new Set())
  const isOverRef = useRef(false)
  const dragEmotionRef = useRef<EmotionType | null>(null)

  const embers = useFireplaceStore((s) => s.embers)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const particleMultiplier = isMobile ? 0.7 : 1.0

  const spawnParticles = useCallback((emotion: EmotionType, canvasWidth: number, canvasHeight: number) => {
    const config = EMOTION_CONFIG[emotion]
    const count = Math.round(rand(config.countRange[0], config.countRange[1]) * particleMultiplier)
    const baseY = canvasHeight * 0.85
    const centerX = canvasWidth / 2
    const spreadX = canvasWidth * 0.3

    for (let i = 0; i < count; i++) {
      const size = rand(config.sizeRange[0], config.sizeRange[1])
      const speed = rand(config.speedRange[0], config.speedRange[1])
      const driftRad = (config.driftAngle * Math.PI) / 180
      const vx = rand(-Math.sin(driftRad), Math.sin(driftRad)) * speed
      const maxLife = rand(40, 80)

      particlesRef.current.push({
        x: centerX + rand(-spreadX / 2, spreadX / 2),
        y: baseY + rand(-10, 10),
        size,
        color: lerpColor(config.colors[0], config.colors[1], Math.random()),
        opacity: config.baseOpacity,
        velocityX: vx,
        velocityY: -speed,
        life: 0,
        maxLife,
        emotion,
        phase: Math.random() * Math.PI * 2,
        flickerPhase: Math.random() * Math.PI * 2,
      })
    }
  }, [particleMultiplier])

  const initCharcoals = useCallback((width: number, height: number) => {
    const baseY = height * 0.88
    const charcoals: Array<{ x: number; y: number; r: number; opacity: number }> = []
    const centerX = width / 2
    const spreadX = width * 0.35
    for (let i = 0; i < 50; i++) {
      charcoals.push({
        x: centerX + rand(-spreadX, spreadX),
        y: baseY + rand(-15, 15),
        r: rand(5, 15),
        opacity: rand(0.15, 0.4),
      })
    }
    charcoalsRef.current = charcoals
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (!container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * 0.9
      canvas.height = isMobile ? window.innerHeight * 0.5 : rect.height * 0.65
      canvas.style.width = `${canvas.width}px`
      canvas.style.height = `${canvas.height}px`
      initCharcoals(canvas.width, canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const render = () => {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'rgba(42, 27, 14, 0.3)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const dormant = embers.length === 0

      const charcoalOpacity = dormant ? 0.06 : 0.15
      charcoalsRef.current.forEach((c) => {
        const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r)
        gradient.addColorStop(0, `rgba(60, 40, 20, ${charcoalOpacity + 0.1})`)
        gradient.addColorStop(1, `rgba(30, 15, 5, ${charcoalOpacity})`)
        ctx.beginPath()
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      embers.forEach((ember) => {
        if (!prevEmberIdsRef.current.has(ember.id)) {
          spawnParticles(ember.emotion, canvas.width, canvas.height)
        }
      })
      const currentIds = new Set(embers.map((e) => e.id))
      prevEmberIdsRef.current = currentIds

      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife)

      particlesRef.current.forEach((p) => {
        p.life++
        const config = EMOTION_CONFIG[p.emotion]
        const lifeRatio = p.life / p.maxLife

        if (config.special === 'sine') {
          p.x += Math.sin(p.phase + p.life * 0.05) * 0.5
        } else {
          p.x += p.velocityX
        }
        p.y += p.velocityY

        let opacity: number
        if (config.special === 'flicker') {
          p.flickerPhase += 0.3
          opacity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(p.flickerPhase))
        } else {
          opacity = config.baseOpacity * (1 - lifeRatio)
        }
        p.opacity = Math.max(0, opacity)

        const currentSize = p.size * (1 - lifeRatio * 0.3)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.shadowBlur = currentSize * 2
        ctx.shadowColor = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.restore()
      })

      if (dormant) {
        const breathe = 0.4 + 0.3 * (0.5 + 0.5 * Math.sin(Date.now() * 0.002))
        ctx.save()
        ctx.globalAlpha = breathe
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.textAlign = 'center'
        ctx.fillText('向壁炉投入一份情绪……', canvas.width / 2, canvas.height * 0.5)
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [embers, spawnParticles, initCharcoals, isMobile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    isOverRef.current = true
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    isOverRef.current = false
    const emotion = e.dataTransfer.getData('emotion') as EmotionType
    if (emotion && onDrop) {
      onDrop(emotion)
    }
  }, [onDrop])

  return (
    <div
      className="fireplace-container"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="fireplace-frame">
        <canvas ref={canvasRef} className="fireplace-canvas" />
      </div>
    </div>
  )
}
