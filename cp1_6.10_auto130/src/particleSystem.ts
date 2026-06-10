import { Particle } from './particle'

export class ParticleSystem {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  particles: Particle[]
  mouseX: number
  mouseY: number
  mouseActive: boolean
  mouseSpeed: number
  lastMouseX: number
  lastMouseY: number
  time: number
  textMode: boolean
  textModeTimer: number
  explosionMode: boolean
  explosionTimer: number
  explosionCenterX: number
  explosionCenterY: number
  explosionPhase: 'gather' | 'disperse'
  glowX: number
  glowY: number
  spatialHash: Map<string, Particle[]>
  cellSize: number
  textTargetPoints: { x: number; y: number }[]
  permutation: number[]

  private static readonly PARTICLE_COUNT = 1500
  private static readonly TEXT_DURATION = 90
  private static readonly EXPLOSION_DURATION = 60
  private static readonly MAX_SPEED = 2
  private static readonly CONNECTION_DISTANCE = 30
  private static readonly GLOW_RADIUS = 60
  private static readonly TEXT_STRING = 'HELLO'

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.particles = []
    this.mouseX = 0
    this.mouseY = 0
    this.mouseActive = false
    this.mouseSpeed = 0
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.time = 0
    this.textMode = false
    this.textModeTimer = 0
    this.explosionMode = false
    this.explosionTimer = 0
    this.explosionCenterX = 0
    this.explosionCenterY = 0
    this.explosionPhase = 'gather'
    this.glowX = 0
    this.glowY = 0
    this.spatialHash = new Map()
    this.cellSize = ParticleSystem.CONNECTION_DISTANCE
    this.textTargetPoints = []
    this.permutation = this.generatePermutation()

    this.resize()
    this.createParticles()
    this.generateTextTargets()
  }

  private generatePermutation(): number[] {
    const p: number[] = []
    for (let i = 0; i < 512; i++) {
      p[i] = Math.floor(Math.random() * 256)
    }
    return p
  }

  private noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    const u = this.fade(xf)
    const v = this.fade(yf)
    const aa = this.permutation[(this.permutation[X] + Y) & 511]
    const ab = this.permutation[(this.permutation[X] + Y + 1) & 511]
    const ba = this.permutation[(this.permutation[X + 1] + Y) & 511]
    const bb = this.permutation[(this.permutation[X + 1] + Y + 1) & 511]
    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u)
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u)
    return this.lerp(x1, x2, v)
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  resize(): void {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    this.glowX = this.canvas.width / 2
    this.glowY = this.canvas.height / 2
  }

  createParticles(): void {
    this.particles = []
    for (let i = 0; i < ParticleSystem.PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(this.canvas.width, this.canvas.height))
    }
  }

  private generateTextTargets(): void {
    const offCanvas = document.createElement('canvas')
    const offCtx = offCanvas.getContext('2d')!
    const fontSize = 120
    offCanvas.width = this.canvas.width
    offCanvas.height = this.canvas.height
    offCtx.fillStyle = '#ffffff'
    offCtx.font = `bold ${fontSize}px Arial, sans-serif`
    offCtx.textAlign = 'center'
    offCtx.textBaseline = 'middle'
    offCtx.fillText(ParticleSystem.TEXT_STRING, this.canvas.width / 2, this.canvas.height / 2)

    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height)
    const data = imageData.data
    const step = 6
    const points: { x: number; y: number }[] = []

    for (let y = 0; y < offCanvas.height; y += step) {
      for (let x = 0; x < offCanvas.width; x += step) {
        const index = (y * offCanvas.width + x) * 4
        if (data[index + 3] > 128) {
          points.push({ x, y })
        }
      }
    }

    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[points[i], points[j]] = [points[j], points[i]]
    }

    this.textTargetPoints = points.slice(0, ParticleSystem.PARTICLE_COUNT)
  }

  regenerateTextTargets(): void {
    this.generateTextTargets()
  }

  setMousePosition(x: number, y: number): void {
    this.lastMouseX = this.mouseX
    this.lastMouseY = this.mouseY
    this.mouseX = x
    this.mouseY = y
    this.mouseActive = true
    const dx = x - this.lastMouseX
    const dy = y - this.lastMouseY
    this.mouseSpeed = Math.sqrt(dx * dx + dy * dy)

    if (this.mouseSpeed > 30 && !this.textMode && !this.explosionMode) {
      this.triggerTextMode()
    }
  }

  setMouseActive(active: boolean): void {
    this.mouseActive = active
  }

  triggerExplosion(x: number, y: number): void {
    this.explosionMode = true
    this.explosionTimer = ParticleSystem.EXPLOSION_DURATION
    this.explosionCenterX = x
    this.explosionCenterY = y
    this.explosionPhase = 'gather'
    this.textMode = false
  }

  triggerTextMode(): void {
    this.textMode = true
    this.textModeTimer = ParticleSystem.TEXT_DURATION
    this.regenerateTextTargets()

    const shuffled = [...this.particles].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length && i < this.textTargetPoints.length; i++) {
      shuffled[i].targetX = this.textTargetPoints[i].x
      shuffled[i].targetY = this.textTargetPoints[i].y
      shuffled[i].hasTarget = true
    }
  }

  private buildSpatialHash(): void {
    this.spatialHash.clear()
    for (const p of this.particles) {
      const cellX = Math.floor(p.x / this.cellSize)
      const cellY = Math.floor(p.y / this.cellSize)
      const key = `${cellX},${cellY}`
      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, [])
      }
      this.spatialHash.get(key)!.push(p)
    }
  }

  private getNearbyParticles(p: Particle): Particle[] {
    const nearby: Particle[] = []
    const cellX = Math.floor(p.x / this.cellSize)
    const cellY = Math.floor(p.y / this.cellSize)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`
        const cell = this.spatialHash.get(key)
        if (cell) {
          for (const other of cell) {
            if (other !== p) {
              nearby.push(other)
            }
          }
        }
      }
    }
    return nearby
  }

  private drawConnections(): void {
    this.buildSpatialHash()
    this.ctx.lineWidth = 1
    const maxDist = ParticleSystem.CONNECTION_DISTANCE

    for (const p of this.particles) {
      const nearby = this.getNearbyParticles(p)
      for (const other of nearby) {
        const dx = other.x - p.x
        const dy = other.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.6
          const color1 = this.parseColor(p.currentColor)
          const color2 = this.parseColor(other.currentColor)
          const r = Math.round((color1.r + color2.r) / 2)
          const g = Math.round((color1.g + color2.g) / 2)
          const b = Math.round((color1.b + color2.b) / 2)
          this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
          this.ctx.beginPath()
          this.ctx.moveTo(p.x, p.y)
          this.ctx.lineTo(other.x, other.y)
          this.ctx.stroke()
        }
      }
    }
  }

  private parseColor(str: string): { r: number; g: number; b: number } {
    const match = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      }
    }
    return { r: 0, g: 212, b: 255 }
  }

  private drawGlow(): void {
    if (!this.mouseActive) return
    const gradient = this.ctx.createRadialGradient(
      this.glowX,
      this.glowY,
      0,
      this.glowX,
      this.glowY,
      ParticleSystem.GLOW_RADIUS
    )
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(this.glowX, this.glowY, ParticleSystem.GLOW_RADIUS, 0, Math.PI * 2)
    this.ctx.fill()
  }

  update(): void {
    this.time += 0.005

    const glowEase = 0.1
    this.glowX += (this.mouseX - this.glowX) * glowEase
    this.glowY += (this.mouseY - this.glowY) * glowEase

    if (this.textMode) {
      this.textModeTimer--
      if (this.textModeTimer <= 0) {
        this.textMode = false
        for (const p of this.particles) {
          p.hasTarget = false
        }
      }
    }

    if (this.explosionMode) {
      this.explosionTimer--
      if (this.explosionTimer <= ParticleSystem.EXPLOSION_DURATION / 2) {
        this.explosionPhase = 'disperse'
      }
      if (this.explosionTimer <= 0) {
        this.explosionMode = false
      }
    }

    const flowScale = 0.003
    for (const p of this.particles) {
      const noiseVal = this.noise2D(p.x * flowScale + this.time, p.y * flowScale + this.time)
      const angle = noiseVal * Math.PI * 4
      const flowVx = Math.cos(angle)
      const flowVy = Math.sin(angle)

      p.update(
        flowVx,
        flowVy,
        this.mouseX,
        this.mouseY,
        this.mouseActive,
        this.canvas.width,
        this.canvas.height,
        this.textMode,
        this.explosionMode,
        this.explosionTimer,
        this.explosionCenterX,
        this.explosionCenterY,
        ParticleSystem.MAX_SPEED
      )
    }
  }

  draw(): void {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.drawConnections()

    for (const p of this.particles) {
      p.draw(this.ctx)
    }

    this.drawGlow()
  }
}
