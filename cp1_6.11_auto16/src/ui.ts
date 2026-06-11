import type { PresetType } from './visualizer';

export interface UICallbacks {
  onToggle: () => Promise<void>;
  onPresetChange: (preset: PresetType) => void;
  onSensitivityChange: (value: number) => void;
}

export class UIManager {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private toggleBtn: HTMLButtonElement;
  private presetSelect: HTMLSelectElement;
  private sensitivitySlider: HTMLInputElement;
  private sensitivityLabel: HTMLSpanElement;
  private isRunning: boolean = false;

  constructor(parent: HTMLElement, callbacks: UICallbacks) {
    this.container = parent;
    this.panel = document.createElement('div');
    this.toggleBtn = document.createElement('button');
    this.presetSelect = document.createElement('select');
    this.sensitivitySlider = document.createElement('input');
    this.sensitivityLabel = document.createElement('span');

    this.initStyles();
    this.initElements(callbacks);
    this.attachToDOM();
  }

  private initStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .sv-panel {
        position: fixed;
        left: 24px;
        bottom: 24px;
        z-index: 100;
        display: flex;
        flex-direction: row;
        gap: 16px;
        align-items: flex-end;
        padding: 20px 24px;
        background: rgba(10, 10, 46, 0.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(100, 150, 255, 0.35);
        border-radius: 14px;
        box-shadow: 0 0 24px rgba(80, 130, 255, 0.18),
                    0 8px 32px rgba(0, 0, 0, 0.4);
        transform: translateX(-120%);
        opacity: 0;
        animation: svSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
      }

      @keyframes svSlideIn {
        0% {
          transform: translateX(-120%);
          opacity: 0;
        }
        100% {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .sv-control-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sv-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(150, 180, 255, 0.8);
      }

      .sv-toggle-btn {
        position: relative;
        min-width: 120px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        background: linear-gradient(135deg, rgba(60, 120, 255, 0.8), rgba(120, 80, 255, 0.8));
        border: 1px solid rgba(140, 180, 255, 0.5);
        border-radius: 10px;
        cursor: pointer;
        overflow: hidden;
        transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.25s ease,
                    filter 0.25s ease,
                    background 0.25s ease;
        box-shadow: 0 4px 16px rgba(60, 120, 255, 0.3);
        font-family: inherit;
      }

      .sv-toggle-btn:hover {
        filter: brightness(1.2);
        transform: scale(1.04);
        box-shadow: 0 6px 24px rgba(60, 120, 255, 0.5);
      }

      .sv-toggle-btn:active {
        transform: scale(0.98);
        transition: transform 0.08s ease;
      }

      .sv-toggle-btn.running {
        background: linear-gradient(135deg, rgba(255, 80, 100, 0.85), rgba(255, 120, 60, 0.85));
        border-color: rgba(255, 160, 140, 0.6);
        box-shadow: 0 4px 16px rgba(255, 80, 100, 0.35);
      }

      .sv-toggle-btn.running:hover {
        box-shadow: 0 6px 24px rgba(255, 80, 100, 0.55);
      }

      .sv-select {
        min-width: 160px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 500;
        color: #e0e8ff;
        background: rgba(20, 25, 60, 0.7);
        border: 1px solid rgba(100, 150, 255, 0.35);
        border-radius: 8px;
        cursor: pointer;
        outline: none;
        transition: all 0.2s ease;
        font-family: inherit;
        appearance: none;
        -webkit-appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238ab4ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 12px center;
        padding-right: 36px;
      }

      .sv-select:hover {
        filter: brightness(1.2);
        border-color: rgba(140, 180, 255, 0.6);
        transform: scale(1.02);
      }

      .sv-select:focus {
        border-color: rgba(160, 200, 255, 0.8);
        box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.15);
      }

      .sv-select option {
        background: #14193c;
        color: #e0e8ff;
      }

      .sv-slider-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 180px;
      }

      .sv-slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sv-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        background: linear-gradient(to right, rgba(60, 120, 255, 0.3), rgba(180, 100, 255, 0.5));
        border-radius: 3px;
        outline: none;
        cursor: pointer;
        transition: filter 0.2s ease;
      }

      .sv-slider:hover {
        filter: brightness(1.3);
      }

      .sv-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6aa0ff, #b080ff);
        border: 2px solid rgba(255, 255, 255, 0.6);
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(100, 150, 255, 0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }

      .sv-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 16px rgba(100, 150, 255, 0.8);
      }

      .sv-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6aa0ff, #b080ff);
        border: 2px solid rgba(255, 255, 255, 0.6);
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(100, 150, 255, 0.6);
      }

      .sv-sensitivity-value {
        font-size: 12px;
        font-weight: 600;
        color: rgba(180, 210, 255, 0.95);
        font-variant-numeric: tabular-nums;
      }

      @media (max-width: 640px) {
        .sv-panel {
          left: 12px;
          right: 12px;
          bottom: 12px;
          flex-direction: column;
          align-items: stretch;
          gap: 14px;
          padding: 16px;
        }

        .sv-control-group {
          width: 100%;
        }

        .sv-toggle-btn,
        .sv-select,
        .sv-slider-wrap {
          width: 100%;
          min-width: unset;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private initElements(callbacks: UICallbacks): void {
    this.panel.className = 'sv-panel';

    const toggleGroup = document.createElement('div');
    toggleGroup.className = 'sv-control-group';
    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'sv-label';
    toggleLabel.textContent = '音频采集';
    this.toggleBtn.className = 'sv-toggle-btn';
    this.toggleBtn.textContent = '开始';
    this.toggleBtn.addEventListener('click', async () => {
      await callbacks.onToggle();
    });
    toggleGroup.appendChild(toggleLabel);
    toggleGroup.appendChild(this.toggleBtn);

    const presetGroup = document.createElement('div');
    presetGroup.className = 'sv-control-group';
    const presetLabel = document.createElement('span');
    presetLabel.className = 'sv-label';
    presetLabel.textContent = '预设音频';
    this.presetSelect.className = 'sv-select';

    const options: { value: PresetType; label: string }[] = [
      { value: 'none', label: '— 麦克风输入 —' },
      { value: 'sine', label: '正弦波' },
      { value: 'whiteNoise', label: '白噪音' },
      { value: 'music', label: '音乐片段' }
    ];
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      this.presetSelect.appendChild(option);
    });

    this.presetSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as PresetType;
      callbacks.onPresetChange(value);
    });
    presetGroup.appendChild(presetLabel);
    presetGroup.appendChild(this.presetSelect);

    const sensitivityGroup = document.createElement('div');
    sensitivityGroup.className = 'sv-control-group';
    const sliderWrap = document.createElement('div');
    sliderWrap.className = 'sv-slider-wrap';
    const sliderHeader = document.createElement('div');
    sliderHeader.className = 'sv-slider-header';
    const sensLabel = document.createElement('span');
    sensLabel.className = 'sv-label';
    sensLabel.textContent = '灵敏度';
    this.sensitivityLabel.className = 'sv-sensitivity-value';
    this.sensitivityLabel.textContent = '1.00x';
    sliderHeader.appendChild(sensLabel);
    sliderHeader.appendChild(this.sensitivityLabel);

    this.sensitivitySlider.className = 'sv-slider';
    this.sensitivitySlider.type = 'range';
    this.sensitivitySlider.min = '0.5';
    this.sensitivitySlider.max = '2.0';
    this.sensitivitySlider.step = '0.05';
    this.sensitivitySlider.value = '1.0';
    this.sensitivitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.sensitivityLabel.textContent = value.toFixed(2) + 'x';
      callbacks.onSensitivityChange(value);
    });

    sliderWrap.appendChild(sliderHeader);
    sliderWrap.appendChild(this.sensitivitySlider);
    sensitivityGroup.appendChild(sliderWrap);

    this.panel.appendChild(toggleGroup);
    this.panel.appendChild(presetGroup);
    this.panel.appendChild(sensitivityGroup);
  }

  private attachToDOM(): void {
    this.container.appendChild(this.panel);
  }

  public setRunningState(running: boolean): void {
    this.isRunning = running;
    if (running) {
      this.toggleBtn.textContent = '停止';
      this.toggleBtn.classList.add('running');
    } else {
      this.toggleBtn.textContent = '开始';
      this.toggleBtn.classList.remove('running');
    }
  }

  public setPresetValue(preset: PresetType): void {
    this.presetSelect.value = preset;
  }

  public setSensitivityValue(value: number): void {
    this.sensitivitySlider.value = value.toString();
    this.sensitivityLabel.textContent = value.toFixed(2) + 'x';
  }
}
