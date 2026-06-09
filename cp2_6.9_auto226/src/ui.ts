import { MineralType, MINERAL_CONFIGS } from './planet'

export type UpgradeType = 'speed' | 'capacity' | 'robot'

export interface UpgradeConfig {
  type: UpgradeType
  name: string
  baseCost: number
  description: string
}

export const UPGRADE_CONFIGS: Record<UpgradeType, UpgradeConfig> = {
  speed: { type: 'speed', name: '移动速度', baseCost: 50, description: '+20% 移动速度' },
  capacity: { type: 'capacity', name: '采集容量', baseCost: 80, description: '+5 单位容量' },
  robot: { type: 'robot', name: '新机器人', baseCost: 100, description: '购买一台新机器人' }
}

export interface GameState {
  credits: number
  inventory: Record<MineralType, number>
  upgrades: {
    speedLevel: number
    capacityLevel: number
  }
  robotCount: number
}

export type UpgradeCallback = (type: UpgradeType) => boolean

export class UIController {
  private creditsEl: HTMLElement
  private inventoryListEl: HTMLElement
  private shopListEl: HTMLElement
  private robotCountEl: HTMLElement
  private darkMatterEffectEl: HTMLElement
  private onUpgrade: UpgradeCallback
  private state: GameState

  constructor(onUpgrade: UpgradeCallback) {
    this.onUpgrade = onUpgrade
    this.creditsEl = document.getElementById('creditsDisplay')!
    this.inventoryListEl = document.getElementById('inventoryList')!
    this.shopListEl = document.getElementById('shopList')!
    this.robotCountEl = document.getElementById('robotCount')!
    this.darkMatterEffectEl = document.getElementById('darkMatterEffect')!

    this.state = {
      credits: 0,
      inventory: { iron: 0, copper: 0, crystal: 0, darkMatter: 0 },
      upgrades: { speedLevel: 0, capacityLevel: 0 },
      robotCount: 0
    }

    this.renderInventory()
    this.renderShop()
  }

  updateState(newState: Partial<GameState>): void {
    this.state = { ...this.state, ...newState }
    this.renderCredits()
    this.renderInventory()
    this.renderShop()
    this.renderRobotCount()
  }

  private renderCredits(): void {
    this.creditsEl.textContent = this.state.credits.toString()
  }

  private renderInventory(): void {
    this.inventoryListEl.innerHTML = ''
    const types: MineralType[] = ['iron', 'copper', 'crystal', 'darkMatter']

    for (const type of types) {
      const config = MINERAL_CONFIGS[type]
      const count = this.state.inventory[type]

      const item = document.createElement('div')
      item.className = 'inventory-item'

      const icon = document.createElement('div')
      icon.className = 'inventory-icon'
      icon.style.backgroundColor = config.color
      icon.style.color = config.color

      const name = document.createElement('span')
      name.className = 'inventory-name'
      name.textContent = config.name

      const countEl = document.createElement('span')
      countEl.className = 'inventory-count'
      countEl.textContent = count.toString()

      item.appendChild(icon)
      item.appendChild(name)
      item.appendChild(countEl)
      this.inventoryListEl.appendChild(item)
    }
  }

  private renderShop(): void {
    this.shopListEl.innerHTML = ''
    const types: UpgradeType[] = ['speed', 'capacity', 'robot']

    for (const type of types) {
      const config = UPGRADE_CONFIGS[type]
      const cost = this.getUpgradeCost(type)
      const level = this.getUpgradeLevel(type)
      const canAfford = this.state.credits >= cost

      const item = document.createElement('div')
      item.className = 'shop-item'

      const header = document.createElement('div')
      header.className = 'shop-item-header'

      const name = document.createElement('span')
      name.className = 'shop-item-name'
      name.textContent = config.name

      const levelEl = document.createElement('span')
      levelEl.className = 'shop-item-level'
      if (type === 'robot') {
        levelEl.textContent = `已有 ${this.state.robotCount}`
      } else {
        levelEl.textContent = `等级 ${level}`
      }

      header.appendChild(name)
      header.appendChild(levelEl)

      const button = document.createElement('button')
      button.className = 'shop-button'
      button.textContent = `${config.description} - ${cost}积分`
      button.disabled = !canAfford

      button.addEventListener('click', () => {
        this.handleUpgradeClick(type, button)
      })

      item.appendChild(header)
      item.appendChild(button)
      this.shopListEl.appendChild(item)
    }
  }

  private handleUpgradeClick(type: UpgradeType, button: HTMLButtonElement): void {
    const cost = this.getUpgradeCost(type)
    if (this.state.credits < cost) return

    button.classList.add('flash')
    setTimeout(() => {
      button.classList.remove('flash')
    }, 200)

    const success = this.onUpgrade(type)
    if (success) {
      button.classList.remove('flash')
      void button.offsetWidth
      button.classList.add('flash')
    }
  }

  private renderRobotCount(): void {
    this.robotCountEl.textContent = this.state.robotCount.toString()
  }

  private getUpgradeCost(type: UpgradeType): number {
    const config = UPGRADE_CONFIGS[type]
    if (type === 'robot') {
      return config.baseCost
    }
    const level = this.getUpgradeLevel(type)
    return Math.floor(config.baseCost * Math.pow(1.5, level))
  }

  private getUpgradeLevel(type: UpgradeType): number {
    if (type === 'speed') return this.state.upgrades.speedLevel
    if (type === 'capacity') return this.state.upgrades.capacityLevel
    return 0
  }

  triggerDarkMatterEffect(): void {
    this.darkMatterEffectEl.classList.add('active')
    setTimeout(() => {
      this.darkMatterEffectEl.classList.remove('active')
    }, 500)
  }
}
