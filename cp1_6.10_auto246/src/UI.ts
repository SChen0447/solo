import { Particle } from './Particle'

export interface UIParams {
  nStrength: number
  sStrength: number
  initialSpeed: number
  charge: number
  particleCount: number
  zoom: number
}

export interface UICallbacks {
  onParamChange: (params: UIParams) => void
  onAddPole: (type: 'N' | 'S') => void
  onRemovePole: () => void
}

export class UIManager {
  private container: HTMLElement
  private params: UIParams
  private callbacks: UICallbacks
  private controlPanel: HTMLElement | null = null
  private toolbar: HTMLElement | null = null
  private warningText: HTMLElement | null = null
  private infoPanel: HTMLElement | null = null
  private activeParticle: Particle | null = null

  constructor(container: HTMLElement, params: UIParams, callbacks: UICallbacks) {
    this.container = container
    this.params = { ...params }
    this.callbacks = callbacks
    this.injectStyles()
    this.createToolbar()
    this.createControlPanel()
    this.createWarning()
  }

  private injectStyles(): void {
    const styleId = 'magnetic-field-ui-styles'
    if (document.getElementById(styleId)) return

    const css = `
      .mf-panel {
        position: absolute;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.2);
        border-radius: 12px;
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 100;
      }
      .mf-toolbar {
        top: 20px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
      }
      .mf-toolbar-title {
        font-size: 11px;
        color: #00d4ff;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .mf-toolbar-row {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .mf-btn {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .mf-btn-n {
        background: rgba(255, 51, 51, 0.2);
        color: #ff6666;
        border: 1px solid rgba(255, 51, 51, 0.4);
      }
      .mf-btn-n:hover { background: rgba(255, 51, 51, 0.4); }
      .mf-btn-s {
        background: rgba(51, 102, 255, 0.2);
        color: #6699ff;
        border: 1px solid rgba(51, 102, 255, 0.4);
      }
      .mf-btn-s:hover { background: rgba(51, 102, 255, 0.4); }
      .mf-btn-remove {
        background: rgba(255, 150, 51, 0.2);
        color: #ffaa66;
        border: 1px solid rgba(255, 150, 51, 0.4);
      }
      .mf-btn-remove:hover { background: rgba(255, 150, 51, 0.4); }
      .mf-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .mf-control-panel {
        top: 20px;
        right: 20px;
        width: 300px;
        padding: 20px;
      }
      .mf-panel-title {
        font-size: 16px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 16px;
        letter-spacing: 0.5px;
      }
      .mf-slider-group {
        margin-bottom: 16px;
      }
      .mf-slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .mf-slider-value {
        color: #00d4ff;
        font-weight: 600;
        font-size: 13px;
      }
      .mf-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(90deg, rgba(0, 212, 255, 0.6), rgba(0, 212, 255, 0.1));
        outline: none;
        cursor: pointer;
      }
      .mf-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #00d4ff;
        border: 2px solid #0b1120;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .mf-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .mf-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #00d4ff;
        border: 2px solid #0b1120;
        box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
        cursor: pointer;
      }
      .mf-warning {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 50, 50, 0.85);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        z-index: 200;
        display: none;
        animation: mf-pulse 1.5s infinite;
      }
      @keyframes mf-pulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 1; }
      }
      .mf-info-panel {
        position: absolute;
        width: 200px;
        height: 150px;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 8px;
        padding: 14px;
        color: #e2e8f0;
        font-size: 12px;
        z-index: 150;
        display: none;
        transform: scale(0);
        transform-origin: center center;
        pointer-events: auto;
      }
      .mf-info-panel.visible {
        display: block;
        animation: mf-popup 0.2s ease-out forwards;
      }
      @keyframes mf-popup {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .mf-info-title {
        font-size: 13px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .mf-info-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0;
      }
      .mf-info-close:hover { color: #fff; }
      .mf-info-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .mf-info-row:last-child { border-bottom: none; }
      .mf-info-label { color: #94a3b8; }
      .mf-info-value { color: #e2e8f0; font-weight: 600; }
      .mf-charge-positive { color: #ff6666; }
      .mf-charge-negative { color: #6699ff; }
    `
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = css
    document.head.appendChild(style)
  }

  private createToolbar(): void {
    this.toolbar = document.createElement('div')
    this.toolbar.className = 'mf-panel mf-toolbar'

    const title = document.createElement('div')
    title.className = 'mf-toolbar-title'
    title.textContent = '磁极管理'
    this.toolbar.appendChild(title)

    const row1 = document.createElement('div')
    row1.className = 'mf-toolbar-row'

    const addN = document.createElement('button')
    addN.className = 'mf-btn mf-btn-n'
    addN.textContent = '+'
    addN.title = '添加N极'
    addN.onclick = () => this.callbacks.onAddPole('N')
    row1.appendChild(addN)

    const addS = document.createElement('button')
    addS.className = 'mf-btn mf-btn-s'
    addS.textContent = '+'
    addS.title = '添加S极'
    addS.onclick = () => this.callbacks.onAddPole('S')
    row1.appendChild(addS)

    const remove = document.createElement('button')
    remove.className = 'mf-btn mf-btn-remove'
    remove.textContent = '−'
    remove.title = '删除最后一个磁极'
    remove.onclick = () => this.callbacks.onRemovePole()
    row1.appendChild(remove)

    this.toolbar.appendChild(row1)
    this.container.appendChild(this.toolbar)
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div')
    this.controlPanel.className = 'mf-panel mf-control-panel'

    const title = document.createElement('div')
    title.className = 'mf-panel-title'
    title.textContent = '⚙ 参数控制'
    this.controlPanel.appendChild(title)

    this.createSlider('N极强度', 'nStrength', 0.5, 3.0, 0.1, this.params.nStrength)
    this.createSlider('S极强度', 'sStrength', 0.5, 3.0, 0.1, this.params.sStrength)
    this.createSlider('粒子初始速度', 'initialSpeed', 0.5, 5.0, 0.1, this.params.initialSpeed)
    this.createSlider('粒子电荷量', 'charge', 0.1, 2.0, 0.1, this.params.charge)
    this.createSlider('粒子发射数量', 'particleCount', 5, 30, 1, this.params.particleCount)
    this.createSlider('视图缩放', 'zoom', 1, 20, 0.5, this.params.zoom)

    this.container.appendChild(this.controlPanel)
  }

  private createSlider(
    label: string,
    key: keyof UIParams,
    min: number,
    max: number,
    step: number,
    value: number
  ): void {
    if (!this.controlPanel) return

    const group = document.createElement('div')
    group.className = 'mf-slider-group'

    const labelDiv = document.createElement('div')
    labelDiv.className = 'mf-slider-label'

    const labelText = document.createElement('span')
    labelText.textContent = label

    const valueText = document.createElement('span')
    valueText.className = 'mf-slider-value'
    valueText.textContent = value.toFixed(step < 1 ? 1 : 0)

    labelDiv.appendChild(labelText)
    labelDiv.appendChild(valueText)

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.className = 'mf-slider'
    slider.min = String(min)
    slider.max = String(max)
    slider.step = String(step)
    slider.value = String(value)

    slider.oninput = () => {
      const v = parseFloat(slider.value)
      valueText.textContent = v.toFixed(step < 1 ? 1 : 0)
      ;(this.params as any)[key] = v
      this.callbacks.onParamChange(this.params)
    }

    group.appendChild(labelDiv)
    group.appendChild(slider)
    this.controlPanel.appendChild(group)
  }

  private createWarning(): void {
    this.warningText = document.createElement('div')
    this.warningText.className = 'mf-warning'
    this.warningText.textContent = '⚠ 警告：当前磁极配置无法形成有效磁场回路！'
    this.container.appendChild(this.warningText)
  }

  public showWarning(show: boolean): void {
    if (this.warningText) {
      this.warningText.style.display = show ? 'block' : 'none'
    }
  }

  public showParticleInfo(particle: Particle, screenX: number, screenY: number): void {
    this.activeParticle = particle
    this.removeInfoPanel()

    this.infoPanel = document.createElement('div')
    this.infoPanel.className = 'mf-info-panel'

    const containerRect = this.container.getBoundingClientRect()
    let posX = screenX - containerRect.left + 15
    let posY = screenY - containerRect.top + 15

    if (posX + 200 > containerRect.width) posX = screenX - containerRect.left - 215
    if (posY + 150 > containerRect.height) posY = screenY - containerRect.top - 165

    this.infoPanel.style.left = `${posX}px`
    this.infoPanel.style.top = `${posY}px`

    const title = document.createElement('div')
    title.className = 'mf-info-title'
    const titleText = document.createElement('span')
    titleText.textContent = '粒子信息'
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mf-info-close'
    closeBtn.textContent = '×'
    closeBtn.onclick = () => this.hideParticleInfo()
    title.appendChild(titleText)
    title.appendChild(closeBtn)

    const velocity = particle.getVelocity().length()
    const fieldStrength = particle.getFieldStrength()

    const rows = [
      { label: '速度', value: `${velocity.toFixed(2)} u/s` },
      {
        label: '电荷量',
        value: `${Math.abs(particle.charge).toFixed(2)} C`,
        className: particle.charge > 0 ? 'mf-charge-positive' : 'mf-charge-negative'
      },
      { label: '场强', value: `${fieldStrength.toFixed(4)} T` }
    ]

    this.infoPanel.appendChild(title)
    for (const row of rows) {
      const r = document.createElement('div')
      r.className = 'mf-info-row'
      const label = document.createElement('span')
      label.className = 'mf-info-label'
      label.textContent = row.label
      const val = document.createElement('span')
      val.className = 'mf-info-value'
      if (row.className) val.classList.add(row.className)
      val.textContent = row.value
      r.appendChild(label)
      r.appendChild(val)
      this.infoPanel.appendChild(r)
    }

    this.infoPanel.onclick = (e) => e.stopPropagation()
    this.container.appendChild(this.infoPanel)

    requestAnimationFrame(() => {
      if (this.infoPanel) this.infoPanel.classList.add('visible')
    })
  }

  public hideParticleInfo(): void {
    this.removeInfoPanel()
    this.activeParticle = null
  }

  private removeInfoPanel(): void {
    if (this.infoPanel && this.infoPanel.parentNode) {
      this.infoPanel.parentNode.removeChild(this.infoPanel)
    }
    this.infoPanel = null
  }

  public getParams(): UIParams {
    return { ...this.params }
  }

  public dispose(): void {
    this.removeInfoPanel()
    if (this.controlPanel && this.controlPanel.parentNode) {
      this.controlPanel.parentNode.removeChild(this.controlPanel)
    }
    if (this.toolbar && this.toolbar.parentNode) {
      this.toolbar.parentNode.removeChild(this.toolbar)
    }
    if (this.warningText && this.warningText.parentNode) {
      this.warningText.parentNode.removeChild(this.warningText)
    }
  }
}
