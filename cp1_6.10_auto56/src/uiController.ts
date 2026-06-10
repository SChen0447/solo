import { WaveSource, WaveformType } from './waveSource';
import { InterferenceGrid, DisplayMode } from './interferenceGrid';
import { ProbeManager } from './probeManager';

export interface UIState {
  frequency: number;
  amplitude: number;
  waveform: WaveformType;
  displayMode: DisplayMode;
  showSourceLabels: boolean;
  showMeasurementPoints: boolean;
  showInterferenceGrid: boolean;
}

type UICallback = (state: UIState) => void;

export class UIController {
  private container: HTMLElement;
  private sources: WaveSource[];
  private interferenceGrid: InterferenceGrid;
  private probeManager: ProbeManager;
  private state: UIState;
  private onStateChange: UICallback;

  private panel: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private isPanelOpen = true;

  constructor(
    container: HTMLElement,
    sources: WaveSource[],
    interferenceGrid: InterferenceGrid,
    probeManager: ProbeManager,
    initialState: UIState,
    onStateChange: UICallback
  ) {
    this.container = container;
    this.sources = sources;
    this.interferenceGrid = interferenceGrid;
    this.probeManager = probeManager;
    this.state = { ...initialState };
    this.onStateChange = onStateChange;

    this.panel = document.createElement('div');
    this.toggleBtn = document.createElement('button');

    this.createPanel();
    this.setupResponsive();
  }

  private createPanel(): void {
    this.panel.className = 'control-panel';
    this.panel.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      width: 280px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      background: rgba(15, 20, 45, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(80, 140, 255, 0.4);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 0 20px rgba(80, 140, 255, 0.15);
      z-index: 10;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
      color: #e0e8ff;
    `;

    const title = document.createElement('div');
    title.textContent = '声波干涉控制面板';
    title.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #a0c0ff;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(80, 140, 255, 0.3);
      letter-spacing: 0.5px;
    `;
    this.panel.appendChild(title);

    this.createFrequencySlider();
    this.createAmplitudeSlider();
    this.createWaveformSelect();
    this.createDisplayModeSelect();
    this.createDisplayOptions();
    this.createHelpText();

    this.createToggleButton();
    this.container.appendChild(this.panel);
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    suffix: string,
    onChange: (v: number) => void
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 14px;
      padding: 10px;
      border-radius: 6px;
      transition: box-shadow 0.2s, border-color 0.2s;
      border: 1px solid transparent;
    `;

    wrapper.addEventListener('mouseenter', () => {
      wrapper.style.boxShadow = '0 0 8px rgba(80, 140, 255, 0.4)';
      wrapper.style.borderColor = 'rgba(80, 140, 255, 0.6)';
    });
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.boxShadow = 'none';
      wrapper.style.borderColor = 'transparent';
    });

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
    `;

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.color = '#b8c8e8';

    const valueSpan = document.createElement('span');
    valueSpan.textContent = `${value}${suffix}`;
    valueSpan.style.cssText = `
      color: #60a0ff;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    `;

    labelRow.appendChild(labelSpan);
    labelRow.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(40, 60, 120, 0.8);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #60a0ff 0%, #3060cc 100%);
        cursor: pointer;
        border: 2px solid rgba(150, 190, 255, 0.8);
        box-shadow: 0 0 6px rgba(80, 140, 255, 0.6);
        transition: transform 0.15s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #60a0ff 0%, #3060cc 100%);
        cursor: pointer;
        border: 2px solid rgba(150, 190, 255, 0.8);
        box-shadow: 0 0 6px rgba(80, 140, 255, 0.6);
      }
    `;
    wrapper.appendChild(styleEl);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      valueSpan.textContent = `${v}${suffix}`;
      onChange(v);
    });

    wrapper.appendChild(labelRow);
    wrapper.appendChild(slider);
    this.panel.appendChild(wrapper);
  }

  private createFrequencySlider(): void {
    this.createSlider('声源频率', this.state.frequency, 100, 1000, 10, ' Hz', (v) => {
      this.state.frequency = v;
      this.sources.forEach(s => { s.frequency = v; });
      this.onStateChange(this.state);
    });
  }

  private createAmplitudeSlider(): void {
    this.createSlider('波幅强度', this.state.amplitude, 0.1, 2.0, 0.1, '', (v) => {
      this.state.amplitude = v;
      this.sources.forEach(s => { s.amplitude = v; });
      this.onStateChange(this.state);
    });
  }

  private createDropdown(
    label: string,
    options: { value: string; label: string }[],
    currentValue: string,
    onChange: (v: string) => void
  ): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 14px;
      padding: 10px;
      border-radius: 6px;
      transition: box-shadow 0.2s, border-color 0.2s;
      border: 1px solid transparent;
    `;

    wrapper.addEventListener('mouseenter', () => {
      wrapper.style.boxShadow = '0 0 8px rgba(80, 140, 255, 0.4)';
      wrapper.style.borderColor = 'rgba(80, 140, 255, 0.6)';
    });
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.boxShadow = 'none';
      wrapper.style.borderColor = 'transparent';
    });

    const labelSpan = document.createElement('div');
    labelSpan.textContent = label;
    labelSpan.style.cssText = `
      font-size: 12px;
      color: #b8c8e8;
      margin-bottom: 8px;
    `;

    const select = document.createElement('select');
    select.style.cssText = `
      width: 100%;
      padding: 8px 10px;
      background: rgba(25, 35, 70, 0.9);
      border: 1px solid rgba(80, 140, 255, 0.4);
      border-radius: 6px;
      color: #e0e8ff;
      font-size: 12px;
      cursor: pointer;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    `;

    select.addEventListener('focus', () => {
      select.style.borderColor = 'rgba(80, 140, 255, 0.8)';
      select.style.boxShadow = '0 0 8px rgba(80, 140, 255, 0.4)';
    });
    select.addEventListener('blur', () => {
      select.style.borderColor = 'rgba(80, 140, 255, 0.4)';
      select.style.boxShadow = 'none';
    });

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.style.background = 'rgba(25, 35, 70, 1)';
      if (opt.value === currentValue) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', () => onChange(select.value));

    wrapper.appendChild(labelSpan);
    wrapper.appendChild(select);
    this.panel.appendChild(wrapper);
  }

  private createWaveformSelect(): void {
    this.createDropdown(
      '波形类型',
      [
        { value: 'sine', label: '正弦波' },
        { value: 'square', label: '方波' },
        { value: 'sawtooth', label: '锯齿波' }
      ],
      this.state.waveform,
      (v) => {
        this.state.waveform = v as WaveformType;
        this.sources.forEach(s => { s.waveform = v as WaveformType; });
        this.onStateChange(this.state);
      }
    );
  }

  private createDisplayModeSelect(): void {
    this.createDropdown(
      '显示模式',
      [
        { value: 'amplitude', label: '波峰波谷' },
        { value: 'energy', label: '能量密度' },
        { value: 'phase', label: '相位分布' }
      ],
      this.state.displayMode,
      (v) => {
        this.state.displayMode = v as DisplayMode;
        this.interferenceGrid.setDisplayMode(v as DisplayMode);
        this.onStateChange(this.state);
      }
    );
  }

  private createCheckbox(
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void
  ): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    `;

    const customCheckbox = document.createElement('div');
    customCheckbox.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 2px solid rgba(80, 140, 255, 0.6);
      background: ${checked ? 'linear-gradient(135deg, #60a0ff, #3060cc)' : 'rgba(25, 35, 70, 0.9)'};
      margin-right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      position: relative;
    `;

    if (checked) {
      customCheckbox.innerHTML = '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.cssText = `
      font-size: 12px;
      color: #c0d0f0;
      user-select: none;
    `;

    wrapper.appendChild(customCheckbox);
    wrapper.appendChild(labelSpan);

    const toggle = () => {
      const newVal = !checked;
      checked = newVal;
      customCheckbox.style.background = newVal
        ? 'linear-gradient(135deg, #60a0ff, #3060cc)'
        : 'rgba(25, 35, 70, 0.9)';
      customCheckbox.innerHTML = newVal
        ? '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '';
      onChange(newVal);
    };

    wrapper.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });

    return wrapper;
  }

  private createDisplayOptions(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      margin-bottom: 14px;
      padding: 10px;
      border-radius: 6px;
      transition: box-shadow 0.2s, border-color 0.2s;
      border: 1px solid transparent;
    `;

    wrapper.addEventListener('mouseenter', () => {
      wrapper.style.boxShadow = '0 0 8px rgba(80, 140, 255, 0.4)';
      wrapper.style.borderColor = 'rgba(80, 140, 255, 0.6)';
    });
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.boxShadow = 'none';
      wrapper.style.borderColor = 'transparent';
    });

    const title = document.createElement('div');
    title.textContent = '显示选项';
    title.style.cssText = `
      font-size: 12px;
      color: #b8c8e8;
      margin-bottom: 10px;
    `;
    wrapper.appendChild(title);

    wrapper.appendChild(this.createCheckbox('显示声源位置标签', this.state.showSourceLabels, (v) => {
      this.state.showSourceLabels = v;
      this.sources.forEach(s => { s.showLabels = v; });
      this.onStateChange(this.state);
    }));

    wrapper.appendChild(this.createCheckbox('显示振幅测量点', this.state.showMeasurementPoints, (v) => {
      this.state.showMeasurementPoints = v;
      this.probeManager.setShowMeasurementPoints(v);
      this.onStateChange(this.state);
    }));

    wrapper.appendChild(this.createCheckbox('显示干涉条纹网格', this.state.showInterferenceGrid, (v) => {
      this.state.showInterferenceGrid = v;
      this.interferenceGrid.setVisible(v);
      this.interferenceGrid.setShowGrid(v);
      this.onStateChange(this.state);
    }));

    this.panel.appendChild(wrapper);
  }

  private createHelpText(): void {
    const help = document.createElement('div');
    help.style.cssText = `
      font-size: 11px;
      color: rgba(150, 170, 220, 0.7);
      line-height: 1.6;
      padding: 10px;
      background: rgba(20, 30, 60, 0.5);
      border-radius: 6px;
      margin-top: 8px;
    `;
    help.innerHTML = `
      <strong style="color: #80a0dd;">操作提示：</strong><br>
      • 拖拽彩色圆球移动声源<br>
      • 单击场景放置麦克风探针<br>
      • 双击探针可删除<br>
      • 鼠标左键拖拽旋转视角<br>
      • 滚轮缩放场景
    `;
    this.panel.appendChild(help);
  }

  private createToggleButton(): void {
    this.toggleBtn.textContent = '☰';
    this.toggleBtn.style.cssText = `
      position: absolute;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      background: rgba(15, 20, 45, 0.8);
      border: 1px solid rgba(80, 140, 255, 0.5);
      border-radius: 8px;
      color: #a0c0ff;
      font-size: 18px;
      cursor: pointer;
      display: none;
      z-index: 11;
      box-shadow: 0 0 10px rgba(80, 140, 255, 0.3);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;
    this.toggleBtn.addEventListener('click', () => {
      this.togglePanel();
      this.toggleBtn.style.transform = 'scale(0.9)';
      setTimeout(() => { this.toggleBtn.style.transform = 'scale(1)'; }, 200);
    });
    this.container.appendChild(this.toggleBtn);
  }

  private togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (window.innerWidth < 768) {
      if (this.isPanelOpen) {
        this.panel.style.transform = 'translateY(0)';
        this.panel.style.opacity = '1';
      } else {
        this.panel.style.transform = 'translateY(100%)';
        this.panel.style.opacity = '0';
      }
    } else {
      this.panel.style.display = this.isPanelOpen ? 'block' : 'none';
    }
  }

  private setupResponsive(): void {
    const applyLayout = () => {
      if (window.innerWidth < 768) {
        this.toggleBtn.style.display = 'block';
        this.panel.style.top = 'auto';
        this.panel.style.right = '0';
        this.panel.style.bottom = '0';
        this.panel.style.left = '0';
        this.panel.style.width = '100%';
        this.panel.style.maxHeight = '50vh';
        this.panel.style.borderRadius = '8px 8px 0 0';
        this.panel.style.transform = this.isPanelOpen ? 'translateY(0)' : 'translateY(100%)';
      } else {
        this.toggleBtn.style.display = 'none';
        this.panel.style.top = '16px';
        this.panel.style.right = '16px';
        this.panel.style.bottom = 'auto';
        this.panel.style.left = 'auto';
        this.panel.style.width = '280px';
        this.panel.style.maxHeight = 'calc(100vh - 32px)';
        this.panel.style.borderRadius = '8px';
        this.panel.style.transform = 'translateY(0)';
        this.panel.style.display = 'block';
        this.panel.style.opacity = '1';
      }
    };
    window.addEventListener('resize', applyLayout);
    applyLayout();
  }

  public getState(): UIState {
    return { ...this.state };
  }

  public dispose(): void {
    this.panel.remove();
    this.toggleBtn.remove();
  }
}
