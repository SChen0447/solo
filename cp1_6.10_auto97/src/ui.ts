import { EnvironmentParams, PlantStats } from './plant'

interface SliderConfig {
  key: keyof EnvironmentParams
  label: string
  icon: string
  iconColor: string
  defaultValue: number
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'light',
    label: '光照强度',
    icon: '☀️',
    iconColor: '#FFD700',
    defaultValue: 50
  },
  {
    key: 'water',
    label: '水分含量',
    icon: '💧',
    iconColor: '#4FC3F7',
    defaultValue: 50
  },
  {
    key: 'soil',
    label: '土壤肥沃度',
    icon: '🌿',
    iconColor: '#16C79A',
    defaultValue: 50
  },
  {
    key: 'speed',
    label: '生长速度',
    icon: '⏱️',
    iconColor: '#E91E63',
    defaultValue: 50
  }
]

export class UIController {
  private controlsContainer: HTMLElement
  private onChangeCallback: (params: Partial<EnvironmentParams>) => void
  private sliders: Map<keyof EnvironmentParams, HTMLInputElement> = new Map()
  private valueLabels: Map<keyof EnvironmentParams, HTMLSpanElement> = new Map()
  private statElements: {
    branches: HTMLElement
    leaves: HTMLElement
    angle: HTMLElement
    score: HTMLElement
  }

  constructor(
    controlsContainer: HTMLElement,
    onChangeCallback: (params: Partial<EnvironmentParams>) => void
  ) {
    this.controlsContainer = controlsContainer
    this.onChangeCallback = onChangeCallback

    this.statElements = {
      branches: document.getElementById('stat-branches')!,
      leaves: document.getElementById('stat-leaves')!,
      angle: document.getElementById('stat-angle')!,
      score: document.getElementById('stat-score')!
    }

    this.createSliders()
  }

  private createSliders(): void {
    SLIDER_CONFIGS.forEach(config => {
      const group = document.createElement('div')
      group.className = 'slider-group'

      const label = document.createElement('div')
      label.className = 'slider-label'

      const icon = document.createElement('span')
      icon.className = 'slider-icon'
      icon.textContent = config.icon
      icon.style.color = config.iconColor
      icon.style.filter = `drop-shadow(0 0 6px ${config.iconColor}80)`
      icon.style.fontSize = '18px'

      const textSpan = document.createElement('span')
      textSpan.textContent = config.label

      const valueSpan = document.createElement('span')
      valueSpan.className = 'slider-value'
      valueSpan.textContent = `${config.defaultValue}`
      this.valueLabels.set(config.key, valueSpan)

      label.appendChild(icon)
      label.appendChild(textSpan)
      label.appendChild(valueSpan)

      const slider = document.createElement('input')
      slider.type = 'range'
      slider.min = '0'
      slider.max = '100'
      slider.value = config.defaultValue.toString()
      slider.className = 'slider-input'
      this.sliders.set(config.key, slider)

      slider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10)
        valueSpan.textContent = `${value}`
        this.onChangeCallback({ [config.key]: value })
      })

      group.appendChild(label)
      group.appendChild(slider)
      this.controlsContainer.appendChild(group)
    })
  }

  updateStats(stats: PlantStats): void {
    this.statElements.branches.textContent = stats.branchCount.toString()
    this.statElements.leaves.textContent = stats.leafCount.toString()
    this.statElements.angle.textContent = `${stats.avgAngle}°`
    this.statElements.score.textContent = `${stats.score}%`
  }

  getValues(): EnvironmentParams {
    const params: EnvironmentParams = {
      light: 50,
      water: 50,
      soil: 50,
      speed: 50
    }
    this.sliders.forEach((slider, key) => {
      params[key] = parseInt(slider.value, 10)
    })
    return params
  }
}
