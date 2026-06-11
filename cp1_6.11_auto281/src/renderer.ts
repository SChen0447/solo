import type { Particle } from './particles'

export interface LightSource {
  x: number
  y: number
  isDragging: boolean
  glowOpacity: number
}

export interface RendererParams {
  lightSource: LightSource
  windSpeed: number
  concentration: number
  canvasWidth: number
  canvasHeight: number
}

const BEAM_COUNT = 5
const GLOW_RADIUS = 60
const GLOW_FADE_DURATION = 500
const EDGE_MASK_DURATION = 1500

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreenCanvas: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D
  private backgroundCache: HTMLCanvasElement
  private bgCtx: CanvasRenderingContext2D
  private params: RendererParams
  private colorStops: string[] = []
  private edgeMaskPhase = 0
  private particleTextureCache: Map<string, HTMLCanvasElement> = new Map()

  constructor(canvas: HTMLCanvasElement, params: RendererParams) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx

    this.offscreenCanvas = document.createElement('canvas')
    const offCtx = this.offscreenCanvas.getContext('2d')
    if (!offCtx) throw new Error('Could not get offscreen context')
    this.offscreenCtx = offCtx

    this.backgroundCache = document.createElement('canvas')
    const bgCtx = this.backgroundCache.getContext('2d')
    if (!bgCtx) throw new Error('Could not get background context')
    this.bgCtx = bgCtx

    this.params = { ...params }
    this.initColorStops()
    this.resize(params.canvasWidth, params.canvasHeight)
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

  private buildParticleTexture(size: number, colorIndex: number): HTMLCanvasElement {
    const key = `${size.toFixed(1)}-${colorIndex}`
    if (this.particleTextureCache.has(key)) {
      return this.particleTextureCache.get(key)!
    }

    const texCanvas = document.createElement('canvas')
    const texSize = Math.ceil(size * 2) + 4
    texCanvas.width = texSize
    texCanvas.height = texSize
    const tctx = texCanvas.getContext('2d')!

    const gradient = tctx.createRadialGradient(
      texSize / 2, texSize / 2, 0,
      texSize / 2, texSize / 2, size
    )
    const color = this.colorStops[colorIndex] || this.colorStops[0]
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(0,0,0,0)')

    tctx.fillStyle = gradient
    tctx.beginPath()
    tctx.arc(texSize / 2, texSize / 2, size, 0, Math.PI * 2)
    tctx.fill()

    this.particleTextureCache.set(key, texCanvas)
    return texCanvas
  }

  public resize(width: number, height: number): void {
    this.params.canvasWidth = width
    this.params.canvasHeight = height

    this.canvas.width = width
    this.canvas.height = height
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height
    this.backgroundCache.width = width
    this.backgroundCache.height = height

    this.particleTextureCache.clear()
    this.renderBackground()
  }

  private renderBackground(): void {
    const { canvasWidth: w, canvasHeight: h } = this.params
    const gradient = this.bgCtx.createLinearGradient(0, 0, 0, h)
    gradient.addColorStop(0, '#e65100')
    gradient.addColorStop(1, '#c0a080')
    this.bgCtx.fillStyle = gradient
    this.bgCtx.fillRect(0, 0, w, h)
  }

  public setLightSource(light: Partial<LightSource>): void {
    this.params.lightSource = { ...this.params.lightSource, ...light }
  }

  public setWindSpeed(windSpeed: number): void {
    this.params.windSpeed = windSpeed
  }

  public setConcentration(concentration: number): void {
    this.params.concentration = concentration
  }

  public getLightSource(): LightSource {
    return { ...this.params.lightSource }
  }

  public render(particles: Particle[], deltaTime: number): void {
    const { canvasWidth: w, canvasHeight: h } = this.params
    const ctx = this.offscreenCtx

    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(this.backgroundCache, 0, 0)

    this.drawLightBeams(ctx)
    this.drawParticles(ctx, particles)
    this.drawLightGlow(ctx)

    if (this.params.windSpeed > 15) {
      this.drawEdgeMask(ctx, deltaTime)
    }

    this.ctx.clearRect(0, 0, w, h)
    this.ctx.drawImage(this.offscreenCanvas, 0, 0)
  }

  private drawLightBeams(ctx: CanvasRenderingContext2D): void {
    const { lightSource, canvasWidth: w, canvasHeight: h, concentration } = this.params
    const { x, y } = lightSource

    const beamAngleSpread = Math.PI / 6
    const centerAngle = Math.atan2(h / 2 - y, w / 2 - x)

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    for (let i = 0; i < BEAM_COUNT; i++) {
      const t = i / (BEAM_COUNT - 1) - 0.5
      const angle = centerAngle + t * beamAngleSpread * 2

      const beamLength = Math.max(w, h) * 1.5
      const beamWidth = 120 + concentration * 80

      const endX = x + Math.cos(angle) * beamLength
      const endY = y + Math.sin(angle) * beamLength

      const gradient = ctx.createLinearGradient(x, y, endX, endY)
      const alpha = 0.08 + concentration * 0.1
      gradient.addColorStop(0, `rgba(255, 250, 220, ${alpha})`)
      gradient.addColorStop(0.3, `rgba(255, 240, 180, ${alpha * 0.7})`)
      gradient.addColorStop(1, 'rgba(255, 230, 150, 0)')

      ctx.strokeStyle = gradient
      ctx.lineWidth = beamWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }

    ctx.restore()
  }

  private calculateLightIntensity(px: number, py: number): number {
    const { lightSource, canvasWidth: w, canvasHeight: h } = this.params
    const { x, y } = lightSource

    const dx = px - x
    const dy = py - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = Math.max(w, h) * 0.8

    if (dist >= maxDist) return 0

    const centerAngle = Math.atan2(h / 2 - y, w / 2 - x)
    const particleAngle = Math.atan2(dy, dx)
    let angleDiff = Math.abs(particleAngle - centerAngle)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff

    const beamSpread = Math.PI / 5
    const angleFactor = Math.max(0, 1 - angleDiff / beamSpread)

    const distFactor = 1 - dist / maxDist
    return Math.pow(distFactor, 1.5) * angleFactor * 0.8
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    const { windSpeed, concentration } = this.params
    const highWind = windSpeed > 15

    ctx.save()
    ctx.globalCompositeOperation = 'source-over'

    for (const p of particles) {
      if (p.opacity <= 0) continue

      const lightIntensity = this.calculateLightIntensity(p.x, p.y)
      const baseOpacity = p.opacity * (0.5 + concentration * 0.5)

      if (lightIntensity > 0.05) {
        ctx.globalCompositeOperation = 'lighter'
        const glowSize = p.size * (2 + lightIntensity * 3)
        const glowAlpha = baseOpacity * lightIntensity * 0.6

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize)
        gradient.addColorStop(0, `rgba(255, 245, 200, ${glowAlpha})`)
        gradient.addColorStop(1, 'rgba(255, 230, 150, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      const brightnessBoost = lightIntensity * 0.5
      const finalOpacity = Math.min(1, baseOpacity + lightIntensity * 0.3)

      if (highWind) {
        const stretch = 2
        const tex = this.buildParticleTexture(p.size, p.colorIndex)
        const texW = tex.width * stretch
        const texH = tex.height

        ctx.save()
        ctx.globalAlpha = finalOpacity
        ctx.filter = brightnessBoost > 0 ? `brightness(${1 + brightnessBoost})` : 'none'
        ctx.drawImage(tex, p.x - texW / 2, p.y - texH / 2, texW, texH)
        ctx.restore()
      } else {
        const tex = this.buildParticleTexture(p.size, p.colorIndex)
        ctx.save()
        ctx.globalAlpha = finalOpacity
        ctx.filter = brightnessBoost > 0 ? `brightness(${1 + brightnessBoost})` : 'none'
        ctx.drawImage(tex, p.x - tex.width / 2, p.y - tex.height / 2)
        ctx.restore()
      }
    }

    ctx.restore()
  }

  private drawLightGlow(ctx: CanvasRenderingContext2D): void {
    const { lightSource } = this.params
    const { x, y, glowOpacity } = lightSource

    if (glowOpacity <= 0) return

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * glowOpacity})`)
    gradient.addColorStop(0.3, `rgba(255, 250, 200, ${0.5 * glowOpacity})`)
    gradient.addColorStop(0.6, `rgba(255, 240, 150, ${0.2 * glowOpacity})`)
    gradient.addColorStop(1, 'rgba(255, 230, 100, 0)')

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.fillStyle = `rgba(255, 255, 255, ${glowOpacity})`
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawEdgeMask(ctx: CanvasRenderingContext2D, deltaTime: number): void {
    const { canvasWidth: w, canvasHeight: h } = this.params

    this.edgeMaskPhase += deltaTime / EDGE_MASK_DURATION
    if (this.edgeMaskPhase > 1) this.edgeMaskPhase -= 1

    const phase = this.edgeMaskPhase * Math.PI * 2
    const intensity = 0.15 + Math.sin(phase) * 0.05

    const leftGradient = ctx.createLinearGradient(0, 0, 80, 0)
    leftGradient.addColorStop(0, `rgba(210, 180, 140, ${intensity})`)
    leftGradient.addColorStop(1, 'rgba(210, 180, 140, 0)')

    const rightGradient = ctx.createLinearGradient(w, 0, w - 80, 0)
    rightGradient.addColorStop(0, `rgba(210, 180, 140, ${intensity})`)
    rightGradient.addColorStop(1, 'rgba(210, 180, 140, 0)')

    ctx.save()
    ctx.fillStyle = leftGradient
    ctx.fillRect(0, 0, 80, h)
    ctx.fillStyle = rightGradient
    ctx.fillRect(w - 80, 0, 80, h)
    ctx.restore()
  }

  public updateGlow(deltaTime: number): void {
    const { lightSource } = this.params

    if (lightSource.isDragging) {
      if (lightSource.glowOpacity < 1) {
        lightSource.glowOpacity = Math.min(1, lightSource.glowOpacity + deltaTime / GLOW_FADE_DURATION * 2)
      }
    } else {
      if (lightSource.glowOpacity > 0) {
        lightSource.glowOpacity = Math.max(0, lightSource.glowOpacity - deltaTime / GLOW_FADE_DURATION)
      }
    }
  }
}
