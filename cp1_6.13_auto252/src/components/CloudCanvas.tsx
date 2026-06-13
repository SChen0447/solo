import { useEffect, useRef, useCallback } from 'react'

interface Flavor {
  id: string
  name: string
  votes: number
  color: string
}

interface Explosion {
  id: string
  x: number
  y: number
  color: string
  startTime: number
}

interface Particle {
  id: string
  flavor: Flavor
  x: number
  y: number
  vx: number
  vy: number
  baseWidth: number
  opacity: number
  bounceFlash: number
  isNew: boolean
  newStartTime: number
}

interface ExplosionParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
  size: number
}

interface CloudCanvasProps {
  flavors: Flavor[]
  explosions: Explosion[]
  onVote: (id: string, x: number, y: number, color: string) => void
}

const GRAVITY_DISTANCE = 80
const TOP_GRAVITY_DISTANCE = 120
const GRAVITY_STRENGTH = 0.15
const MIN_SPEED = 0.3
const MAX_SPEED = 0.8
const MIN_WIDTH = 50
const MAX_WIDTH = 120

function CloudCanvas({ flavors, explosions, onVote }: CloudCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Map<string, Particle>>(new Map())
  const explosionParticlesRef = useRef<ExplosionParticle[]>([])
  const animFrameRef = useRef<number>(0)
  const explosionsRef = useRef<Explosion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  explosionsRef.current = explosions

  const getCanvasSize = useCallback(() => {
    if (!containerRef.current) return { width: window.innerWidth, height: window.innerHeight }
    return {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    }
  }, [])

  const calculateBaseWidth = useCallback((votes: number, maxVotes: number) => {
    if (maxVotes === 0) return MIN_WIDTH
    const ratio = Math.min(votes / Math.max(maxVotes, 1), 1)
    return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * ratio
  }, [])

  const initParticle = useCallback((flavor: Flavor, maxVotes: number, canvasWidth: number, canvasHeight: number, isNew = false): Particle => {
    const baseWidth = calculateBaseWidth(flavor.votes, maxVotes)
    return {
      id: flavor.id,
      flavor,
      x: isNew ? canvasWidth / 2 : Math.random() * (canvasWidth - baseWidth * 2) + baseWidth,
      y: isNew ? canvasHeight / 2 : Math.random() * (canvasHeight - baseWidth * 2) + baseWidth,
      vx: (Math.random() - 0.5) * 2 * (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)),
      vy: (Math.random() - 0.5) * 2 * (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)),
      baseWidth,
      opacity: 1,
      bounceFlash: 0,
      isNew,
      newStartTime: isNew ? Date.now() : 0
    }
  }, [calculateBaseWidth])

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    const particles: ExplosionParticle[] = []
    const count = 30
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1,
        maxLife: 1500,
        size: 3 + Math.random() * 4
      })
    }
    explosionParticlesRef.current.push(...particles)
  }, [])

  const drawRoundedRect = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }, [])

  const drawFlavorCard = useCallback((
    ctx: CanvasRenderingContext2D,
    particle: Particle,
    scale: number,
    color: string,
    opacity: number
  ) => {
    const width = particle.baseWidth * scale
    const height = width * 0.5
    const x = particle.x - width / 2
    const y = particle.y - height / 2
    const radius = 6

    ctx.save()
    ctx.globalAlpha = opacity

    if (particle.bounceFlash > 0) {
      ctx.shadowBlur = 20 * particle.bounceFlash
      ctx.shadowColor = '#ffffff'
    } else {
      ctx.shadowBlur = 8
      ctx.shadowColor = color
    }

    ctx.strokeStyle = color
    ctx.lineWidth = 0.5
    drawRoundedRect(ctx, x, y, width, height, radius)
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(20, 24, 41, 0.85)'
    drawRoundedRect(ctx, x, y, width, height, radius)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = `${Math.max(10, width * 0.13)}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(particle.flavor.name, particle.x, particle.y)

    ctx.restore()
  }, [drawRoundedRect])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const particles = particlesRef.current
    for (const particle of particles.values()) {
      const scale = 1
      const width = particle.baseWidth * scale
      const height = width * 0.5
      if (
        clickX >= particle.x - width / 2 &&
        clickX <= particle.x + width / 2 &&
        clickY >= particle.y - height / 2 &&
        clickY <= particle.y + height / 2
      ) {
        onVote(particle.flavor.id, particle.x, particle.y, particle.flavor.color)
        break
      }
    }
  }, [onVote])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      const { width, height } = getCanvasSize()
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let lastExplosionIds = new Set<string>()

    const animate = () => {
      const { width: canvasWidth, height: canvasHeight } = getCanvasSize()
      
      const sortedFlavors = [...flavors].sort((a, b) => b.votes - a.votes)
      const maxVotes = sortedFlavors.length > 0 ? sortedFlavors[0].votes : 1
      const top3Ids = new Set(sortedFlavors.slice(0, 3).map(f => f.id))
      const bottom3Ids = new Set(sortedFlavors.slice(-3).map(f => f.id))

      const currentParticles = particlesRef.current
      const newParticles = new Map<string, Particle>()

      for (const flavor of flavors) {
        if (currentParticles.has(flavor.id)) {
          const p = currentParticles.get(flavor.id)!
          p.flavor = flavor
          p.baseWidth = calculateBaseWidth(flavor.votes, maxVotes)
          newParticles.set(flavor.id, p)
        } else {
          const newP = initParticle(flavor, maxVotes, canvasWidth, canvasHeight, true)
          newParticles.set(flavor.id, newP)
        }
      }

      particlesRef.current = newParticles

      for (const exp of explosionsRef.current) {
        if (!lastExplosionIds.has(exp.id)) {
          createExplosion(exp.x, exp.y, exp.color)
        }
      }
      lastExplosionIds = new Set(explosionsRef.current.map(e => e.id))

      const particlesArray = Array.from(newParticles.values())

      for (let i = 0; i < particlesArray.length; i++) {
        const p1 = particlesArray[i]

        if (p1.isNew) {
          const elapsed = Date.now() - p1.newStartTime
          const progress = Math.min(elapsed / 500, 1)
          const easeOut = 1 - Math.pow(1 - progress, 3)
          const targetX = p1.x
          const targetY = p1.y
          if (progress < 1) {
            p1.x = canvasWidth / 2 + (targetX - canvasWidth / 2) * easeOut
            p1.y = canvasHeight / 2 + (targetY - canvasHeight / 2) * easeOut
          } else {
            p1.isNew = false
          }
          continue
        }

        for (let j = i + 1; j < particlesArray.length; j++) {
          const p2 = particlesArray[j]
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          const gDist = (top3Ids.has(p1.flavor.id) || top3Ids.has(p2.flavor.id)) 
            ? TOP_GRAVITY_DISTANCE 
            : GRAVITY_DISTANCE

          if (dist < gDist && dist > 0) {
            const force = (gDist - dist) / gDist * GRAVITY_STRENGTH
            p1.vx += (dx / dist) * force * 0.1
            p1.vy += (dy / dist) * force * 0.1
            p2.vx -= (dx / dist) * force * 0.1
            p2.vy -= (dy / dist) * force * 0.1
          }
        }
      }

      for (const particle of particlesArray) {
        if (particle.isNew) continue

        const isBottom = bottom3Ids.has(particle.flavor.id)
        if (isBottom) {
          const edgeMargin = 50
          const centerX = canvasWidth / 2
          const centerY = canvasHeight / 2
          const dx = particle.x - centerX
          const dy = particle.y - centerY
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist > 0) {
            particle.vx += (dx / dist) * 0.02
            particle.vy += (dy / dist) * 0.02
          }
        }

        particle.x += particle.vx
        particle.y += particle.vy

        const w = particle.baseWidth * 0.5
        const h = particle.baseWidth * 0.25

        if (particle.x - w < 0) {
          particle.x = w
          particle.vx = Math.abs(particle.vx) * 0.8
          particle.bounceFlash = 1
        } else if (particle.x + w > canvasWidth) {
          particle.x = canvasWidth - w
          particle.vx = -Math.abs(particle.vx) * 0.8
          particle.bounceFlash = 1
        }

        if (particle.y - h < 0) {
          particle.y = h
          particle.vy = Math.abs(particle.vy) * 0.8
          particle.bounceFlash = 1
        } else if (particle.y + h > canvasHeight) {
          particle.y = canvasHeight - h
          particle.vy = -Math.abs(particle.vy) * 0.8
          particle.bounceFlash = 1
        }

        if (particle.bounceFlash > 0) {
          particle.bounceFlash -= 0.05
          if (particle.bounceFlash < 0) particle.bounceFlash = 0
        }

        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy)
        if (speed > MAX_SPEED * 1.5) {
          particle.vx = (particle.vx / speed) * MAX_SPEED * 1.5
          particle.vy = (particle.vy / speed) * MAX_SPEED * 1.5
        } else if (speed < MIN_SPEED * 0.5) {
          if (speed > 0) {
            particle.vx = (particle.vx / speed) * MIN_SPEED * 0.5
            particle.vy = (particle.vy / speed) * MIN_SPEED * 0.5
          }
        }
      }

      explosionParticlesRef.current = explosionParticlesRef.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.98
        p.vy *= 0.98
        p.life -= 16 / p.maxLife
        return p.life > 0
      })

      ctx.clearRect(0, 0, canvasWidth, canvasHeight)

      const bgGradient = ctx.createRadialGradient(
        canvasWidth / 2, canvasHeight / 2, 0,
        canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.7
      )
      bgGradient.addColorStop(0, '#141829')
      bgGradient.addColorStop(1, '#0b0e14')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)

      for (const particle of particlesArray) {
        let scale = 1
        let color = particle.flavor.color
        let opacity = 1

        if (top3Ids.has(particle.flavor.id)) {
          scale = 1.5
          color = '#feca57'
        }
        if (bottom3Ids.has(particle.flavor.id)) {
          scale = 0.7
          opacity = 0.3
        }

        drawFlavorCard(ctx, particle, scale, color, opacity)
      }

      for (const p of explosionParticlesRef.current) {
        ctx.save()
        ctx.globalAlpha = p.life
        ctx.fillStyle = p.color
        ctx.shadowBlur = 10
        ctx.shadowColor = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [flavors, getCanvasSize, initParticle, calculateBaseWidth, createExplosion, drawFlavorCard])

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '70%',
        height: '100%',
        cursor: 'pointer'
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ display: 'block' }}
      />
    </div>
  )
}

export default CloudCanvas
