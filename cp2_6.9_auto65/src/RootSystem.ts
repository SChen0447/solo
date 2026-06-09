import { Environment } from './Environment'

export interface RootNode {
  x: number
  y: number
  angle: number
  isMain: boolean
  parentIndex: number
  depth: number
  accumulatedGrowth: number
  nextBranchAt: number
  avoidingFrames: number
  speedMultiplier: number
}

export interface GrowthParams {
  mainRootSpeed: number
  lateralRootSpeedFactor: number
  maxDeflection: number
  avoidDeflectionMain: number
  avoidDeflectionLateral: number
  branchIntervalMin: number
  branchIntervalMax: number
  branchAngleMin: number
  branchAngleMax: number
  minBranchDepth: number
  consumptionRate: number
  consumptionRadius: number
}

export class RootSystem {
  nodes: RootNode[] = []
  totalLength: number = 0
  branchCount: number = 0
  seeded: boolean = false
  seedX: number = 0
  seedY: number = 0
  waterConsumed: number = 0

  placeSeed(x: number, y: number): void {
    this.nodes = []
    this.totalLength = 0
    this.branchCount = 0
    this.waterConsumed = 0
    this.seeded = true
    this.seedX = x
    this.seedY = y

    this.nodes.push({
      x,
      y,
      angle: Math.PI / 2,
      isMain: true,
      parentIndex: -1,
      depth: 0,
      accumulatedGrowth: 0,
      nextBranchAt: 60 + Math.random() * 20,
      avoidingFrames: 0,
      speedMultiplier: 1.0
    })
  }

  reset(): void {
    this.nodes = []
    this.totalLength = 0
    this.branchCount = 0
    this.waterConsumed = 0
    this.seeded = false
  }

  private clampAngle(angle: number, baseAngle: number, maxDelta: number): number {
    let diff = angle - baseAngle
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    diff = Math.max(-maxDelta, Math.min(maxDelta, diff))
    return baseAngle + diff
  }

  private evaluateDirection(
    env: Environment,
    x: number,
    y: number,
    angle: number,
    distance: number
  ): number {
    const tx = x + Math.cos(angle) * distance
    const ty = y + Math.sin(angle) * distance
    const moisture = env.getMoistureAt(tx, ty)
    const nutrient = env.getNutrientAt(tx, ty)
    const obsDist = env.getObstacleDistance(tx, ty)
    const obstaclePenalty = obsDist < 10 ? (10 - obsDist) * 0.15 : 0
    return 0.6 * moisture + 0.4 * nutrient - obstaclePenalty
  }

  grow(env: Environment, params: GrowthParams, dt: number): number {
    if (!this.seeded) return 0

    const tipIndices = this.getTipIndices()
    let frameWaterConsumed = 0
    const newBranches: { parentIdx: number; angle: number }[] = []

    for (const idx of tipIndices) {
      const node = this.nodes[idx]
      if (node.y >= env.height - 2) continue

      const baseSpeed = node.isMain ? params.mainRootSpeed : params.mainRootSpeed * params.lateralRootSpeedFactor
      const speed = baseSpeed * node.speedMultiplier * dt
      if (speed <= 0) continue

      let targetAngle = node.angle
      const obsDist = env.getObstacleDistance(node.x, node.y)

      if (obsDist < 5) {
        const obs = env.findNearestObstacle(node.x, node.y)
        if (obs) {
          const awayAngle = Math.atan2(node.y - obs.y, node.x - obs.x)
          const deflection = node.isMain ? params.avoidDeflectionMain : params.avoidDeflectionLateral
          const deflectionRad = (deflection + Math.random() * 20) * (Math.PI / 180)
          const leftScore = this.evaluateDirection(env, node.x, node.y, node.angle + deflectionRad, 15)
          const rightScore = this.evaluateDirection(env, node.x, node.y, node.angle - deflectionRad, 15)
          targetAngle = leftScore > rightScore ? node.angle + deflectionRad : node.angle - deflectionRad
          node.avoidingFrames = 20
        }
      } else if (node.avoidingFrames <= 0) {
        let bestScore = -Infinity
        let bestAngle = node.angle
        for (let i = -4; i <= 4; i++) {
          const testAngle = node.angle + (i * Math.PI) / 16
          const score = this.evaluateDirection(env, node.x, node.y, testAngle, 12)
          if (score > bestScore) {
            bestScore = score
            bestAngle = testAngle
          }
        }
        targetAngle = this.clampAngle(bestAngle, node.angle, params.maxDeflection * (Math.PI / 180))
      }

      if (node.avoidingFrames > 0) {
        node.avoidingFrames--
        node.speedMultiplier = 0.5
      } else {
        node.speedMultiplier = Math.min(1, node.speedMultiplier + 0.05)
      }

      node.angle = targetAngle

      const nx = node.x + Math.cos(node.angle) * speed
      const ny = node.y + Math.sin(node.angle) * speed
      const actualDx = Math.min(nx, env.width - 1) - node.x
      const actualDy = Math.min(Math.max(ny, this.seedY + 5), env.height - 1) - node.y
      const actualDist = Math.sqrt(actualDx * actualDx + actualDy * actualDy)

      if (actualDist > 0) {
        const newNode: RootNode = {
          x: node.x + actualDx,
          y: node.y + actualDy,
          angle: node.angle,
          isMain: node.isMain,
          parentIndex: idx,
          depth: node.depth + actualDist,
          accumulatedGrowth: 0,
          nextBranchAt: node.nextBranchAt,
          avoidingFrames: node.avoidingFrames,
          speedMultiplier: node.speedMultiplier
        }

        this.nodes.push(newNode)
        this.totalLength += actualDist
        node.accumulatedGrowth += actualDist

        if (node.isMain && node.depth > params.minBranchDepth && node.accumulatedGrowth >= node.nextBranchAt) {
          node.accumulatedGrowth = 0
          node.nextBranchAt = params.branchIntervalMin + Math.random() * (params.branchIntervalMax - params.branchIntervalMin)
          const branchAngle = params.branchAngleMin + Math.random() * (params.branchAngleMax - params.branchAngleMin)
          const side = Math.random() > 0.5 ? 1 : -1
          newBranches.push({
            parentIdx: this.nodes.length - 1,
            angle: node.angle + side * branchAngle * (Math.PI / 180)
          })
        }

        frameWaterConsumed += env.consumeMoisture(newNode.x, newNode.y, params.consumptionRadius, params.consumptionRate * dt)
      }
    }

    for (const branch of newBranches) {
      const parent = this.nodes[branch.parentIdx]
      this.nodes.push({
        x: parent.x,
        y: parent.y,
        angle: branch.angle,
        isMain: false,
        parentIndex: branch.parentIdx,
        depth: 0,
        accumulatedGrowth: 0,
        nextBranchAt: Infinity,
        avoidingFrames: 0,
        speedMultiplier: 1.0
      })
      this.branchCount++
    }

    this.waterConsumed += frameWaterConsumed
    return frameWaterConsumed
  }

  getTipIndices(): number[] {
    const isParent = new Set<number>()
    for (const node of this.nodes) {
      if (node.parentIndex >= 0) {
        isParent.add(node.parentIndex)
      }
    }
    const tips: number[] = []
    for (let i = 0; i < this.nodes.length; i++) {
      if (!isParent.has(i)) {
        tips.push(i)
      }
    }
    return tips
  }
}
