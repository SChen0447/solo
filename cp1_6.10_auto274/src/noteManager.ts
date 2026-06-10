export type NoteType = 'basic' | 'hold' | 'special'
export type NoteLane = 0 | 1 | 2 | 3
export type JudgeResult = 'perfect' | 'good' | 'normal' | 'miss' | null

export interface Note {
  id: number
  type: NoteType
  lane: NoteLane
  y: number
  speed: number
  color: string
  label: string
  holdDuration?: number
  holdProgress?: number
  holdActive?: boolean
  holdLastTick?: number
  judged: boolean
  judgeResult?: JudgeResult
  createdAt: number
}

export interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

export type EffectType = 'flash' | 'judge' | 'star' | 'lightbeam'

export interface Effect {
  id: number
  type: EffectType
  x: number
  y: number
  life: number
  maxLife: number
  value?: string | number
  color?: string
  rotation?: number
  side?: 'left' | 'right'
}

export interface GameState {
  score: number
  combo: number
  maxCombo: number
  consecutiveMisses: number
  phase: 1 | 2 | 3
  phaseTime: number
  gameOver: boolean
  notes: Note[]
  particles: Particle[]
  effects: Effect[]
  keyStates: Record<string, boolean>
  lastScoreMilestone: number
}

export const LANE_LABELS: Record<NoteLane, string> = {
  0: 'A',
  1: 'S',
  2: 'D',
  3: 'F'
}

export const LANE_KEYS = ['a', 's', 'd', 'f'] as const

const NOTE_COLORS: Record<NoteType, string> = {
  basic: '#4488ff',
  hold: '#ff8844',
  special: '#aa66ff'
}

const PHASE_CONFIG: Record<1 | 2 | 3, { speed: number; interval: number }> = {
  1: { speed: 60, interval: 1200 },
  2: { speed: 80, interval: 900 },
  3: { speed: 100, interval: 600 }
}

const MAX_PARTICLES = 200
const PERFECT_RANGE = 10
const GOOD_RANGE = 20
const NORMAL_RANGE = 30

export class NoteManager {
  private state: GameState
  private noteIdCounter = 0
  private particleIdCounter = 0
  private effectIdCounter = 0
  private lastNoteTime = 0
  private noteCountSinceHold = 0
  private noteCountSinceSpecial = 0
  private totalNotesGenerated = 0
  private judgeLineY = 0

  constructor(state: GameState) {
    this.state = state
  }

  setJudgeLineY(y: number): void {
    this.judgeLineY = y
  }

  getState(): GameState {
    return this.state
  }

  reset(): void {
    this.state.score = 0
    this.state.combo = 0
    this.state.maxCombo = 0
    this.state.consecutiveMisses = 0
    this.state.phase = 1
    this.state.phaseTime = 0
    this.state.gameOver = false
    this.state.notes = []
    this.state.particles = []
    this.state.effects = []
    this.state.keyStates = { a: false, s: false, d: false, f: false }
    this.state.lastScoreMilestone = 0
    this.noteIdCounter = 0
    this.particleIdCounter = 0
    this.effectIdCounter = 0
    this.lastNoteTime = 0
    this.noteCountSinceHold = 0
    this.noteCountSinceSpecial = 0
    this.totalNotesGenerated = 0
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.state.gameOver) return

    this.state.phaseTime += deltaTime
    if (this.state.phaseTime >= 30000 && this.state.phase < 3) {
      this.state.phase = (this.state.phase + 1) as 1 | 2 | 3
      this.state.phaseTime = 0
    }

    const config = PHASE_CONFIG[this.state.phase]
    if (currentTime - this.lastNoteTime >= config.interval) {
      this.generateNote(config.speed, currentTime)
      this.lastNoteTime = currentTime
    }

    this.updateNotes(deltaTime, currentTime)
    this.updateParticles(deltaTime)
    this.updateEffects(deltaTime)
  }

  private generateNote(speed: number, currentTime: number): void {
    let type: NoteType = 'basic'

    if (this.state.phase >= 3 && this.noteCountSinceSpecial >= 20 && Math.random() < 0.5) {
      type = 'special'
      this.noteCountSinceSpecial = 0
    } else if (this.state.phase >= 2 && this.noteCountSinceHold >= 10 && Math.random() < 0.5) {
      type = 'hold'
      this.noteCountSinceHold = 0
    }

    const lane = Math.floor(Math.random() * 4) as NoteLane
    const note: Note = {
      id: this.noteIdCounter++,
      type,
      lane,
      y: -30,
      speed,
      color: NOTE_COLORS[type],
      label: LANE_LABELS[lane],
      judged: false,
      createdAt: currentTime
    }

    if (type === 'hold') {
      note.holdDuration = 2000
      note.holdProgress = 0
      note.holdActive = false
      note.holdLastTick = 0
    }

    this.state.notes.push(note)
    this.totalNotesGenerated++
    this.noteCountSinceHold++
    this.noteCountSinceSpecial++
  }

  private updateNotes(deltaTime: number, currentTime: number): void {
    const canvasHeight = this.judgeLineY * 2 + 200

    for (let i = this.state.notes.length - 1; i >= 0; i--) {
      const note = this.state.notes[i]
      note.y += (note.speed * deltaTime) / 1000

      if (note.type === 'hold' && note.holdActive) {
        note.holdProgress = (note.holdProgress ?? 0) + deltaTime
        const elapsed = note.holdProgress ?? 0
        const lastTick = note.holdLastTick ?? 0
        if (elapsed - lastTick >= 1000) {
          this.state.score += 50
          this.state.combo++
          if (this.state.combo > this.state.maxCombo) {
            this.state.maxCombo = this.state.combo
          }
          note.holdLastTick = elapsed
        }
      }

      if (!note.judged && note.y > this.judgeLineY + NORMAL_RANGE) {
        this.handleMiss(note)
      }

      if (note.type === 'hold' && note.holdActive) {
        if ((note.holdProgress ?? 0) >= (note.holdDuration ?? 0)) {
          note.judged = true
          this.state.notes.splice(i, 1)
          continue
        }
      } else if (note.y > canvasHeight || note.judged) {
        if (note.judged && note.type !== 'hold') {
          setTimeout(() => {
            const idx = this.state.notes.indexOf(note)
            if (idx !== -1) this.state.notes.splice(idx, 1)
          }, 200)
        }
        if (note.y > canvasHeight) {
          this.state.notes.splice(i, 1)
        }
      }
    }
  }

  private handleMiss(note: Note): void {
    note.judged = true
    note.judgeResult = 'miss'
    this.state.combo = 0
    this.state.consecutiveMisses++
    this.addJudgeEffect(note.lane, 'Miss', '#ff2244')
    if (this.state.consecutiveMisses >= 5) {
      this.state.gameOver = true
    }
  }

  handleKeyPress(key: string): void {
    if (this.state.gameOver) return
    const laneIdx = LANE_KEYS.indexOf(key as typeof LANE_KEYS[number])
    if (laneIdx === -1) return

    const lane = laneIdx as NoteLane
    let targetNote: Note | null = null
    let minDist = Infinity

    for (const note of this.state.notes) {
      if (note.lane !== lane || note.judged) continue
      const dist = Math.abs(note.y - this.judgeLineY)
      if (dist < minDist && dist <= NORMAL_RANGE) {
        minDist = dist
        targetNote = note
      }
    }

    if (!targetNote) return

    if (targetNote.type === 'hold') {
      targetNote.holdActive = true
      targetNote.judged = true
      this.addJudgeEffect(lane, 'Hold!', targetNote.color)
      this.spawnParticles(this.getLaneX(lane), this.judgeLineY, targetNote.color, 8)
      return
    }

    let result: JudgeResult = 'normal'
    let scoreGain = 30
    let color = '#ffffff'
    let label = '普通'

    if (minDist <= PERFECT_RANGE) {
      result = 'perfect'
      scoreGain = 100
      color = '#00ff88'
      label = '完美'
    } else if (minDist <= GOOD_RANGE) {
      result = 'good'
      scoreGain = 60
      color = '#4488ff'
      label = '良好'
    }

    targetNote.judged = true
    targetNote.judgeResult = result
    this.state.score += scoreGain
    this.state.consecutiveMisses = 0

    if (result === 'perfect' || result === 'good') {
      this.state.combo++
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo
      }
      if (this.state.combo > 10 && result === 'perfect') {
        this.addStarEffect(this.getLaneX(lane))
      }
    } else {
      this.state.combo = 0
    }

    this.addJudgeEffect(lane, `+${scoreGain} ${label}`, color)
    this.spawnParticles(this.getLaneX(lane), this.judgeLineY, targetNote.color, 12)

    if (targetNote.type === 'special') {
      this.addFlashEffect()
    }

    const milestone = Math.floor(this.state.score / 100)
    if (milestone > this.state.lastScoreMilestone) {
      this.state.lastScoreMilestone = milestone
      this.addLightBeamEffects()
    }
  }

  handleKeyRelease(key: string): void {
    const laneIdx = LANE_KEYS.indexOf(key as typeof LANE_KEYS[number])
    if (laneIdx === -1) return
    const lane = laneIdx as NoteLane

    for (const note of this.state.notes) {
      if (note.lane === lane && note.type === 'hold' && note.holdActive) {
        note.holdActive = false
      }
    }
  }

  private getLaneX(lane: NoteLane): number {
    const centerX = (typeof window !== 'undefined' ? window.innerWidth : 800) / 2
    const laneSpacing = 60
    return centerX + (lane - 1.5) * laneSpacing
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    const actualCount = Math.min(count, 8 + Math.floor(Math.random() * 9))
    for (let i = 0; i < actualCount; i++) {
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.5
      const speed = 200 + Math.random() * 200
      this.state.particles.push({
        id: this.particleIdCounter++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 4,
        life: 500,
        maxLife: 500
      })
    }

    while (this.state.particles.length > MAX_PARTICLES) {
      this.state.particles.shift()
    }
  }

  private addJudgeEffect(lane: NoteLane, text: string, color: string): void {
    this.state.effects.push({
      id: this.effectIdCounter++,
      type: 'judge',
      x: this.getLaneX(lane),
      y: this.judgeLineY - 50,
      life: 500,
      maxLife: 500,
      value: text,
      color
    })
  }

  private addStarEffect(x: number): void {
    this.state.effects.push({
      id: this.effectIdCounter++,
      type: 'star',
      x,
      y: this.judgeLineY - 80,
      life: 400,
      maxLife: 400,
      rotation: 0
    })
  }

  private addFlashEffect(): void {
    this.state.effects.push({
      id: this.effectIdCounter++,
      type: 'flash',
      x: 0,
      y: 0,
      life: 300,
      maxLife: 300
    })
  }

  private addLightBeamEffects(): void {
    const colors = ['#4488ff', '#aa66ff', '#ff8844', '#00ff88', '#ffd700']
    const color = colors[Math.floor(Math.random() * colors.length)]
    this.state.effects.push({
      id: this.effectIdCounter++,
      type: 'lightbeam',
      x: 0,
      y: window.innerHeight / 2,
      life: 1000,
      maxLife: 1000,
      color,
      side: 'left'
    })
    this.state.effects.push({
      id: this.effectIdCounter++,
      type: 'lightbeam',
      x: window.innerWidth,
      y: window.innerHeight / 2,
      life: 1000,
      maxLife: 1000,
      color,
      side: 'right'
    })
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i]
      p.x += (p.vx * deltaTime) / 1000
      p.y += (p.vy * deltaTime) / 1000
      p.life -= deltaTime
      p.size = 4 * (p.life / p.maxLife)
      if (p.life <= 0) {
        this.state.particles.splice(i, 1)
      }
    }
  }

  private updateEffects(deltaTime: number): void {
    for (let i = this.state.effects.length - 1; i >= 0; i--) {
      const e = this.state.effects[i]
      e.life -= deltaTime
      if (e.type === 'star') {
        e.rotation = ((e.rotation ?? 0) + (deltaTime / 800) * Math.PI * 2)
      }
      if (e.life <= 0) {
        this.state.effects.splice(i, 1)
      }
    }
  }
}
