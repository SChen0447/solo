import type { Island } from './islandSystem'

export interface DragState {
  isDragging: boolean
  islandId: string | null
  startX: number
  startY: number
  currentX: number
  currentY: number
  crowbarAngle: number
}

const MAX_ANGLE = 15
const MAX_SPEED_DEFAULT = 200

export function startDrag(
  state: DragState,
  islandId: string,
  mouseX: number,
  mouseY: number
): DragState {
  return {
    isDragging: true,
    islandId,
    startX: mouseX,
    startY: mouseY,
    currentX: mouseX,
    currentY: mouseY,
    crowbarAngle: 0
  }
}

export function updateDrag(
  state: DragState,
  mouseX: number,
  mouseY: number,
  islands: Island[],
  maxSpeed: number = MAX_SPEED_DEFAULT
): { state: DragState; updatedIslands: Island[] } {
  if (!state.isDragging || !state.islandId) {
    return { state, updatedIslands: islands }
  }

  const dx = mouseX - state.startX
  const dy = mouseY - state.startY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const angle = dist > 0 ? Math.min((dist / 100) * MAX_ANGLE, MAX_ANGLE) : 0

  const speedFactor = Math.min(dist / 50, 1)
  const vx = (dx / Math.max(dist, 1)) * maxSpeed * speedFactor
  const vy = (dy / Math.max(dist, 1)) * maxSpeed * speedFactor

  const updatedIslands = islands.map(island => {
    if (island.id === state.islandId) {
      return { ...island, vx, vy }
    }
    return island
  })

  return {
    state: {
      ...state,
      currentX: mouseX,
      currentY: mouseY,
      crowbarAngle: angle
    },
    updatedIslands
  }
}

export function endDrag(
  state: DragState,
  islands: Island[],
  damping: number = 0.95
): { state: DragState; updatedIslands: Island[] } {
  if (!state.isDragging) {
    return { state, updatedIslands: islands }
  }

  const updatedIslands = islands.map(island => {
    if (island.id === state.islandId) {
      return {
        ...island,
        vx: island.vx * damping,
        vy: island.vy * damping
      }
    }
    return island
  })

  return {
    state: {
      isDragging: false,
      islandId: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      crowbarAngle: 0
    },
    updatedIslands
  }
}
