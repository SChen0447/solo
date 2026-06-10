import * as THREE from 'three';
import { WaveParams, COLOR_THEMES } from './WaveManager';

interface UIManagerCallbacks {
  onParamsChange: (params: Partial<WaveParams>) => void;
  onThemeChange: (index: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrag: (deltaX: number, deltaY: number) => void;
  onWheel: (deltaY: number) => void;
  onClick: (worldPos: THREE.Vector3) => void;
}

export class UIManager {
  private container: HTMLElement;
  private callbacks: UIManagerCallbacks;
  private camera: THREE.PerspectiveCamera;
  
  private panel!: HTMLDivElement;
  private frequencySlider!: HTMLInputElement;
  private amplitudeSlider!: HTMLInputElement;
  private wavelengthSlider!: HTMLInputElement;
  private themeButtons: HTMLButtonElement[] = [];
  
  private cursorIndicator!: HTMLDivElement;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastUpdateTime = 0;
  private readonly updateInterval = 1000 / 60;
  
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private planeIntersect = new THREE.Vector3();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    callbacks: UIManagerCallbacks
  ) {
    this.container = container;
    this.camera = camera;
    this.callbacks = callbacks;
    
    this.createPanel();
    this.createCursorIndicator();
    this.bindEvents();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      position: absolute;
      left: 20px;
      bottom: 20px;
      background: rgba(10, 10, 26, 0.7);
      border: 1px solid #4466aa;
      border-radius: 12px;
      padding: 20px;
      color: #aaccff;
      font-family: 'Segoe UI', Tahoma, sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      user-select: none;
      z-index: 10;
      min-width: 260px;
      transition: transform 0.2s ease-out;
    `;
    
    const title = document.createElement('div');
    title.textContent = '量子波形控制台';
    title.style.cssText = `
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 16px;
      color: #88ccff;
      text-shadow: 0 0 10px rgba(136, 204, 255, 0.5);
      letter-spacing: 1px;
    `;
    this.panel.appendChild(title);
    
    this.frequencySlider = this.createSlider('频率', 0.5, 5.0, 0.1, 2.0);
    this.amplitudeSlider = this.createSlider('振幅', 0.2, 2.0, 0.1, 1.0);
    this.wavelengthSlider = this.createSlider('波长', 1.0, 4.0, 0.1, 2.5);
    
    this.createThemeButtons();
    
    const hint = document.createElement('div');
    hint.innerHTML = '拖拽: 频率/振幅 | 滚轮: 波长 | 点击: 冲击波<br>快捷键: Q/W/E 切换主题';
    hint.style.cssText = `
      margin-top: 16px;
      font-size: 11px;
      color: #6688bb;
      line-height: 1.6;
    `;
    this.panel.appendChild(hint);
    
    this.container.appendChild(this.panel);
  }

  private createSlider(label: string, min: number, max: number, step: number, value: number): HTMLInputElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'margin-bottom: 14px;';
    
    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 12px;
    `;
    
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.color = '#aaccff';
    
    const valueEl = document.createElement('span');
    valueEl.textContent = value.toFixed(1);
    valueEl.style.color = '#88ccff';
    valueEl.style.fontWeight = 'bold';
    valueEl.id = `value-${label}`;
    
    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);
    wrapper.appendChild(labelRow);
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: linear-gradient(90deg, #223366, #4466aa);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #88ccff;
        cursor: pointer;
        box-shadow: 0 0 10px #88ccff;
        transition: all 0.2s ease-out;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        width: 14px;
        height: 14px;
        box-shadow: 0 0 15px #88ccff;
        transform: scale(1.05);
      }
      input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #88ccff;
        cursor: pointer;
        box-shadow: 0 0 10px #88ccff;
        border: none;
        transition: all 0.2s ease-out;
      }
      input[type="range"]::-moz-range-thumb:hover {
        width: 14px;
        height: 14px;
        box-shadow: 0 0 15px #88ccff;
        transform: scale(1.05);
      }
      .theme-btn:hover {
        transform: scale(1.05) !important;
        filter: brightness(1.2) !important;
      }
      .theme-btn.active {
        animation: pulse 1.5s infinite !important;
      }
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 5px currentColor; }
        50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
      }
      #cursor-indicator {
        animation: cursorPulse 1s infinite;
      }
      @keyframes cursorPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        50% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
    
    wrapper.appendChild(slider);
    this.panel.appendChild(wrapper);
    
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(1);
      if (label === '频率') {
        this.callbacks.onParamsChange({ frequency: val });
      } else if (label === '振幅') {
        this.callbacks.onParamsChange({ amplitude: val });
      } else if (label === '波长') {
        this.callbacks.onParamsChange({ wavelength: val });
      }
    });
    
    return slider;
  }

  private createThemeButtons(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-top: 8px;
    `;
    
    const label = document.createElement('div');
    label.textContent = '颜色主题';
    label.style.cssText = `
      font-size: 12px;
      color: #aaccff;
      margin-bottom: 8px;
    `;
    wrapper.appendChild(label);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;
    
    const themeColors = [
      { bg: 'linear-gradient(135deg, #88ccff, #aa88ff, #ff88cc)', border: '#88ccff' },
      { bg: 'linear-gradient(135deg, #ff4422, #ff8844, #ffcc66)', border: '#ff4422' },
      { bg: 'linear-gradient(135deg, #00ff88, #00aaff, #ff00aa)', border: '#00ff88' }
    ];
    
    COLOR_THEMES.forEach((theme, index) => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn';
      btn.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 6px; background: ${themeColors[index].bg}; margin: 0 auto 4px;"></div>
        <div style="font-size: 10px;">${theme.name}</div>
      `;
      btn.style.cssText = `
        flex: 1;
        background: rgba(34, 51, 102, 0.5);
        border: 2px solid #334477;
        border-radius: 8px;
        color: #aaccff;
        cursor: pointer;
        padding: 8px 4px;
        font-family: inherit;
        transition: all 0.2s ease-out;
      `;
      
      if (index === 0) {
        btn.classList.add('active');
        btn.style.borderColor = themeColors[index].border;
      }
      
      btn.addEventListener('click', () => {
        this.setActiveTheme(index);
        this.callbacks.onThemeChange(index);
      });
      
      btnContainer.appendChild(btn);
      this.themeButtons.push(btn);
    });
    
    wrapper.appendChild(btnContainer);
    this.panel.appendChild(wrapper);
  }

  private createCursorIndicator(): void {
    this.cursorIndicator = document.createElement('div');
    this.cursorIndicator.id = 'cursor-indicator';
    this.cursorIndicator.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid #aaccff;
      border-radius: 50%;
      pointer-events: none;
      display: none;
      z-index: 100;
      box-shadow: 0 0 10px rgba(170, 204, 255, 0.5);
    `;
    this.container.appendChild(this.cursorIndicator);
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', (e) => {
      if (e.target !== this.container && (e.target as HTMLElement).closest('#' + this.panel.id)) {
        return;
      }
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.callbacks.onDragStart();
      
      this.cursorIndicator.style.display = 'block';
      this.cursorIndicator.style.left = e.clientX + 'px';
      this.cursorIndicator.style.top = e.clientY + 'px';
    });
    
    this.container.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const now = performance.now();
        if (now - this.lastUpdateTime >= this.updateInterval) {
          const deltaX = e.clientX - this.lastMouseX;
          const deltaY = e.clientY - this.lastMouseY;
          this.callbacks.onDrag(deltaX, deltaY);
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          this.lastUpdateTime = now;
        }
        
        this.cursorIndicator.style.left = e.clientX + 'px';
        this.cursorIndicator.style.top = e.clientY + 'px';
      }
    });
    
    this.container.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) {
          const worldPos = this.getWorldPosition(e.clientX, e.clientY);
          if (worldPos) {
            this.callbacks.onClick(worldPos);
          }
        }
      }
      this.isDragging = false;
      this.callbacks.onDragEnd();
      this.cursorIndicator.style.display = 'none';
    });
    
    this.container.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.callbacks.onDragEnd();
      this.cursorIndicator.style.display = 'none';
    });
    
    this.container.addEventListener('wheel', (e) => {
      if (e.target !== this.container && (e.target as HTMLElement).closest('#' + this.panel.id)) {
        return;
      }
      e.preventDefault();
      this.callbacks.onWheel(e.deltaY);
    }, { passive: false });
    
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'q') {
        this.setActiveTheme(0);
        this.callbacks.onThemeChange(0);
      } else if (key === 'w') {
        this.setActiveTheme(1);
        this.callbacks.onThemeChange(1);
      } else if (key === 'e') {
        this.setActiveTheme(2);
        this.callbacks.onThemeChange(2);
      }
    });
  }

  private getWorldPosition(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.container.getBoundingClientRect();
    this.mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    if (this.raycaster.ray.intersectPlane(this.groundPlane, this.planeIntersect)) {
      return this.planeIntersect.clone();
    }
    return null;
  }

  public setActiveTheme(index: number): void {
    const themeColors = ['#88ccff', '#ff4422', '#00ff88'];
    this.themeButtons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('active');
        btn.style.borderColor = themeColors[i];
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = '#334477';
      }
    });
  }

  public updateSliders(params: WaveParams): void {
    this.frequencySlider.value = params.frequency.toString();
    this.amplitudeSlider.value = params.amplitude.toString();
    this.wavelengthSlider.value = params.wavelength.toString();
    
    const freqVal = document.getElementById('value-频率');
    const ampVal = document.getElementById('value-振幅');
    const waveVal = document.getElementById('value-波长');
    if (freqVal) freqVal.textContent = params.frequency.toFixed(1);
    if (ampVal) ampVal.textContent = params.amplitude.toFixed(1);
    if (waveVal) waveVal.textContent = params.wavelength.toFixed(1);
  }

  public dispose(): void {
    this.container.removeChild(this.panel);
    this.container.removeChild(this.cursorIndicator);
  }
}
