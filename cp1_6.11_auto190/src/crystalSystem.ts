import { v4 as uuidv4 } from 'uuid'
import type { Island } from './islandSystem'

export interface Crystal {
  id: string
  islandId: string
  offsetX: number
  offsetY: number
  collected: boolean
}

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'shockwave' | 'crystal-shard'
}

export function spawnCrystals(islands: Island[]): Crystal[] {
  const crystals: Crystal[] = []
  for (const island of islands) {
    const count = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * (island.radius * 0.5)
      crystals.push({
        id: uuidv4(),
        islandId: island.id,
        offsetX: Math.cos(angle) * dist,
        offsetY: Math.sin(angle) * dist,
        collected: false
      })
    }
  }
  return crystals
}

export function collectCrystal(
  crystals: Crystal[],
  crystalId: string
): { updatedCrystals: Crystal[]; collectedCrystal: Crystal | null } {
  const target = crystals.find(c => c.id === crystalId && !c.collected)
  if (!target) return { updatedCrystals: crystals, collectedCrystal: null }

  const updatedCrystals = crystals.map(c =>
    c.id === crystalId ? { ...c, collected: true } : c
  )
  return { updatedCrystals, collectedCrystal: target }
}

export function explodeParticles(
  x: number,
  y: number,
  type: 'shockwave' | 'crystal-shard'
): Particle[] {
  const particles: Particle[] = []

  if (type === 'crystal-shard') {
    const count = 10 + Math.floor(Math.random() * 6)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 40 + Math.random() * 80
      particles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800,
        maxLife: 800,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#ffd700' : '#ff8c00',
        type
      })
    }
  } else {
    const count = 5 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
      const speed = 60 + Math.random() * 40
      particles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        maxLife: 600,
        size: 5,
        color: '#ffffff',
        type
      })
    }
  }

  return particles
}
