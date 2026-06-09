import { Environment } from './Environment'
import { RootSystem, GrowthParams } from './RootSystem'
import { Renderer } from './Renderer'
import { UI, UIParams } from './ui'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600
const TARGET_FPS = 30
const FRAME_INTERVAL = 1000 / TARGET_FPS

class App {
  private canvas: HTMLCanvasElement
  private environment: Environment
  private rootSystem: RootSystem
  private renderer: Renderer
  private ui: UI
  private params: UIParams

  private running: boolean = false
  private lastFrameTime: number = 0
  private animationId: number | null = null

  private waterConsumptionHistory: { time: number; consumed: number }[] = []
  private moistureSeed: number = 42
  private nutrientSeed: number = 73
  private obstacleSeed: number = 42

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement
    this.canvas.width = CANVAS_WIDTH
    this.canvas.height = CANVAS_HEIGHT

    this.environment = new Environment(CANVAS_WIDTH, CANVAS_HEIGHT)
    this.rootSystem = new RootSystem()
    this.renderer = new Renderer(this.canvas)

    this.params = {
      moistureSeed: 42,
      nutrientSeed: 73,
      consumptionRate: 0.05,
      branchInterval: 70
    }

    this.ui = new UI({
      onMoistureSeedChange: this.handleMoistureSeedChange.bind(this),
      onNutrientSeedChange: this.handleNutrientSeedChange.bind(this),
      onConsumptionRateChange: this.handleConsumptionRateChange.bind(this),
      onBranchIntervalChange: this.handleBranchIntervalChange.bind(this),
      onToggle: this.handleToggle.bind(this),
      onReset: this.handleReset.bind(this)
    })

    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this))

    this.regenerateEnvironment()
    this.render()
  }

  private regenerateEnvironment(): void {
    this.environment.regenerateAll(this.moistureSeed, this.nutrientSeed, this.obstacleSeed)
  }

  private handleMoistureSeedChange(value: number): void {
    this.moistureSeed = value
    this.params.moistureSeed = value
    this.environment.generateMoisture(value)
    this.render()
  }

  private handleNutrientSeedChange(value: number): void {
    this.nutrientSeed = value
    this.params.nutrientSeed = value
    this.environment.generateNutrients(value)
    this.render()
  }

  private handleConsumptionRateChange(value: number): void {
    this.params.consumptionRate = value
  }

  private handleBranchIntervalChange(value: number): void {
    this.params.branchInterval = value
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    if (y < 10) return
    this.rootSystem.placeSeed(x, y)
    this.render()
  }

  private handleToggle(): void {
    if (!this.rootSystem.seeded) {
      return
    }
    this.running = !this.running
    this.ui.setToggleButtonState(this.running)
    if (this.running) {
      this.lastFrameTime = performance.now()
      this.loop()
    } else if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private handleReset(): void {
    this.running = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.ui.setToggleButtonState(false)
    this.rootSystem.reset()
    this.waterConsumptionHistory = []
    this.regenerateEnvironment()
    this.ui.updateStatus(0, 0, 0)
    this.render()
  }

  private getGrowthParams(): GrowthParams {
    return {
      mainRootSpeed: 4,
      lateralRootSpeedFactor: 0.7,
      maxDeflection: 30,
      avoidDeflectionMain: 50,
      avoidDeflectionLateral: 25,
      branchIntervalMin: this.params.branchInterval - 10,
      branchIntervalMax: this.params.branchInterval + 10,
      branchAngleMin: 45,
      branchAngleMax: 135,
      minBranchDepth: 20,
      consumptionRate: this.params.consumptionRate,
      consumptionRadius: 10
    }
  }

  private loop(): void {
    if (!this.running) return

    const now = performance.now()
    const elapsed = now - this.lastFrameTime

    if (elapsed >= FRAME_INTERVAL) {
      const dt = Math.min(2, elapsed / 1000) * TARGET_FPS / TARGET_FPS
      const actualDt = elapsed / 1000
      this.lastFrameTime = now - (elapsed % FRAME_INTERVAL)

      const consumed = this.rootSystem.grow(this.environment, this.getGrowthParams(), dt)
      
      this.waterConsumptionHistory.push({ time: now, consumed })
      const cutoff = now - 5000
      while (this.waterConsumptionHistory.length > 0 && this.waterConsumptionHistory[0].time < cutoff) {
        this.waterConsumptionHistory.shift()
      }
      
      const windowMs = 5000
      const avgConsumption = this.waterConsumptionHistory.reduce((s, e) => s + e.consumed, 0) / (windowMs / 1000)

      this.ui.updateStatus(this.rootSystem.totalLength, this.rootSystem.branchCount, avgConsumption)
      this.render()
    }

    this.animationId = requestAnimationFrame(() => this.loop())
  }

  private render(): void {
    this.renderer.render(
      this.environment,
      this.rootSystem.nodes,
      this.rootSystem.seedX,
      this.rootSystem.seedY,
      this.rootSystem.seeded
    )
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App()
})
