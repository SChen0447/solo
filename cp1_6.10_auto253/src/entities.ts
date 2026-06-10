export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  baseAlpha: number
  color: string
  life: number
  maxLife: number
  brightTime: number
}

export interface Creature {
  x: number
  y: number
  baseX: number
  baseY: number
  radius: number
  color: string
  vx: number
  vy: number
  phase: number
  collected: boolean
  spawnTrailParticle(): Particle
  update(width: number, height: number): void
}

export interface SoundWave {
  x: number
  y: number
  radius: number
  maxRadius: number
  lineWidth: number
  color: string
  age: number
  maxAge: number
  isDead(): boolean
  update(): void
}

export interface BurstParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  life: number
  maxLife: number
}

export interface RidgePoint {
  x: number
  y: number
}

const CREATURE_COLORS = ['#ffdb58', '#7aff6e', '#ff6eb4']
const PLANKTON_COLORS = ['#1a5c7a', '#2a7ba0', '#3a9bdc']

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function createPlanktonParticles(count: number, width: number, height: number): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.1,
      vy: (Math.random() - 0.5) * 0.05,
      size: 1 + Math.random() * 2,
      baseAlpha: 0.2 + Math.random() * 0.4,
      alpha: 0.2 + Math.random() * 0.4,
      color: PLANKTON_COLORS[Math.floor(Math.random() * PLANKTON_COLORS.length)],
      life: -1,
      maxLife: -1,
      brightTime: 0
    })
  }
  return particles
}

export function createCreatures(count: number, width: number, height: number): Creature[] {
  const creatures: Creature[] = []
  const actualCount = 8 + Math.floor(Math.random() * 5)
  const n = Math.min(count, actualCount)
  for (let i = 0; i < n; i++) {
    const baseX = 100 + Math.random() * (width - 200)
    const baseY = 100 + Math.random() * (height - 250)
    const color = CREATURE_COLORS[Math.floor(Math.random() * CREATURE_COLORS.length)]
    const speed = 0.2 + Math.random() * 0.3
    const angle = Math.random() * Math.PI * 2
    creatures.push({
      x: baseX,
      y: baseY,
      baseX,
      baseY,
      radius: 6 + Math.random() * 4,
      color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: Math.random() * Math.PI * 2,
      collected: false,
      spawnTrailParticle(): Particle {
        const a = Math.random() * Math.PI * 2
        const sp = 0.3 + Math.random() * 0.5
        return {
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: 1 + Math.random(),
          alpha: 0.9,
          baseAlpha: 0.9,
          color: this.color,
          life: 0,
          maxLife: 60,
          brightTime: 0
        }
      },
      update(width: number, height: number): void {
        this.phase += 0.02
        this.baseX += this.vx
        this.baseY += this.vy
        if (this.baseX < 50) { this.baseX = 50; this.vx = Math.abs(this.vx) }
        if (this.baseX > width - 50) { this.baseX = width - 50; this.vx = -Math.abs(this.vx) }
        if (this.baseY < 50) { this.baseY = 50; this.vy = Math.abs(this.vy) }
        if (this.baseY > height - 150) { this.baseY = height - 150; this.vy = -Math.abs(this.vy) }
        this.x = this.baseX + Math.sin(this.phase) * 15
        this.y = this.baseY + Math.cos(this.phase * 0.8) * 10
      }
    })
  }
  return creatures
}

export function createSoundWave(x: number, y: number, width: number, height: number): SoundWave {
  const isUpper = y < height / 2
  const color = isUpper ? '#4a9eff' : '#9b5ffa'
  return {
    x,
    y,
    radius: 0,
    maxRadius: 200,
    lineWidth: 6,
    color,
    age: 0,
    maxAge: 60,
    isDead(): boolean {
      return this.age >= this.maxAge
    },
    update(): void {
      this.age++
      const t = this.age / this.maxAge
      this.radius = this.maxRadius * easeOutCubic(t)
      this.lineWidth = 6 * (1 - t)
    }
  }
}

export function createBurstParticles(x: number, y: number, color: string, count: number): BurstParticle[] {
  const particles: BurstParticle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const speed = 1.5 + Math.random() * 2
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      alpha: 1,
      life: 0,
      maxLife: 48
    })
  }
  return particles
}

export function createRidgePoints(width: number, height: number): RidgePoint[] {
  const points: RidgePoint[] = []
  const baseY = height - 50
  let x = 0
  while (x <= width) {
    const y = baseY - 20 - Math.random() * 60
    points.push({ x, y })
    x += 15 + Math.random() * 25
  }
  points.push({ x: width, y: baseY })
  points.push({ x: width, y: height })
  points.push({ x: 0, y: height })
  return points
}
