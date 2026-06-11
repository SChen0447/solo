export interface OceanParams {
  tideStrength: number
  waterTemperature: number
  nutrientConcentration: number
}

export interface AlgaePoint {
  id: number
  x: number
  y: number
  baseY: number
  radius: number
  baseAlpha: number
  pulsePhase: number
  pulseSpeed: number
  pulsePeriod: number
  waveOffset: number
  isActive: boolean
  glowBoost: number
  glowDecayStart: number
}

export interface Ripple {
  id: number
  x: number
  y: number
  startTime: number
  duration: number
  maxRadius: number
  isActive: boolean
}

export interface WaveLayer {
  amplitude: number
  wavelength: number
  speed: number
  phase: number
  colorTop: string
  colorBottom: string
}

export interface OceanSnapshot {
  params: OceanParams
  timestamp: number
  waveSeed: number
  algaePositions: Array<{ x: number; baseY: number; radius: number; pulsePhase: number; pulsePeriod: number }>
  avgBrightness: number
  dominantColor: string
}

class AlgaePool {
  private pool: AlgaePoint[] = []
  private nextId = 0
  private size = 0

  constructor(private maxSize: number = 2500) {
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this.createEmpty())
    }
  }

  private createEmpty(): AlgaePoint {
    return {
      id: -1,
      x: 0,
      y: 0,
      baseY: 0,
      radius: 0,
      baseAlpha: 0,
      pulsePhase: 0,
      pulseSpeed: 0,
      pulsePeriod: 0,
      waveOffset: 0,
      isActive: false,
      glowBoost: 0,
      glowDecayStart: 0,
    }
  }

  acquire(): AlgaePoint | null {
    if (this.size >= this.maxSize) return null
    for (let i = 0; i < this.maxSize; i++) {
      if (!this.pool[i].isActive) {
        this.pool[i].isActive = true
        this.pool[i].id = this.nextId++
        this.size++
        return this.pool[i]
      }
    }
    return null
  }

  release(point: AlgaePoint) {
    point.isActive = false
    this.size--
  }

  clear() {
    for (let i = 0; i < this.maxSize; i++) {
      this.pool[i].isActive = false
    }
    this.size = 0
  }

  getActive(): AlgaePoint[] {
    const result: AlgaePoint[] = []
    for (let i = 0; i < this.maxSize; i++) {
      if (this.pool[i].isActive) result.push(this.pool[i])
    }
    return result
  }

  getAll(): AlgaePoint[] {
    return this.pool
  }

  getActiveCount(): number {
    return this.size
  }
}

class RipplePool {
  private pool: Ripple[] = []
  private nextId = 0
  private size = 0

  constructor(private maxSize: number = 20) {
    for (let i = 0; i < maxSize; i++) {
      this.pool.push({
        id: -1,
        x: 0,
        y: 0,
        startTime: 0,
        duration: 0,
        maxRadius: 0,
        isActive: false,
      })
    }
  }

  acquire(): Ripple | null {
    if (this.size >= this.maxSize) return null
    for (let i = 0; i < this.maxSize; i++) {
      if (!this.pool[i].isActive) {
        this.pool[i].isActive = true
        this.pool[i].id = this.nextId++
        this.size++
        return this.pool[i]
      }
    }
    return null
  }

  getActive(): Ripple[] {
    const result: Ripple[] = []
    for (let i = 0; i < this.maxSize; i++) {
      if (this.pool[i].isActive) result.push(this.pool[i])
    }
    return result
  }

  cleanup(currentTime: number) {
    for (let i = 0; i < this.maxSize; i++) {
      if (this.pool[i].isActive && currentTime - this.pool[i].startTime > this.pool[i].duration) {
        this.pool[i].isActive = false
        this.size--
      }
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function lerpColor(color1: string, color2: string, t: number): [number, number, number] {
  const [r1, g1, b1] = hexToRgb(color1)
  const [r2, g2, b2] = hexToRgb(color2)
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ]
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export class OceanCanvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private offscreenCanvas: HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private dpr = 1

  private running = false
  private rafId = 0
  private startTime = 0
  private lastFrameTime = 0
  private frameCount = 0

  private params: OceanParams = {
    tideStrength: 50,
    waterTemperature: 18,
    nutrientConcentration: 50,
  }

  private algaePool: AlgaePool
  private ripplePool: RipplePool
  private waveLayers: WaveLayer[] = []
  private waveSeed = Math.random() * 1000

  private viewOffsetX = 0
  private viewOffsetY = 0
  private viewScale = 1
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private dragOffsetStartX = 0
  private dragOffsetStartY = 0

  private minScale = 0.5
  private maxScale = 3

  private onParamsChange?: (params: OceanParams) => void
  private onBrightnessSample?: (brightness: number, color: string) => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx

    this.offscreenCanvas = document.createElement('canvas')
    const offCtx = this.offscreenCanvas.getContext('2d')
    if (!offCtx) throw new Error('Offscreen canvas context not available')
    this.offscreenCtx = offCtx

    this.algaePool = new AlgaePool(2500)
    this.ripplePool = new RipplePool(20)

    this.initWaveLayers()
    this.initEvents()
    this.resize()
  }

  private initWaveLayers() {
    this.waveLayers = [
      { amplitude: 30, wavelength: 250, speed: 0.8, phase: 0, colorTop: '#0b3d60', colorBottom: '#1a6b4a' },
      { amplitude: 15, wavelength: 120, speed: 1.2, phase: Math.PI / 3, colorTop: '#0e4a70', colorBottom: '#1e8b5a' },
      { amplitude: 8, wavelength: 60, speed: 1.6, phase: Math.PI / 2, colorTop: '#135880', colorBottom: '#22aa68' },
      { amplitude: 4, wavelength: 30, speed: 2.0, phase: Math.PI, colorTop: '#186890', colorBottom: '#28c078' },
    ]
  }

  private initEvents() {
    window.addEventListener('resize', this.handleResize)
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
    this.canvas.addEventListener('mouseleave', this.handleMouseUp)
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false })
    this.canvas.addEventListener('click', this.handleClick)

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.canvas.addEventListener('touchend', this.handleTouchEnd)
  }

  private destroyEvents() {
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('click', this.handleClick)

    this.canvas.removeEventListener('touchstart', this.handleTouchStart)
    this.canvas.removeEventListener('touchmove', this.handleTouchMove)
    this.canvas.removeEventListener('touchend', this.handleTouchEnd)
  }

  private handleResize = () => {
    this.resize()
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = rect.width
    this.height = rect.height

    this.canvas.width = Math.floor(this.width * this.dpr)
    this.canvas.height = Math.floor(this.height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.offscreenCanvas.width = Math.floor(this.width * this.dpr)
    this.offscreenCanvas.height = Math.floor(this.height * this.dpr)
    this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.updateAlgaeDistribution()
  }

  private handleMouseDown = (e: MouseEvent) => {
    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragOffsetStartX = this.viewOffsetX
    this.dragOffsetStartY = this.viewOffsetY
  }

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) return
    this.viewOffsetX = this.dragOffsetStartX + (e.clientX - this.dragStartX)
    this.viewOffsetY = this.dragOffsetStartY + (e.clientY - this.dragStartY)
  }

  private handleMouseUp = () => {
    this.isDragging = false
  }

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.viewScale * zoomFactor))
    const scaleRatio = newScale / this.viewScale

    this.viewOffsetX = mouseX - (mouseX - this.viewOffsetX) * scaleRatio
    this.viewOffsetY = mouseY - (mouseY - this.viewOffsetY) * scaleRatio
    this.viewScale = newScale
  }

  private handleClick = (e: MouseEvent) => {
    if (this.isDragging) return
    const rect = this.canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - this.viewOffsetX) / this.viewScale
    const y = (e.clientY - rect.top - this.viewOffsetY) / this.viewScale
    this.createRipple(x, y)
  }

  private handleTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 1) {
      this.isDragging = true
      this.dragStartX = e.touches[0].clientX
      this.dragStartY = e.touches[0].clientY
      this.dragOffsetStartX = this.viewOffsetX
      this.dragOffsetStartY = this.viewOffsetY
    }
  }

  private handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    if (!this.isDragging || e.touches.length !== 1) return
    this.viewOffsetX = this.dragOffsetStartX + (e.touches[0].clientX - this.dragStartX)
    this.viewOffsetY = this.dragOffsetStartY + (e.touches[0].clientY - this.dragStartY)
  }

  private handleTouchEnd = (e: TouchEvent) => {
    if (this.isDragging && e.changedTouches.length === 1) {
      const dx = Math.abs(e.changedTouches[0].clientX - this.dragStartX)
      const dy = Math.abs(e.changedTouches[0].clientY - this.dragStartY)
      if (dx < 5 && dy < 5) {
        const rect = this.canvas.getBoundingClientRect()
        const x = (e.changedTouches[0].clientX - rect.left - this.viewOffsetX) / this.viewScale
        const y = (e.changedTouches[0].clientY - rect.top - this.viewOffsetY) / this.viewScale
        this.createRipple(x, y)
      }
    }
    this.isDragging = false
  }

  private createRipple(x: number, y: number) {
    const ripple = this.ripplePool.acquire()
    if (!ripple) return
    ripple.x = x
    ripple.y = y
    ripple.startTime = performance.now()
    ripple.duration = 3000
    ripple.maxRadius = 400
  }

  setParams(params: OceanParams) {
    const oldNutrient = this.params.nutrientConcentration
    this.params = { ...params }
    if (Math.abs(oldNutrient - params.nutrientConcentration) > 2) {
      this.updateAlgaeDistribution()
    }
  }

  getParams(): OceanParams {
    return { ...this.params }
  }

  setOnBrightnessSample(callback: (brightness: number, color: string) => void) {
    this.onBrightnessSample = callback
  }

  private updateAlgaeDistribution() {
    this.algaePool.clear()
    const densityFactor = this.params.nutrientConcentration / 100
    const baseCount = 200
    const maxCount = 2000
    const targetCount = Math.floor(baseCount + (maxCount - baseCount) * densityFactor)

    const seaTop = this.height * 0.3
    const seaBottom = this.height * 0.95

    for (let i = 0; i < targetCount; i++) {
      const point = this.algaePool.acquire()
      if (!point) break

      const depthT = Math.random()
      point.x = Math.random() * this.width * 2 - this.width * 0.5
      point.baseY = seaTop + (seaBottom - seaTop) * depthT
      point.radius = 3 + Math.random() * 3
      point.baseAlpha = 0.6 + Math.random() * 0.4
      point.pulsePeriod = 500 + Math.random() * 1500
      point.pulsePhase = Math.random() * Math.PI * 2
      point.waveOffset = Math.random() * Math.PI * 2
      point.glowBoost = 0
      point.glowDecayStart = 0
    }
  }

  private getWaveHeight(x: number, time: number, layerIndex?: number): number {
    const tideFactor = this.params.tideStrength / 100
    let height = 0

    const layers = layerIndex !== undefined ? [this.waveLayers[layerIndex]] : this.waveLayers
    for (const layer of layers) {
      const amp = layer.amplitude * (0.4 + tideFactor * 0.9)
      const freq = (2 * Math.PI) / (layer.wavelength * (1 - tideFactor * 0.3))
      height += Math.sin(x * freq + time * 0.001 * layer.speed + layer.phase + this.waveSeed) * amp
    }
    return height
  }

  private getWaveColor(depthT: number): string {
    const layers = this.waveLayers
    const topColor = layers[0].colorTop
    const bottomColor = layers[layers.length - 1].colorBottom
    const [r, g, b] = lerpColor(topColor, bottomColor, depthT)
    return `rgb(${r},${g},${b})`
  }

  private drawBackground() {
    const gradient = this.offscreenCtx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#0a1128')
    gradient.addColorStop(1, '#1c1b33')
    this.offscreenCtx.fillStyle = gradient
    this.offscreenCtx.fillRect(0, 0, this.width, this.height)
  }

  private drawWaves(time: number) {
    const seaTop = this.height * 0.3
    const ctx = this.offscreenCtx

    for (let layerIdx = this.waveLayers.length - 1; layerIdx >= 0; layerIdx--) {
      const layer = this.waveLayers[layerIdx]
      const layerDepth = layerIdx / (this.waveLayers.length - 1)
      const baseY = seaTop + layerDepth * (this.height * 0.15)

      ctx.beginPath()
      ctx.moveTo(-50, this.height + 50)

      const step = 4 / this.viewScale
      for (let x = -50; x <= this.width + 50; x += step) {
        const worldX = (x - this.viewOffsetX) / this.viewScale
        const waveH = this.getWaveHeight(worldX, time, layerIdx)
        const y = baseY + waveH * this.viewScale + this.viewOffsetY
        ctx.lineTo(x, y)
      }

      ctx.lineTo(this.width + 50, this.height + 50)
      ctx.closePath()

      const depthT = layerDepth
      const [tr, tg, tb] = lerpColor(layer.colorTop, layer.colorBottom, 0.3)
      const [br, bg, bb] = lerpColor(layer.colorBottom, '#0a1128', 0.6)
      const grad = ctx.createLinearGradient(0, baseY, 0, this.height)
      grad.addColorStop(0, `rgba(${tr},${tg},${tb},${0.85 - layerDepth * 0.3})`)
      grad.addColorStop(1, `rgba(${br},${bg},${bb},${0.95})`)
      ctx.fillStyle = grad
      ctx.fill()
    }
  }

  private drawAlgae(time: number) {
    const ctx = this.offscreenCtx
    const tempFactor = (this.params.waterTemperature - 5) / 25
    const brightnessBase = 0.3 + tempFactor * 0.7
    const flickerSpeed = 0.5 + tempFactor * 1.5

    const activeCount = this.algaePool.getActiveCount()
    const shouldDowngrade = activeCount > 1500
    const skipFrames = shouldDowngrade ? 2 : 1

    const seaTop = this.height * 0.3

    const allPoints = this.algaePool.getAll()
    for (let i = 0; i < allPoints.length; i++) {
      const p = allPoints[i]
      if (!p.isActive) continue
      if (shouldDowngrade && i % skipFrames !== this.frameCount % skipFrames) continue

      const worldX = p.x
      const waveH = this.getWaveHeight(worldX, time)
      const depthRatio = Math.min(1, (p.baseY - seaTop) / (this.height * 0.6))
      const waveInfluence = (1 - depthRatio) * 0.8
      p.y = p.baseY + waveH * waveInfluence

      const screenX = p.x * this.viewScale + this.viewOffsetX
      const screenY = p.y * this.viewScale + this.viewOffsetY

      if (screenX < -20 || screenX > this.width + 20 || screenY < -20 || screenY > this.height + 20) continue

      const t = (time * flickerSpeed) / p.pulsePeriod + p.pulsePhase
      const pulse = easeInOutSine(0.5 + 0.5 * Math.sin(t * Math.PI * 2))
      let alpha = p.baseAlpha * (0.4 + pulse * 0.6) * brightnessBase
      let radius = p.radius * (0.9 + pulse * 0.3)

      if (p.glowBoost > 0) {
        const elapsed = time - p.glowDecayStart
        if (elapsed < 1000) {
          const decayT = elapsed / 1000
          const glowAmount = p.glowBoost * (1 - decayT)
          alpha = Math.min(1, alpha + glowAmount)
          radius = p.radius * (1 + glowAmount * 1.5)
        } else {
          p.glowBoost = 0
        }
      }

      const scale = this.viewScale
      const drawRadius = Math.max(1, radius * scale)

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      const glow = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, drawRadius * 4)
      glow.addColorStop(0, `rgba(0, 255, 170, ${alpha * 0.4})`)
      glow.addColorStop(0.5, `rgba(0, 255, 170, ${alpha * 0.1})`)
      glow.addColorStop(1, 'rgba(0, 255, 170, 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(screenX, screenY, drawRadius * 4, 0, Math.PI * 2)
      ctx.fill()

      const core = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, drawRadius)
      core.addColorStop(0, `rgba(150, 255, 220, ${alpha})`)
      core.addColorStop(0.6, `rgba(0, 255, 170, ${alpha * 0.8})`)
      core.addColorStop(1, `rgba(0, 200, 140, ${alpha * 0.3})`)
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(screenX, screenY, drawRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  private drawRipples(time: number) {
    this.ripplePool.cleanup(time)
    const ripples = this.ripplePool.getActive()
    if (ripples.length === 0) return

    const ctx = this.offscreenCtx
    const nutrientFactor = 0.5 + (this.params.nutrientConcentration / 100) * 0.5

    for (const ripple of ripples) {
      const elapsed = time - ripple.startTime
      const progress = Math.min(1, elapsed / ripple.duration)
      if (progress >= 1) continue

      const screenX = ripple.x * this.viewScale + this.viewOffsetX
      const screenY = ripple.y * this.viewScale + this.viewOffsetY

      const decay = Math.exp(-progress * 3)
      const currentRadius = ripple.maxRadius * (1 - Math.exp(-progress * 2.5)) * this.viewScale * nutrientFactor
      const ringSpacing = 15 * this.viewScale
      const maxRings = 8

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      for (let r = 0; r < maxRings; r++) {
        const ringProgress = r / maxRings
        const ringRadius = currentRadius * (0.2 + ringProgress * 0.8)
        if (ringRadius < 2) continue

        const ringDecay = decay * (1 - ringProgress * 0.7)
        const alpha = ringDecay * 0.6

        const ringWidth = 3 * this.viewScale
        const gradient = ctx.createRadialGradient(screenX, screenY, ringRadius - ringWidth, screenX, screenY, ringRadius + ringWidth)
        gradient.addColorStop(0, `rgba(0, 255, 255, 0)`)
        gradient.addColorStop(0.5, `rgba(0, 255, 255, ${alpha})`)
        gradient.addColorStop(1, `rgba(0, 255, 255, 0)`)

        ctx.strokeStyle = gradient
        ctx.lineWidth = ringWidth * 2
        ctx.beginPath()
        ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.restore()

      this.checkRippleAlgaeCollision(ripple, currentRadius, time)
    }
  }

  private checkRippleAlgaeCollision(ripple: Ripple, currentRadius: number, time: number) {
    const allPoints = this.algaePool.getAll()
    const innerRadius = currentRadius - 20 * this.viewScale
    const outerRadius = currentRadius + 20 * this.viewScale

    for (let i = 0; i < allPoints.length; i++) {
      const p = allPoints[i]
      if (!p.isActive) continue

      const dx = p.x - ripple.x
      const dy = p.y - ripple.y
      const dist = Math.sqrt(dx * dx + dy * dy) * this.viewScale

      if (dist >= innerRadius && dist <= outerRadius) {
        if (p.glowBoost < 0.6) {
          p.glowBoost = 0.6
          p.glowDecayStart = time
        }
      }
    }
  }

  private sampleBrightness(time: number): { brightness: number; color: string } {
    const tempFactor = (this.params.waterTemperature - 5) / 25
    const nutrientFactor = this.params.nutrientConcentration / 100
    const tideFactor = this.params.tideStrength / 100

    const brightness = 0.2 + tempFactor * 0.3 + nutrientFactor * 0.25 + tideFactor * 0.15

    const r = Math.round(0 + tempFactor * 20 + nutrientFactor * 0)
    const g = Math.round(180 + tempFactor * 40 + nutrientFactor * 30)
    const b = Math.round(200 + tempFactor * 20 - nutrientFactor * 50)

    return {
      brightness: Math.min(1, brightness),
      color: `rgb(${r},${g},${b})`,
    }
  }

  takeSnapshot(): OceanSnapshot {
    const { brightness, color } = this.sampleBrightness(performance.now())
    const algaePositions: OceanSnapshot['algaePositions'] = []

    const allPoints = this.algaePool.getAll()
    for (const p of allPoints) {
      if (!p.isActive) continue
      algaePositions.push({
        x: p.x,
        baseY: p.baseY,
        radius: p.radius,
        pulsePhase: p.pulsePhase,
        pulsePeriod: p.pulsePeriod,
      })
    }

    return {
      params: { ...this.params },
      timestamp: Date.now(),
      waveSeed: this.waveSeed,
      algaePositions,
      avgBrightness: brightness,
      dominantColor: color,
    }
  }

  loadSnapshot(snapshot: OceanSnapshot) {
    this.params = { ...snapshot.params }
    this.waveSeed = snapshot.waveSeed

    this.algaePool.clear()
    for (const ap of snapshot.algaePositions) {
      const point = this.algaePool.acquire()
      if (!point) break
      point.x = ap.x
      point.baseY = ap.baseY
      point.y = ap.baseY
      point.radius = ap.radius
      point.baseAlpha = 0.6 + Math.random() * 0.4
      point.pulsePhase = ap.pulsePhase
      point.pulsePeriod = ap.pulsePeriod
      point.waveOffset = Math.random() * Math.PI * 2
      point.glowBoost = 0
      point.glowDecayStart = 0
    }
  }

  getCanvasDataURL(): string {
    return this.canvas.toDataURL('image/png')
  }

  private loop = (time: number) => {
    if (!this.running) return

    if (!this.startTime) this.startTime = time
    this.frameCount++

    if (this.frameCount % 30 === 0 && this.onBrightnessSample) {
      const sample = this.sampleBrightness(time)
      this.onBrightnessSample(sample.brightness, sample.color)
    }

    this.offscreenCtx.clearRect(0, 0, this.width, this.height)

    this.drawBackground()
    this.drawWaves(time)
    this.drawRipples(time)
    this.drawAlgae(time)

    this.ctx.clearRect(0, 0, this.width, this.height)
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height)

    this.rafId = requestAnimationFrame(this.loop)
    this.lastFrameTime = time
  }

  start() {
    if (this.running) return
    this.running = true
    this.startTime = 0
    this.rafId = requestAnimationFrame(this.loop)
    this.updateAlgaeDistribution()
  }

  stop() {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  destroy() {
    this.stop()
    this.destroyEvents()
  }
}
