import { useEffect, useRef, useCallback } from 'react'
import type { CandleState, ScentNote, Particle } from '../types'

interface ParticleFieldProps {
  candle: CandleState
  scentNotes: ScentNote[]
}

const MAX_PARTICLES = 2000
const BASE_DIFFUSION_RADIUS = 300
const MIN_DIFFUSION_RADIUS = 200

export default function ParticleField({ candle, scentNotes }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const lastEmitRef = useRef<number>(0)
  const candleDataRef = useRef(candle)
  const scentDataRef = useRef(scentNotes)

  candleDataRef.current = candle
  scentDataRef.current = scentNotes

  const getDiffusionRadius = useCallback((burnTime: number) => {
    if (burnTime < 120000) return BASE_DIFFUSION_RADIUS
    const progress = Math.min((burnTime - 120000) / 1200000, 1)
    return BASE_DIFFUSION_RADIUS - progress * (BASE_DIFFUSION_RADIUS - MIN_DIFFUSION_RADIUS)
  }, [])

  const emitParticles = useCallback((now: number, candleCenter: { x: number; y: number }) => {
    const c = candleDataRef.current
    const notes = scentDataRef.current
    const activeScents = c.scents.filter((s) => s.percentage > 0)

    if (activeScents.length === 0) return

    const emitCount = Math.floor(30 + Math.random() * 20)
    const perScent = Math.max(1, Math.floor(emitCount / activeScents.length))

    for (const scent of activeScents) {
      const note = notes.find((n) => n.id === scent.noteId)
      if (!note) continue

      for (let i = 0; i < perScent; i++) {
        if (particlesRef.current.length >= MAX_PARTICLES) break

        const angle = Math.random() * Math.PI * 2
        const speed = 0.5 + Math.random() * 1.5
        const size = 4 + Math.random() * 4

        particlesRef.current.push({
          x: candleCenter.x + (Math.random() - 0.5) * 20,
          y: candleCenter.y + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: note.particleColor,
          size,
          opacity: 1,
          shape: note.particleShape,
          createdAt: now,
          lifespan: 4000,
        })
      }
    }
  }, [])

  const updateParticle = useCallback((p: Particle, dt: number, diffusionRadius: number, centerX: number, centerY: number) => {
    const age = dt - p.createdAt
    p.opacity = Math.max(0, 1 - age / p.lifespan)

    switch (p.shape) {
      case 'pulse':
        p.x += p.vx
        p.y += p.vy
        p.size = Math.max(2, p.size + Math.sin(age * 0.01) * 0.3)
        break
      case 'spiral':
        p.x += p.vx * Math.cos(age * 0.003) - p.vy * Math.sin(age * 0.003)
        p.y += p.vx * Math.sin(age * 0.003) + p.vy * Math.cos(age * 0.003)
        break
      case 'bubble':
        p.x += p.vx * 0.5
        p.y -= Math.abs(p.vy) * 1.2
        p.x += Math.sin(age * 0.005) * 0.5
        break
      case 'bounce':
        p.x += p.vx
        p.y += Math.abs(Math.sin(age * 0.004)) * p.vy * 2
        break
      case 'star': {
        const starAngle = age * 0.002
        p.x += p.vx + Math.cos(starAngle) * 0.5
        p.y += p.vy + Math.sin(starAngle) * 0.5
        break
      }
      case 'float':
        p.x += p.vx * 0.3 + Math.sin(age * 0.002) * 0.8
        p.y += p.vy * 0.3 + Math.cos(age * 0.001) * 0.5
        break
      case 'spiral_down':
        p.x += p.vx * Math.cos(-age * 0.003) - p.vy * Math.sin(-age * 0.003)
        p.y += Math.abs(p.vy) * 0.5
        break
      case 'wave':
        p.x += p.vx
        p.y += p.vy + Math.sin(age * 0.005) * 2
        break
      case 'zigzag':
        p.x += p.vx + (Math.floor(age / 200) % 2 === 0 ? 1 : -1) * 0.8
        p.y += p.vy
        break
      case 'slow_spread':
        p.x += p.vx * 0.2
        p.y += p.vy * 0.2
        break
      case 'random_walk':
        p.x += p.vx + (Math.random() - 0.5) * 2
        p.y += p.vy + (Math.random() - 0.5) * 2
        break
      case 'sink':
        p.x += p.vx * 0.5
        p.y += Math.abs(p.vy) * 0.8
        break
      default:
        p.x += p.vx
        p.y += p.vy
    }

    const dx = p.x - centerX
    const dy = p.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > diffusionRadius) {
      p.opacity = 0
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const candleCenter = { x: canvas.width / 2, y: canvas.height / 2 - 60 }

    const animate = (now: number) => {
      const c = candleDataRef.current
      if (!c.isBurning) {
        animFrameRef.current = requestAnimationFrame(animate)
        return
      }

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      if (now - lastEmitRef.current > 1000) {
        emitParticles(now, candleCenter)
        lastEmitRef.current = now
      }

      const diffusionRadius = getDiffusionRadius(c.burnTime)

      particlesRef.current = particlesRef.current.filter((p) => {
        updateParticle(p, now, diffusionRadius, candleCenter.x, candleCenter.y)
        return p.opacity > 0
      })

      ctx!.imageSmoothingEnabled = false

      for (const p of particlesRef.current) {
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color

        ctx!.beginPath()
        if (p.shape === 'star') {
          drawStar(ctx!, p.x, p.y, 5, p.size, p.size * 0.5)
        } else if (p.shape === 'zigzag') {
          ctx!.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
        } else {
          ctx!.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        }
        ctx!.fill()
      }

      ctx!.globalAlpha = 1
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [candle.id, candle.isBurning, emitParticles, getDiffusionRadius, updateParticle])

  return (
    <canvas
      ref={canvasRef}
      className="particle-canvas"
      style={{ pointerEvents: 'none' }}
    />
  )
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  let rot = (Math.PI / 2) * 3
  const step = Math.PI / spikes
  ctx.moveTo(cx, cy - outerR)
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR)
    rot += step
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR)
    rot += step
  }
  ctx.lineTo(cx, cy - outerR)
  ctx.closePath()
}
