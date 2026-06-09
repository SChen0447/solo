import type { Potion, ReactionResult, AnimationType } from './recipeBook'
import { matchRecipe } from './recipeBook'

interface Bubble {
  x: number
  y: number
  radius: number
  baseX: number
  speedY: number
  opacity: number
  color: string
  frequency: number
  amplitude: number
  phase: number
  life: number
  maxLife: number
}

interface Particle {
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

const CAULDRON_WIDTH = 240
const CAULDRON_HEIGHT = 180
const CAULDRON_CENTER_X = 160
const CAULDRON_CENTER_Y = 160
const MAX_BUBBLES = 300
const MAX_PARTICLES = 200

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      })
      .join('')
  )
}

function blendColors(baseHex: string, addHex: string, baseWeight = 0.6, addWeight = 0.4): string {
  const base = hexToRgb(baseHex)
  const add = hexToRgb(addHex)
  return rgbToHex(
    base.r * baseWeight + add.r * addWeight,
    base.g * baseWeight + add.g * addWeight,
    base.b * baseWeight + add.b * addWeight
  )
}

export class Cauldron {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private bubbles: Bubble[] = []
  private particles: Particle[] = []
  private currentColor: string = '#333333'
  private potions: Potion[] = []
  private animationType: AnimationType | 'none' = 'none'
  private animationTime: number = 0
  private animationDuration: number = 0
  private vortexAngle: number = 0
  private bubbleGenTimer: number = 0
  private lastTime: number = 0
  private running: boolean = false
  private onReactionComplete: ((result: ReactionResult) => void) | null = null
  private ripplePhase: number = 0
  private reactionMatched: boolean = false
  private matchedRecipeName: string | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
  }

  setOnReactionComplete(callback: (result: ReactionResult) => void): void {
    this.onReactionComplete = callback
  }

  addPotion(potion: Potion): void {
    if (this.potions.length >= 3) return
    this.potions.push(potion)
    this.currentColor = blendColors(this.currentColor, potion.color)
    this.startBubblePhase(potion.color)
  }

  private startBubblePhase(color: string): void {
    this.animationType = 'bubble'
    this.animationTime = 0
    this.animationDuration = 2000
    this.reactionMatched = false
    this.matchedRecipeName = null
  }

  processReaction(): ReactionResult | null {
    if (this.potions.length < 2 || this.potions.length > 3) return null

    const colors = this.potions.map(p => p.color)
    const recipe = matchRecipe(colors)

    let result: ReactionResult

    if (recipe) {
      result = {
        finalColor: recipe.finalColor,
        bubbleDensity: recipe.animation === 'explosion' ? 0.8 : 0.5,
        animationType: recipe.animation,
        matched: true,
        recipeName: recipe.name
      }
      this.currentColor = recipe.finalColor
      this.animationType = recipe.animation
      this.animationTime = 0
      this.animationDuration = recipe.animation === 'explosion' ? 1500 : recipe.animation === 'vortex' ? 3000 : 2000
      this.reactionMatched = true
      this.matchedRecipeName = recipe.name

      if (recipe.animation === 'explosion') {
        this.generateExplosionParticles()
      }
    } else {
      result = {
        finalColor: this.currentColor,
        bubbleDensity: 0.3,
        animationType: 'none',
        matched: false
      }
      this.animationType = 'none'
      this.reactionMatched = false
      this.matchedRecipeName = null
    }

    return result
  }

  private generateExplosionParticles(): void {
    this.particles = []
    const particleCount = 200
    for (let i = 0; i < particleCount && this.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 160
      const colors = [this.currentColor, '#FFFFFF', '#FFD700', '#FF6B6B', '#4488FF']
      this.particles.push({
        x: CAULDRON_CENTER_X,
        y: CAULDRON_CENTER_Y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        radius: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
        life: 0,
        maxLife: 1500
      })
    }
  }

  reset(): void {
    this.potions = []
    this.bubbles = []
    this.particles = []
    this.currentColor = '#333333'
    this.animationType = 'none'
    this.animationTime = 0
    this.reactionMatched = false
    this.matchedRecipeName = null
  }

  getPotions(): Potion[] {
    return [...this.potions]
  }

  getCurrentColor(): string {
    return this.currentColor
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.loop()
  }

  stop(): void {
    this.running = false
  }

  private loop(): void {
    if (!this.running) return
    const now = performance.now()
    const dt = Math.min(now - this.lastTime, 50)
    this.lastTime = now
    this.update(dt)
    this.render()
    requestAnimationFrame(() => this.loop())
  }

  private update(dt: number): void {
    this.ripplePhase += dt * 0.003

    if (this.animationType !== 'none') {
      this.animationTime += dt
      if (this.animationTime >= this.animationDuration) {
        const wasAnimation = this.animationType
        this.animationType = 'none'
        if (this.onReactionComplete && wasAnimation !== 'bubble') {
          this.onReactionComplete({
            finalColor: this.currentColor,
            bubbleDensity: 0,
            animationType: wasAnimation,
            matched: this.reactionMatched,
            recipeName: this.matchedRecipeName || undefined
          })
        } else if (this.onReactionComplete && wasAnimation === 'bubble') {
          this.onReactionComplete({
            finalColor: this.currentColor,
            bubbleDensity: 0,
            animationType: 'bubble',
            matched: false
          })
        }
      }
    }

    if (this.animationType === 'vortex') {
      this.vortexAngle += dt * 0.008
    }

    this.bubbleGenTimer += dt
    if (this.animationType === 'bubble' && this.bubbleGenTimer > 30 && this.bubbles.length < MAX_BUBBLES) {
      this.bubbleGenTimer = 0
      const count = 5 + Math.floor(Math.random() * 11)
      for (let i = 0; i < count && this.bubbles.length < MAX_BUBBLES; i++) {
        this.spawnBubble()
      }
    }

    this.bubbles = this.bubbles.filter(b => {
      b.life += dt
      if (b.life >= b.maxLife) return false
      const t = b.life / b.maxLife
      b.opacity = 0.8 * (1 - t)
      b.y -= b.speedY * (dt / 1000)
      b.x = b.baseX + Math.sin(b.phase + b.life * 0.001 * b.frequency) * b.amplitude
      return true
    })

    this.particles = this.particles.filter(p => {
      p.life += dt
      if (p.life >= p.maxLife) return false
      const t = p.life / p.maxLife
      p.opacity = 1 - t
      p.vy += 120 * (dt / 1000)
      p.x += p.vx * (dt / 1000)
      p.y += p.vy * (dt / 1000)
      p.radius *= 0.995
      return true
    })
  }

  private spawnBubble(): void {
    const baseX = CAULDRON_CENTER_X - CAULDRON_WIDTH / 2 + 30 + Math.random() * (CAULDRON_WIDTH - 60)
    const baseY = CAULDRON_CENTER_Y + 20
    this.bubbles.push({
      x: baseX,
      y: baseY,
      baseX,
      radius: 2 + Math.random() * 6,
      speedY: 40 + Math.random() * 40,
      opacity: 0.8,
      color: this.currentColor,
      frequency: 2 + Math.random() * 3,
      amplitude: 5 + Math.random() * 15,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 2000
    })
  }

  private render(): void {
    const ctx = this.ctx
    const w = this.canvas.width
    const h = this.canvas.height

    ctx.clearRect(0, 0, w, h)

    this.drawCauldronBody()
    this.drawLiquid()
    this.drawBubbles()
    this.drawParticles()
    this.drawCauldronRim()
  }

  private drawCauldronBody(): void {
    const ctx = this.ctx
    const cx = CAULDRON_CENTER_X
    const cy = CAULDRON_CENTER_Y
    const w = CAULDRON_WIDTH
    const h = CAULDRON_HEIGHT

    ctx.save()
    const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy)
    grad.addColorStop(0, '#3D2817')
    grad.addColorStop(0.5, '#5C4033')
    grad.addColorStop(1, '#3D2817')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#5C4033'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.restore()
  }

  private drawLiquid(): void {
    const ctx = this.ctx
    const cx = CAULDRON_CENTER_X
    const cy = CAULDRON_CENTER_Y + 10
    const w = CAULDRON_WIDTH - 30
    const h = CAULDRON_HEIGHT / 2 + 10

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(cx, cy + 5, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.clip()

    const liquidColor = this.currentColor
    const rgb = hexToRgb(liquidColor)

    if (this.animationType === 'vortex') {
      const steps = 12
      for (let i = 0; i < steps; i++) {
        const angle = this.vortexAngle + (i / steps) * Math.PI * 2
        const radius = 10 + (i / steps) * (w / 2 - 20)
        const x = cx + Math.cos(angle) * radius * 0.3
        const y = cy + Math.sin(angle) * radius * 0.2
        const alpha = 0.3 + (i / steps) * 0.5
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const grad = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy, w / 2)
    grad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 40)},${Math.min(255, rgb.g + 40)},${Math.min(255, rgb.b + 40)},0.95)`)
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`)
    ctx.fillStyle = grad
    ctx.fillRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20)

    ctx.globalAlpha = 0.6
    ctx.strokeStyle = `rgba(255,255,255,0.3)`
    ctx.lineWidth = 2
    ctx.beginPath()
    const freq = 3
    const amp = 4
    for (let x = cx - w / 2; x <= cx + w / 2; x += 2) {
      const y = cy - h / 2 + Math.sin(this.ripplePhase * freq + x * 0.05) * amp
      if (x === cx - w / 2) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.beginPath()
    for (let x = cx - w / 2; x <= cx + w / 2; x += 2) {
      const y = cy - h / 2 + 8 + Math.sin(this.ripplePhase * freq * 1.5 + x * 0.07 + 1) * (amp * 0.6)
      if (x === cx - w / 2) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.restore()
  }

  private drawBubbles(): void {
    const ctx = this.ctx
    for (const b of this.bubbles) {
      ctx.save()
      ctx.globalAlpha = b.opacity
      const rgb = hexToRgb(b.color)
      const grad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0, b.x, b.y, b.radius)
      grad.addColorStop(0, `rgba(255,255,255,0.8)`)
      grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`)
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx
    for (const p of this.particles) {
      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawCauldronRim(): void {
    const ctx = this.ctx
    const cx = CAULDRON_CENTER_X
    const cy = CAULDRON_CENTER_Y - CAULDRON_HEIGHT / 2 + 5
    const w = CAULDRON_WIDTH
    const h = 20

    ctx.save()
    const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy)
    grad.addColorStop(0, '#2D1810')
    grad.addColorStop(0.5, '#5C4033')
    grad.addColorStop(1, '#2D1810')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(cx, cy, w / 2 + 8, h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#5C4033'
    ctx.lineWidth = 3
    ctx.stroke()

    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 2, w / 2 - 5, (h - 8) / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  static isPointInCauldron(px: number, py: number, canvasRect: DOMRect): boolean {
    const scaleX = 320 / canvasRect.width
    const scaleY = 320 / canvasRect.height
    const cx = CAULDRON_CENTER_X * (canvasRect.width / 320)
    const cy = CAULDRON_CENTER_Y * (canvasRect.height / 320)
    const rx = (CAULDRON_WIDTH / 2 + 20) * (canvasRect.width / 320)
    const ry = (CAULDRON_HEIGHT / 2 + 20) * (canvasRect.height / 320)
    const dx = (px - canvasRect.left - cx) / rx
    const dy = (py - canvasRect.top - cy) / ry
    void scaleX
    void scaleY
    return dx * dx + dy * dy <= 1
  }
}
