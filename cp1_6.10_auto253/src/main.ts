import {
  createPlanktonParticles,
  createCreatures,
  createSoundWave,
  createBurstParticles,
  createRidgePoints,
  type Particle,
  type Creature,
  type SoundWave,
  type BurstParticle,
  type RidgePoint
} from './entities'
import { createRenderer, type GameState } from './renderer'
import { createAudioSystem } from './audio'

const MAX_SOUND_WAVES = 3
const MAX_TOTAL_PARTICLES = 1500
const TRAIL_PARTICLE_LIMIT = 800

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

let width = window.innerWidth
let height = window.innerHeight

function resizeCanvas(): void {
  width = window.innerWidth
  height = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

const audio = createAudioSystem()
const renderer = createRenderer(ctx)

let plankton: Particle[] = createPlanktonParticles(600, width, height)
let creatures: Creature[] = createCreatures(12, width, height)
let soundWaves: SoundWave[] = []
let burstParticles: BurstParticle[] = []
let trailParticles: Particle[] = []
let ridgePoints: RidgePoint[] = createRidgePoints(width, height)
let collected = 0
let timeAcc = 0

window.addEventListener('resize', () => {
  plankton = createPlanktonParticles(600, width, height)
  creatures = createCreatures(12, width, height)
  ridgePoints = createRidgePoints(width, height)
})

canvas.addEventListener('click', (e: MouseEvent) => {
  audio.init()
  const x = e.clientX
  const y = e.clientY
  if (soundWaves.length >= MAX_SOUND_WAVES) {
    soundWaves.shift()
  }
  soundWaves.push(createSoundWave(x, y, width, height))
})

canvas.addEventListener('keydown', () => {
  audio.init()
})

function updatePlankton(): void {
  for (const p of plankton) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = width
    if (p.x > width) p.x = 0
    if (p.y < 0) p.y = height
    if (p.y > height) p.y = 0

    if (p.brightTime > 0) {
      p.brightTime--
      p.alpha = 0.8
    } else {
      const flicker = 0.05 * Math.sin(timeAcc * 0.05 + p.x)
      p.alpha = Math.max(0.1, Math.min(0.6, p.baseAlpha + flicker))
    }
  }
}

function applyWavePush(wave: SoundWave): void {
  const r = wave.radius
  const lw = Math.max(3, wave.lineWidth)
  for (const p of plankton) {
    const dx = p.x - wave.x
    const dy = p.y - wave.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > r - lw - 2 && dist < r + lw + 2) {
      if (dist > 0.1) {
        const push = 1.5
        p.vx += (dx / dist) * push
        p.vy += (dy / dist) * push
      }
      p.brightTime = 30
    }
  }
}

function checkCollections(wave: SoundWave): void {
  for (const c of creatures) {
    if (c.collected) continue
    const dx = c.x - wave.x
    const dy = c.y - wave.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 20) {
      c.collected = true
      collected++
      audio.playCollectSound()
      audio.updateTrackLayers(collected)
      const bursts = createBurstParticles(c.x, c.y, c.color, 12)
      burstParticles.push(...bursts)
    }
  }
}

function updateSoundWaves(): void {
  const remaining: SoundWave[] = []
  for (const w of soundWaves) {
    const prevR = w.radius
    w.update()
    if (prevR < 40 && w.radius >= 40) {
      checkCollections(w)
    }
    applyWavePush(w)
    if (!w.isDead()) remaining.push(w)
  }
  soundWaves = remaining
}

function updateBurstParticles(): void {
  const remaining: BurstParticle[] = []
  for (const p of burstParticles) {
    p.life++
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.96
    p.vy *= 0.96
    const t = p.life / p.maxLife
    p.alpha = Math.max(0, 1 - t)
    if (p.life < p.maxLife) remaining.push(p)
  }
  burstParticles = remaining
}

function updateCreatures(): void {
  const newTrails: Particle[] = []
  for (const c of creatures) {
    if (c.collected) continue
    c.update(width, height)
    for (let i = 0; i < 3; i++) {
      newTrails.push(c.spawnTrailParticle())
    }
  }
  trailParticles.push(...newTrails)
  if (trailParticles.length > TRAIL_PARTICLE_LIMIT) {
    trailParticles = trailParticles.slice(trailParticles.length - TRAIL_PARTICLE_LIMIT)
  }
}

function updateTrailParticles(): void {
  const remaining: Particle[] = []
  for (const p of trailParticles) {
    p.life++
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.97
    p.vy *= 0.97
    const t = p.life / p.maxLife
    p.alpha = Math.max(0, p.baseAlpha * (1 - t))
    if (p.life < p.maxLife) remaining.push(p)
  }
  trailParticles = remaining
}

function enforceParticleLimits(): void {
  const total = plankton.length + trailParticles.length + burstParticles.length
  if (total > MAX_TOTAL_PARTICLES) {
    const excess = total - MAX_TOTAL_PARTICLES
    if (trailParticles.length > excess) {
      trailParticles = trailParticles.slice(excess)
    }
  }
}

function loop(): void {
  timeAcc++
  updatePlankton()
  updateCreatures()
  updateSoundWaves()
  updateBurstParticles()
  updateTrailParticles()
  enforceParticleLimits()

  const state: GameState = {
    width,
    height,
    plankton,
    creatures,
    soundWaves,
    burstParticles,
    trailParticles,
    collected,
    ridgePoints
  }
  renderer.render(state)
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
