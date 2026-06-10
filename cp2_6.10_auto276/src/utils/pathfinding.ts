import { Point } from '../types'

function distance(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function greedyNearestNeighbor(points: Point[]): number[] {
  if (points.length <= 1) return points.map((_, i) => i)

  const order: number[] = []
  const visited = new Set<number>()

  order.push(0)
  visited.add(0)

  let current = 0

  while (visited.size < points.length) {
    let nearest = -1
    let nearestDist = Infinity

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue
      const d = distance(points[current], points[i])
      if (d < nearestDist) {
        nearestDist = d
        nearest = i
      }
    }

    if (nearest === -1) break

    order.push(nearest)
    visited.add(nearest)
    current = nearest
  }

  return order
}
