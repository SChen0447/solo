export type MineralType = 'iron' | 'copper' | 'crystal' | 'darkMatter'

export type TileType = 'grass' | 'dirt' | 'rock'

export interface MineralConfig {
  type: MineralType
  name: string
  color: string
  value: number
  rarity: number
}

export interface MineralDeposit {
  id: number
  x: number
  y: number
  type: MineralType
  amount: number
  maxAmount: number
  radius: number
}

export interface Tile {
  type: TileType
  x: number
  y: number
}

export const MINERAL_CONFIGS: Record<MineralType, MineralConfig> = {
  iron: { type: 'iron', name: '铁矿', color: '#808080', value: 1, rarity: 50 },
  copper: { type: 'copper', name: '铜矿', color: '#D2691E', value: 3, rarity: 30 },
  crystal: { type: 'crystal', name: '水晶', color: '#8A2BE2', value: 8, rarity: 15 },
  darkMatter: { type: 'darkMatter', name: '暗物质', color: '#1A1A1A', value: 25, rarity: 5 }
}

export const TILE_COLORS: Record<TileType, string> = {
  grass: '#3D6B3D',
  dirt: '#8B5A2B',
  rock: '#6B6B6B'
}

export const TILE_SIZE = 20
export const MAP_SIZE = 600
export const GRID_SIZE = MAP_SIZE / TILE_SIZE
export const BASE_X = 30
export const BASE_Y = 30
export const BASE_RADIUS = 25

export class Planet {
  tiles: Tile[][] = []
  deposits: MineralDeposit[] = []
  private depositIdCounter = 0

  constructor() {
    this.generate()
  }

  private generate(): void {
    this.generateTiles()
    this.generateDeposits()
  }

  private generateTiles(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      this.tiles[y] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        const rand = Math.random()
        let type: TileType
        if (rand < 0.5) {
          type = 'grass'
        } else if (rand < 0.8) {
          type = 'dirt'
        } else {
          type = 'rock'
        }
        this.tiles[y][x] = { type, x: x * TILE_SIZE, y: y * TILE_SIZE }
      }
    }
  }

  private generateDeposits(): void {
    const totalDeposits = 25 + Math.floor(Math.random() * 10)
    const types: MineralType[] = ['iron', 'copper', 'crystal', 'darkMatter']
    const totalRarity = types.reduce((sum, t) => sum + MINERAL_CONFIGS[t].rarity, 0)

    for (let i = 0; i < totalDeposits; i++) {
      let type = this.pickMineralType(types, totalRarity)
      let x: number, y: number
      let attempts = 0
      do {
        x = 60 + Math.random() * (MAP_SIZE - 120)
        y = 60 + Math.random() * (MAP_SIZE - 120)
        attempts++
      } while (this.isNearBase(x, y) || this.isOverlappingDeposit(x, y) && attempts < 50)

      if (attempts < 50) {
        const config = MINERAL_CONFIGS[type]
        const amount = type === 'darkMatter'
          ? 3 + Math.floor(Math.random() * 3)
          : type === 'crystal'
            ? 8 + Math.floor(Math.random() * 8)
            : type === 'copper'
              ? 15 + Math.floor(Math.random() * 15)
              : 25 + Math.floor(Math.random() * 25)

        this.deposits.push({
          id: this.depositIdCounter++,
          x,
          y,
          type,
          amount,
          maxAmount: amount,
          radius: type === 'darkMatter' ? 6 : type === 'crystal' ? 7 : 8
        })
      }
    }
  }

  private pickMineralType(types: MineralType[], totalRarity: number): MineralType {
    let rand = Math.random() * totalRarity
    for (const type of types) {
      rand -= MINERAL_CONFIGS[type].rarity
      if (rand <= 0) return type
    }
    return 'iron'
  }

  private isNearBase(x: number, y: number): boolean {
    const dx = x - BASE_X
    const dy = y - BASE_Y
    return Math.sqrt(dx * dx + dy * dy) < 70
  }

  private isOverlappingDeposit(x: number, y: number): boolean {
    return this.deposits.some(d => {
      const dx = d.x - x
      const dy = d.y - y
      return Math.sqrt(dx * dx + dy * dy) < 40
    })
  }

  getNearestDeposit(x: number, y: number): MineralDeposit | null {
    const validDeposits = this.deposits.filter(d => d.amount > 0)
    if (validDeposits.length === 0) return null

    let nearest: MineralDeposit | null = null
    let minDist = Infinity

    for (const d of validDeposits) {
      const dx = d.x - x
      const dy = d.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        nearest = d
      }
    }
    return nearest
  }

  getDepositById(id: number): MineralDeposit | undefined {
    return this.deposits.find(d => d.id === id)
  }

  mineDeposit(depositId: number, amount: number): number {
    const deposit = this.getDepositById(depositId)
    if (!deposit) return 0
    const mined = Math.min(amount, deposit.amount)
    deposit.amount -= mined
    if (deposit.amount <= 0) {
      const idx = this.deposits.findIndex(d => d.id === depositId)
      if (idx !== -1) {
        this.deposits.splice(idx, 1)
      }
    }
    return mined
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = this.tiles[y][x]
        ctx.fillStyle = TILE_COLORS[tile.type]
        ctx.fillRect(tile.x, tile.y, TILE_SIZE, TILE_SIZE)
        if (Math.random() < 0.02) {
          ctx.fillStyle = this.darkenColor(TILE_COLORS[tile.type], 0.8)
          ctx.fillRect(tile.x + Math.random() * TILE_SIZE, tile.y + Math.random() * TILE_SIZE, 2, 2)
        }
      }
    }

    this.renderBase(ctx)

    for (const deposit of this.deposits) {
      this.renderDeposit(ctx, deposit, time)
    }
  }

  private renderBase(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2A2A4E'
    ctx.beginPath()
    ctx.arc(BASE_X, BASE_Y, BASE_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#00D4FF'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#00D4FF'
    ctx.beginPath()
    ctx.arc(BASE_X, BASE_Y, 6, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#00D4FF'
    ctx.font = '10px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('基地', BASE_X, BASE_Y + BASE_RADIUS + 12)
  }

  private renderDeposit(ctx: CanvasRenderingContext2D, deposit: MineralDeposit, time: number): void {
    const config = MINERAL_CONFIGS[deposit.type]
    const alpha = 0.5 + (deposit.amount / deposit.maxAmount) * 0.5

    if (deposit.type === 'darkMatter') {
      const pulse = 0.5 + Math.sin(time * 0.005) * 0.5
      for (let r = deposit.radius + 4; r > deposit.radius; r -= 2) {
        ctx.fillStyle = `rgba(138, 43, 226, ${(1 - (r - deposit.radius) / 4) * 0.4 * pulse})`
        ctx.beginPath()
        ctx.arc(deposit.x, deposit.y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.fillStyle = config.color
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.arc(deposit.x, deposit.y, deposit.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + time * 0.001
      const dist = deposit.radius * 0.5
      const sx = deposit.x + Math.cos(angle) * dist
      const sy = deposit.y + Math.sin(angle) * dist
      ctx.fillStyle = deposit.type === 'darkMatter' ? '#8A2BE2' : this.lightenColor(config.color, 1.3)
      ctx.fillRect(sx - 1, sy - 1, 2, 2)
    }
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`
  }

  private lightenColor(hex: string, factor: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor)
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
  }
}
