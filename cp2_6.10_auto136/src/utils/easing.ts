import { PathNode } from '../types'

export const buildBezierPath = (nodes: PathNode[]): string => {
  if (nodes.length === 0) return ''
  if (nodes.length === 1) return `M ${nodes[0].x} ${nodes[0].y}`

  let d = `M ${nodes[0].x} ${nodes[0].y}`

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]
    const curr = nodes[i]
    const cpx1 = prev.x + (curr.x - prev.x) / 2
    const cpy1 = prev.y
    const cpx2 = prev.x + (curr.x - prev.x) / 2
    const cpy2 = curr.y
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`
  }

  return d
}

export const getPointOnPath = (nodes: PathNode[], t: number): { x: number; y: number } => {
  if (nodes.length === 0) return { x: 0, y: 0 }
  if (nodes.length === 1) return { x: nodes[0].x, y: nodes[0].y }
  if (t <= 0) return { x: nodes[0].x, y: nodes[0].y }
  if (t >= 1) return { x: nodes[nodes.length - 1].x, y: nodes[nodes.length - 1].y }

  const segmentCount = nodes.length - 1
  const scaledT = t * segmentCount
  const segmentIndex = Math.min(Math.floor(scaledT), segmentCount - 1)
  const localT = scaledT - segmentIndex

  const p0 = nodes[segmentIndex]
  const p1 = nodes[segmentIndex + 1]

  const cpx1 = p0.x + (p1.x - p0.x) / 2
  const cpy1 = p0.y
  const cpx2 = p0.x + (p1.x - p0.x) / 2
  const cpy2 = p1.y

  const cx = 3 * (cpx1 - p0.x)
  const bx = 3 * (cpx2 - cpx1) - cx
  const ax = p1.x - p0.x - cx - bx

  const cy = 3 * (cpy1 - p0.y)
  const by = 3 * (cpy2 - cpy1) - cy
  const ay = p1.y - p0.y - cy - by

  const x = ax * Math.pow(localT, 3) + bx * Math.pow(localT, 2) + cx * localT + p0.x
  const y = ay * Math.pow(localT, 3) + by * Math.pow(localT, 2) + cy * localT + p0.y

  return { x, y }
}

export const applyEasing = (t: number, easing: string): number => {
  switch (easing) {
    case 'linear':
      return t
    case 'ease':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    case 'ease-in':
      return t * t
    case 'ease-out':
      return 1 - Math.pow(1 - t, 3)
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    case 'cubic-bezier(0.68,-0.55,0.27,1.55)': {
      if (t === 0 || t === 1) return t
      const p0 = 0, p1 = 0.68, p2 = 0.27, p3 = 1
      return 3 * p1 * Math.pow(1 - t, 2) * t + 3 * p2 * (1 - t) * Math.pow(t, 2) + p3 * Math.pow(t, 3)
    }
    default:
      return t
  }
}
