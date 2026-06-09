import { RootNode } from './RootSystem'
import { Environment, NutrientPoint } from './Environment'

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Cannot get 2D context')
    this.ctx = ctx
    this.width = canvas.width
    this.height = canvas.height
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  drawSoilBackground(): void {
    this.ctx.fillStyle = '#3E2723'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  drawMoistureHeatmap(env: Environment): void {
    const { gridSize, cols, rows, moistureGrid } = env
    const cellSize = gridSize
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const value = moistureGrid[y * cols + x]
        const r = Math.floor(0)
        const g = Math.floor(value * 180)
        const b = Math.floor(100 + value * 155)
        const a = value * 0.3
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
        this.ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
    }
  }

  drawNutrientPoints(points: NutrientPoint[]): void {
    for (const p of points) {
      const size = 2 + p.concentration * 2
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 235, 59, ${0.25 + p.concentration * 0.25})`
      this.ctx.fill()
    }
  }

  private interpolateColor(depthRatio: number): string {
    const r1 = 93, g1 = 64, b1 = 55
    const r2 = 139, g2 = 195, b2 = 74
    const t = Math.min(1, Math.max(0, depthRatio))
    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)
    return `rgb(${r}, ${g}, ${b})`
  }

  drawRoots(nodes: RootNode[]): void {
    if (nodes.length < 2) return

    let maxMainDepth = 0
    for (const node of nodes) {
      if (node.isMain && node.depth > maxMainDepth) {
        maxMainDepth = node.depth
      }
    }

    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'

    for (let i = 1; i < nodes.length; i++) {
      const node = nodes[i]
      const parent = nodes[node.parentIndex]
      if (!parent) continue

      if (node.isMain) {
        const depthRatio = maxMainDepth > 0 ? node.depth / maxMainDepth : 0
        this.ctx.strokeStyle = this.interpolateColor(depthRatio)
        this.ctx.lineWidth = 3
      } else {
        this.ctx.strokeStyle = '#A1887F'
        this.ctx.lineWidth = 1.5
      }

      this.ctx.beginPath()
      this.ctx.moveTo(parent.x, parent.y)
      this.ctx.lineTo(node.x, node.y)
      this.ctx.stroke()
    }
  }

  drawRootTips(nodes: RootNode[]): void {
    const isParent = new Set<number>()
    for (const node of nodes) {
      if (node.parentIndex >= 0) {
        isParent.add(node.parentIndex)
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      if (isParent.has(i)) continue
      const node = nodes[i]
      
      this.ctx.beginPath()
      this.ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
      this.ctx.fillStyle = '#FFFFFF'
      this.ctx.shadowColor = '#FFFFFF'
      this.ctx.shadowBlur = 6
      this.ctx.fill()
      this.ctx.shadowBlur = 0
    }
  }

  drawSeedMarker(x: number, y: number): void {
    this.ctx.beginPath()
    this.ctx.arc(x, y, 6, 0, Math.PI * 2)
    this.ctx.fillStyle = '#8D6E63'
    this.ctx.fill()
    this.ctx.strokeStyle = '#5D4037'
    this.ctx.lineWidth = 2
    this.ctx.stroke()
  }

  render(env: Environment, nodes: RootNode[], seedX: number, seedY: number, seeded: boolean): void {
    this.clear()
    this.drawSoilBackground()
    this.drawMoistureHeatmap(env)
    this.drawNutrientPoints(env.nutrientPoints)
    this.drawRoots(nodes)
    this.drawRootTips(nodes)
    if (seeded) {
      this.drawSeedMarker(seedX, seedY)
    }
  }
}
