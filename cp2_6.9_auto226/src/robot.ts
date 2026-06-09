import {
  MineralType,
  MineralDeposit,
  Planet,
  BASE_X,
  BASE_Y,
  TILE_SIZE,
  GRID_SIZE,
  MINERAL_CONFIGS
} from './planet'

export type RobotState = 'moving' | 'mining' | 'returning'

export interface Point {
  x: number
  y: number
}

interface AStarNode {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: AStarNode | null
}

export interface RobotCargo {
  type: MineralType | null
  amount: number
}

export class Robot {
  id: number
  x: number
  y: number
  state: RobotState
  level: number
  speed: number
  capacity: number
  miningProgress: number
  cargo: RobotCargo
  path: Point[]
  targetDepositId: number | null
  miningRatePerSecond: number
  private pathIndex: number = 0

  constructor(id: number, x: number, y: number, baseSpeed: number, baseCapacity: number) {
    this.id = id
    this.x = x
    this.y = y
    this.state = 'moving'
    this.level = 1
    this.speed = baseSpeed
    this.capacity = baseCapacity
    this.miningProgress = 0
    this.cargo = { type: null, amount: 0 }
    this.path = []
    this.targetDepositId = null
    this.miningRatePerSecond = 1
  }

  setSpeed(speed: number): void {
    this.speed = speed
  }

  setCapacity(capacity: number): void {
    this.capacity = capacity
  }

  setMiningRate(rate: number): void {
    this.miningRatePerSecond = rate
  }

  findPathTo(targetX: number, targetY: number): void {
    this.path = this.aStar(
      { x: Math.floor(this.x / TILE_SIZE), y: Math.floor(this.y / TILE_SIZE) },
      { x: Math.floor(targetX / TILE_SIZE), y: Math.floor(targetY / TILE_SIZE) }
    )
    this.pathIndex = 0
  }

  private aStar(start: Point, goal: Point): Point[] {
    const openSet: AStarNode[] = []
    const closedSet: Set<string> = new Set()

    const startNode: AStarNode = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.manhattanDistance(start, goal),
      f: this.manhattanDistance(start, goal),
      parent: null
    }
    openSet.push(startNode)

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      if (current.x === goal.x && current.y === goal.y) {
        return this.reconstructPath(current)
      }

      closedSet.add(`${current.x},${current.y}`)

      const neighbors = this.getNeighbors(current.x, current.y)
      for (const neighbor of neighbors) {
        const key = `${neighbor.x},${neighbor.y}`
        if (closedSet.has(key)) continue

        const tentativeG = current.g + 1

        const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)
        if (!existing) {
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g: tentativeG,
            h: this.manhattanDistance(neighbor, goal),
            f: tentativeG + this.manhattanDistance(neighbor, goal),
            parent: current
          })
        } else if (tentativeG < existing.g) {
          existing.g = tentativeG
          existing.f = tentativeG + existing.h
          existing.parent = current
        }
      }
    }

    return [
      { x: goal.x * TILE_SIZE + TILE_SIZE / 2, y: goal.y * TILE_SIZE + TILE_SIZE / 2 }
    ]
  }

  private manhattanDistance(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
  }

  private getNeighbors(x: number, y: number): Point[] {
    const neighbors: Point[] = []
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 }
    ]

    for (const dir of dirs) {
      const nx = x + dir.dx
      const ny = y + dir.dy
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        neighbors.push({ x: nx, y: ny })
      }
    }
    return neighbors
  }

  private reconstructPath(node: AStarNode): Point[] {
    const path: Point[] = []
    let current: AStarNode | null = node
    while (current) {
      path.unshift({
        x: current.x * TILE_SIZE + TILE_SIZE / 2,
        y: current.y * TILE_SIZE + TILE_SIZE / 2
      })
      current = current.parent
    }
    return path
  }

  update(dt: number, planet: Planet): MineralType | null {
    let darkMatterMined: MineralType | null = null

    switch (this.state) {
      case 'moving':
        this.updateMovement(dt)
        break
      case 'mining':
        darkMatterMined = this.updateMining(dt, planet)
        break
      case 'returning':
        this.updateMovement(dt)
        break
    }

    return darkMatterMined
  }

  private updateMovement(dt: number): void {
    if (this.path.length === 0 || this.pathIndex >= this.path.length) {
      if (this.state === 'returning') {
        this.state = 'moving'
      }
      return
    }

    const target = this.path[this.pathIndex]
    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 2) {
      this.pathIndex++
      if (this.pathIndex >= this.path.length) {
        if (this.state === 'returning') {
          this.cargo = { type: null, amount: 0 }
          this.state = 'moving'
        }
      }
      return
    }

    const moveDistance = this.speed * dt
    const ratio = Math.min(moveDistance / dist, 1)
    this.x += dx * ratio
    this.y += dy * ratio
  }

  private updateMining(dt: number, planet: Planet): MineralType | null {
    if (this.targetDepositId === null) {
      this.state = 'moving'
      return null
    }

    const deposit = planet.getDepositById(this.targetDepositId)
    if (!deposit || deposit.amount <= 0) {
      this.state = 'returning'
      this.targetDepositId = null
      this.findPathTo(BASE_X, BASE_Y)
      return null
    }

    const mineAmount = this.miningRatePerSecond * dt
    const mined = planet.mineDeposit(this.targetDepositId, mineAmount)

    if (this.cargo.type === null) {
      this.cargo.type = deposit.type
    }

    this.cargo.amount = Math.min(this.cargo.amount + mined, this.capacity)
    this.miningProgress = this.cargo.amount / this.capacity

    let darkMatterMined: MineralType | null = null
    if (deposit.type === 'darkMatter' && mined > 0) {
      darkMatterMined = 'darkMatter'
    }

    if (this.cargo.amount >= this.capacity) {
      this.state = 'returning'
      this.findPathTo(BASE_X, BASE_Y)
    } else if (deposit.amount <= 0) {
      this.state = 'returning'
      this.targetDepositId = null
      this.findPathTo(BASE_X, BASE_Y)
    }

    return darkMatterMined
  }

  seekDeposit(planet: Planet): void {
    if (this.cargo.amount >= this.capacity) {
      this.state = 'returning'
      this.findPathTo(BASE_X, BASE_Y)
      return
    }

    const deposit = planet.getNearestDeposit(this.x, this.y)
    if (deposit) {
      this.targetDepositId = deposit.id
      this.findPathTo(deposit.x, deposit.y)
      this.state = 'moving'
    }
  }

  checkArrivedAtDeposit(planet: Planet): void {
    if (this.state !== 'moving' || this.targetDepositId === null) return
    if (this.path.length > 0 && this.pathIndex < this.path.length) return

    const deposit = planet.getDepositById(this.targetDepositId)
    if (!deposit) {
      this.seekDeposit(planet)
      return
    }

    const dx = deposit.x - this.x
    const dy = deposit.y - this.y
    if (Math.sqrt(dx * dx + dy * dy) < deposit.radius + 8) {
      this.state = 'mining'
      if (this.cargo.type === null) {
        this.cargo.type = deposit.type
      }
    }
  }

  checkArrivedAtBase(): { type: MineralType, amount: number } | null {
    if (this.state !== 'returning') return null
    if (this.path.length > 0 && this.pathIndex < this.path.length) return null

    const dx = BASE_X - this.x
    const dy = BASE_Y - this.y
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      if (this.cargo.type && this.cargo.amount > 0) {
        const result = { type: this.cargo.type, amount: this.cargo.amount }
        this.cargo = { type: null, amount: 0 }
        this.miningProgress = 0
        this.state = 'moving'
        this.targetDepositId = null
        return result
      }
    }
    return null
  }

  render(ctx: CanvasRenderingContext2D): void {
    const bodyColor = '#00D4FF'
    const accentColor = '#FF6B35'

    ctx.fillStyle = '#1A1A3E'
    ctx.beginPath()
    ctx.arc(this.x, this.y, 9, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = bodyColor
    ctx.fillRect(this.x - 6, this.y - 5, 12, 10)

    ctx.fillStyle = accentColor
    ctx.fillRect(this.x - 4, this.y - 7, 8, 3)

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(this.x - 3, this.y - 3, 2, 2)
    ctx.fillRect(this.x + 1, this.y - 3, 2, 2)

    if (this.state === 'mining') {
      ctx.fillStyle = '#FFD700'
      const blink = Math.floor(Date.now() / 200) % 2 === 0
      if (blink) {
        ctx.fillRect(this.x - 1, this.y + 5, 2, 3)
      }
    }

    if (this.cargo.type) {
      const config = MINERAL_CONFIGS[this.cargo.type]
      ctx.fillStyle = config.color
      ctx.fillRect(this.x + 4, this.y - 1, 3, 3)
    }

    if (this.state === 'mining' || (this.cargo.amount > 0 && this.state !== 'returning')) {
      const barWidth = 16
      const barHeight = 3
      const barX = this.x - barWidth / 2
      const barY = this.y - 14

      ctx.fillStyle = '#3A3A6E'
      ctx.fillRect(barX, barY, barWidth, barHeight)

      ctx.fillStyle = '#00D4FF'
      ctx.fillRect(barX, barY, barWidth * this.miningProgress, barHeight)

      ctx.strokeStyle = '#5A5A8E'
      ctx.lineWidth = 1
      ctx.strokeRect(barX, barY, barWidth, barHeight)
    }
  }
}
