import { ParticleInfo } from './CloudParticleSystem';

export interface ControlPanelCallbacks {
  onDensityChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onColorChange: (hex: string) => void;
  onFlowSpeedChange: (value: number) => void;
  onResetCamera: () => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private callbacks: ControlPanelCallbacks;

  private densitySlider: HTMLInputElement;
  private heightSlider: HTMLInputElement;
  private colorPicker: HTMLInputElement;
  private flowSpeedSlider: HTMLInputElement;
  private particleInfoDiv: HTMLDivElement;

  private isDragging: boolean = false;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createPanel();
    document.body.appendChild(this.container);

    this.densitySlider = this.createSlider(0.1, 1.0, 0.1, 0.5, '密度', (v) => callbacks.onDensityChange(v));
    this.heightSlider = this.createSlider(0, 20, 0.5, 10, '高度', (v) => callbacks.onHeightChange(v));
    this.colorPicker = this.createColorPicker();
    this.flowSpeedSlider = this.createSlider(0, 5, 0.1, 1.0, '流动速度', (v) => callbacks.onFlowSpeedChange(v));

    const resetBtn = this.createResetButton();

    this.particleInfoDiv = this.createParticleInfo();

    const contentDiv = this.container.querySelector('.panel-content') as HTMLDivElement;
    contentDiv.appendChild(this.createSliderWrapper(this.densitySlider, '密度'));
    contentDiv.appendChild(this.createSliderWrapper(this.heightSlider, '高度'));
    contentDiv.appendChild(this.createColorPickerWrapper(this.colorPicker));
    contentDiv.appendChild(this.createSliderWrapper(this.flowSpeedSlider, '流动速度'));
    contentDiv.appendChild(resetBtn);
    contentDiv.appendChild(this.particleInfoDiv);

    this.setupDragging();
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 280px;
      background: rgba(26, 26, 46, 0.85);
      border-radius: 12px;
      padding: 20px;
      color: #ffffff;
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      user-select: none;
    `;
    panel.className = 'control-panel';

    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: move;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    header.innerHTML = `<span style="width: 12px; height: 12px; background: #f59e0b; border-radius: 3px; display: inline-block;"></span>控制面板`;
    header.className = 'panel-header';

    const content = document.createElement('div');
    content.className = 'panel-content';

    panel.appendChild(header);
    panel.appendChild(content);

    return panel;
  }

  private createSliderWrapper(slider: HTMLInputElement, label: string): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
    `;

    const valueSpan = slider.parentElement?.querySelector('.slider-value') as HTMLSpanElement;
    labelDiv.innerHTML = `<span>${label}</span>`;
    if (valueSpan) {
      labelDiv.appendChild(valueSpan);
    }

    wrapper.appendChild(labelDiv);
    wrapper.appendChild(slider);

    return wrapper;
  }

  private createSlider(min: number, max: number, step: number, value: number, label: string, onChange: (v: number) => void): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
      cursor: pointer;
      -webkit-appearance: none;
      appearance: none;
    `;

    const styleTag = document.createElement('style');
    styleTag.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #f59e0b;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #f59e0b;
        cursor: pointer;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(styleTag);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.style.cssText = `
      color: #f59e0b;
      font-weight: 500;
      font-size: 13px;
    `;
    valueSpan.textContent = value.toFixed(1);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueSpan.textContent = v.toFixed(1);
      onChange(v);
    });

    const tempWrapper = document.createElement('div');
    tempWrapper.style.display = 'none';
    tempWrapper.appendChild(valueSpan);
    document.body.appendChild(tempWrapper);

    return slider;
  }

  private createColorPickerWrapper(picker: HTMLInputElement): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.marginBottom = '16px';

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
    `;
    labelDiv.innerHTML = `<span>颜色</span>`;

    const pickerWrapper = document.createElement('div');
    pickerWrapper.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      cursor: pointer;
    `;

    const colorPreview = document.createElement('div');
    colorPreview.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #ffffff;
      border: 2px solid rgba(255, 255, 255, 0.3);
    `;

    const colorValue = document.createElement('span');
    colorValue.style.cssText = `
      font-size: 13px;
      font-family: monospace;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
    `;
    colorValue.textContent = '#FFFFFF';

    picker.addEventListener('input', () => {
      colorPreview.style.background = picker.value;
      colorValue.textContent = picker.value.toUpperCase();
    });

    pickerWrapper.appendChild(colorPreview);
    pickerWrapper.appendChild(picker);
    pickerWrapper.appendChild(colorValue);

    pickerWrapper.addEventListener('click', () => {
      picker.click();
    });

    wrapper.appendChild(labelDiv);
    wrapper.appendChild(pickerWrapper);

    return wrapper;
  }

  private createColorPicker(): HTMLInputElement {
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = '#ffffff';
    picker.style.cssText = `
      position: absolute;
      opacity: 0;
      pointer-events: none;
      width: 0;
      height: 0;
    `;

    picker.addEventListener('input', () => {
      this.callbacks.onColorChange(picker.value);
    });

    return picker;
  }

  private createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '重置视角';
    btn.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: #f59e0b;
      color: #1a1a2e;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#fbbf24';
      btn.style.transform = 'translateY(-1px)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#f59e0b';
      btn.style.transform = 'translateY(0)';
    });

    btn.addEventListener('click', () => {
      this.callbacks.onResetCamera();
    });

    return btn;
  }

  private createParticleInfo(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      margin-top: 20px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.8;
      display: none;
      border-left: 3px solid #ff6b6b;
    `;
    div.className = 'particle-info';

    div.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #ff6b6b;">选中粒子信息</div>
      <div>X: <span class="info-x" style="color: #60a5fa;">-</span></div>
      <div>Y: <span class="info-y" style="color: #60a5fa;">-</span></div>
      <div>Z: <span class="info-z" style="color: #60a5fa;">-</span></div>
      <div style="margin-top: 6px;">颜色: <span class="info-color" style="color: #60a5fa; font-family: monospace;">-</span></div>
    `;

    return div;
  }

  public updateParticleInfo(info: ParticleInfo | null): void {
    if (!info) {
      this.particleInfoDiv.style.display = 'none';
      return;
    }

    this.particleInfoDiv.style.display = 'block';
    const xEl = this.particleInfoDiv.querySelector('.info-x') as HTMLSpanElement;
    const yEl = this.particleInfoDiv.querySelector('.info-y') as HTMLSpanElement;
    const zEl = this.particleInfoDiv.querySelector('.info-z') as HTMLSpanElement;
    const colorEl = this.particleInfoDiv.querySelector('.info-color') as HTMLSpanElement;

    if (xEl) xEl.textContent = info.position.x.toFixed(2);
    if (yEl) yEl.textContent = info.position.y.toFixed(2);
    if (zEl) zEl.textContent = info.position.z.toFixed(2);
    if (colorEl) {
      colorEl.textContent = `rgba(${info.color.r}, ${info.color.g}, ${info.color.b}, ${info.color.a})`;
    }
  }

  private setupDragging(): void {
    const header = this.container.querySelector('.panel-header') as HTMLDivElement;

    header.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDragging = true;
      const rect = this.container.getBoundingClientRect();
      this.dragOffsetX = e.clientX - rect.left;
      this.dragOffsetY = e.clientY - rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;

      const newLeft = e.clientX - this.dragOffsetX;
      const newTop = e.clientY - this.dragOffsetY;

      const maxLeft = window.innerWidth - this.container.offsetWidth;
      const maxTop = window.innerHeight - this.container.offsetHeight;

      this.container.style.left = `${Math.max(0, Math.min(newLeft, maxLeft))}px`;
      this.container.style.top = `${Math.max(0, Math.min(newTop, maxTop))}px`;
      this.container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
      header.style.cursor = 'move';
    });
  }
}
