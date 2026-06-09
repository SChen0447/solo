import { Pottery } from './pottery'

const GLAZE_COLORS = [
  { name: '青瓷', hex: '#90EE90' },
  { name: '天蓝', hex: '#87CEEB' },
  { name: '朱红', hex: '#DC143C' },
  { name: '象牙白', hex: '#FFFFF0' }
]

export class Toolbar {
  private pottery: Pottery
  private paletteEl!: HTMLDivElement
  private toolbarEl!: HTMLDivElement
  private sliderValueEl!: HTMLSpanElement
  private roughnessSliderEl!: HTMLInputElement
  private mobileToggleBtn!: HTMLButtonElement
  private isMobilePanelOpen = false

  constructor(pottery: Pottery) {
    this.pottery = pottery
    this.injectStyles()
    this.buildToolbar()
    this.buildPalette()
    this.buildMobileToggle()
    this.bindEvents()
  }

  private injectStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      .pottery-toolbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 48px;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        padding: 0 20px;
        gap: 12px;
        z-index: 10;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      .pottery-toolbar .tb-btn {
        background: transparent;
        border: none;
        color: #fff;
        font-size: 13px;
        padding: 0 18px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s ease, transform 0.1s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
        letter-spacing: 0.3px;
      }
      .pottery-toolbar .tb-btn:hover {
        background: rgba(255, 255, 255, 0.15);
      }
      .pottery-toolbar .tb-btn:active {
        transform: scale(0.95);
      }
      .pottery-toolbar .tb-btn svg {
        width: 16px;
        height: 16px;
      }
      .pottery-palette {
        position: fixed;
        top: 68px;
        left: 20px;
        width: 200px;
        background: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 16px;
        padding: 20px 18px;
        z-index: 10;
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      }
      .pottery-palette .palette-title {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 14px;
      }
      .pottery-palette .section-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;
        margin-top: 4px;
      }
      .color-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      .color-btn {
        width: 100%;
        height: 44px;
        border-radius: 10px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease;
        position: relative;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.6);
        font-weight: 600;
        font-family: inherit;
        letter-spacing: 0.5px;
      }
      .color-btn:hover {
        transform: scale(1.05);
        border-color: rgba(255, 255, 255, 0.6);
      }
      .color-btn.active {
        border-color: #fff;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
      }
      .slider-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .roughness-slider {
        flex: 1;
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        height: 24px;
        cursor: pointer;
      }
      .roughness-slider:focus {
        outline: none;
      }
      .roughness-slider::-webkit-slider-runnable-track {
        height: 3px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 2px;
      }
      .roughness-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        margin-top: -6.5px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        transition: transform 0.15s ease;
      }
      .roughness-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .roughness-slider::-moz-range-track {
        height: 3px;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 2px;
      }
      .roughness-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        border: none;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      }
      .slider-value {
        min-width: 32px;
        text-align: right;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
        font-variant-numeric: tabular-nums;
      }
      .mobile-palette-toggle {
        display: none;
        position: fixed;
        bottom: 24px;
        right: 20px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: none;
        cursor: pointer;
        z-index: 11;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease;
      }
      .mobile-palette-toggle:active {
        transform: scale(0.92);
      }
      .mobile-palette-toggle svg {
        width: 24px;
        height: 24px;
        color: #fff;
      }
      @media (max-width: 1279px) and (min-width: 769px) {
        .pottery-palette {
          width: 180px;
        }
      }
      @media (max-width: 768px) {
        .pottery-palette {
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          width: 100%;
          border-radius: 20px 20px 0 0;
          padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
          transform: translateY(100%);
          opacity: 0;
          pointer-events: none;
        }
        .pottery-palette.mobile-open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .mobile-palette-toggle {
          display: flex;
        }
        .mobile-palette-toggle.hidden {
          display: none;
        }
      }
    `
    document.head.appendChild(style)
  }

  private buildToolbar(): void {
    const bar = document.createElement('div')
    bar.className = 'pottery-toolbar'

    const undoBtn = this.createToolbarBtn('undo', '撤销',
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 3L3 13"/></svg>`
    )
    undoBtn.dataset.action = 'undo'

    const redoBtn = this.createToolbarBtn('redo', '重做',
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3L21 13"/></svg>`
    )
    redoBtn.dataset.action = 'redo'

    const resetBtn = this.createToolbarBtn('reset', '重置',
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
    )
    resetBtn.dataset.action = 'reset'

    bar.appendChild(undoBtn)
    bar.appendChild(redoBtn)
    bar.appendChild(resetBtn)

    const title = document.createElement('div')
    title.style.cssText = `
      margin-left: auto;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.5);
      letter-spacing: 1px;
    `
    title.textContent = '陶艺拉坯 · Pottery Wheel'
    bar.appendChild(title)

    document.getElementById('app')!.appendChild(bar)
    this.toolbarEl = bar
  }

  private createToolbarBtn(action: string, label: string, iconSvg: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'tb-btn'
    btn.dataset.action = action
    btn.innerHTML = `${iconSvg}<span>${label}</span>`
    return btn
  }

  private buildPalette(): void {
    const palette = document.createElement('div')
    palette.className = 'pottery-palette'

    const title = document.createElement('div')
    title.className = 'palette-title'
    title.textContent = '调色板 · Palette'
    palette.appendChild(title)

    const colorLabel = document.createElement('div')
    colorLabel.className = 'section-label'
    colorLabel.textContent = '釉色 Glaze Color'
    palette.appendChild(colorLabel)

    const colorGrid = document.createElement('div')
    colorGrid.className = 'color-grid'
    GLAZE_COLORS.forEach((c, idx) => {
      const btn = document.createElement('button')
      btn.className = 'color-btn'
      btn.style.background = c.hex
      btn.dataset.hex = c.hex
      btn.textContent = c.name
      if (idx === 0) btn.classList.add('active')
      colorGrid.appendChild(btn)
    })
    palette.appendChild(colorGrid)

    const roughLabel = document.createElement('div')
    roughLabel.className = 'section-label'
    roughLabel.textContent = '粗糙度 Roughness'
    palette.appendChild(roughLabel)

    const sliderWrapper = document.createElement('div')
    sliderWrapper.className = 'slider-wrapper'

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = '0'
    slider.max = '1'
    slider.step = '0.1'
    slider.value = '0.6'
    slider.className = 'roughness-slider'

    const val = document.createElement('span')
    val.className = 'slider-value'
    val.textContent = '0.6'

    sliderWrapper.appendChild(slider)
    sliderWrapper.appendChild(val)
    palette.appendChild(sliderWrapper)

    document.getElementById('app')!.appendChild(palette)
    this.paletteEl = palette
    this.roughnessSliderEl = slider
    this.sliderValueEl = val
  }

  private buildMobileToggle(): void {
    const btn = document.createElement('button')
    btn.className = 'mobile-palette-toggle'
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`
    document.getElementById('app')!.appendChild(btn)
    this.mobileToggleBtn = btn
  }

  private bindEvents(): void {
    this.toolbarEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.tb-btn') as HTMLButtonElement
      if (!btn) return
      const action = btn.dataset.action
      if (action === 'undo') this.pottery.undo()
      else if (action === 'redo') this.pottery.redo()
      else if (action === 'reset') this.pottery.reset()
    })

    this.paletteEl.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.paletteEl.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        const hex = btn.dataset.hex!
        this.pottery.setColor(hex)
      })
    })

    this.roughnessSliderEl.addEventListener('input', () => {
      const val = parseFloat(this.roughnessSliderEl.value)
      this.sliderValueEl.textContent = val.toFixed(1)
      this.pottery.setRoughness(val)
    })

    this.mobileToggleBtn.addEventListener('click', () => {
      this.toggleMobilePanel()
    })

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return
      if (!this.isMobilePanelOpen) return
      const target = e.target as HTMLElement
      if (this.paletteEl.contains(target) || this.mobileToggleBtn.contains(target)) return
      this.toggleMobilePanel(false)
    })
  }

  private toggleMobilePanel(force?: boolean): void {
    const open = force !== undefined ? force : !this.isMobilePanelOpen
    this.isMobilePanelOpen = open
    if (open) {
      this.paletteEl.classList.add('mobile-open')
      this.mobileToggleBtn.classList.add('hidden')
    } else {
      this.paletteEl.classList.remove('mobile-open')
      this.mobileToggleBtn.classList.remove('hidden')
    }
  }
}
