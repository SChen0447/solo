export interface Obstacle {
  x: number
  y: number
  radius: number
}

export interface NutrientPoint {
  x: number
  y: number
  concentration: number
}

export class Environment {
  width: number
  height: number
  gridSize: number = 5
  cols: number
  rows: number
  moistureGrid: Float32Array
  nutrientPoints: NutrientPoint[] = []
  obstacles: Obstacle[] = []

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cols = Math.ceil(width / this.gridSize)
    this.rows = Math.ceil(height / this.gridSize)
    this.moistureGrid = new Float32Array(this.cols * this.rows)
  }

  private mulberry32(seed: number): () => number {
    return function () {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let t = seed
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  private gaussian(rand: () => number): number {
    const u1 = rand() || 1e-9
    const u2 = rand()
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  }

  generateMoisture(seed: number): void {
    const rand = this.mulberry32(seed * 1000 + 1)
    const centers: { x: number; y: number; sigma: number; amp: number }[] = []
    const centerCount = 6 + Math.floor(rand() * 5)
    
    for (let i = 0; i < centerCount; i++) {
      centers.push({
        x: rand() * this.cols,
        y: rand() * this.rows,
        sigma: 10 + rand() * 30,
        amp: 0.4 + rand() * 0.6
      })
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let value = 0.2 + rand() * 0.1
        for (const c of centers) {
          const dx = x - c.x
          const dy = y - c.y
          value += c.amp * Math.exp(-(dx * dx + dy * dy) / (2 * c.sigma * c.sigma))
        }
        value += 0.05 * this.gaussian(rand)
        this.moistureGrid[y * this.cols + x] = Math.max(0, Math.min(1, value))
      }
    }
  }

  generateNutrients(seed: number): void {
    const rand = this.mulberry32(seed * 1000 + 7)
    this.nutrientPoints = []
    const count = 80 + Math.floor(rand() * 60)
    
    for (let i = 0; i < count; i++) {
      this.nutrientPoints.push({
        x: rand() * this.width,
        y: rand() * this.height,
        concentration: 0.3 + rand() * 0.7
      })
    }
  }

  generateObstacles(seed: number): void {
    const rand = this.mulberry32(seed * 1000 + 13)
    this.obstacles = []
    const count = 20 + Math.floor(rand() * 11)
    
    for (let i = 0; i < count; i++) {
      const radius = 8 + rand() * 7
      this.obstacles.push({
        x: radius + rand() * (this.width - 2 * radius),
        y: 40 + radius + rand() * (this.height - 2 * radius - 40),
        radius
      })
    }
  }

  getMoistureAt(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0
    const gx = Math.floor(x / this.gridSize)
    const gy = Math.floor(y / this.gridSize)
    if (gx >= this.cols || gy >= this.rows) return 0
    return this.moistureGrid[gy * this.cols + gx]
  }

  getNutrientAt(x: number, y: number): number {
    let total = 0
    const radius = 30
    for (const p of this.nutrientPoints) {
      const dx = x - p.x
      const dy = y - p.y
      const dist2 = dx * dx + dy * dy
      if (dist2 < radius * radius) {
        const dist = Math.sqrt(dist2)
        total += p.concentration * (1 - dist / radius)
      }
    }
    return Math.min(1, total)
  }

  findNearestObstacle(x: number, y: number): Obstacle | null {
    let nearest: Obstacle | null = null
    let minDist = Infinity
    for (const obs of this.obstacles) {
      const dx = x - obs.x
      const dy = y - obs.y
      const dist = Math.sqrt(dx * dx + dy * dy) - obs.radius
      if (dist < minDist) {
        minDist = dist
        nearest = obs
      }
    }
    return nearest
  }

  getObstacleDistance(x: number, y: number): number {
    const obs = this.findNearestObstacle(x, y)
    if (!obs) return Infinity
    const dx = x - obs.x
    const dy = y - obs.y
    return Math.sqrt(dx * dx + dy * dy) - obs.radius
  }

  consumeMoisture(x: number, y: number, radius: number, amount: number): number {
    let totalConsumed = 0
    const gr = Math.ceil(radius / this.gridSize)
    const gx = Math.floor(x / this.gridSize)
    const gy = Math.floor(y / this.gridSize)

    for (let dy = -gr; dy <= gr; dy++) {
      for (let dx = -gr; dx <= gr; dx++) {
        const cx = gx + dx
        const cy = gy + dy
        if (cx < 0 || cx >= this.cols || cy < 0 || cy >= this.rows) continue
        const wx = cx * this.gridSize + this.gridSize / 2
        const wy = cy * this.gridSize + this.gridSize / 2
        const dist = Math.sqrt((wx - x) ** 2 + (wy - y) ** 2)
        if (dist <= radius) {
          const factor = Math.exp(-(dist * dist) / (2 * (radius * 0.5) ** 2))
          const idx = cy * this.cols + cx
          const consume = Math.min(this.moistureGrid[idx], amount * factor)
          this.moistureGrid[idx] -= consume
          totalConsumed += consume
        }
      }
    }
    return totalConsumed
  }

  regenerateAll(moistureSeed: number, nutrientSeed: number, obstacleSeed: number): void {
    this.generateMoisture(moistureSeed)
    this.generateNutrients(nutrientSeed)
    this.generateObstacles(obstacleSeed)
  }
}
