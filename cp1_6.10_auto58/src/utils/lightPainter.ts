export interface LightPoint {
  x: number
  y: number
  timestamp: number
  color: string
  size: number
}

export interface LightTrail {
  id: string
  points: LightPoint[]
  createdAt: number
}

export interface BrushConfig {
  hue: number
  saturation: number
  lightness: number
  size: number
  autoColorCycle: boolean
}

const MAX_TRAILS = 500
const POINT_DISTANCE_THRESHOLD = 3
const FADE_DURATION = 5000

export class LightPainter {
  private trails: LightTrail[] = []
  private currentTrailId: string | null = null
  private offscreenCanvas: OffscreenCanvas | HTMLCanvasElement
  private offscreenCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  private frameCount = 0
  private fpsHistory: number[] = []
  private lastFrameTime = 0
  private adaptiveSampling = 1
  private hueOffset = 0

  constructor(width: number, height: number) {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(width, height)
    } else {
      this.offscreenCanvas = document.createElement('canvas')
      this.offscreenCanvas.width = width
      this.offscreenCanvas.height = height
    }
    const ctx = this.offscreenCanvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.offscreenCtx = ctx
    this.offscreenCtx.globalCompositeOperation = 'lighter'
  }

  private generateId(): string {
    return `trail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360
    s /= 100
    l /= 100
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }

  resize(width: number, height: number): void {
    this.offscreenCanvas.width = width
    this.offscreenCanvas.height = height
  }

  startTrail(): void {
    const id = this.generateId()
    this.currentTrailId = id
    this.trails.push({
      id,
      points: [],
      createdAt: Date.now(),
    })
    this.enforceTrailLimit()
  }

  endTrail(): void {
    this.currentTrailId = null
  }

  addPoint(x: number, y: number, brush: BrushConfig): void {
    if (!this.currentTrailId) return

    this.frameCount++
    if (this.frameCount % this.adaptiveSampling !== 0) return

    const trail = this.trails.find(t => t.id === this.currentTrailId)
    if (!trail) return

    const lastPoint = trail.points[trail.points.length - 1]
    if (lastPoint) {
      const dist = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2))
      if (dist < POINT_DISTANCE_THRESHOLD) return
    }

    let hue = brush.hue
    if (brush.autoColorCycle) {
      this.hueOffset = (this.hueOffset + 0.5) % 360
      hue = (brush.hue + this.hueOffset) % 360
    }

    const color = `hsl(${hue}, ${brush.saturation}%, ${brush.lightness}%)`

    trail.points.push({
      x,
      y,
      timestamp: Date.now(),
      color,
      size: brush.size,
    })
  }

  private enforceTrailLimit(): void {
    if (this.trails.length > MAX_TRAILS) {
      const removeCount = Math.floor(MAX_TRAILS / 2)
      this.trails.splice(0, removeCount)
    }
  }

  private updateFPS(): void {
    const now = performance.now()
    if (this.lastFrameTime > 0) {
      const fps = 1000 / (now - this.lastFrameTime)
      this.fpsHistory.push(fps)
      if (this.fpsHistory.length > 30) {
        this.fpsHistory.shift()
      }
      const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.adaptiveSampling = avgFps < 45 ? 2 : 1
    }
    this.lastFrameTime = now
  }

  updateAndRender(targetCtx: CanvasRenderingContext2D): void {
    this.updateFPS()

    const now = Date.now()
    const ctx = this.offscreenCtx
    const width = this.offscreenCanvas.width
    const height = this.offscreenCanvas.height

    ctx.clearRect(0, 0, width, height)

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i]
      const validPoints: LightPoint[] = []

      for (const point of trail.points) {
        const age = now - point.timestamp
        if (age < FADE_DURATION) {
          validPoints.push(point)
          const opacity = 1 - age / FADE_DURATION
          this.drawPoint(ctx, point, opacity)
        }
      }

      if (validPoints.length > 1) {
        this.drawConnections(ctx, validPoints, now)
      }

      trail.points = validPoints
      if (trail.points.length === 0 && trail.id !== this.currentTrailId) {
        this.trails.splice(i, 1)
      }
    }

    targetCtx.clearRect(0, 0, targetCtx.canvas.width, targetCtx.canvas.height)
    targetCtx.drawImage(this.offscreenCanvas as HTMLCanvasElement, 0, 0)
  }

  private drawPoint(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    point: LightPoint,
    opacity: number
  ): void {
    const [r, g, b] = this.hslToRgb(
      parseFloat(point.color.match(/hsl\((\d+)/)?.[1] || '0'),
      parseFloat(point.color.match(/,\s*(\d+)%/)?.[1] || '100'),
      parseFloat(point.color.match(/(\d+)%\)/)?.[1] || '60')
    )

    const baseSize = point.size

    const gradient = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, baseSize * 3
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.9})`)
    gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`)
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.4})`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(point.x, point.y, baseSize * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
    ctx.beginPath()
    ctx.arc(point.x, point.y, baseSize * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawConnections(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    points: LightPoint[],
    now: number
  ): void {
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const age = now - curr.timestamp
      const opacity = Math.max(0, 1 - age / FADE_DURATION)

      const [r, g, b] = this.hslToRgb(
        parseFloat(curr.color.match(/hsl\((\d+)/)?.[1] || '0'),
        parseFloat(curr.color.match(/,\s*(\d+)%/)?.[1] || '100'),
        parseFloat(curr.color.match(/(\d+)%\)/)?.[1] || '60')
      )

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`
      ctx.lineWidth = curr.size * 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(curr.x, curr.y)
      ctx.stroke()
    }
  }

  async saveAsPNG(
    videoFrame: HTMLVideoElement | null,
    includeBackground: boolean
  ): Promise<string> {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = this.offscreenCanvas.width
    exportCanvas.height = this.offscreenCanvas.height
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) throw new Error('Failed to get export context')

    if (includeBackground && videoFrame) {
      exportCtx.drawImage(videoFrame, 0, 0, exportCanvas.width, exportCanvas.height)
    } else {
      exportCtx.fillStyle = '#0a0a0f'
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    }

    exportCtx.globalCompositeOperation = 'lighter'
    exportCtx.drawImage(this.offscreenCanvas as HTMLCanvasElement, 0, 0)

    return exportCanvas.toDataURL('image/png')
  }

  clearAll(): void {
    this.trails = []
    this.currentTrailId = null
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height)
  }

  getTrailCount(): number {
    return this.trails.length
  }
}
