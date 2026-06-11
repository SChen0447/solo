export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  size: number
  baseOpacity: number
  opacity: number
  fadeState: 'stable' | 'fadingIn' | 'fadingOut'
  fadeProgress: number
  colorIndex: number
}

export interface ParticleSystemParams {
  windSpeed: number
  concentration: number
  canvasWidth: number
  canvasHeight: number
}

const MIN_PARTICLES = 1500
const MAX_PARTICLES = 5000
const FADE_DURATION = 1000

export class ParticleSystem {
  private particles: Particle[] = []
  private params: ParticleSystemParams
  private targetCount: number
  private nextId = 0
  private colorStops: string[] = []

  constructor(params: ParticleSystemParams) {
    this.params = { ...params }
    this.targetCount = this.calculateTargetCount(params.concentration)
    this.initColorStops()
    this.initParticles()
  }

  private initColorStops(): void {
    const start = { r: 210, g: 180, b: 140 }
    const end = { r: 139, g: 115, b: 85 }
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      const r = Math.round(start.r + (end.r - start.r) * t)
      const g = Math.round(start.g + (end.g - start.g) * t)
      const b = Math.round(start.b + (end.b - start.b) * t)
      this.colorStops.push(`rgb(${r},${g},${b})`)
    }
  }

  private calculateTargetCount(concentration: number): number {
    const t = (concentration - 0.1) / 0.9
    return Math.round(MIN_PARTICLES + (MAX_PARTICLES - MIN_PARTICLES) * t)
  }

  private createParticle(initialFade = true): Particle {
    const size = 2 + Math.random() * 6
    const baseOpacity = 0.3 + Math.random() * 0.5
    const windBase = this.params.windSpeed * 0.3
    const vx = windBase + (Math.random() - 0.5) * 2
    const vy = (Math.random() - 0.5) * 1.5

    return {
      id: this.nextId++,
      x: Math.random() * this.params.canvasWidth,
      y: Math.random() * this.params.canvasHeight,
      vx,
      vy,
      size,
      baseOpacity,
      opacity: initialFade ? 0 : baseOpacity,
      fadeState: initialFade ? 'fadingIn' : 'stable',
      fadeProgress: initialFade ? 0 : 1,
      colorIndex: Math.floor(Math.random() * this.colorStops.length)
    }
  }

  private initParticles(): void {
    for (let i = 0; i < this.targetCount; i++) {
      this.particles.push(this.createParticle(false))
    }
  }

  public setWindSpeed(windSpeed: number): void {
    this.params.windSpeed = windSpeed
  }

  public setConcentration(concentration: number): void {
    this.params.concentration = concentration
    this.targetCount = this.calculateTargetCount(concentration)
  }

  public resize(width: number, height: number): void {
    this.params.canvasWidth = width
    this.params.canvasHeight = height
  }

  public getParticles(): Particle[] {
    return this.particles
  }

  public getColorStops(): string[] {
    return this.colorStops
  }

  public getParams(): ParticleSystemParams {
    return { ...this.params }
  }

  public reset(): void {
    this.particles = []
    this.nextId = 0
    this.targetCount = this.calculateTargetCount(this.params.concentration)
    this.initParticles()
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 32) / 16.67
    const { windSpeed, canvasWidth, canvasHeight } = this.params

    this.adjustParticleCount(dt)

    const windBase = windSpeed * 0.3

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.fadeState === 'fadingIn') {
        p.fadeProgress += deltaTime / FADE_DURATION
        if (p.fadeProgress >= 1) {
          p.fadeProgress = 1
          p.fadeState = 'stable'
        }
        p.opacity = p.baseOpacity * p.fadeProgress
      } else if (p.fadeState === 'fadingOut') {
        p.fadeProgress -= deltaTime / FADE_DURATION
        if (p.fadeProgress <= 0) {
          this.particles.splice(i, 1)
          continue
        }
        p.opacity = p.baseOpacity * p.fadeProgress
      }

      p.vx = windBase + (p.vx - windBase) * 0.95
      p.vy += (Math.random() - 0.5) * 0.1 * dt
      p.vy *= 0.99

      p.x += p.vx * dt
      p.y += p.vy * dt

      if (p.x > canvasWidth + 20) {
        p.x = -20
        p.y = Math.random() * canvasHeight
      } else if (p.x < -20) {
        p.x = canvasWidth + 20
        p.y = Math.random() * canvasHeight
      }

      if (p.y > canvasHeight + 20) {
        p.y = -20
        p.x = Math.random() * canvasWidth
      } else if (p.y < -20) {
        p.y = canvasHeight + 20
        p.x = Math.random() * canvasWidth
      }
    }
  }

  private adjustParticleCount(dt: number): void {
    const currentCount = this.particles.filter(p => p.fadeState !== 'fadingOut').length
    const diff = this.targetCount - currentCount

    if (diff > 0) {
      const addCount = Math.min(diff, Math.ceil(50 * dt))
      for (let i = 0; i < addCount; i++) {
        this.particles.push(this.createParticle(true))
      }
    } else if (diff < 0) {
      const removeCount = Math.min(-diff, Math.ceil(50 * dt))
      let removed = 0
      for (let i = this.particles.length - 1; i >= 0 && removed < removeCount; i--) {
        const p = this.particles[i]
        if (p.fadeState === 'stable') {
          p.fadeState = 'fadingOut'
          p.fadeProgress = 1
          removed++
        }
      }
    }
  }
}
