import { ElementType, GeometryType, HoloElement } from './elements'

export interface UICallbacks {
  onAddElement: (type: ElementType, options?: { geometryType?: GeometryType; text?: string }) => void
  onToggleRotate: (id: string) => void
  onDeleteElement: (id: string) => void
  onChangeColor: (id: string, color: string) => void
  onRecord: () => void
  onReset: () => void
}

const primaryColor = '#00BFFF'
const secondaryColor = '#8A2BE2'

function createStyle(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `
    .control-panel {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 220px;
      padding: 16px;
      background: rgba(10, 10, 30, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 191, 255, 0.3);
      border-radius: 0 12px 12px 0;
      box-shadow: 0 0 10px #00BFFF;
      z-index: 100;
    }
    .panel-title {
      font-size: 14px;
      font-weight: bold;
      color: ${primaryColor};
      text-shadow: 0 0 8px ${primaryColor};
      margin-bottom: 12px;
      letter-spacing: 2px;
    }
    .preset-btn {
      display: block;
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, rgba(0, 191, 255, 0.15), rgba(138, 43, 226, 0.15));
      border: 1px solid rgba(0, 191, 255, 0.4);
      border-radius: 6px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.2s ease, background 0.2s ease;
      text-align: left;
    }
    .preset-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 15px ${primaryColor};
      background: linear-gradient(135deg, rgba(0, 191, 255, 0.3), rgba(138, 43, 226, 0.3));
    }
    .preset-btn:active {
      transform: scale(0.95);
    }
    .preset-btn .icon {
      margin-right: 8px;
    }
    .geometry-select {
      display: none;
      margin-bottom: 8px;
    }
    .geometry-select.show {
      display: block;
    }
    .geo-btn {
      display: inline-block;
      width: 32%;
      padding: 6px 4px;
      margin-right: 1%;
      margin-bottom: 4px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(138, 43, 226, 0.4);
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      cursor: pointer;
      transition: transform 0.1s ease;
    }
    .geo-btn:hover {
      transform: scale(1.1);
      border-color: ${secondaryColor};
    }
    .geo-btn:active {
      transform: scale(0.95);
    }
    .geo-btn.active {
      background: rgba(138, 43, 226, 0.4);
      box-shadow: 0 0 8px ${secondaryColor};
    }
    .text-input {
      display: none;
      width: 100%;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(0, 191, 255, 0.4);
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      outline: none;
    }
    .text-input.show {
      display: block;
    }
    .text-input:focus {
      border-color: ${primaryColor};
      box-shadow: 0 0 8px ${primaryColor};
    }
    .global-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: rgba(10, 10, 30, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(0, 191, 255, 0.3);
      box-shadow: 0 0 10px #00BFFF;
      z-index: 100;
    }
    .global-btn {
      padding: 8px 20px;
      background: linear-gradient(135deg, rgba(0, 191, 255, 0.2), rgba(138, 43, 226, 0.2));
      border: 1px solid rgba(0, 191, 255, 0.5);
      border-radius: 6px;
      color: #fff;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.2s ease;
    }
    .global-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 15px ${primaryColor};
    }
    .global-btn:active {
      transform: scale(0.95);
    }
    .global-btn.recording {
      background: rgba(255, 0, 0, 0.3);
      border-color: rgba(255, 0, 0, 0.6);
      animation: blink 1s infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; box-shadow: 0 0 15px #ff0000; }
      50% { opacity: 0.5; box-shadow: 0 0 5px #ff0000; }
    }
    .element-controls {
      position: absolute;
      bottom: -40px;
      left: 50%;
      transform: translateX(-50%);
      height: 30px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 8px;
      background: rgba(10, 10, 30, 0.55);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 191, 255, 0.3);
      border-radius: 6px;
      box-shadow: 0 0 8px rgba(0, 191, 255, 0.3);
      pointer-events: all;
      white-space: nowrap;
    }
    .mini-btn {
      width: 26px;
      height: 22px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(0, 191, 255, 0.4);
      border-radius: 4px;
      color: #fff;
      font-size: 11px;
      cursor: pointer;
      transition: transform 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .mini-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 0 8px ${primaryColor};
    }
    .mini-btn:active {
      transform: scale(0.95);
    }
    .mini-btn.active {
      background: rgba(0, 191, 255, 0.3);
    }
    .mini-btn.danger:hover {
      box-shadow: 0 0 8px #ff4444;
      border-color: rgba(255, 68, 68, 0.6);
    }
    .color-slider {
      width: 60px;
      height: 18px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      border-radius: 9px;
      outline: none;
      cursor: pointer;
    }
    .color-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 4px #000;
      cursor: pointer;
    }
    .controls-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 50;
    }
    .element-controls-wrap {
      position: absolute;
      pointer-events: none;
    }
    .element-controls-wrap.visible .element-controls {
      pointer-events: all;
    }
    .download-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 24px 32px;
      background: rgba(10, 10, 30, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 191, 255, 0.5);
      border-radius: 12px;
      box-shadow: 0 0 20px #00BFFF;
      z-index: 200;
      text-align: center;
    }
    .download-modal h3 {
      color: ${primaryColor};
      margin-bottom: 16px;
      text-shadow: 0 0 8px ${primaryColor};
    }
    .download-modal a {
      display: inline-block;
      padding: 10px 24px;
      background: linear-gradient(135deg, rgba(0, 191, 255, 0.3), rgba(138, 43, 226, 0.3));
      border: 1px solid rgba(0, 191, 255, 0.6);
      border-radius: 6px;
      color: #fff;
      text-decoration: none;
      font-weight: bold;
      transition: transform 0.1s ease;
    }
    .download-modal a:hover {
      transform: scale(1.1);
      box-shadow: 0 0 15px ${primaryColor};
    }
    .download-modal .close-btn {
      display: block;
      margin-top: 12px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      cursor: pointer;
      font-size: 12px;
    }
    .stage-flash {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 191, 255, 0.3);
      pointer-events: none;
      opacity: 0;
      z-index: 150;
    }
    .stage-flash.active {
      animation: flashAnim 1s ease-out;
    }
    @keyframes flashAnim {
      0% { opacity: 0.8; }
      100% { opacity: 0; }
    }
  `
  return style
}

export class UI {
  private _callbacks: UICallbacks
  private _container: HTMLElement
  private _controlsContainer: HTMLElement
  private _recordBtn: HTMLButtonElement
  private _isRecording = false
  private _selectedGeometry: GeometryType = 'cube'
  private _controlMap: Map<string, HTMLElement> = new Map()

  constructor(callbacks: UICallbacks) {
    this._callbacks = callbacks
    document.head.appendChild(createStyle())
    this._container = document.getElementById('app')!
    this._controlsContainer = document.createElement('div')
    this._controlsContainer.className = 'controls-container'
    this._container.appendChild(this._controlsContainer)
    this._recordBtn = this._buildGlobalBar()
    this._buildControlPanel()
    this._buildFlashOverlay()
  }

  private _buildGlobalBar(): HTMLButtonElement {
    const bar = document.createElement('div')
    bar.className = 'global-bar'

    const recordBtn = document.createElement('button')
    recordBtn.className = 'global-btn'
    recordBtn.textContent = '● 录制 GIF'
    recordBtn.addEventListener('click', () => this._callbacks.onRecord())
    bar.appendChild(recordBtn)

    const resetBtn = document.createElement('button')
    resetBtn.className = 'global-btn'
    resetBtn.textContent = '↺ 重置'
    resetBtn.addEventListener('click', () => this._callbacks.onReset())
    bar.appendChild(resetBtn)

    this._container.appendChild(bar)
    return recordBtn
  }

  private _buildControlPanel() {
    const panel = document.createElement('div')
    panel.className = 'control-panel'

    const title = document.createElement('div')
    title.className = 'panel-title'
    title.textContent = '✦ 全息元素'
    panel.appendChild(title)

    const geoSelect = document.createElement('div')
    geoSelect.className = 'geometry-select'
    ;(['cube', 'tetrahedron', 'dodecahedron'] as GeometryType[]).forEach((type) => {
      const btn = document.createElement('button')
      btn.className = 'geo-btn' + (type === this._selectedGeometry ? ' active' : '')
      btn.textContent = type === 'cube' ? '立方体' : type === 'tetrahedron' ? '四面体' : '十二面体'
      btn.addEventListener('click', () => {
        this._selectedGeometry = type
        geoSelect.querySelectorAll('.geo-btn').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
      })
      geoSelect.appendChild(btn)
    })

    const textInput = document.createElement('input')
    textInput.className = 'text-input'
    textInput.type = 'text'
    textInput.placeholder = '输入文字 (最多10字符)'
    textInput.maxLength = 10
    textInput.value = 'HOLOGRAM'

    const buttons: { label: string; icon: string; type: ElementType }[] = [
      { label: '几何体', icon: '◆', type: 'geometry' },
      { label: '粒子群', icon: '✦', type: 'particles' },
      { label: '光束', icon: '↑', type: 'beam' },
      { label: '文字标签', icon: 'T', type: 'text' },
      { label: '星环', icon: '◎', type: 'ring' },
    ]

    buttons.forEach(({ label, icon, type }) => {
      const btn = document.createElement('button')
      btn.className = 'preset-btn'
      btn.innerHTML = `<span class="icon">${icon}</span>${label}`
      btn.addEventListener('mouseenter', () => {
        if (type === 'geometry') geoSelect.classList.add('show')
        if (type === 'text') textInput.classList.add('show')
      })
      btn.addEventListener('click', () => {
        if (type === 'geometry') {
          this._callbacks.onAddElement('geometry', { geometryType: this._selectedGeometry })
        } else if (type === 'text') {
          this._callbacks.onAddElement('text', { text: textInput.value || 'HOLOGRAM' })
        } else {
          this._callbacks.onAddElement(type)
        }
      })
      panel.appendChild(btn)
    })

    panel.appendChild(geoSelect)
    panel.appendChild(textInput)

    panel.addEventListener('mouseleave', () => {
      geoSelect.classList.remove('show')
      textInput.classList.remove('show')
    })

    this._container.appendChild(panel)
  }

  private _buildFlashOverlay() {
    const flash = document.createElement('div')
    flash.className = 'stage-flash'
    flash.id = 'stage-flash'
    this._container.appendChild(flash)
  }

  addElementControls(element: HoloElement) {
    const wrap = document.createElement('div')
    wrap.className = 'element-controls-wrap'
    wrap.dataset.id = element.id

    const controls = document.createElement('div')
    controls.className = 'element-controls'

    const rotateBtn = document.createElement('button')
    rotateBtn.className = 'mini-btn active'
    rotateBtn.title = '旋转开关'
    rotateBtn.textContent = '⟳'
    rotateBtn.addEventListener('click', () => {
      element.autoRotate = !element.autoRotate
      rotateBtn.classList.toggle('active', element.autoRotate)
      this._callbacks.onToggleRotate(element.id)
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'mini-btn danger'
    deleteBtn.title = '删除'
    deleteBtn.textContent = '✕'
    deleteBtn.addEventListener('click', () => {
      this._callbacks.onDeleteElement(element.id)
    })

    const colorSlider = document.createElement('input')
    colorSlider.className = 'color-slider'
    colorSlider.type = 'range'
    colorSlider.min = '0'
    colorSlider.max = '360'
    colorSlider.value = '200'
    colorSlider.addEventListener('input', (e) => {
      const hue = parseInt((e.target as HTMLInputElement).value)
      const color = `hsl(${hue}, 100%, 50%)`
      this._callbacks.onChangeColor(element.id, color)
    })

    controls.appendChild(rotateBtn)
    controls.appendChild(deleteBtn)
    controls.appendChild(colorSlider)
    wrap.appendChild(controls)
    this._controlsContainer.appendChild(wrap)
    this._controlMap.set(element.id, wrap)
  }

  removeElementControls(id: string) {
    const el = this._controlMap.get(id)
    if (el) {
      el.remove()
      this._controlMap.delete(id)
    }
  }

  updateElementControlPosition(id: string, x: number, y: number) {
    const el = this._controlMap.get(id)
    if (el) {
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      el.classList.add('visible')
    }
  }

  hideAllElementControls() {
    this._controlMap.forEach((el) => el.classList.remove('visible'))
  }

  setRecording(recording: boolean) {
    this._isRecording = recording
    if (recording) {
      this._recordBtn.classList.add('recording')
      this._recordBtn.textContent = '● 录制中...'
    } else {
      this._recordBtn.classList.remove('recording')
      this._recordBtn.textContent = '● 录制 GIF'
    }
  }

  get isRecording(): boolean {
    return this._isRecording
  }

  flashStage() {
    const flash = document.getElementById('stage-flash')
    if (flash) {
      flash.classList.remove('active')
      void flash.offsetWidth
      flash.classList.add('active')
      setTimeout(() => flash.classList.remove('active'), 1000)
    }
  }

  showDownloadModal(blobUrl: string) {
    const modal = document.createElement('div')
    modal.className = 'download-modal'
    modal.innerHTML = `
      <h3>✦ GIF 录制完成</h3>
      <a href="${blobUrl}" download="hologram-showcase.gif">⬇ 下载 GIF</a>
      <button class="close-btn">关闭</button>
    `
    const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement
    closeBtn.addEventListener('click', () => modal.remove())
    this._container.appendChild(modal)
  }
}
