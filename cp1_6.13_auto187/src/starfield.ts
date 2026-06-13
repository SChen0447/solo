export interface Point {
  x: number
  y: number
}

interface Star {
  x: number
  y: number
  size: number
  baseAlpha: number
  phase: number
  period: number
}

export interface GridPoint extends Point {
  col: number
  row: number
}

export class Starfield {
  stars: Star[] = []
  centerX: number = 0
  centerY: number = 0
  radius: number = 0
  viewportWidth: number = 0
  viewportHeight: number = 0
  gridBrightness: number = 0.2
  glowIntensity: number = 0
  glowRadius: number = 0

  private readonly STAR_COUNT = 30
  private readonly GRID_LINES = 19

  constructor() {
    this.generateStars()
  }

  private generateStars(): void {
    this.stars = []
    for (let i = 0; i < this.STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        baseAlpha: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        period: 2000 + Math.random() * 2000,
      })
    }
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    this.viewportWidth = viewportWidth
    this.viewportHeight = viewportHeight
    this.centerX = viewportWidth / 2
    this.centerY = viewportHeight / 2

    const isMobile = viewportWidth < 768
    let diameter: number
    if (isMobile) {
      diameter = Math.max(350, viewportWidth * 0.9)
    } else {
      diameter = Math.max(600, viewportHeight * 0.7)
    }
    this.radius = diameter / 2

    const newStars: Star[] = []
    for (const star of this.stars) {
      newStars.push({
        ...star,
        x: Math.random(),
        y: Math.random(),
      })
    }
    this.stars = newStars
  }

  update(dt: number, _time: number): void {
    for (const star of this.stars) {
      star.phase += (dt / star.period) * Math.PI * 2
    }
    if (this.gridBrightness > 0.2) {
      this.gridBrightness = Math.max(0.2, this.gridBrightness - dt * 0.0008)
    }
    if (this.glowIntensity > 0) {
      this.glowIntensity = Math.max(0, this.glowIntensity - dt * 0.0003)
    }
  }

  boostGridBrightness(): void {
    this.gridBrightness = 0.5
  }

  triggerGlow(radius: number): void {
    this.glowIntensity = 0.1
    this.glowRadius = radius
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    this.renderBackgroundStars(ctx, time)
    this.renderBoardGlow(ctx)
    this.renderBoard(ctx)
    this.renderGrid(ctx)
  }

  private renderBackgroundStars(ctx: CanvasRenderingContext2D, time: number): void {
    for (const star of this.stars) {
      const sx = star.x * this.viewportWidth
      const sy = star.y * this.viewportHeight
      const flicker = (Math.sin(time * 0.001 * (2000 / star.period) + star.phase) + 1) / 2
      const alpha = star.baseAlpha * (0.4 + flicker * 0.6)
      ctx.beginPath()
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private renderBoardGlow(ctx: CanvasRenderingContext2D): void {
    if (this.glowIntensity <= 0) return
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, this.radius * 0.3,
      this.centerX, this.centerY, this.radius * 1.15
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`)
    gradient.addColorStop(0.7, `rgba(255, 255, 255, 0)`)
    gradient.addColorStop(1, `rgba(255, 255, 255, ${this.glowIntensity})`)
    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.arc(this.centerX, this.centerY, this.radius * 1.15, 0, Math.PI * 2)
    ctx.fill()
  }

  private renderBoard(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.radius
    )
    gradient.addColorStop(0, '#0a0e1a')
    gradient.addColorStop(1, '#010005')

    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)'
    ctx.lineWidth = 2
    ctx.arc(this.centerX, this.centerY, this.radius - 1, 0, Math.PI * 2)
    ctx.stroke()
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    const alpha = this.gridBrightness
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.lineWidth = 1

    for (let i = 0; i < this.GRID_LINES; i++) {
      const t = i / (this.GRID_LINES - 1)
      const r = this.radius * t
      ctx.beginPath()
      ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    for (let i = 0; i < this.GRID_LINES; i++) {
      const angle = (i / this.GRID_LINES) * Math.PI * 2
      const x2 = this.centerX + Math.cos(angle) * this.radius
      const y2 = this.centerY + Math.sin(angle) * this.radius
      ctx.beginPath()
      ctx.moveTo(this.centerX, this.centerY)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }

    this.renderGridNodes(ctx)
  }

  private renderGridNodes(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(255, 255, 255, 0.3)`
    for (let row = 0; row < this.GRID_LINES; row++) {
      const t = row / (this.GRID_LINES - 1)
      const r = this.radius * t
      for (let col = 0; col < this.GRID_LINES; col++) {
        const angle = (col / this.GRID_LINES) * Math.PI * 2
        const x = this.centerX + Math.cos(angle) * r
        const y = this.centerY + Math.sin(angle) * r
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  getGridIntersections(): GridPoint[] {
    const points: GridPoint[] = []
    for (let row = 0; row < this.GRID_LINES; row++) {
      const t = row / (this.GRID_LINES - 1)
      const r = this.radius * t
      for (let col = 0; col < this.GRID_LINES; col++) {
        const angle = (col / this.GRID_LINES) * Math.PI * 2
        const x = this.centerX + Math.cos(angle) * r
        const y = this.centerY + Math.sin(angle) * r
        points.push({ x, y, col, row })
      }
    }
    return points
  }

  findNearestGridPoint(x: number, y: number): GridPoint | null {
    if (!this.isInBoard(x, y)) return null
    const dx = x - this.centerX
    const dy = y - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const t = Math.min(1, dist / this.radius)
    const row = Math.max(0, Math.min(this.GRID_LINES - 1, Math.round(t * (this.GRID_LINES - 1))))
    let angle = Math.atan2(dy, dx)
    if (angle < 0) angle += Math.PI * 2
    let col = Math.round((angle / (Math.PI * 2)) * this.GRID_LINES) % this.GRID_LINES
    if (col < 0) col += this.GRID_LINES

    if (row === 0) col = 0

    const tFixed = row / (this.GRID_LINES - 1)
    const rFixed = this.radius * tFixed
    const angleFixed = (col / this.GRID_LINES) * Math.PI * 2
    return {
      x: this.centerX + Math.cos(angleFixed) * rFixed,
      y: this.centerY + Math.sin(angleFixed) * rFixed,
      col,
      row,
    }
  }

  findRandomEmptyGridPoint(occupied: Set<string>): GridPoint | null {
    const allPoints = this.getGridIntersections()
    const available = allPoints.filter(p => !occupied.has(`${p.col}-${p.row}`))
    if (available.length === 0) return null
    return available[Math.floor(Math.random() * available.length)]
  }

  isInBoard(x: number, y: number, margin: number = 0): boolean {
    const dx = x - this.centerX
    const dy = y - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    return dist <= this.radius + margin
  }

  screenToBoard(x: number, y: number): Point {
    return { x, y }
  }

  getGridKey(p: GridPoint): string {
    return `${p.col}-${p.row}`
  }

  getInitialPositions(): Point[] {
    return [
      { x: this.centerX, y: this.centerY },
      {
        x: this.centerX + Math.cos(Math.PI * 1.25) * this.radius * 0.55,
        y: this.centerY + Math.sin(Math.PI * 1.25) * this.radius * 0.55,
      },
      {
        x: this.centerX + Math.cos(Math.PI * 0.25) * this.radius * 0.55,
        y: this.centerY + Math.sin(Math.PI * 0.25) * this.radius * 0.55,
      },
    ]
  }
}
