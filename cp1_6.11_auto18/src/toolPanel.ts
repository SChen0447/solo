import * as THREE from 'three';
import { ColorManager } from './colorManager';

export interface ToolPanelEvents {
  onStrengthChange: (value: number) => void;
  onBrushRadiusChange: (value: number) => void;
  onSymmetricToggle: (enabled: boolean) => void;
  onReset: () => void;
  onColorSelect: (color: THREE.Color) => void;
  onToolModeChange: (mode: ToolMode) => void;
}

export type ToolMode = 'sculpt' | 'paint';

export class ToolPanel {
  private container: HTMLElement;
  private events: ToolPanelEvents;
  private colorManager: ColorManager;
  private strengthValue: number = 0.5;
  private brushRadiusValue: number = 0.25;
  private symmetricEnabled: boolean = false;
  private currentMode: ToolMode = 'sculpt';
  private toolLabel: HTMLElement;
  private toolValue: HTMLElement;
  private symmetricToggle: HTMLButtonElement;
  private strengthSlider: HTMLInputElement;
  private brushSlider: HTMLInputElement;
  private modeButtons: { sculpt: HTMLButtonElement; paint: HTMLButtonElement };

  constructor(parent: HTMLElement, events: ToolPanelEvents, colorManager: ColorManager) {
    this.events = events;
    this.colorManager = colorManager;
    this.container = document.createElement('div');
    this.container.className = 'tool-panel';
    
    this.toolLabel = document.createElement('div');
    this.toolValue = document.createElement('div');
    this.symmetricToggle = document.createElement('button');
    this.strengthSlider = document.createElement('input');
    this.brushSlider = document.createElement('input');
    this.modeButtons = { sculpt: document.createElement('button'), paint: document.createElement('button') };

    this.createPanel();
    parent.appendChild(this.container);
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  private createPanel(): void {
    this.container.innerHTML = '';
    
    const style = document.createElement('style');
    style.textContent = `
      .tool-panel {
        width: 260px;
        min-width: 260px;
        height: 100%;
        background: rgba(20, 28, 40, 0.75);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-right: 1px solid rgba(100, 150, 200, 0.15);
        display: flex;
        flex-direction: column;
        padding: 20px 16px;
        gap: 20px;
        overflow-y: auto;
        z-index: 10;
        box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3);
      }

      .tool-panel::-webkit-scrollbar {
        width: 4px;
      }
      .tool-panel::-webkit-scrollbar-track {
        background: transparent;
      }
      .tool-panel::-webkit-scrollbar-thumb {
        background: rgba(100, 150, 200, 0.3);
        border-radius: 2px;
      }

      .panel-title {
        font-size: 18px;
        font-weight: 600;
        color: #b8c4d4;
        letter-spacing: 1px;
        margin-bottom: 4px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }

      .panel-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .section-label {
        font-size: 12px;
        color: #7a8a9e;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 2px;
      }

      .mode-toggle {
        display: flex;
        background: rgba(30, 42, 58, 0.8);
        border-radius: 8px;
        padding: 3px;
        gap: 3px;
      }

      .mode-btn {
        flex: 1;
        padding: 10px 8px;
        border: none;
        background: transparent;
        color: #7a8a9e;
        font-size: 13px;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }

      .mode-btn.active {
        background: linear-gradient(135deg, rgba(100, 160, 220, 0.3), rgba(80, 140, 200, 0.2));
        color: #c8d8e8;
        box-shadow: 0 2px 8px rgba(80, 140, 200, 0.2);
      }

      .mode-btn:hover:not(.active) {
        color: #a0b4c8;
        background: rgba(60, 80, 100, 0.3);
      }

      .slider-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .slider-label {
        font-size: 13px;
        color: #90a0b4;
      }

      .slider-value {
        font-size: 13px;
        font-weight: 600;
        color: #80b0d8;
        min-width: 40px;
        text-align: right;
        transition: transform 0.15s ease;
      }

      .slider-value.bump {
        transform: scale(1.3);
        color: #a0d0f0;
      }

      .slider-input {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(50, 65, 85, 0.8);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }

      .slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #6090c0, #4070a0);
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(80, 140, 200, 0.4);
        transition: transform 0.15s ease;
      }

      .slider-input::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      .slider-input::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: linear-gradient(135deg, #6090c0, #4070a0);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(80, 140, 200, 0.4);
      }

      .toggle-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        background: rgba(30, 42, 58, 0.8);
        border: 1px solid rgba(80, 120, 160, 0.2);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .toggle-btn:hover {
        background: rgba(40, 56, 76, 0.8);
        border-color: rgba(100, 150, 200, 0.3);
      }

      .toggle-btn.active {
        background: linear-gradient(135deg, rgba(100, 160, 220, 0.25), rgba(80, 140, 200, 0.15));
        border-color: rgba(100, 180, 240, 0.4);
      }

      .toggle-label {
        font-size: 13px;
        color: #a0b4c8;
      }

      .toggle-icon {
        width: 36px;
        height: 20px;
        background: rgba(60, 80, 100, 0.6);
        border-radius: 10px;
        position: relative;
        transition: background 0.3s ease;
      }

      .toggle-icon::after {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        background: #8899aa;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: all 0.3s ease;
      }

      .toggle-btn.active .toggle-icon {
        background: rgba(80, 160, 220, 0.5);
      }

      .toggle-btn.active .toggle-icon::after {
        left: 18px;
        background: #a0d0f0;
        box-shadow: 0 0 8px rgba(120, 200, 255, 0.5);
      }

      .action-btn {
        width: 100%;
        padding: 12px 16px;
        background: linear-gradient(135deg, rgba(100, 160, 220, 0.2), rgba(80, 140, 200, 0.1));
        border: 1px solid rgba(100, 160, 220, 0.3);
        border-radius: 8px;
        color: #b0c8e0;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }

      .action-btn:hover {
        background: linear-gradient(135deg, rgba(100, 160, 220, 0.3), rgba(80, 140, 200, 0.2));
        border-color: rgba(120, 180, 240, 0.4);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(80, 140, 200, 0.2);
      }

      .action-btn:active {
        transform: translateY(0);
      }

      .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(150, 200, 255, 0.4);
        transform: scale(0);
        animation: ripple-effect 0.6s ease-out;
        pointer-events: none;
      }

      @keyframes ripple-effect {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      .color-wheel {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        padding: 10px;
        background: rgba(30, 42, 58, 0.6);
        border-radius: 10px;
      }

      .color-swatch {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 6px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all 0.2s ease;
        position: relative;
      }

      .color-swatch:hover {
        transform: scale(1.1);
        border-color: rgba(200, 220, 255, 0.5);
      }

      .color-swatch.selected {
        border-color: #fff;
        box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      .color-swatch::after {
        content: attr(data-name);
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: #8a9aaf;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      }

      .color-swatch:hover::after {
        opacity: 1;
      }

      .viewport-info {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 20px;
        background: rgba(20, 28, 40, 0.6);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(100, 150, 200, 0.2);
        z-index: 5;
        pointer-events: none;
      }

      .tool-name {
        font-size: 14px;
        font-weight: 500;
        color: #a0c0e0;
        opacity: 1;
        transition: opacity 0.3s ease;
      }

      .tool-name.fade {
        opacity: 0;
      }

      .tool-intensity {
        font-size: 14px;
        color: #7a8a9e;
        opacity: 1;
        transition: opacity 0.3s ease;
      }

      .tool-intensity.fade {
        opacity: 0;
      }

      .intensity-value {
        color: #80b0d8;
        font-weight: 600;
      }

      .symmetric-hint {
        position: absolute;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 16px;
        background: rgba(80, 160, 220, 0.2);
        border: 1px solid rgba(100, 180, 240, 0.3);
        border-radius: 12px;
        color: #80c0e8;
        font-size: 12px;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 5;
        pointer-events: none;
      }

      .symmetric-hint.show {
        opacity: 1;
      }

      .divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(100, 150, 200, 0.2), transparent);
        margin: 4px 0;
      }

      @media (max-width: 1024px) {
        .tool-panel {
          width: 220px;
          min-width: 220px;
          padding: 16px 12px;
        }
        .color-wheel {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `;
    this.container.appendChild(style);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '雕塑工坊';
    this.container.appendChild(title);

    this.createModeToggle();
    this.createDivider();
    this.createSliders();
    this.createDivider();
    this.createSymmetricToggle();
    this.createDivider();
    this.createColorWheel();
    this.createDivider();
    this.createResetButton();
    this.createViewportInfo();
  }

  private createModeToggle(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';
    
    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = '工具模式';
    section.appendChild(label);

    const toggle = document.createElement('div');
    toggle.className = 'mode-toggle';

    this.modeButtons.sculpt = document.createElement('button');
    this.modeButtons.sculpt.className = 'mode-btn active';
    this.modeButtons.sculpt.textContent = '雕刻';
    this.modeButtons.sculpt.addEventListener('click', () => this.setMode('sculpt'));
    toggle.appendChild(this.modeButtons.sculpt);

    this.modeButtons.paint = document.createElement('button');
    this.modeButtons.paint.className = 'mode-btn';
    this.modeButtons.paint.textContent = '着色';
    this.modeButtons.paint.addEventListener('click', () => this.setMode('paint'));
    toggle.appendChild(this.modeButtons.paint);

    section.appendChild(toggle);
    this.container.appendChild(section);
  }

  private createSliders(): void {
    const strengthSection = this.createSlider(
      '推拉强度',
      0.1,
      1.0,
      this.strengthValue,
      0.1,
      (value) => {
        this.strengthValue = value;
        this.events.onStrengthChange(value);
      }
    );
    this.container.appendChild(strengthSection.container);
    this.strengthSlider = strengthSection.slider;

    const radiusSection = this.createSlider(
      '笔刷半径',
      0.1,
      0.5,
      this.brushRadiusValue,
      0.01,
      (value) => {
        this.brushRadiusValue = value;
        this.events.onBrushRadiusChange(value);
      }
    );
    this.container.appendChild(radiusSection.container);
    this.brushSlider = radiusSection.slider;
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    step: number,
    onChange: (value: number) => void
  ): { container: HTMLElement; slider: HTMLInputElement } {
    const container = document.createElement('div');
    container.className = 'slider-container';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'slider-label';
    labelEl.textContent = label;
    header.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'slider-value';
    valueEl.textContent = value.toFixed(2);
    header.appendChild(valueEl);

    container.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider-input';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.value = value.toString();
    slider.step = step.toString();

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueEl.textContent = val.toFixed(2);
      onChange(val);

      valueEl.classList.remove('bump');
      void valueEl.offsetWidth;
      valueEl.classList.add('bump');
    });

    slider.addEventListener('mouseup', () => {
      setTimeout(() => {
        valueEl.classList.remove('bump');
      }, 150);
    });

    container.appendChild(slider);

    return { container, slider };
  }

  private createSymmetricToggle(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';
    
    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = '对称模式';
    section.appendChild(label);

    this.symmetricToggle = document.createElement('button');
    this.symmetricToggle.className = 'toggle-btn';
    this.symmetricToggle.innerHTML = `
      <span class="toggle-label">左右对称雕刻</span>
      <span class="toggle-icon"></span>
    `;
    
    this.symmetricToggle.addEventListener('click', (e) => {
      this.addRipple(e);
      this.symmetricEnabled = !this.symmetricEnabled;
      this.symmetricToggle.classList.toggle('active', this.symmetricEnabled);
      this.events.onSymmetricToggle(this.symmetricEnabled);
      this.showSymmetricHint();
    });

    section.appendChild(this.symmetricToggle);
    this.container.appendChild(section);
  }

  private createColorWheel(): void {
    const section = document.createElement('div');
    section.className = 'panel-section';
    
    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = '色彩调色盘';
    section.appendChild(label);

    const wheel = document.createElement('div');
    wheel.className = 'color-wheel';

    const presets = this.colorManager.getPresets();
    presets.forEach((preset, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.dataset.name = preset.name;
      swatch.style.background = `rgb(${Math.floor(preset.color.r * 255)}, ${Math.floor(preset.color.g * 255)}, ${Math.floor(preset.color.b * 255)})`;
      
      if (index === 0) {
        swatch.classList.add('selected');
      }

      swatch.addEventListener('click', () => {
        wheel.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        this.events.onColorSelect(preset.color);
      });

      wheel.appendChild(swatch);
    });

    section.appendChild(wheel);
    section.style.paddingBottom = '20px';
    this.container.appendChild(section);
  }

  private createResetButton(): void {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.textContent = '重置为初始球体';
    
    btn.addEventListener('click', (e) => {
      this.addRipple(e);
      this.events.onReset();
    });

    this.container.appendChild(btn);
  }

  private createViewportInfo(): void {
    const viewportContainer = this.container.parentElement;
    if (!viewportContainer) return;

    const info = document.createElement('div');
    info.className = 'viewport-info';
    info.style.left = 'calc(50% + 130px)';

    this.toolLabel = document.createElement('span');
    this.toolLabel.className = 'tool-name';
    this.toolLabel.textContent = '雕刻工具';
    info.appendChild(this.toolLabel);

    const separator = document.createElement('span');
    separator.style.color = '#4a5568';
    separator.textContent = '|';
    info.appendChild(separator);

    this.toolValue = document.createElement('span');
    this.toolValue.className = 'tool-intensity';
    this.toolValue.innerHTML = '强度: <span class="intensity-value">0.50</span>';
    info.appendChild(this.toolValue);

    setTimeout(() => {
      const app = document.getElementById('app');
      if (app) {
        const viewport = app.querySelector('.viewport-container');
        if (viewport) {
          viewport.appendChild(info);
        } else {
          app.appendChild(info);
        }
      }
    }, 0);

    const hint = document.createElement('div');
    hint.className = 'symmetric-hint';
    hint.id = 'symmetric-hint';
    hint.textContent = '对称模式已开启';
    hint.style.left = 'calc(50% + 130px)';
    
    setTimeout(() => {
      const app = document.getElementById('app');
      if (app) {
        const viewport = app.querySelector('.viewport-container');
        if (viewport) {
          viewport.appendChild(hint);
        }
      }
    }, 0);
  }

  private showSymmetricHint(): void {
    const hint = document.getElementById('symmetric-hint');
    if (!hint) return;

    hint.textContent = this.symmetricEnabled ? '对称模式已开启' : '对称模式已关闭';
    hint.classList.add('show');
    
    setTimeout(() => {
      hint.classList.remove('show');
    }, 1500);
  }

  private setMode(mode: ToolMode): void {
    if (this.currentMode === mode) return;
    
    this.currentMode = mode;
    
    this.modeButtons.sculpt.classList.toggle('active', mode === 'sculpt');
    this.modeButtons.paint.classList.toggle('active', mode === 'paint');

    this.toolLabel.classList.add('fade');
    this.toolValue.classList.add('fade');
    
    setTimeout(() => {
      this.toolLabel.textContent = mode === 'sculpt' ? '雕刻工具' : '着色工具';
      const value = mode === 'sculpt' ? this.strengthValue.toFixed(2) : this.brushRadiusValue.toFixed(2);
      const label = mode === 'sculpt' ? '强度' : '半径';
      this.toolValue.innerHTML = `${label}: <span class="intensity-value">${value}</span>`;
      
      this.toolLabel.classList.remove('fade');
      this.toolValue.classList.remove('fade');
    }, 300);

    this.events.onToolModeChange(mode);
  }

  private addRipple(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    
    target.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  private createDivider(): void {
    const divider = document.createElement('div');
    divider.className = 'divider';
    this.container.appendChild(divider);
  }

  public updateIntensityDisplay(value: number): void {
    const intensityEl = this.toolValue.querySelector('.intensity-value');
    if (intensityEl) {
      intensityEl.textContent = value.toFixed(2);
    }
  }

  public getMode(): ToolMode {
    return this.currentMode;
  }
}
