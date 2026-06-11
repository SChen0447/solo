import { v4 as uuidv4 } from 'uuid'

export type ToolType = 'brush' | 'pen' | 'dropper'

export interface InkPoint {
  id: string
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  pressure: number
  timestamp: number
}

export interface FiberParticle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  opacity: number
  life: number
  maxLife: number
}

export interface BezierControl {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Stroke {
  id: string
  tool: ToolType
  points: InkPoint[]
  particles: FiberParticle[]
  createdAt: number
}

const MAX_PARTICLES = 5000
const PARTICLE_LIFESPAN = 20

const globalParticlePool: FiberParticle[] = []

export function getParticlePool(): FiberParticle[] {
  return globalParticlePool
}

export function clearParticlePool(): void {
  globalParticlePool.length = 0
}

export function pressureToRadius(pressure: number, tool: ToolType): number {
  if (tool === 'pen') {
    return 1 + pressure * 1
  }
  if (tool === 'dropper') {
    return 1.5
  }
  const p = pressure < 0 ? 0.5 : pressure
  return 3 + p * 9
}

export function generateInkColor(tool: ToolType, factor: number = 0): string {
  if (tool === 'pen') {
    return '#1a1a1a'
  }
  const base = 26
  const darker = Math.max(0, Math.min(26, base - Math.floor(factor * 26)))
  const gray = base + Math.floor(factor * 32)
  const r = darker > 0 ? darker : gray
  const g = r
  const b = r
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function createInkPoint(
  x: number,
  y: number,
  pressure: number,
  tool: ToolType,
  customRadius?: number,
  customOpacity?: number,
): InkPoint {
  const radius = customRadius ?? pressureToRadius(pressure, tool)
  const randomFactor = Math.random()
  const jitterRadius = tool === 'brush'
    ? Math.max(2, Math.min(6, radius * (0.6 + randomFactor * 0.6)))
    : radius
  return {
    id: uuidv4(),
    x,
    y,
    radius: jitterRadius,
    color: generateInkColor(tool, randomFactor),
    opacity: customOpacity ?? 0.8,
    pressure,
    timestamp: Date.now(),
  }
}

export function bezierQuadratic(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

export function bezierCubic(
  p0: number, p1: number, p2: number, p3: number, t: number
): number {
  const mt = 1 - t
  return mt * mt * mt * p0
    + 3 * mt * mt * t * p1
    + 3 * mt * t * t * p2
    + t * t * t * p3
}

export function generateBezierControl(
  prev: InkPoint | null,
  curr: InkPoint,
  next: InkPoint
): BezierControl {
  const prevX = prev ? prev.x : curr.x
  const prevY = prev ? prev.y : curr.y
  const mid1x = (prevX + curr.x) / 2
  const mid1y = (prevY + curr.y) / 2
  const mid2x = (curr.x + next.x) / 2
  const mid2y = (curr.y + next.y) / 2
  return {
    x1: mid1x,
    y1: mid1y,
    x2: mid2x,
    y2: mid2y,
  }
}

export function generateBezierInkPoints(
  start: InkPoint,
  end: InkPoint,
  control?: BezierControl,
  spacing: number = 1.5,
  tool: ToolType = 'brush',
): InkPoint[] {
  const points: InkPoint[] = []
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  if (distance < 0.5) {
    return points
  }
  const steps = Math.max(1, Math.ceil(distance / spacing))

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let x: number
    let y: number
    if (control) {
      x = bezierCubic(start.x, control.x1, control.x2, end.x, t)
      y = bezierCubic(start.y, control.y1, control.y2, end.y, t)
    } else {
      x = start.x + dx * t
      y = start.y + dy * t
    }
    const pressure = start.pressure + (end.pressure - start.pressure) * t
    const baseRadius = start.radius + (end.radius - start.radius) * t
    const opacity = start.opacity + (end.opacity - start.opacity) * t
    points.push(createInkPoint(x, y, pressure, tool, baseRadius, opacity))
  }
  return points
}

export function generateFiberParticles(
  x: number,
  y: number,
  radius: number,
  tool: ToolType,
): FiberParticle[] {
  if (tool === 'pen') {
    return []
  }
  let count: number
  let maxSpeed: number
  let spread: number

  if (tool === 'dropper') {
    count = 100 + Math.floor(Math.random() * 51)
    maxSpeed = 1.2
    spread = 30
  } else {
    count = 20 + Math.floor(Math.random() * 21)
    maxSpeed = 1.5
    spread = radius * 2
  }

  const particles: FiberParticle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 0.5 + Math.random() * maxSpeed
    const offsetRatio = Math.random()
    particles.push({
      id: uuidv4(),
      x: x + Math.cos(angle) * offsetRatio * spread * 0.3,
      y: y + Math.sin(angle) * offsetRatio * spread * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 0.3 + Math.random() * 0.7,
      color: '#2a2a2a',
      opacity: 0.6 + Math.random() * 0.4,
      life: PARTICLE_LIFESPAN,
      maxLife: PARTICLE_LIFESPAN,
    })
  }
  return particles
}

export function generateRingParticles(
  x: number,
  y: number,
  innerRadius: number,
): InkPoint[] {
  const count = 6 + Math.floor(Math.random() * 5)
  const points: InkPoint[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const r = 10 + Math.random() * 10
    points.push(createInkPoint(
      x + Math.cos(angle) * (innerRadius + r),
      y + Math.sin(angle) * (innerRadius + r),
      0.3,
      'brush',
      2 + Math.random() * 3,
      0.3 + Math.random() * 0.2,
    ))
  }
  return points
}

export function addParticlesToPool(particles: FiberParticle[]): void {
  globalParticlePool.push(...particles)
  while (globalParticlePool.length > MAX_PARTICLES) {
    globalParticlePool.shift()
  }
}

export function updateParticles(): FiberParticle[] {
  const alive: FiberParticle[] = []
  for (const p of globalParticlePool) {
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.95
    p.vy *= 0.95
    p.life -= 1
    p.opacity = (p.life / p.maxLife) * 0.8
    if (p.life > 0) {
      alive.push(p)
    }
  }
  globalParticlePool.length = 0
  globalParticlePool.push(...alive)
  return alive
}

export function generateFiberTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const density = 0.3
  const totalLines = Math.floor(width * height * density)
  ctx.strokeStyle = '#d4cbb3'
  ctx.lineCap = 'round'
  for (let i = 0; i < totalLines; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const length = 3 + Math.random() * 3
    const angle = Math.random() * Math.PI
    ctx.lineWidth = 0.5 + Math.random() * 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    ctx.stroke()
  }
}
