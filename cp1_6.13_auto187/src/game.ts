import { gsap } from 'gsap'
import { AudioManager } from './audio'
import { Starfield, type Point } from './starfield'
import {
  ChessPiece,
  PIECE_COLORS,
  HELPER_COLOR,
  PIECE_RADIUS,
} from './chesspiece'

type GameState = 'placing' | 'moving' | 'chaining'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  baseSize: number
  color: string
  life: number
  maxLife: number
}

interface EnergyWave {
  x: number
  y: number
  color: string
  radius: number
  maxRadius: number
  alpha: number
  age: number
  duration: number
  appliedGravity: Set<number>
}

interface Afterimage {
  x: number
  y: number
  color: string
  alpha: number
  age: number
  duration: number
}

const MAX_WAVE_RADIUS = 200
const WAVE_DURATION = 1500
const GRAVITY_SPEED = 50
const GRAVITY_DURATION = 1000
const COLLISION_DIST_SQ = 30 * 30
const EXPLOSION_PARTICLES = 20
const AFTERIMAGE_DURATION = 500
const REMOVE_MARGIN = 30
const MAX_PIECES = 12
const CHAIN_SCORE = 10
const REMOVE_SCORE = -5
const MAX_PARTICLES = 200

class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private starfield: Starfield
  private audio: AudioManager
  private pieces: ChessPiece[] = []
  private particles: Particle[] = []
  private energyWaves: EnergyWave[] = []
  private afterimages: Afterimage[] = []
  private score = 0
  private scoreScale = 1
  private state: GameState = 'placing'
  private stateTimer = 0
  private selectedPiece: ChessPiece | null = null
  private _dragCurrentX = 0
  private _dragCurrentY = 0
  private lastTime = 0
  private _rafId = 0
  private running = false
  private scoreAnimating = false

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null
    if (!canvas) throw new Error('Canvas #game-canvas not found')
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    this.starfield = new Starfield()
    this.audio = new AudioManager()
    this.bindEvents()
    this.resize()
  }

  private bindEvents(): void {
    const handleDown = (e: PointerEvent): void => {
      e.preventDefault()
      this.audio.init().then(() => {})
      const rect = this.canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height)
      this.handleMouseDown(x, y)
    }
    const handleMove = (e: PointerEvent): void => {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height)
      this.handleMouseMove(x, y)
    }
    const handleUp = (e: PointerEvent): void => {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width)
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height)
      this.handleMouseUp(x, y)
    }
    const handleResize = (): void => this.resize()

    this.canvas.addEventListener('pointerdown', handleDown, { passive: false })
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp, { passive: false })
    window.addEventListener('pointercancel', handleUp, { passive: false })
    window.addEventListener('resize', handleResize)
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.starfield.resize(w, h)
  }

  start(): void {
    this.initInitialPieces()
    this.running = true
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  private initInitialPieces(): void {
    const positions = this.starfield.getInitialPositions()
    const colorsShuffled = [...PIECE_COLORS].sort(() => Math.random() - 0.5)
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      const color = colorsShuffled[i % colorsShuffled.length]
      const piece = new ChessPiece(p.x, p.y, color, false)
      const grid = this.starfield.findNearestGridPoint(p.x, p.y)
      if (grid) {
        piece.col = grid.col
        piece.row = grid.row
      }
      this.pieces.push(piece)
    }
  }

  private getOccupiedKeys(): Set<string> {
    const s = new Set<string>()
    for (const p of this.pieces) {
      if (p.col >= 0 && p.row >= 0) {
        s.add(`${p.col}-${p.row}`)
      }
    }
    return s
  }

  private loop = (time: number): void => {
    if (!this.running) return
    let dt = time - this.lastTime
    if (dt > 50) dt = 50
    this.lastTime = time
    this.update(dt, time)
    this.render(time)
    this._rafId = requestAnimationFrame(this.loop)
  }

  private update(dt: number, time: number): void {
    this.starfield.update(dt, time)
    for (const piece of this.pieces) piece.update(dt)

    if (this.stateTimer > 0) {
      this.stateTimer -= dt
      if (this.stateTimer <= 0) {
        if (this.state === 'moving' || this.state === 'chaining') {
          this.setState('placing', 0)
        }
      }
    }

    this.updateWaves(dt)
    this.updateParticles(dt)
    this.updateAfterimages(dt)
    this.checkCollisions()

    this.pieces = this.pieces.filter(p => !p.destroyed)
  }

  private setState(s: GameState, duration: number): void {
    this.state = s
    this.stateTimer = duration > 0 ? duration : 0
  }

  private updateWaves(dt: number): void {
    const stillActive: EnergyWave[] = []
    for (const w of this.energyWaves) {
      w.age += dt
      const t = w.age / w.duration
      if (t >= 1) continue
      w.radius = w.maxRadius * t
      const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 4)
      w.alpha = (1 - t) * (0.45 + 0.15 * pulse)
      stillActive.push(w)

      for (const piece of this.pieces) {
        if (piece.id === 0) continue
        if (piece.isDragging) continue
        if (w.appliedGravity.has(piece.id)) continue
        const dx = piece.x - w.x
        const dy = piece.y - w.y
        const dsq = dx * dx + dy * dy
        if (dsq <= w.radius * w.radius) {
          w.appliedGravity.add(piece.id)
          piece.applyGravity(w.x, w.y, GRAVITY_DURATION, GRAVITY_SPEED)
          this.setState('moving', 1200)
          this.starfield.boostGridBrightness()
        }
      }
    }
    this.energyWaves = stillActive
  }

  private updateParticles(dt: number): void {
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life -= dt
      if (p.life <= 0) continue
      p.x += p.vx * (dt / 1000)
      p.y += p.vy * (dt / 1000)
      p.vx *= 0.98
      p.vy *= 0.98
      const lifeT = p.life / p.maxLife
      p.size = p.baseSize * lifeT
      alive.push(p)
    }
    this.particles = alive
  }

  private updateAfterimages(dt: number): void {
    const alive: Afterimage[] = []
    for (const a of this.afterimages) {
      a.age += dt
      if (a.age >= a.duration) continue
      a.alpha = 1 - a.age / a.duration
      alive.push(a)
    }
    this.afterimages = alive
  }

  private checkCollisions(): void {
    let chainTriggered = false
    for (let i = 0; i < this.pieces.length; i++) {
      for (let j = i + 1; j < this.pieces.length; j++) {
        const a = this.pieces[i]
        const b = this.pieces[j]
        if (a.destroyed || b.destroyed) continue
        if (a.isDragging || b.isDragging) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dsq = dx * dx + dy * dy
        if (dsq <= COLLISION_DIST_SQ) {
          this.spawnExplosion(a, b)
          a.destroyed = true
          b.destroyed = true
          chainTriggered = true
          this.addScore(CHAIN_SCORE)
          this.audio.playMetalImpact()
          this.setState('chaining', 1200)
          this.starfield.boostGridBrightness()
        }
      }
    }
    if (chainTriggered) {
      setTimeout(() => this.spawnHelperIfNeeded(), 300)
    }
  }

  private spawnExplosion(p1: ChessPiece, p2: ChessPiece): void {
    const cx = (p1.x + p2.x) / 2
    const cy = (p1.y + p2.y) / 2
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = (i / EXPLOSION_PARTICLES) * Math.PI * 2 + Math.random() * 0.5
      const speed = 80 + Math.random() * 180
      const baseSize = 3 + Math.random() * 5
      const colorMix = Math.random()
      const color = colorMix < 0.5 ? p1.color : p2.color
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: baseSize,
        baseSize,
        color,
        life: 800,
        maxLife: 800,
      })
    }
    const centerP: Point = { x: cx, y: cy }
    if (centerP) {}
  }

  private spawnHelperIfNeeded(): void {
    if (this.pieces.length >= MAX_PIECES) return
    const need = Math.min(MAX_PIECES - this.pieces.length, 1)
    const occupied = this.getOccupiedKeys()
    for (let i = 0; i < need; i++) {
      const gp = this.starfield.findRandomEmptyGridPoint(occupied)
      if (!gp) break
      const piece = new ChessPiece(gp.x, gp.y, HELPER_COLOR, true)
      piece.col = gp.col
      piece.row = gp.row
      this.pieces.push(piece)
      occupied.add(this.starfield.getGridKey(gp))
    }
  }

  private addScore(delta: number): void {
    this.score = Math.max(0, this.score + delta)
    if (!this.scoreAnimating) {
      this.scoreAnimating = true
      gsap.fromTo(
        this,
        { scoreScale: 1 },
        {
          scoreScale: 1.2,
          duration: 0.1,
          ease: 'power2.out',
          onComplete: () => {
            gsap.to(this, {
              scoreScale: 1,
              duration: 0.1,
              ease: 'power2.in',
              onComplete: () => {
                this.scoreAnimating = false
              },
            })
          },
        },
      )
    }
  }

  private handleMouseDown(x: number, y: number): void {
    if (this.state === 'chaining') return
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i]
      if (piece.destroyed) continue
      if (piece.hitTest(x, y)) {
        if (this.selectedPiece && this.selectedPiece.id !== piece.id) {
          this.selectedPiece.deselect()
        }
        piece.select(this.audio)
        piece.isDragging = true
        piece.dragOffsetX = x - piece.x
        piece.dragOffsetY = y - piece.y
        this.selectedPiece = piece
        this._dragCurrentX = x
        this._dragCurrentY = y
        this.afterimages.push({
          x: piece.x,
          y: piece.y,
          color: piece.color,
          alpha: 1,
          age: 0,
          duration: AFTERIMAGE_DURATION,
        })
        return
      }
    }
    if (this.selectedPiece) {
      this.selectedPiece.deselect()
      this.selectedPiece = null
    }
  }

  private handleMouseMove(x: number, y: number): void {
    this.dragCurrentX = x
    this.dragCurrentY = y
    if (this.selectedPiece && this.selectedPiece.isDragging) {
      this.selectedPiece.x = x - this.selectedPiece.dragOffsetX
      this.selectedPiece.y = y - this.selectedPiece.dragOffsetY
    }
  }

  private handleMouseUp(x: number, y: number): void {
    if (!this.selectedPiece) return
    const piece = this.selectedPiece
    if (!piece.isDragging) {
      piece.deselect()
      this.selectedPiece = null
      return
    }
    piece.isDragging = false
    const fx = x - piece.dragOffsetX
    const fy = y - piece.dragOffsetY
    if (!this.starfield.isInBoard(fx, fy, REMOVE_MARGIN)) {
      this.removePiece(piece)
      this.selectedPiece = null
      return
    }
    const grid = this.starfield.findNearestGridPoint(fx, fy)
    if (grid) {
      this.placePiece(piece, grid)
    } else {
      piece.deselect()
    }
    this.selectedPiece = null
  }

  private removePiece(piece: ChessPiece): void {
    piece.destroyed = true
    piece.deselect()
    this.audio.playGlassBreak()
    this.addScore(REMOVE_SCORE)
    for (let i = 0; i < 12; i++) {
      if (this.particles.length >= MAX_PARTICLES) break
      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * 140
      const baseSize = 2 + Math.random() * 4
      this.particles.push({
        x: piece.x,
        y: piece.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: baseSize,
        baseSize,
        color: piece.color,
        life: 600,
        maxLife: 600,
      })
    }
  }

  private placePiece(piece: ChessPiece, grid: { x: number; y: number; col: number; row: number }): void {
    const occupied = this.getOccupiedKeys()
    const key = `${grid.col}-${grid.row}`
    if (occupied.has(key)) {
      piece.deselect()
      return
    }
    gsap.to(piece, {
      x: grid.x,
      y: grid.y,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        piece.col = grid.col
        piece.row = grid.row
        piece.deselect()
        if (!piece.isHelper) {
          piece.triggerTransform(this.audio)
          this.spawnEnergyWave(piece)
          this.audio.playEnergyWave()
          setTimeout(() => {
            this.spawnHelperIfNeeded()
          }, 200)
        } else {
          this.audio.playMove()
          setTimeout(() => {
            this.spawnHelperIfNeeded()
          }, 200)
        }
      },
    })
    this.starfield.boostGridBrightness()
  }

  private spawnEnergyWave(piece: ChessPiece): void {
    this.energyWaves.push({
      x: piece.x,
      y: piece.y,
      color: piece.color,
      radius: 0,
      maxRadius: MAX_WAVE_RADIUS,
      alpha: 0.6,
      age: 0,
      duration: WAVE_DURATION,
      appliedGravity: new Set<number>(),
    })
    this.starfield.triggerGlow(MAX_WAVE_RADIUS)
  }

  private render(time: number): void {
    const w = window.innerWidth
    const h = window.innerHeight
    this.ctx.clearRect(0, 0, w, h)
    this.starfield.render(this.ctx, time)
    this.renderAfterimages()
    this.renderEnergyWaves()
    for (const piece of this.pieces) {
      piece.render(this.ctx)
    }
    this.renderParticles()
    this.renderHUD()
  }

  private renderAfterimages(): void {
    for (const a of this.afterimages) {
      this.ctx.save()
      this.ctx.translate(a.x, a.y)
      const r = PIECE_RADIUS
      this.ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 - Math.PI / 2
        const px = Math.cos(ang) * r
        const py = Math.sin(ang) * r
        if (i === 0) this.ctx.moveTo(px, py)
        else this.ctx.lineTo(px, py)
      }
      this.ctx.closePath()
      this.ctx.globalAlpha = a.alpha * 0.35
      this.ctx.fillStyle = a.color
      this.ctx.fill()
      this.ctx.restore()
    }
  }

  private renderEnergyWaves(): void {
    for (const w of this.energyWaves) {
      const t = w.age / w.duration
      const rings = 3
      for (let r = 0; r < rings; r++) {
        const rt = Math.max(0, t - r * 0.08)
        const radius = w.maxRadius * rt
        if (radius <= 0) continue
        const ringAlpha = (1 - rt) * w.alpha * (1 - r * 0.3)
        const grad = this.ctx.createRadialGradient(w.x, w.y, radius * 0.92, w.x, w.y, radius)
        grad.addColorStop(0, hexToRgba(w.color, 0))
        grad.addColorStop(0.5, hexToRgba(w.color, ringAlpha * 0.7))
        grad.addColorStop(1, hexToRgba(w.color, 0))
        this.ctx.beginPath()
        this.ctx.fillStyle = grad
        this.ctx.arc(w.x, w.y, radius, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      this.ctx.beginPath()
      this.ctx.fillStyle = p.color
      this.ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()
    }
    this.ctx.globalAlpha = 1
  }

  private renderHUD(): void {
    const w = window.innerWidth
    this.ctx.save()
    this.ctx.font = 'bold 22px "Courier New", Consolas, monospace'
    this.ctx.textBaseline = 'top'

    this.ctx.textAlign = 'left'
    const scoreText = `分数: ${this.score}`
    this.ctx.save()
    this.ctx.translate(28, 24)
    this.ctx.scale(this.scoreScale, this.scoreScale)
    this.ctx.shadowColor = 'rgba(0, 200, 255, 0.6)'
    this.ctx.shadowBlur = 12
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fillText(scoreText, 0, 0)
    this.ctx.shadowBlur = 0
    this.ctx.restore()

    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = '#ffd700'
    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)'
    this.ctx.shadowBlur = 10
    this.ctx.fillText(`棋子: ${this.pieces.length}/${MAX_PIECES}`, w - 28, 24)
    this.ctx.shadowBlur = 0

    this.ctx.textAlign = 'center'
    let stateText = '状态: 放置中'
    let stateColor = '#ffffff'
    if (this.state === 'moving') {
      stateText = '状态: 移动中'
      stateColor = '#ffd700'
    } else if (this.state === 'chaining') {
      stateText = '状态: 连锁反应!'
      stateColor = '#ff4444'
    }
    this.ctx.font = 'bold 20px "Courier New", Consolas, monospace'
    this.ctx.fillStyle = stateColor
    this.ctx.shadowColor = stateColor
    this.ctx.shadowBlur = 14
    this.ctx.fillText(stateText, w / 2, window.innerHeight - 44)
    this.ctx.shadowBlur = 0

    this.ctx.textAlign = 'center'
    this.ctx.font = '13px "Courier New", Consolas, monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
    this.ctx.fillText(
      '点击棋子选中并拖拽至目标交叉点 · 移出棋盘可移除 · 触发连锁获分',
      w / 2,
      window.innerHeight - 20,
    )
    this.ctx.restore()
  }
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('')
  }
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game()
    game.start()
  } catch (e) {
    console.error('Game failed to start:', e)
  }
})
