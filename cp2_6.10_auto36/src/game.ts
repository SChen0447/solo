export enum GrowthStage {
  EMPTY = 'empty',
  SEED = 'seed',
  SPROUT = 'sprout',
  MATURE = 'mature',
  FLOWER = 'flower'
}

export const STAGE_DURATION: Record<GrowthStage, number> = {
  [GrowthStage.EMPTY]: 0,
  [GrowthStage.SEED]: 5000,
  [GrowthStage.SPROUT]: 8000,
  [GrowthStage.MATURE]: 15000,
  [GrowthStage.FLOWER]: 10000
}

export const STAGE_NAMES: Record<GrowthStage, string> = {
  [GrowthStage.EMPTY]: '空地',
  [GrowthStage.SEED]: '发芽',
  [GrowthStage.SPROUT]: '幼苗',
  [GrowthStage.MATURE]: '成熟',
  [GrowthStage.FLOWER]: '开花'
}

export const STAGE_ORDER: GrowthStage[] = [
  GrowthStage.EMPTY,
  GrowthStage.SEED,
  GrowthStage.SPROUT,
  GrowthStage.MATURE,
  GrowthStage.FLOWER
]

export interface Plant {
  id: string
  stage: GrowthStage
  stageStartTime: number
  water: number
  lastWaterDecay: number
}

export interface GameStats {
  coins: number
  planted: number
  harvested: number
  achievements: string[]
}

export interface GameState {
  grid: (Plant | null)[][]
  stats: GameStats
  selectedCell: { row: number; col: number } | null
}

export interface WaterAnimation {
  id: string
  fromX: number
  fromY: number
  toRow: number
  toCol: number
  startTime: number
  duration: number
}

export interface HarvestFlash {
  row: number
  col: number
  startTime: number
  duration: number
}

const STORAGE_KEY = 'pixel_garden_state'
const GRID_ROWS = 8
const GRID_COLS = 8
const WATER_DECAY_INTERVAL = 3000
const WATER_DECAY_AMOUNT = 5
const WATER_ADD_AMOUNT = 20
const HARVEST_COINS = 10
const ACHIEVEMENT_HARVEST_COUNT = 20
const ACHIEVEMENT_GREEN_MASTER = 'green_master'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function createEmptyGrid(): (Plant | null)[][] {
  const grid: (Plant | null)[][] = []
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: (Plant | null)[] = []
    for (let c = 0; c < GRID_COLS; c++) {
      row.push(null)
    }
    grid.push(row)
  }
  return grid
}

function createInitialState(): GameState {
  return {
    grid: createEmptyGrid(),
    stats: {
      coins: 0,
      planted: 0,
      harvested: 0,
      achievements: []
    },
    selectedCell: null
  }
}

export class Game {
  state: GameState
  waterAnimations: WaterAnimation[] = []
  harvestFlashes: HarvestFlash[] = []
  achievementToShow: string | null = null
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.state = this.loadState()
  }

  loadState(): GameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as GameState
        if (parsed && parsed.grid && parsed.stats) {
          return {
            ...parsed,
            selectedCell: null
          }
        }
      }
    } catch (e) {
      console.warn('加载存档失败:', e)
    }
    return createInitialState()
  }

  saveState(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => {
      try {
        const toSave = {
          grid: this.state.grid,
          stats: this.state.stats
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
      } catch (e) {
        console.warn('保存失败:', e)
      }
    }, 200)
  }

  getAliveCount(): number {
    let count = 0
    for (const row of this.state.grid) {
      for (const cell of row) {
        if (cell && cell.stage !== GrowthStage.EMPTY) {
          count++
        }
      }
    }
    return count
  }

  plantSeed(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
    if (this.state.grid[row][col] !== null) return false

    const now = Date.now()
    this.state.grid[row][col] = {
      id: generateId(),
      stage: GrowthStage.SEED,
      stageStartTime: now,
      water: 80,
      lastWaterDecay: now
    }
    this.state.stats.planted++
    this.state.selectedCell = { row, col }
    this.saveState()
    return true
  }

  waterPlant(row: number, col: number, fromX: number, fromY: number): boolean {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
    const plant = this.state.grid[row][col]
    if (!plant || plant.stage === GrowthStage.EMPTY) return false

    plant.water = Math.min(100, plant.water + WATER_ADD_AMOUNT)

    this.waterAnimations.push({
      id: generateId(),
      fromX,
      fromY,
      toRow: row,
      toCol: col,
      startTime: Date.now(),
      duration: 400
    })

    this.state.selectedCell = { row, col }
    this.saveState()
    return true
  }

  harvestPlant(row: number, col: number): boolean {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false
    const plant = this.state.grid[row][col]
    if (!plant || plant.stage !== GrowthStage.FLOWER) return false

    this.state.grid[row][col] = null
    this.state.stats.harvested++
    this.state.stats.coins += HARVEST_COINS

    this.harvestFlashes.push({
      row,
      col,
      startTime: Date.now(),
      duration: 300
    })

    if (
      this.state.stats.harvested >= ACHIEVEMENT_HARVEST_COUNT &&
      !this.state.stats.achievements.includes(ACHIEVEMENT_GREEN_MASTER)
    ) {
      this.state.stats.achievements.push(ACHIEVEMENT_GREEN_MASTER)
      this.achievementToShow = ACHIEVEMENT_GREEN_MASTER
    }

    this.state.selectedCell = null
    this.saveState()
    return true
  }

  selectCell(row: number, col: number): void {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      this.state.selectedCell = null
      return
    }
    this.state.selectedCell = { row, col }
  }

  getSelectedPlant(): Plant | null {
    if (!this.state.selectedCell) return null
    const { row, col } = this.state.selectedCell
    return this.state.grid[row][col] || null
  }

  getStageProgress(plant: Plant): number {
    if (plant.stage === GrowthStage.EMPTY) return 1
    if (plant.stage === GrowthStage.FLOWER) return 1
    const duration = STAGE_DURATION[plant.stage]
    if (duration === 0) return 1
    const elapsed = Date.now() - plant.stageStartTime
    return Math.min(1, elapsed / duration)
  }

  getStageRemainingTime(plant: Plant): number {
    if (plant.stage === GrowthStage.EMPTY) return 0
    if (plant.stage === GrowthStage.FLOWER) return 0
    const duration = STAGE_DURATION[plant.stage]
    const elapsed = Date.now() - plant.stageStartTime
    return Math.max(0, duration - elapsed)
  }

  update(): void {
    const now = Date.now()

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const plant = this.state.grid[r][c]
        if (!plant) continue

        if (now - plant.lastWaterDecay >= WATER_DECAY_INTERVAL) {
          plant.water = Math.max(0, plant.water - WATER_DECAY_AMOUNT)
          plant.lastWaterDecay = now
        }

        if (
          plant.stage !== GrowthStage.EMPTY &&
          plant.stage !== GrowthStage.FLOWER
        ) {
          const duration = STAGE_DURATION[plant.stage]
          if (duration > 0 && now - plant.stageStartTime >= duration) {
            const currentIdx = STAGE_ORDER.indexOf(plant.stage)
            if (currentIdx < STAGE_ORDER.length - 1) {
              plant.stage = STAGE_ORDER[currentIdx + 1]
              plant.stageStartTime = now
            }
          }
        }
      }
    }

    this.waterAnimations = this.waterAnimations.filter(
      a => now - a.startTime < a.duration
    )
    this.harvestFlashes = this.harvestFlashes.filter(
      f => now - f.startTime < f.duration
    )

    this.saveState()
  }

  consumeAchievement(): string | null {
    const a = this.achievementToShow
    this.achievementToShow = null
    return a
  }

  get gridRows(): number {
    return GRID_ROWS
  }

  get gridCols(): number {
    return GRID_COLS
  }

  isGreenMasterUnlocked(): boolean {
    return this.state.stats.achievements.includes(ACHIEVEMENT_GREEN_MASTER)
  }
}

export { ACHIEVEMENT_GREEN_MASTER }
