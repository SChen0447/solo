export class Particle {
  x: number
  y: number
  vx: number
  vy: number
  char: string
  baseColor: string
  currentColor: string
  baseSize: number
  currentSize: number
  opacity: number
  explosionVx: number
  explosionVy: number
  isExploding: boolean
  targetX: number
  targetY: number
  hasTarget: boolean
  hueOffset: number

  private static readonly CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth
    this.y = Math.random() * canvasHeight
    this.vx = 0
    this.vy = 0
    this.char = Particle.CHAR_SET[Math.floor(Math.random() * Particle.CHAR_SET.length)]
    this.baseSize = 12 + Math.random() * 12
    this.currentSize = this.baseSize
    this.opacity = 0.5 + Math.random() * 0.3
    this.explosionVx = 0
    this.explosionVy = 0
    this.isExploding = false
    this.targetX = 0
    this.targetY = 0
    this.hasTarget = false
    this.hueOffset = 0

    const t = this.y / canvasHeight
    this.baseColor = Particle.interpolateColor('#00d4ff', '#7b2ffc', t)
    this.currentColor = this.baseColor
  }

  update(
    flowVx: number,
    flowVy: number,
    mouseX: number,
    mouseY: number,
    mouseActive: boolean,
    canvasWidth: number,
    canvasHeight: number,
    textMode: boolean,
    explosionMode: boolean,
    explosionTimer: number,
    explosionCenterX: number,
    explosionCenterY: number,
    maxSpeed: number = 2
  ): void {
    if (explosionMode) {
      if (explosionTimer > 30) {
        const dx = explosionCenterX - this.x
        const dy = explosionCenterY - this.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        this.vx += (dx / dist) * 0.8
        this.vy += (dy / dist) * 0.8
      } else {
        if (!this.isExploding) {
          const angle = Math.random() * Math.PI * 2
          const speed = 3 + Math.random() * 3
          this.explosionVx = Math.cos(angle) * speed
          this.explosionVy = Math.sin(angle) * speed
          this.isExploding = true
        }
        this.vx = this.explosionVx
        this.vy = this.explosionVy
      }
    } else if (textMode && this.hasTarget) {
      const ease = 0.08
      this.vx = (this.targetX - this.x) * ease
      this.vy = (this.targetY - this.y) * ease
    } else {
      this.vx += flowVx * 0.15
      this.vy += flowVy * 0.15

      if (mouseActive) {
        const dx = mouseX - this.x
        const dy = mouseY - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 200 && dist > 0) {
          const force = (200 - dist) / 200 * 0.6
          this.vx += (dx / dist) * force
          this.vy += (dy / dist) * force
        }
      }

      this.vx *= 0.95
      this.vy *= 0.95
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > maxSpeed && !explosionMode) {
      this.vx = (this.vx / speed) * maxSpeed
      this.vy = (this.vy / speed) * maxSpeed
    }

    this.x += this.vx
    this.y += this.vy

    if (this.x < 0) this.x = canvasWidth
    if (this.x > canvasWidth) this.x = 0
    if (this.y < 0) this.y = canvasHeight
    if (this.y > canvasHeight) this.y = 0

    if (textMode) {
      this.currentSize += (20 - this.currentSize) * 0.1
      this.currentColor = Particle.mixColor(this.currentColor, '#ffffff', 0.1)
    } else {
      this.currentSize += (this.baseSize - this.currentSize) * 0.05
      this.currentColor = Particle.mixColor(this.currentColor, this.baseColor, 0.05)
    }

    this.hueOffset = (Math.random() - 0.5) * 0.05
    this.currentColor = Particle.shiftHue(this.baseColor, this.hueOffset)
    if (textMode) {
      this.currentColor = Particle.mixColor(this.currentColor, '#ffffff', 0.7)
    }

    if (!explosionMode) {
      this.isExploding = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.fillStyle = this.currentColor
    ctx.font = `${this.currentSize}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.char, this.x, this.y)
    ctx.restore()
  }

  private static interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = Particle.hexToRgb(color1)
    const c2 = Particle.hexToRgb(color2)
    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    }
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  private static mixColor(c1Str: string, c2Str: string, t: number): string {
    const c1 = Particle.parseRgb(c1Str)
    const c2 = Particle.parseRgb(c2Str)
    return Particle.rgbToHex(
      c1.r + (c2.r - c1.r) * t,
      c1.g + (c2.g - c1.g) * t,
      c1.b + (c2.b - c1.b) * t
    )
  }

  private static parseRgb(str: string): { r: number; g: number; b: number } {
    const match = str.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      }
    }
    return Particle.hexToRgb(str)
  }

  private static shiftHue(colorStr: string, offset: number): string {
    const c = Particle.parseRgb(colorStr)
    const { h, s, l } = Particle.rgbToHsl(c.r, c.g, c.b)
    const newH = (h + offset * 360 + 360) % 360
    const { r, g, b } = Particle.hslToRgb(newH, s, l)
    return Particle.rgbToHex(r, g, b)
  }

  private static rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }
    return { h, s, l }
  }

  private static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
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
    return { r: r * 255, g: g * 255, b: b * 255 }
  }
}
