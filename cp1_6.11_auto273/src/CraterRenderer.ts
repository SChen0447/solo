export interface Crater {
  id: string
  x: number
  y: number
  radius: number
  depth: number
  isPreset: boolean
  radiationRays: number
  age: number
  merged?: boolean
  mergePartnerId?: string
}

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  colorStart: string
  colorEnd: string
  life: number
  maxLife: number
  type: 'trail' | 'explosion' | 'ejecta' | 'smoke' | 'goldRain'
}

export interface Rune {
  id: string
  symbol: 'triangle' | 'hexagon' | 'spiral' | 'parallel' | 'crescent'
  x: number
  y: number
  size: number
  pulsePhase: number
  orderIndex: number
  clicked: boolean
}

export interface Crack {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  color: string
  life: number
  maxLife: number
}

export interface Debris {
  id: string
  x: number
  y: number
  size: number
  color: string
  rotation: number
  rotationSpeed: number
  ascending: boolean
}

export interface EjectaLayer {
  id: string
  x: number
  y: number
  radius: number
  thickness: number
  color: string
  alpha: number
}

export interface RendererState {
  craters: Crater[]
  particles: Particle[]
  runes: Rune[]
  cracks: Crack[]
  debrisList: Debris[]
  ejectaLayers: EjectaLayer[]
  aimX: number
  aimY: number
  isAiming: boolean
  aimVisible: boolean
  launchPadX: number
  launchPadY: number
  currentDebris: Debris | null
  debrisInFlight: boolean
  debrisTrail: { x: number; y: number; alpha: number }[]
  goldRainActive: boolean
}

export class CraterRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number = 0
  private height: number = 0
  private state: RendererState
  private animationFrameId: number | null = null
  private lastTime: number = 0
  private debrisSpawnTimer: number = 0
  private readonly DEBRIS_SPAWN_INTERVAL: number = 2000
  private aimPulsePhase: number = 0
  private runePulseTime: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx

    this.state = {
      craters: [],
      particles: [],
      runes: [],
      cracks: [],
      debrisList: [],
      ejectaLayers: [],
      aimX: 0,
      aimY: 0,
      isAiming: false,
      aimVisible: false,
      launchPadX: 100,
      launchPadY: 0,
      currentDebris: null,
      debrisInFlight: false,
      debrisTrail: [],
      goldRainActive: false,
    }

    this.resize()
    this.generatePresetCraters()
    this.updateLaunchPadPosition()
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = rect.width * window.devicePixelRatio
    this.canvas.height = rect.height * window.devicePixelRatio
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }

  private updateLaunchPadPosition(): void {
    this.state.launchPadX = this.width * 0.12
    this.state.launchPadY = this.height * 0.82
  }

  private generatePresetCraters(): void {
    const craters: Crater[] = []
    const count = 15 + Math.floor(Math.random() * 10)
    
    for (let i = 0; i < count; i++) {
      const radius = 20 + Math.random() * 55
      craters.push({
        id: `preset-${i}`,
        x: 100 + Math.random() * (this.width - 200),
        y: 100 + Math.random() * (this.height * 0.6),
        radius,
        depth: 0.3 + Math.random() * 0.5,
        isPreset: true,
        radiationRays: Math.floor(3 + Math.random() * 6),
        age: 1,
      })
    }
    
    this.state.craters = craters
  }

  public getState(): RendererState {
    return this.state
  }

  public setAimPosition(x: number, y: number, isAiming: boolean, visible: boolean = true): void {
    this.state.aimX = x
    this.state.aimY = y
    this.state.isAiming = isAiming
    this.state.aimVisible = visible
  }

  public addCrater(crater: Crater): void {
    this.state.craters.push(crater)
  }

  public addParticle(particle: Particle): void {
    this.state.particles.push(particle)
  }

  public addCrack(crack: Crack): void {
    this.state.cracks.push(crack)
  }

  public setRunes(runes: Rune[]): void {
    this.state.runes = runes
  }

  public addEjectaLayer(layer: EjectaLayer): void {
    this.state.ejectaLayers.push(layer)
  }

  public setGoldRainActive(active: boolean): void {
    this.state.goldRainActive = active
  }

  public launchDebris(targetX: number, targetY: number, angle: number, power: number): Debris {
    const debris: Debris = {
      id: `debris-${Date.now()}`,
      x: this.state.launchPadX,
      y: this.state.launchPadY - 30,
      size: 15 + Math.random() * 15,
      color: '#ff8f00',
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      ascending: true,
    }
    this.state.currentDebris = debris
    this.state.debrisInFlight = true
    this.state.debrisTrail = []
    return debris
  }

  public resetDebris(): void {
    this.state.currentDebris = null
    this.state.debrisInFlight = false
    this.state.debrisTrail = []
  }

  public start(): void {
    this.lastTime = performance.now()
    this.loop()
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private loop = (): void => {
    const now = performance.now()
    const dt = Math.min(now - this.lastTime, 50)
    this.lastTime = now

    if (this.width > 0 && this.height > 0) {
      this.update(dt)
      this.render()
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    this.aimPulsePhase += dt * 0.005
    this.runePulseTime += dt * 0.001
    this.debrisSpawnTimer += dt

    if (this.debrisSpawnTimer >= this.DEBRIS_SPAWN_INTERVAL && !this.state.debrisInFlight) {
      this.spawnRotatingDebris()
      this.debrisSpawnTimer = 0
    }

    this.updateRotatingDebris(dt)
    this.updateParticles(dt)
    this.updateCracks(dt)

    if (this.state.goldRainActive) {
      this.updateGoldRain(dt)
    }
  }

  private spawnRotatingDebris(): void {
    if (this.state.debrisList.length >= 3) return
    
    const debris: Debris = {
      id: `rot-${Date.now()}-${Math.random()}`,
      x: this.state.launchPadX + (Math.random() - 0.5) * 40,
      y: this.state.launchPadY - 20 - Math.random() * 30,
      size: 10 + Math.random() * 20,
      color: `hsl(${30 + Math.random() * 20}, 100%, ${50 + Math.random() * 20}%)`,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      ascending: true,
    }
    this.state.debrisList.push(debris)
  }

  private updateRotatingDebris(dt: number): void {
    this.state.debrisList = this.state.debrisList.filter(d => {
      d.rotation += d.rotationSpeed * dt
      d.y += d.ascending ? -0.02 * dt : 0.01 * dt
      
      if (d.y < this.state.launchPadY - 80) d.ascending = false
      if (d.y > this.state.launchPadY - 10) d.ascending = true
      
      return true
    })
  }

  private updateParticles(dt: number): void {
    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * dt * 0.06
      p.y += p.vy * dt * 0.06
      
      if (p.type === 'ejecta' || p.type === 'goldRain') {
        p.vy += 0.3 * dt * 0.06
      }
      if (p.type === 'smoke') {
        p.vy -= 0.05 * dt * 0.06
        p.size += 0.02 * dt
      }
      
      p.life -= dt
      return p.life > 0
    })
  }

  private updateCracks(dt: number): void {
    this.state.cracks = this.state.cracks.filter(c => {
      c.life -= dt
      return c.life > 0
    })
  }

  private updateGoldRain(dt: number): void {
    if (Math.random() < 0.3) {
      this.state.particles.push({
        id: `gold-${Date.now()}-${Math.random()}`,
        x: Math.random() * this.width,
        y: -20,
        vx: (Math.random() - 0.5) * 20,
        vy: 200 + Math.random() * 100,
        size: 5 + Math.random() * 5,
        colorStart: '#ffd54f',
        colorEnd: '#ffb300',
        life: 3000,
        maxLife: 3000,
        type: 'goldRain',
      })
    }
  }

  private render(): void {
    const ctx = this.ctx
    
    ctx.clearRect(0, 0, this.width, this.height)
    
    this.drawSurfaceBackground()
    this.drawEjectaLayers()
    this.drawCraters()
    this.drawCracks()
    this.drawParticles()
    this.drawLaunchPad()
    this.drawRotatingDebris()
    this.drawFlyingDebris()
    this.drawAimCrosshair()
    this.drawRunes()
  }

  private drawSurfaceBackground(): void {
    const ctx = this.ctx
    
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#2c2c2c')
    gradient.addColorStop(1, '#c0c0c0')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
    
    ctx.save()
    ctx.globalAlpha = 0.08
    for (let i = 0; i < 50; i++) {
      const x = (i * 137) % this.width
      const y = (i * 89) % this.height
      const r = 20 + (i % 5) * 15
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
    
    ctx.save()
    ctx.globalAlpha = 0.05
    for (let i = 0; i < 30; i++) {
      const x = (i * 193 + 50) % this.width
      const y = (i * 127 + 30) % this.height
      const r = 30 + (i % 7) * 10
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, '#000000')
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  private drawEjectaLayers(): void {
    const ctx = this.ctx
    for (const layer of this.state.ejectaLayers) {
      ctx.save()
      ctx.globalAlpha = layer.alpha
      ctx.fillStyle = layer.color
      ctx.beginPath()
      ctx.arc(layer.x, layer.y, layer.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawCraters(): void {
    const ctx = this.ctx
    
    for (const crater of this.state.craters) {
      this.drawSingleCrater(crater)
    }
  }

  private drawSingleCrater(crater: Crater): void {
    const ctx = this.ctx
    const { x, y, radius, depth, radiationRays, isPreset } = crater
    
    const rimGradient = ctx.createRadialGradient(
      x - radius * 0.2, y - radius * 0.2, 0,
      x, y, radius * 1.1
    )
    rimGradient.addColorStop(0, '#d0d0d0')
    rimGradient.addColorStop(0.7, '#8a8a8a')
    rimGradient.addColorStop(1, '#5a5a5a')
    
    ctx.fillStyle = rimGradient
    ctx.beginPath()
    ctx.arc(x, y, radius * 1.08, 0, Math.PI * 2)
    ctx.fill()
    
    const innerGradient = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    )
    const depthFactor = isPreset ? 0.5 : depth
    innerGradient.addColorStop(0, `rgb(${60 + depthFactor * 40}, ${60 + depthFactor * 40}, ${60 + depthFactor * 40})`)
    innerGradient.addColorStop(0.6, `rgb(${30 + depthFactor * 30}, ${30 + depthFactor * 30}, ${30 + depthFactor * 30})`)
    innerGradient.addColorStop(1, `rgb(${15 + depthFactor * 20}, ${15 + depthFactor * 20}, ${15 + depthFactor * 20})`)
    
    ctx.fillStyle = innerGradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.save()
    ctx.globalAlpha = 0.4
    const shadowGradient = ctx.createRadialGradient(
      x + radius * 0.3, y + radius * 0.3, 0,
      x + radius * 0.3, y + radius * 0.3, radius * 0.6
    )
    shadowGradient.addColorStop(0, 'rgba(0,0,0,0.5)')
    shadowGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = shadowGradient
    ctx.beginPath()
    ctx.arc(x + radius * 0.15, y + radius * 0.15, radius * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    
    if (radiationRays > 0 && !isPreset) {
      this.drawRadiationRays(x, y, radius, radiationRays, depth)
    } else if (isPreset && radiationRays > 0) {
      this.drawRadiationRays(x, y, radius, radiationRays, 0.5)
    }
  }

  private drawRadiationRays(
    cx: number, cy: number, radius: number,
    rayCount: number, depth: number
  ): void {
    const ctx = this.ctx
    const rayLength = radius * (1.5 + depth * 2)
    
    ctx.save()
    ctx.globalAlpha = 0.3 + depth * 0.3
    ctx.strokeStyle = '#9e9e9e'
    ctx.lineWidth = 1.5
    
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + Math.random() * 0.2
      const innerR = radius * 1.05
      const outerR = rayLength * (0.7 + Math.random() * 0.5)
      
      const x1 = cx + Math.cos(angle) * innerR
      const y1 = cy + Math.sin(angle) * innerR
      const x2 = cx + Math.cos(angle) * outerR
      const y2 = cy + Math.sin(angle) * outerR
      
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      gradient.addColorStop(0, 'rgba(200,200,200,0.6)')
      gradient.addColorStop(1, 'rgba(200,200,200,0)')
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2 - depth
      
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawCracks(): void {
    const ctx = this.ctx
    
    for (const crack of this.state.cracks) {
      const alpha = crack.life / crack.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = crack.color
      ctx.lineWidth = crack.width
      ctx.lineCap = 'round'
      
      ctx.beginPath()
      ctx.moveTo(crack.startX, crack.startY)
      
      const segments = 5
      for (let i = 1; i <= segments; i++) {
        const t = i / segments
        const x = crack.startX + (crack.endX - crack.startX) * t
        const y = crack.startY + (crack.endY - crack.startY) * t
        const offset = (Math.random() - 0.5) * 15
        const perpAngle = Math.atan2(crack.endY - crack.startY, crack.endX - crack.startX) + Math.PI / 2
        ctx.lineTo(
          x + Math.cos(perpAngle) * offset,
          y + Math.sin(perpAngle) * offset
        )
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx
    
    for (const p of this.state.particles) {
      const alpha = p.life / p.maxLife
      
      let color = p.colorStart
      if (p.type === 'trail' || p.type === 'explosion' || p.type === 'ejecta') {
        const t = 1 - alpha
        color = this.lerpColor(p.colorStart, p.colorEnd, t)
      }
      
      ctx.save()
      ctx.globalAlpha = alpha * (p.type === 'smoke' ? 0.7 : 1)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1)
    const c2 = this.hexToRgb(color2)
    if (!c1 || !c2) return color1
    
    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)
    return `rgb(${r},${g},${b})`
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  private drawLaunchPad(): void {
    const ctx = this.ctx
    const { launchPadX: x, launchPadY: y } = this.state
    
    const size = 50
    
    ctx.save()
    ctx.translate(x, y)
    
    const gradient = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.3)
    gradient.addColorStop(0, '#78909c')
    gradient.addColorStop(0.5, '#546e7a')
    gradient.addColorStop(1, '#37474f')
    
    ctx.fillStyle = gradient
    ctx.strokeStyle = '#90a4ae'
    ctx.lineWidth = 2
    
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
      const px = Math.cos(angle) * size
      const py = Math.sin(angle) * size * 0.5
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.strokeStyle = '#607d8b'
    ctx.lineWidth = 1
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * size * 0.8, Math.sin(angle) * size * 0.4)
      ctx.stroke()
    }
    
    ctx.fillStyle = '#ff6f00'
    ctx.beginPath()
    ctx.arc(0, -size * 0.15, 8, 0, Math.PI * 2)
    ctx.fill()
    
    const glowGradient = ctx.createRadialGradient(
      0, -size * 0.15, 0,
      0, -size * 0.15, 25
    )
    glowGradient.addColorStop(0, 'rgba(255,171,0,0.4)')
    glowGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(0, -size * 0.15, 25, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }

  private drawRotatingDebris(): void {
    const ctx = this.ctx
    
    for (const debris of this.state.debrisList) {
      ctx.save()
      ctx.translate(debris.x, debris.y)
      ctx.rotate(debris.rotation)
      
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, debris.size * 1.5)
      glowGradient.addColorStop(0, 'rgba(255,171,0,0.6)')
      glowGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(0, 0, debris.size * 1.5, 0, Math.PI * 2)
      ctx.fill()
      
      const bodyGradient = ctx.createRadialGradient(
        -debris.size * 0.3, -debris.size * 0.3, 0,
        0, 0, debris.size
      )
      bodyGradient.addColorStop(0, '#ffab00')
      bodyGradient.addColorStop(0.5, '#ff6f00')
      bodyGradient.addColorStop(1, '#e65100')
      ctx.fillStyle = bodyGradient
      
      ctx.beginPath()
      const points = 7
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2
        const r = debris.size * (0.7 + Math.sin(i * 2.5) * 0.3)
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      
      ctx.restore()
    }
  }

  private drawFlyingDebris(): void {
    if (!this.state.currentDebris) return
    
    const ctx = this.ctx
    const debris = this.state.currentDebris
    
    ctx.save()
    ctx.translate(debris.x, debris.y)
    ctx.rotate(debris.rotation)
    
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, debris.size * 2)
    glowGradient.addColorStop(0, 'rgba(255,171,0,0.8)')
    glowGradient.addColorStop(0.4, 'rgba(255,111,0,0.4)')
    glowGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(0, 0, debris.size * 2, 0, Math.PI * 2)
    ctx.fill()
    
    const bodyGradient = ctx.createRadialGradient(
      -debris.size * 0.3, -debris.size * 0.3, 0,
      0, 0, debris.size
    )
    bodyGradient.addColorStop(0, '#ffab00')
    bodyGradient.addColorStop(0.5, '#ff6f00')
    bodyGradient.addColorStop(1, '#bf360c')
    ctx.fillStyle = bodyGradient
    
    ctx.beginPath()
    const points = 8
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2
      const r = debris.size * (0.7 + Math.sin(i * 3) * 0.25)
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    
    ctx.strokeStyle = '#ffcc80'
    ctx.lineWidth = 1.5
    ctx.stroke()
    
    ctx.restore()
  }

  private drawAimCrosshair(): void {
    if (!this.state.aimVisible) return
    
    const ctx = this.ctx
    const { aimX: x, aimY: y } = this.state
    const size = 30
    const pulse = 1 + Math.sin(this.aimPulsePhase) * 0.15
    
    ctx.save()
    ctx.translate(x, y)
    
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2 * pulse)
    glowGradient.addColorStop(0, 'rgba(255,204,128,0.3)')
    glowGradient.addColorStop(0.5, 'rgba(255,204,128,0.1)')
    glowGradient.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGradient
    ctx.beginPath()
    ctx.arc(0, 0, size * 2 * pulse, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.strokeStyle = '#ffcc80'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * 15 * Math.PI) / 180
      ctx.save()
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(-size * pulse, 0)
      ctx.lineTo(-size * 0.5 * pulse, 0)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(size * 0.5 * pulse, 0)
      ctx.lineTo(size * pulse, 0)
      ctx.stroke()
      ctx.restore()
    }
    
    ctx.setLineDash([])
    ctx.fillStyle = '#ffcc80'
    ctx.beginPath()
    ctx.arc(0, 0, 3, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()
  }

  private drawRunes(): void {
    if (this.state.runes.length === 0) return
    
    const ctx = this.ctx
    
    for (const rune of this.state.runes) {
      const pulse = 0.7 + Math.sin(this.runePulseTime * Math.PI * 2 / 0.8 + rune.pulsePhase) * 0.3
      
      ctx.save()
      ctx.translate(rune.x, rune.y)
      
      const glowSize = rune.size * 2 * pulse
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize)
      glowGradient.addColorStop(0, 'rgba(206,147,216,0.5)')
      glowGradient.addColorStop(0.5, 'rgba(206,147,216,0.2)')
      glowGradient.addColorStop(1, 'transparent')
      ctx.fillStyle = glowGradient
      ctx.beginPath()
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.strokeStyle = rune.clicked ? '#ffd54f' : '#ce93d8'
      ctx.fillStyle = rune.clicked ? 'rgba(255,213,79,0.3)' : 'rgba(206,147,216,0.2)'
      ctx.lineWidth = 2.5
      
      this.drawRuneSymbol(rune.symbol, rune.size)
      
      ctx.restore()
    }
  }

  private drawRuneSymbol(symbol: Rune['symbol'], size: number): void {
    const ctx = this.ctx
    const s = size
    
    switch (symbol) {
      case 'triangle':
        ctx.beginPath()
        ctx.moveTo(0, -s * 0.6)
        ctx.lineTo(s * 0.55, s * 0.4)
        ctx.lineTo(-s * 0.55, s * 0.4)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
        
      case 'hexagon':
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * s * 0.6
          const y = Math.sin(angle) * s * 0.6
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
        
      case 'spiral':
        ctx.beginPath()
        for (let i = 0; i < 50; i++) {
          const angle = i * 0.3
          const r = (i / 50) * s * 0.6
          const x = Math.cos(angle) * r
          const y = Math.sin(angle) * r
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
        break
        
      case 'parallel':
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-s * 0.4, -s * 0.4)
        ctx.lineTo(s * 0.1, s * 0.4)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(s * 0.1, -s * 0.4)
        ctx.lineTo(s * 0.5, s * 0.4)
        ctx.stroke()
        break
        
      case 'crescent':
        ctx.beginPath()
        ctx.arc(0, 0, s * 0.55, -Math.PI * 0.7, Math.PI * 0.7)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(s * 0.2, 0, s * 0.4, -Math.PI * 0.6, Math.PI * 0.6, true)
        ctx.stroke()
        break
    }
  }

  public getCanvasSize(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  public handleResize(): void {
    this.resize()
    this.updateLaunchPadPosition()
  }

  public checkRuneClick(x: number, y: number): Rune | null {
    for (const rune of this.state.runes) {
      const dist = Math.sqrt((x - rune.x) ** 2 + (y - rune.y) ** 2)
      if (dist < rune.size * 1.5) {
        return rune
      }
    }
    return null
  }
}
