import { Planet, MineralType, MINERAL_CONFIGS, BASE_X, BASE_Y, MAP_SIZE } from './planet'
import { Robot } from './robot'
import { UIController, UpgradeType, UPGRADE_CONFIGS } from './ui'

const BASE_SPEED = 60
const BASE_CAPACITY = 10

class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private planet: Planet
  private robots: Robot[] = []
  private ui: UIController
  private robotIdCounter = 0

  private credits = 0
  private inventory: Record<MineralType, number> = {
    iron: 0,
    copper: 0,
    crystal: 0,
    darkMatter: 0
  }
  private upgrades = {
    speedLevel: 0,
    capacityLevel: 0
  }

  private lastTime = 0
  private running = true

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.planet = new Planet()
    this.ui = new UIController(this.handleUpgrade.bind(this))

    this.setupEventListeners()
    this.addInitialRobot()
    this.updateUI()
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this))
    this.canvas.addEventListener('touchend', this.handleCanvasTouch.bind(this))
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    this.tryPlaceRobot(x, y)
  }

  private handleCanvasTouch(e: TouchEvent): void {
    e.preventDefault()
    if (e.changedTouches.length > 0) {
      const touch = e.changedTouches[0]
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const x = (touch.clientX - rect.left) * scaleX
      const y = (touch.clientY - rect.top) * scaleY
      this.tryPlaceRobot(x, y)
    }
  }

  private tryPlaceRobot(x: number, y: number): void {
    const robotCost = UPGRADE_CONFIGS.robot.baseCost
    if (this.robots.length === 0) {
      this.createRobot(x, y)
      return
    }
    if (this.credits >= robotCost) {
      this.credits -= robotCost
      this.createRobot(x, y)
      this.updateUI()
    }
  }

  private addInitialRobot(): void {
    this.createRobot(BASE_X + 40, BASE_Y + 40)
  }

  private createRobot(x: number, y: number): void {
    const clampedX = Math.max(20, Math.min(MAP_SIZE - 20, x))
    const clampedY = Math.max(20, Math.min(MAP_SIZE - 20, y))

    const robot = new Robot(
      this.robotIdCounter++,
      clampedX,
      clampedY,
      this.getCurrentSpeed(),
      this.getCurrentCapacity()
    )
    robot.setMiningRate(1 + this.upgrades.speedLevel * 0.5)
    robot.seekDeposit(this.planet)
    this.robots.push(robot)
  }

  private getCurrentSpeed(): number {
    return BASE_SPEED * (1 + this.upgrades.speedLevel * 0.2)
  }

  private getCurrentCapacity(): number {
    return BASE_CAPACITY + this.upgrades.capacityLevel * 5
  }

  private handleUpgrade(type: UpgradeType): boolean {
    let cost: number
    switch (type) {
      case 'speed':
        cost = Math.floor(UPGRADE_CONFIGS.speed.baseCost * Math.pow(1.5, this.upgrades.speedLevel))
        if (this.credits >= cost) {
          this.credits -= cost
          this.upgrades.speedLevel++
          this.applyUpgradeToAllRobots()
          this.updateUI()
          return true
        }
        break
      case 'capacity':
        cost = Math.floor(UPGRADE_CONFIGS.capacity.baseCost * Math.pow(1.5, this.upgrades.capacityLevel))
        if (this.credits >= cost) {
          this.credits -= cost
          this.upgrades.capacityLevel++
          this.applyUpgradeToAllRobots()
          this.updateUI()
          return true
        }
        break
      case 'robot':
        cost = UPGRADE_CONFIGS.robot.baseCost
        if (this.credits >= cost) {
          this.credits -= cost
          this.createRobot(BASE_X + 40 + Math.random() * 20, BASE_Y + 40 + Math.random() * 20)
          this.updateUI()
          return true
        }
        break
    }
    return false
  }

  private applyUpgradeToAllRobots(): void {
    for (const robot of this.robots) {
      robot.setSpeed(this.getCurrentSpeed())
      robot.setCapacity(this.getCurrentCapacity())
      robot.setMiningRate(1 + this.upgrades.speedLevel * 0.5)
    }
  }

  private updateUI(): void {
    this.ui.updateState({
      credits: this.credits,
      inventory: { ...this.inventory },
      upgrades: { ...this.upgrades },
      robotCount: this.robots.length
    })
  }

  start(): void {
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  private loop(currentTime: number): void {
    if (!this.running) return

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05)
    this.lastTime = currentTime

    this.update(dt)
    this.render(currentTime)

    requestAnimationFrame((t) => this.loop(t))
  }

  private update(dt: number): void {
    let darkMatterMined = false

    for (const robot of this.robots) {
      const result = robot.update(dt, this.planet)
      if (result === 'darkMatter') {
        darkMatterMined = true
      }
      robot.checkArrivedAtDeposit(this.planet)

      if (robot.state === 'moving' && robot.targetDepositId === null && robot.cargo.amount < robot.capacity) {
        robot.seekDeposit(this.planet)
      }

      const deposit = robot.checkArrivedAtBase()
      if (deposit) {
        this.collectDeposit(deposit.type, deposit.amount)
      }
    }

    if (darkMatterMined) {
      this.ui.triggerDarkMatterEffect()
    }
  }

  private collectDeposit(type: MineralType, amount: number): void {
    const roundedAmount = Math.floor(amount)
    if (roundedAmount <= 0) return

    this.inventory[type] = (this.inventory[type] || 0) + roundedAmount
    const value = MINERAL_CONFIGS[type].value * roundedAmount
    this.credits += value
    this.updateUI()
  }

  private render(time: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.planet.render(this.ctx, time)

    for (const robot of this.robots) {
      robot.render(this.ctx)
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game()
  game.start()
})
