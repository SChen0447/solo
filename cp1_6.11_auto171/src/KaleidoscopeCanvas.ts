export type ShapeType = 'triangle' | 'hexagon' | 'snowflake'
export type ColorTheme = 'aurora' | 'warm' | 'cool' | 'rainbow'

export interface RenderParams {
  angle: number
  shape: ShapeType
  colors: string[]
}

interface Fragment {
  x: number
  y: number
  size: number
  rotation: number
  colorIndex: number
}

export class KaleidoscopeRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private fragments: Fragment[] = []
  private seed: number = Math.random() * 10000

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    this.ctx = ctx
    this.generateFragments()
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  private generateFragments() {
    this.fragments = []
    const count = 24
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 0.2 + this.seededRandom(this.seed + i) * 0.6
      this.fragments.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 0.08 + this.seededRandom(this.seed + i * 2) * 0.12,
        rotation: this.seededRandom(this.seed + i * 3) * Math.PI * 2,
        colorIndex: i % 4
      })
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 0, b: 0 }
  }

  private interpolateColor(c1: string, c2: string, t: number): string {
    const rgb1 = this.hexToRgb(c1)
    const rgb2 = this.hexToRgb(c2)
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t)
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t)
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t)
    return `rgb(${r},${g},${b})`
  }

  private drawTriangle(ctx: CanvasRenderingContext2D, size: number, colors: string[], colorIndex: number) {
    ctx.beginPath()
    ctx.moveTo(0, -size)
    ctx.lineTo(-size * 0.866, size * 0.5)
    ctx.lineTo(size * 0.866, size * 0.5)
    ctx.closePath()

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size)
    gradient.addColorStop(0, colors[colorIndex % colors.length])
    gradient.addColorStop(0.5, colors[(colorIndex + 1) % colors.length])
    gradient.addColorStop(1, colors[(colorIndex + 2) % colors.length])

    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = this.interpolateColor(colors[colorIndex % colors.length], '#ffffff', 0.3)
    ctx.lineWidth = size * 0.05
    ctx.stroke()
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, size: number, colors: string[], colorIndex: number) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(angle) * size
      const y = Math.sin(angle) * size
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()

    const gradient = ctx.createLinearGradient(-size, -size, size, size)
    gradient.addColorStop(0, colors[colorIndex % colors.length])
    gradient.addColorStop(0.5, colors[(colorIndex + 1) % colors.length])
    gradient.addColorStop(1, colors[(colorIndex + 2) % colors.length])

    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = this.interpolateColor(colors[(colorIndex + 1) % colors.length], '#ffffff', 0.4)
    ctx.lineWidth = size * 0.04
    ctx.stroke()
  }

  private drawSnowflake(ctx: CanvasRenderingContext2D, size: number, colors: string[], colorIndex: number) {
    const arms = 6
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size)
    gradient.addColorStop(0, colors[colorIndex % colors.length])
    gradient.addColorStop(0.6, colors[(colorIndex + 1) % colors.length])
    gradient.addColorStop(1, colors[(colorIndex + 2) % colors.length])

    ctx.strokeStyle = gradient
    ctx.lineWidth = size * 0.08
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2
      ctx.save()
      ctx.rotate(angle)

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -size)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, -size * 0.4)
      ctx.lineTo(-size * 0.3, -size * 0.6)
      ctx.moveTo(0, -size * 0.4)
      ctx.lineTo(size * 0.3, -size * 0.6)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, -size * 0.7)
      ctx.lineTo(-size * 0.25, -size * 0.85)
      ctx.moveTo(0, -size * 0.7)
      ctx.lineTo(size * 0.25, -size * 0.85)
      ctx.stroke()

      ctx.restore()
    }

    ctx.beginPath()
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2)
    ctx.fillStyle = colors[(colorIndex + 1) % colors.length]
    ctx.fill()
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: ShapeType, size: number, colors: string[], colorIndex: number) {
    switch (shape) {
      case 'triangle':
        this.drawTriangle(ctx, size, colors, colorIndex)
        break
      case 'hexagon':
        this.drawHexagon(ctx, size, colors, colorIndex)
        break
      case 'snowflake':
        this.drawSnowflake(ctx, size, colors, colorIndex)
        break
    }
  }

  render(params: RenderParams) {
    const { width, height } = this.canvas
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.48

    this.ctx.clearRect(0, 0, width, height)

    const bgGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
    bgGradient.addColorStop(0, 'rgba(10, 10, 30, 0.9)')
    bgGradient.addColorStop(0.7, 'rgba(20, 10, 40, 0.8)')
    bgGradient.addColorStop(1, 'rgba(5, 5, 20, 0.95)')

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = bgGradient
    this.ctx.fill()
    this.ctx.restore()

    const symmetryCount = 12
    const angleRad = (params.angle * Math.PI) / 180

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.clip()

    for (let s = 0; s < symmetryCount; s++) {
      const sectorAngle = (s / symmetryCount) * Math.PI * 2 + angleRad

      for (let mirror = 0; mirror < 2; mirror++) {
        this.ctx.save()
        this.ctx.translate(centerX, centerY)
        this.ctx.rotate(sectorAngle)
        if (mirror === 1) {
          this.ctx.scale(-1, 1)
        }

        for (const frag of this.fragments) {
          this.ctx.save()
          this.ctx.translate(frag.x * radius, frag.y * radius)
          this.ctx.rotate(frag.rotation + angleRad * 0.5)

          const fragSize = frag.size * radius * 0.8
          this.drawShape(this.ctx, params.shape, fragSize, params.colors, frag.colorIndex)

          this.ctx.restore()
        }

        this.ctx.restore()
      }
    }

    this.ctx.restore()

    const borderGradient = this.ctx.createRadialGradient(centerX, centerY, radius * 0.95, centerX, centerY, radius)
    borderGradient.addColorStop(0, 'rgba(100, 200, 255, 0)')
    borderGradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)')
    borderGradient.addColorStop(1, 'rgba(150, 100, 255, 0.3)')

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    this.ctx.strokeStyle = borderGradient
    this.ctx.lineWidth = 4
    this.ctx.stroke()
    this.ctx.restore()

    const glowGradient = this.ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.2)
    glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0)')
    glowGradient.addColorStop(0.5, 'rgba(150, 100, 255, 0.15)')
    glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)')

    this.ctx.save()
    this.ctx.globalCompositeOperation = 'screen'
    this.ctx.beginPath()
    this.ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2)
    this.ctx.fillStyle = glowGradient
    this.ctx.fill()
    this.ctx.restore()
  }

  regenerate() {
    this.seed = Math.random() * 10000
    this.generateFragments()
  }
}
