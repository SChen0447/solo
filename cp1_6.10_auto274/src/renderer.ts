import type { GameState, Note, Particle, Effect, NoteLane } from './noteManager'
import { LANE_KEYS } from './noteManager'

interface Star {
  x: number
  y: number
  size: number
  phase: number
  speed: number
}

interface Beam {
  x: number
  opacity: number
  lastBlink: number
}

const LANE_SPACING = 60
const STAFF_LINE_SPACING = 20

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private stars: Star[] = []
  private beams: Beam[] = []
  private startTime = 0
  private lastBeamBlink = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.resize()
    this.initStars()
    this.initBeams()
    window.addEventListener('resize', () => this.resize())
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.canvas.style.width = window.innerWidth + 'px'
    this.canvas.style.height = window.innerHeight + 'px'
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.initBeams()
  }

  getJudgeLineY(): number {
    return window.innerHeight / 2
  }

  getTrackLeft(): number {
    return window.innerWidth / 2 - LANE_SPACING * 2
  }

  getTrackRight(): number {
    return window.innerWidth / 2 + LANE_SPACING * 2
  }

  getLaneX(lane: NoteLane): number {
    return window.innerWidth / 2 + (lane - 1.5) * LANE_SPACING
  }

  private initStars(): void {
    this.stars = []
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        speed: 1
      })
    }
  }

  private initBeams(): void {
    this.beams = []
    const left = this.getTrackLeft()
    const right = this.getTrackRight()
    for (let i = 0; i < 6; i++) {
      this.beams.push({
        x: left - 30 - Math.random() * 80,
        opacity: 0.1,
        lastBlink: Math.random() * 2000
      })
    }
    for (let i = 0; i < 6; i++) {
      this.beams.push({
        x: right + 30 + Math.random() * 80,
        opacity: 0.1,
        lastBlink: Math.random() * 2000
      })
    }
  }

  render(state: GameState, elapsedTime: number): void {
    if (this.startTime === 0) this.startTime = elapsedTime
    const ctx = this.ctx
    const w = window.innerWidth
    const h = window.innerHeight

    ctx.clearRect(0, 0, w, h)

    this.drawBackground(w, h, elapsedTime)
    this.drawStars(w, h, elapsedTime)
    this.drawSideBeams(elapsedTime)
    this.drawStaff(w, h)
    this.drawJudgeLine(h)
    this.drawNotes(state.notes, elapsedTime)
    this.drawParticles(state.particles)
    this.drawEffects(state.effects, w, h, elapsedTime)
  }

  private drawBackground(w: number, h: number, t: number): void {
    const ctx = this.ctx
    const cycle = (t / 15000) % 2
    const isVertical = cycle < 1

    const gradient = isVertical
      ? ctx.createLinearGradient(0, 0, 0, h)
      : ctx.createLinearGradient(0, 0, w, 0)

    const phase = (t / 15000) % 1
    const r1 = Math.floor(10 + phase * 32)
    const g1 = Math.floor(10)
    const b1 = Math.floor(46 - phase * 16)
    const r2 = Math.floor(42 - phase * 32)
    const g2 = Math.floor(10)
    const b2 = Math.floor(58 + phase * 16)

    gradient.addColorStop(0, `rgb(${r1},${g1},${b1})`)
    gradient.addColorStop(1, `rgb(${r2},${g2},${b2})`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  private drawStars(w: number, h: number, t: number): void {
    const ctx = this.ctx
    const dt = 16
    for (const star of this.stars) {
      star.y += (star.speed * dt) / 1000
      if (star.y > h) {
        star.y = -5
        star.x = Math.random() * w
      }
      const twinkle = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t / 500 + star.phase))
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`
      ctx.fill()
    }
  }

  private drawSideBeams(t: number): void {
    const ctx = this.ctx
    const h = window.innerHeight
    if (t - this.lastBeamBlink > 2000) {
      this.lastBeamBlink = t
      for (const beam of this.beams) {
        if (Math.random() < 0.3) {
          beam.opacity = 0.15 + Math.random() * 0.2
          setTimeout(() => { beam.opacity = 0.1 }, 300)
        }
      }
    }
    for (const beam of this.beams) {
      ctx.fillStyle = `rgba(68,136,255,${beam.opacity})`
      ctx.fillRect(beam.x, 0, 2, h)
    }
  }

  private drawStaff(w: number, h: number): void {
    const ctx = this.ctx
    const centerX = w / 2
    const judgeY = h / 2
    const top = judgeY - 180
    const bottom = judgeY + 180

    ctx.strokeStyle = 'rgba(160,160,160,0.6)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const y = top + i * STAFF_LINE_SPACING
      ctx.beginPath()
      ctx.moveTo(this.getTrackLeft() - 40, y)
      ctx.lineTo(this.getTrackRight() + 40, y)
      ctx.stroke()
    }
    void bottom
    void centerX
  }

  private drawJudgeLine(h: number): void {
    const ctx = this.ctx
    const y = h / 2
    const left = this.getTrackLeft() - 40
    const right = this.getTrackRight() + 40

    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 8
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  private drawNotes(notes: Note[], t: number): void {
    const ctx = this.ctx
    for (const note of notes) {
      const x = this.getLaneX(note.lane)

      if (note.type === 'hold') {
        this.drawHoldNote(note, x, t)
      } else {
        this.drawBasicNote(note, x, t)
      }
    }
  }

  private drawBasicNote(note: Note, x: number, t: number): void {
    const ctx = this.ctx
    const y = note.y

    let alpha = 1
    if (note.judged) {
      const elapsed = t - note.createdAt
      alpha = Math.max(0, 1 - elapsed / 200)
    }

    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(x, y, 12, 0, Math.PI * 2)
    ctx.fillStyle = note.color
    ctx.shadowColor = note.color
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(note.label, x, y)
    ctx.globalAlpha = 1
  }

  private drawHoldNote(note: Note, x: number, t: number): void {
    const ctx = this.ctx
    const y = note.y
    const length = 60

    const progress = note.holdActive
      ? Math.min(1, (note.holdProgress ?? 0) / (note.holdDuration ?? 1))
      : 0

    const tailGradient = ctx.createLinearGradient(x, y - length, x, y)
    tailGradient.addColorStop(0, `rgba(255,136,68,0.2)`)
    tailGradient.addColorStop(1, `rgba(255,136,68,0.6)`)
    ctx.fillStyle = tailGradient
    ctx.fillRect(x - 10, y - length, 20, length)

    const bodyHeight = length
    const barRadius = 10
    ctx.fillStyle = note.color
    ctx.shadowColor = note.color
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.moveTo(x - barRadius, y)
    ctx.lineTo(x - barRadius, y - bodyHeight + barRadius)
    ctx.quadraticCurveTo(x - barRadius, y - bodyHeight, x, y - bodyHeight)
    ctx.quadraticCurveTo(x + barRadius, y - bodyHeight, x + barRadius, y - bodyHeight + barRadius)
    ctx.lineTo(x + barRadius, y)
    ctx.quadraticCurveTo(x + barRadius, y, x, y)
    ctx.quadraticCurveTo(x - barRadius, y, x - barRadius, y)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(note.label, x, y - 10)

    if (note.holdActive) {
      this.drawHoldTail(note, x, y, progress, t)
    }
  }

  private drawHoldTail(note: Note, x: number, y: number, progress: number, t: number): void {
    const ctx = this.ctx
    const tailY = y + 5
    const tailHeight = 100 * progress

    const trailGradient = ctx.createLinearGradient(x, tailY, x, tailY + tailHeight)
    trailGradient.addColorStop(0, `rgba(255,136,68,0.6)`)
    trailGradient.addColorStop(1, `rgba(255,136,68,0.1)`)
    ctx.fillStyle = trailGradient
    ctx.fillRect(x - 6, tailY, 12, tailHeight)

    void t
    void note
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx
    for (const p of particles) {
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawEffects(effects: Effect[], w: number, h: number, t: number): void {
    const ctx = this.ctx
    for (const e of effects) {
      const progress = 1 - e.life / e.maxLife
      switch (e.type) {
        case 'flash':
          ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - progress)})`
          ctx.fillRect(0, 0, w, h)
          break
        case 'judge':
          ctx.globalAlpha = 1 - progress
          ctx.font = 'bold 28px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = e.color ?? '#ffffff'
          ctx.shadowColor = e.color ?? '#ffffff'
          ctx.shadowBlur = 10
          ctx.fillText(String(e.value ?? ''), e.x, e.y - progress * 30)
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
          break
        case 'star':
          this.drawStarEffect(e.x, e.y, e.rotation ?? 0, 1 - progress)
          break
        case 'lightbeam':
          this.drawLightBeam(e, w, h, progress)
          break
      }
    }
    void t
  }

  private drawStarEffect(x: number, y: number, rotation: number, alpha: number): void {
    const ctx = this.ctx
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rotation)
    ctx.globalAlpha = alpha

    const spikes = 5
    const outerRadius = 24
    const innerRadius = 10

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius)
    gradient.addColorStop(0, 'rgba(255,215,0,0.9)')
    gradient.addColorStop(0.5, 'rgba(255,140,0,0.5)')
    gradient.addColorStop(1, 'rgba(255,215,0,0)')

    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / spikes - Math.PI / 2
      const px = Math.cos(angle) * radius
      const py = Math.sin(angle) * radius
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 15
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore()
    ctx.globalAlpha = 1
  }

  private drawLightBeam(e: Effect, w: number, h: number, progress: number): void {
    const ctx = this.ctx
    const centerX = w / 2
    let currentX: number
    if (e.side === 'left') {
      currentX = -20 + progress * (centerX + 20)
    } else {
      currentX = w + 20 - progress * (w - centerX + 20)
    }
    const alpha = 1 - Math.abs(progress - 0.5) * 2
    ctx.fillStyle = e.color ?? '#4488ff'
    ctx.globalAlpha = Math.max(0, alpha)
    ctx.fillRect(currentX - 1.5, 0, 3, h)
    ctx.globalAlpha = 1
  }
}
