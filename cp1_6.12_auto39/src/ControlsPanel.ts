export interface PanelCallbacks {
  onCountChange: (v: number) => void
  onSpeedChange: (v: number) => void
  onTurbulenceChange: (v: number) => void
  onHueOffsetChange: (v: number) => void
  onAttractorXChange: (v: number) => void
  onAttractorYChange: (v: number) => void
  onAttractorZChange: (v: number) => void
  onTogglePlay: () => void
  onScreenshot: () => void
}

interface SliderConfig {
  key: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  format: (v: number) => string
  onChange: (v: number) => void
}

export class ControlsPanel {
  private root: HTMLElement
  private callbacks: PanelCallbacks
  private panel!: HTMLDivElement
  private toggleBtn!: HTMLButtonElement
  private isPlaying = true

  constructor(root: HTMLElement, callbacks: PanelCallbacks) {
    this.root = root
    this.callbacks = callbacks
    this.build()
  }

  private build(): void {
    this.panel = document.createElement('div')
    this.panel.className = 'controls-panel'

    const title = document.createElement('div')
    title.className = 'panel-title'
    title.textContent = '粒子艺术生成器'
    this.panel.appendChild(title)

    const motionTitle = document.createElement('div')
    motionTitle.className = 'section-title'
    motionTitle.textContent = '运动参数'
    this.panel.appendChild(motionTitle)

    this.addSlider({
      key: 'count',
      label: '粒子数量',
      min: 1000,
      max: 8000,
      step: 100,
      defaultValue: 3000,
      format: (v) => v.toFixed(0),
      onChange: (v) => this.callbacks.onCountChange(v)
    })

    this.addSlider({
      key: 'speed',
      label: '运动速度',
      min: 0.1,
      max: 5.0,
      step: 0.1,
      defaultValue: 1.0,
      format: (v) => v.toFixed(1),
      onChange: (v) => this.callbacks.onSpeedChange(v)
    })

    this.addSlider({
      key: 'turbulence',
      label: '湍流强度',
      min: 0,
      max: 3,
      step: 0.1,
      defaultValue: 1.0,
      format: (v) => v.toFixed(1),
      onChange: (v) => this.callbacks.onTurbulenceChange(v)
    })

    const colorTitle = document.createElement('div')
    colorTitle.className = 'section-title'
    colorTitle.textContent = '颜色参数'
    this.panel.appendChild(colorTitle)

    this.addSlider({
      key: 'hue',
      label: '色相偏移 (H)',
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 0,
      format: (v) => v.toFixed(0) + '°',
      onChange: (v) => this.callbacks.onHueOffsetChange(v)
    })

    const attrTitle = document.createElement('div')
    attrTitle.className = 'section-title'
    attrTitle.textContent = '吸引子位置'
    this.panel.appendChild(attrTitle)

    this.addSlider({
      key: 'ax',
      label: '吸引子 X',
      min: -5,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      format: (v) => v.toFixed(1),
      onChange: (v) => this.callbacks.onAttractorXChange(v)
    })

    this.addSlider({
      key: 'ay',
      label: '吸引子 Y',
      min: -5,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      format: (v) => v.toFixed(1),
      onChange: (v) => this.callbacks.onAttractorYChange(v)
    })

    this.addSlider({
      key: 'az',
      label: '吸引子 Z',
      min: -5,
      max: 5,
      step: 0.1,
      defaultValue: 0,
      format: (v) => v.toFixed(1),
      onChange: (v) => this.callbacks.onAttractorZChange(v)
    })

    const btnRow = document.createElement('div')
    btnRow.className = 'button-row'

    this.toggleBtn = document.createElement('button')
    this.toggleBtn.className = 'btn btn-primary'
    this.toggleBtn.textContent = '暂停'
    this.toggleBtn.addEventListener('click', () => this.handleToggle())
    btnRow.appendChild(this.toggleBtn)

    const shotBtn = document.createElement('button')
    shotBtn.className = 'btn'
    shotBtn.textContent = '截图'
    shotBtn.addEventListener('click', () => this.callbacks.onScreenshot())
    btnRow.appendChild(shotBtn)

    this.panel.appendChild(btnRow)
    this.root.appendChild(this.panel)
  }

  private addSlider(cfg: SliderConfig): void {
    const group = document.createElement('div')
    group.className = 'slider-group'

    const labelWrap = document.createElement('div')
    labelWrap.className = 'slider-label'

    const labelText = document.createElement('span')
    labelText.textContent = cfg.label

    const valueText = document.createElement('span')
    valueText.className = 'slider-value'
    valueText.textContent = cfg.format(cfg.defaultValue)

    labelWrap.appendChild(labelText)
    labelWrap.appendChild(valueText)
    group.appendChild(labelWrap)

    const input = document.createElement('input')
    input.type = 'range'
    input.min = String(cfg.min)
    input.max = String(cfg.max)
    input.step = String(cfg.step)
    input.value = String(cfg.defaultValue)
    input.dataset.key = cfg.key

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      const v = parseFloat(target.value)
      valueText.textContent = cfg.format(v)
      cfg.onChange(v)
    })

    group.appendChild(input)
    this.panel.appendChild(group)
  }

  private handleToggle(): void {
    this.isPlaying = !this.isPlaying
    this.toggleBtn.textContent = this.isPlaying ? '暂停' : '开始'
    this.callbacks.onTogglePlay()
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing
    this.toggleBtn.textContent = playing ? '暂停' : '开始'
  }

  public getPlaying(): boolean {
    return this.isPlaying
  }

  public dispose(): void {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel)
    }
  }
}
