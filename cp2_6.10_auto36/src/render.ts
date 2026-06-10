import { Game, GrowthStage, Plant, WaterAnimation, HarvestFlash } from './game'

const CELL_SIZE_DESKTOP = 56
const CELL_SIZE_MOBILE = 64
const GRID_LINE_WIDTH = 6
const GRID_COLOR = '#388E3C'
const CELL_BG_COLOR = '#C8E6C9'
const CELL_BG_COLOR_ALT = '#A5D6A7'
const SELECTED_BORDER_COLOR = '#FF9800'

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private cellSize: number = CELL_SIZE_DESKTOP
  private cols: number = 8
  private game: Game

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取Canvas上下文')
    this.ctx = ctx
    this.game = game
    this.resize()
  }

  resize(): void {
    const isMobile = window.innerWidth < 768
    this.cellSize = isMobile ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP
    this.cols = isMobile ? 4 : this.game.gridCols

    const rows = this.game.gridRows
    const totalWidth = this.cols * this.cellSize + (this.cols + 1) * GRID_LINE_WIDTH
    const totalHeight = rows * this.cellSize + (rows + 1) * GRID_LINE_WIDTH

    this.canvas.width = totalWidth
    this.canvas.height = totalHeight
  }

  getCanvasRect(): DOMRect {
    return this.canvas.getBoundingClientRect()
  }

  canvasToGrid(canvasX: number, canvasY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = canvasX * scaleX
    const y = canvasY * scaleY

    const col = Math.floor((x - GRID_LINE_WIDTH) / (this.cellSize + GRID_LINE_WIDTH))
    const row = Math.floor((y - GRID_LINE_WIDTH) / (this.cellSize + GRID_LINE_WIDTH))

    if (row < 0 || row >= this.game.gridRows || col < 0 || col >= this.game.gridCols) {
      return null
    }

    const cellX = col * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH
    const cellY = row * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH
    const localX = x - cellX
    const localY = y - cellY

    if (localX < 0 || localX >= this.cellSize || localY < 0 || localY >= this.cellSize) {
      return null
    }

    return { row, col }
  }

  getCellCenter(row: number, col: number): { x: number; y: number } {
    const x = col * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH + this.cellSize / 2
    const y = row * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH + this.cellSize / 2
    return { x, y }
  }

  render(): void {
    const ctx = this.ctx
    ctx.imageSmoothingEnabled = false

    this.drawGrid()
    this.drawPlants()
    this.drawSelected()
    this.drawWaterAnimations()
    this.drawHarvestFlashes()
  }

  private drawGrid(): void {
    const ctx = this.ctx
    const rows = this.game.gridRows
    const cols = this.cols

    ctx.fillStyle = GRID_COLOR
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH
        const y = r * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH
        ctx.fillStyle = (r + c) % 2 === 0 ? CELL_BG_COLOR : CELL_BG_COLOR_ALT
        ctx.fillRect(x, y, this.cellSize, this.cellSize)
      }
    }
  }

  private drawPlants(): void {
    const rows = this.game.gridRows
    const cols = this.cols

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const plant = this.game.state.grid[r][c]
        if (plant) {
          this.drawPlant(r, c, plant)
        }
      }
    }
  }

  private drawPlant(row: number, col: number, plant: Plant): void {
    const ctx = this.ctx
    const { x: cx, y: cy } = this.getCellCenter(row, col)
    const pixelSize = this.cellSize / 16

    ctx.save()
    ctx.translate(cx, cy)

    switch (plant.stage) {
      case GrowthStage.SEED:
        this.drawSeed(ctx, pixelSize, plant)
        break
      case GrowthStage.SPROUT:
        this.drawSprout(ctx, pixelSize, plant)
        break
      case GrowthStage.MATURE:
        this.drawMature(ctx, pixelSize, plant)
        break
      case GrowthStage.FLOWER:
        this.drawFlower(ctx, pixelSize, plant)
        break
    }

    ctx.restore()

    if (plant.water < 20) {
      ctx.save()
      ctx.fillStyle = 'rgba(255, 87, 34, 0.9)'
      ctx.font = `${Math.floor(this.cellSize / 4)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const { x, y } = this.getCellCenter(row, col)
      ctx.fillText('⚠', x, y - this.cellSize / 2 + 2)
      ctx.restore()
    }
  }

  private drawSeed(ctx: CanvasRenderingContext2D, ps: number, plant: Plant): void {
    const progress = this.game.getStageProgress(plant)
    const scale = 0.5 + progress * 0.5

    ctx.fillStyle = '#5D4037'
    const size = Math.floor(3 * ps * scale)
    ctx.fillRect(-size / 2, -size / 2, size, size)

    ctx.fillStyle = '#795548'
    const size2 = Math.floor(2 * ps * scale)
    ctx.fillRect(-size2 / 2, -size2 / 2 - ps, size2, size2)

    if (progress > 0.5) {
      ctx.fillStyle = '#4CAF50'
      const tipSize = Math.floor(2 * ps * (progress - 0.5) * 2)
      if (tipSize > 0) {
        ctx.fillRect(-tipSize / 2, -Math.floor(2 * ps) - tipSize, tipSize, tipSize)
      }
    }
  }

  private drawSprout(ctx: CanvasRenderingContext2D, ps: number, plant: Plant): void {
    const progress = this.game.getStageProgress(plant)
    const sway = Math.sin(Date.now() / 500) * ps * 0.5

    ctx.fillStyle = '#6D4C41'
    ctx.fillRect(-ps / 2, 0, ps, Math.floor(5 * ps))

    const leafColor = progress < 0.5 ? '#81C784' : '#66BB6A'
    ctx.fillStyle = leafColor

    const leftLeafSize = Math.floor((3 + progress * 1) * ps)
    ctx.save()
    ctx.translate(-ps + sway, -Math.floor(2 * ps))
    ctx.rotate(-0.4)
    ctx.fillRect(-leftLeafSize / 2, -leftLeafSize / 2, leftLeafSize, Math.floor(leftLeafSize * 0.6))
    ctx.restore()

    ctx.fillStyle = leafColor
    const rightLeafSize = Math.floor((3 + progress * 1) * ps)
    ctx.save()
    ctx.translate(ps - sway, -Math.floor(2 * ps))
    ctx.rotate(0.4)
    ctx.fillRect(-rightLeafSize / 2, -rightLeafSize / 2, rightLeafSize, Math.floor(rightLeafSize * 0.6))
    ctx.restore()

    ctx.fillStyle = '#4CAF50'
    const topLeafSize = Math.floor((2 + progress * 2) * ps)
    ctx.fillRect(-topLeafSize / 2 + sway / 2, -Math.floor(5 * ps), topLeafSize, Math.floor(topLeafSize * 0.7))
  }

  private drawMature(ctx: CanvasRenderingContext2D, ps: number, plant: Plant): void {
    const progress = this.game.getStageProgress(plant)

    ctx.fillStyle = '#5D4037'
    ctx.fillRect(-ps, 0, ps * 2, Math.floor(6 * ps))

    ctx.fillStyle = '#4CAF50'
    ctx.fillRect(-ps * 0.7, -Math.floor(8 * ps), ps * 1.4, Math.floor(8 * ps))

    ctx.fillStyle = '#66BB6A'
    const leftLeafW = Math.floor(4 * ps)
    const leftLeafH = Math.floor(2.5 * ps)
    ctx.save()
    ctx.translate(-Math.floor(3 * ps), -Math.floor(4 * ps))
    ctx.rotate(-0.3)
    ctx.fillRect(-leftLeafW / 2, -leftLeafH / 2, leftLeafW, leftLeafH)
    ctx.restore()

    ctx.fillStyle = '#66BB6A'
    const rightLeafW = Math.floor(4 * ps)
    const rightLeafH = Math.floor(2.5 * ps)
    ctx.save()
    ctx.translate(Math.floor(3 * ps), -Math.floor(5 * ps))
    ctx.rotate(0.3)
    ctx.fillRect(-rightLeafW / 2, -rightLeafH / 2, rightLeafW, rightLeafH)
    ctx.restore()

    const budSize = Math.floor((2 + progress * 3) * ps)
    ctx.fillStyle = '#8D6E63'
    ctx.fillRect(-budSize / 2, -Math.floor(10 * ps) - budSize / 2, budSize, budSize)

    if (progress > 0.3) {
      ctx.fillStyle = '#F48FB1'
      const petalSize = Math.floor((progress - 0.3) * 3 * ps)
      if (petalSize > 0) {
        ctx.fillRect(-budSize / 2 - petalSize, -Math.floor(10 * ps) - budSize / 2, petalSize, budSize)
        ctx.fillRect(budSize / 2, -Math.floor(10 * ps) - budSize / 2, petalSize, budSize)
      }
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D, ps: number, plant: Plant): void {
    const pulse = 1 + Math.sin(Date.now() / 400) * 0.05

    ctx.fillStyle = '#5D4037'
    ctx.fillRect(-ps * 1.2, 0, ps * 2.4, Math.floor(7 * ps))

    ctx.fillStyle = '#4CAF50'
    ctx.fillRect(-ps, -Math.floor(9 * ps), ps * 2, Math.floor(9 * ps))

    ctx.fillStyle = '#66BB6A'
    ctx.save()
    ctx.translate(-Math.floor(4 * ps), -Math.floor(3 * ps))
    ctx.rotate(-0.35)
    ctx.fillRect(-Math.floor(4 * ps), -Math.floor(1.5 * ps), Math.floor(8 * ps), Math.floor(3 * ps))
    ctx.restore()

    ctx.fillStyle = '#66BB6A'
    ctx.save()
    ctx.translate(Math.floor(4 * ps), -Math.floor(4 * ps))
    ctx.rotate(0.35)
    ctx.fillRect(-Math.floor(4 * ps), -Math.floor(1.5 * ps), Math.floor(8 * ps), Math.floor(3 * ps))
    ctx.restore()

    const centerY = -Math.floor(11 * ps)
    const petalSize = Math.floor(3 * ps * pulse)

    const petalColors = ['#E91E63', '#FF5722', '#FFEB3B', '#9C27B0']
    const positions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ]

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = petalColors[i]
      const px = positions[i].dx * petalSize
      const py = centerY + positions[i].dy * petalSize
      ctx.fillRect(px - petalSize / 2, py - petalSize / 2, petalSize, petalSize)
    }

    ctx.fillStyle = '#FFC107'
    const centerSize = Math.floor(3 * ps * pulse)
    ctx.fillRect(-centerSize / 2, centerY - centerSize / 2, centerSize, centerSize)

    ctx.fillStyle = '#FF9800'
    const dotSize = Math.floor(ps * 0.8)
    ctx.fillRect(-dotSize / 2, centerY - dotSize / 2, dotSize, dotSize)
  }

  private drawSelected(): void {
    const selected = this.game.state.selectedCell
    if (!selected) return

    const ctx = this.ctx
    const { row, col } = selected

    if (row < 0 || row >= this.game.gridRows || col < 0 || col >= this.game.gridCols) return

    const x = col * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH
    const y = row * (this.cellSize + GRID_LINE_WIDTH) + GRID_LINE_WIDTH

    ctx.save()
    ctx.strokeStyle = SELECTED_BORDER_COLOR
    ctx.lineWidth = 3
    ctx.setLineDash([4, 4])
    ctx.lineDashOffset = (Date.now() / 100) % 8
    ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4)
    ctx.restore()
  }

  private drawWaterAnimations(): void {
    const now = Date.now()
    for (const anim of this.game.waterAnimations) {
      this.drawWaterAnimation(anim, now)
    }
  }

  private drawWaterAnimation(anim: WaterAnimation, now: number): void {
    const progress = Math.min(1, (now - anim.startTime) / anim.duration)
    const { x: toX, y: toY } = this.getCellCenter(anim.toRow, anim.toCol)

    const easeProgress = this.easeOutQuad(progress)
    const x = anim.fromX + (toX - anim.fromX) * easeProgress
    const y = anim.fromY + (toY - anim.fromY) * easeProgress - Math.sin(progress * Math.PI) * 20

    const ctx = this.ctx
    const dropSize = 8
    const alpha = 1 - progress * 0.5

    ctx.save()
    ctx.globalAlpha = alpha

    ctx.fillStyle = '#1E88E5'
    ctx.beginPath()
    ctx.arc(x, y, dropSize / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#64B5F6'
    ctx.beginPath()
    ctx.arc(x - 1, y - 1, dropSize / 4, 0, Math.PI * 2)
    ctx.fill()

    if (progress > 0.7) {
      const splashProgress = (progress - 0.7) / 0.3
      const splashSize = 10 + splashProgress * 15
      ctx.globalAlpha = (1 - splashProgress) * 0.6
      ctx.strokeStyle = '#42A5F5'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(toX, toY, splashSize, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawHarvestFlashes(): void {
    const now = Date.now()
    for (const flash of this.game.harvestFlashes) {
      this.drawHarvestFlash(flash, now)
    }
  }

  private drawHarvestFlash(flash: HarvestFlash, now: number): void {
    const progress = Math.min(1, (now - flash.startTime) / flash.duration)
    const { x, y } = this.getCellCenter(flash.row, flash.col)

    const ctx = this.ctx
    const alpha = 1 - progress
    const size = this.cellSize * (0.9 + progress * 0.2)

    ctx.save()
    ctx.globalAlpha = alpha * 0.7
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(x - size / 2, y - size / 2, size, size)

    ctx.globalAlpha = alpha
    const sparkleSize = 3
    const sparklePositions = [
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: 0, dy: 0 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 }
    ]
    for (const pos of sparklePositions) {
      const sx = x + pos.dx * this.cellSize * 0.25
      const sy = y + pos.dy * this.cellSize * 0.25
      ctx.fillStyle = '#FFEB3B'
      ctx.fillRect(sx - sparkleSize, sy - sparkleSize, sparkleSize * 2, sparkleSize * 2)
    }

    ctx.restore()
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t)
  }
}
