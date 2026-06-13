import { gsap } from 'gsap'
import type { AudioManager } from './audio'

export const PIECE_COLORS = ['#ff6b35', '#00b4d8', '#e63946', '#a7c957'] as const
export const HELPER_COLOR = '#888899'
export const GOLD_STROKE = '#ffd700'
export const PIECE_RADIUS = 20
export const GEAR_TEETH_LENGTH = 8
export const HIT_RADIUS = 26

let _pieceIdCounter = 0

export type PieceColor = typeof PIECE_COLORS[number] | typeof HELPER_COLOR

export class ChessPiece {
  id: number
  x: number
  y: number
  color: PieceColor
  isHelper: boolean
  isSelected: boolean = false
  transformProgress: number = 0
  rotation: number = 0
  scale: number = 1
  isDragging: boolean = false
  dragOffsetX: number = 0
  dragOffsetY: number = 0
  vx: number = 0
  vy: number = 0
  gravityTimer: number = 0
  gravityTargetX: number = 0
  gravityTargetY: number = 0
  destroyed: boolean = false
  col: number = -1
  row: number = -1

  constructor(
    x: number,
    y: number,
    color: PieceColor,
    isHelper: boolean = false,
  ) {
    this.id = ++_pieceIdCounter
    this.x = x
    this.y = y
    this.color = color
    this.isHelper = isHelper
  }

  select(audio: AudioManager): void {
    if (this.isSelected) return
    this.isSelected = true
    gsap.to(this, {
      scale: 1.2,
      rotation: 15 * (Math.PI / 180),
      duration: 0.3,
      ease: 'power2.out',
    })
    audio.playHum()
  }

  deselect(): void {
    if (!this.isSelected) return
    this.isSelected = false
    gsap.to(this, {
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out',
    })
  }

  triggerTransform(audio: AudioManager): void {
    if (this.isHelper) return
    gsap.to(this, {
      transformProgress: 1,
      duration: 0.35,
      ease: 'power2.out',
    })
    audio.playTransform()
  }

  revertTransform(): void {
    gsap.to(this, {
      transformProgress: 0,
      duration: 0.4,
      ease: 'power2.out',
    })
  }

  applyGravity(targetX: number, targetY: number, duration: number, speed: number): void {
    this.gravityTargetX = targetX
    this.gravityTargetY = targetY
    this.gravityTimer = duration
    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0.1) {
      this.vx = (dx / dist) * speed
      this.vy = (dy / dist) * speed
    }
  }

  update(dt: number): void {
    if (this.gravityTimer > 0) {
      const step = dt / 1000
      this.x += this.vx * step
      this.y += this.vy * step
      this.gravityTimer -= dt
      const decay = Math.max(0, this.gravityTimer / 1000)
      this.vx *= 0.96 + 0.04 * decay
      this.vy *= 0.96 + 0.04 * decay
      if (this.gravityTimer <= 0) {
        this.vx = 0
        this.vy = 0
      }
    }
    if (!this.isSelected && this.isDragging === false) {
      this.rotation += dt * 0.0003 * (this.id % 2 === 0 ? 1 : -1)
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.destroyed) return
    const baseRadius = PIECE_RADIUS * this.scale
    const shadowRadius = baseRadius * 1.2
    ctx.save()
    ctx.translate(this.x, this.y + 2)
    ctx.beginPath()
    ctx.fillStyle = `rgba(0, 0, 0, 0.2)`
    ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.scale(this.scale, this.scale)

    const prog = this.transformProgress
    const r = PIECE_RADIUS
    const teethLen = GEAR_TEETH_LENGTH * prog
    const teethCount = 6
    const points: { x: number; y: number }[] = []

    for (let i = 0; i < teethCount; i++) {
      const angleBase = (i / teethCount) * Math.PI * 2 - Math.PI / 2
      const angleAhead = angleBase + (Math.PI / teethCount) * 0.5
      const angleBehind = angleBase - (Math.PI / teethCount) * 0.5
      const angleToothTip = angleBase
      const angleToothLeft = angleBase - (Math.PI / teethCount) * 0.2
      const angleToothRight = angleBase + (Math.PI / teethCount) * 0.2

      points.push({
        x: Math.cos(angleBehind) * r,
        y: Math.sin(angleBehind) * r,
      })
      if (prog > 0) {
        points.push({
          x: Math.cos(angleToothLeft) * (r + teethLen * 0.4),
          y: Math.sin(angleToothLeft) * (r + teethLen * 0.4),
        })
        points.push({
          x: Math.cos(angleToothTip) * (r + teethLen),
          y: Math.sin(angleToothTip) * (r + teethLen),
        })
        points.push({
          x: Math.cos(angleToothRight) * (r + teethLen * 0.4),
          y: Math.sin(angleToothRight) * (r + teethLen * 0.4),
        })
      }
      points.push({
        x: Math.cos(angleAhead) * r,
        y: Math.sin(angleAhead) * r,
      })
    }

    if (points.length > 0) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.closePath()

      ctx.fillStyle = this.color
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = GOLD_STROKE
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = GOLD_STROKE
      ctx.globalAlpha = 0.6
      ctx.stroke()
      ctx.globalAlpha = 1

      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const bx = Math.cos(a) * r * 0.7
        const by = Math.sin(a) * r * 0.7
        ctx.beginPath()
        ctx.arc(bx, by, 2, 0, Math.PI * 2)
        ctx.fillStyle = GOLD_STROKE
        ctx.globalAlpha = 0.75
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    ctx.restore()
  }

  renderAfterimage(ctx: CanvasRenderingContext2D, alpha: number): void {
    const baseRadius = PIECE_RADIUS
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation * 0.3)

    const r = baseRadius
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.globalAlpha = alpha * 0.35
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.strokeStyle = GOLD_STROKE
    ctx.lineWidth = 1.5
    ctx.globalAlpha = alpha * 0.5
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  hitTest(screenX: number, screenY: number): boolean {
    const dx = screenX - this.x
    const dy = screenY - this.y
    const r = HIT_RADIUS * (this.isSelected ? 1.2 : 1)
    return dx * dx + dy * dy <= r * r
  }

  distanceTo(other: ChessPiece): number {
    const dx = other.x - this.x
    const dy = other.y - this.y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
