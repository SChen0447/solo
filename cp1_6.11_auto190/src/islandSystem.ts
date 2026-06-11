import { v4 as uuidv4 } from 'uuid'

export interface Island {
  id: string
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  mergedWith: string[]
  initialX: number
  initialY: number
}

export interface CollisionResult {
  collided: boolean
  contactX: number
  contactY: number
  pushDirX: number
  pushDirY: number
}

export function generateIslands(canvasWidth: number, canvasHeight: number): Island[] {
  const count = 6 + Math.floor(Math.random() * 3)
  const islands: Island[] = []
  const margin = 100
  const maxAttempts = 200

  for (let i = 0; i < count; i++) {
    let placed = false
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      const radius = 75 + Math.random() * 75
      const x = margin + radius + Math.random() * (canvasWidth - 2 * margin - 2 * radius)
      const y = margin + radius + Math.random() * (canvasHeight - 2 * margin - 2 * radius)

      let overlaps = false
      for (const existing of islands) {
        const dx = x - existing.x
        const dy = y - existing.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < radius + existing.radius + 60) {
          overlaps = true
          break
        }
      }

      if (!overlaps) {
        islands.push({
          id: uuidv4(),
          x,
          y,
          radius,
          vx: 0,
          vy: 0,
          mergedWith: [],
          initialX: x,
          initialY: y
        })
        placed = true
      }
    }
    if (!placed) {
      const radius = 75 + Math.random() * 75
      const x = margin + radius + Math.random() * (canvasWidth - 2 * margin - 2 * radius)
      const y = margin + radius + Math.random() * (canvasHeight - 2 * margin - 2 * radius)
      islands.push({
        id: uuidv4(),
        x,
        y,
        radius,
        vx: 0,
        vy: 0,
        mergedWith: [],
        initialX: x,
        initialY: y
      })
    }
  }

  return islands
}

export function checkCollision(island1: Island, island2: Island): CollisionResult {
  const dx = island2.x - island1.x
  const dy = island2.y - island1.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = island1.radius + island2.radius
  const collided = dist <= minDist

  let pushDirX = 0
  let pushDirY = 0
  let contactX = 0
  let contactY = 0

  if (collided && dist > 0) {
    pushDirX = dx / dist
    pushDirY = dy / dist
    contactX = island1.x + pushDirX * island1.radius
    contactY = island1.y + pushDirY * island1.radius
  } else if (collided) {
    pushDirX = 1
    pushDirY = 0
    contactX = island1.x + island1.radius
    contactY = island1.y
  }

  return { collided, contactX, contactY, pushDirX, pushDirY }
}

export function mergeIslands(islands: Island[], id1: string, id2: string): Island[] {
  const island1 = islands.find(i => i.id === id1)
  const island2 = islands.find(i => i.id === id2)
  if (!island1 || !island2) return islands

  const alreadyMerged =
    island1.mergedWith.includes(id2) || island2.mergedWith.includes(id1)
  if (alreadyMerged) return islands

  return islands.map(island => {
    if (island.id === id1) {
      return { ...island, mergedWith: [...island.mergedWith, id2] }
    }
    if (island.id === id2) {
      return { ...island, mergedWith: [...island.mergedWith, id1] }
    }
    return island
  })
}

export function resetIslands(islands: Island[]): Island[] {
  return islands.map(island => ({
    ...island,
    x: island.initialX,
    y: island.initialY,
    vx: 0,
    vy: 0,
    mergedWith: []
  }))
}
