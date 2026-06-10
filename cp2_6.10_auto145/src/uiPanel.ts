import { ParticleConfig, ParticleSystem, Presets } from './particleSystem';

interface SliderConfig {
  key: keyof ParticleConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'emissionRate', label: '发射速率', min: 10, max: 200, step: 5, unit: '个/秒' },
  { key: 'lifetime', label: '生命周期', min: 0.5, max: 5, step: 0.1, unit: '秒' },
  { key: 'startVelocityX', label: '初始速度X', min: -300, max: 300, step: 10 },
  { key: 'startVelocityY', label: '初始速度Y', min: -300, max: 300, step: 10 },
  { key: 'startSize', label: '初始大小', min: 2, max: 20, step: 1, unit: 'px' },
  { key: 'endSize', label: '最终大小', min: 2, max: 40, step: 1, unit: 'px' },
  { key: 'gravity', label: '重力影响', min: -200, max: 200, step: 5 },
  { key: 'opacity', label: '透明度', min: 0.1, max: 1.0, step: 0.05 }
];

const STYLE = `
  .panel-container {
    width: 280px;
    max-width: 340px;
    min-width: 240px;
    background: #16213e;
    border-radius: 10px;
    padding: 20px;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0, 184, 148, 0.3);
  }

  .control-group {
    margin-bottom: 16px;
  }

  .control-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #b0b8d4;
    margin-bottom: 6px;
  }

  .control-value {
    color: #00b894;
    font-weight: 500;
  }

  input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #1a1a2e;
    outline: none;
    -webkit-appearance: none;
    cursor: pointer;
    transition: box-shadow 0.2s ease;
  }

  input[type="range"]:hover {
    box-shadow: 0 0 8px #00b894;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00b894;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.05);
    box-shadow: 0 0 8px #00b894;
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #00b894;
    cursor: pointer;
    border: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  input[type="range"]::-moz-range-thumb:hover {
    transform: scale(1.05);
    box-shadow: 0 0 8px #00b894;
  }

  .color-group {
    margin-bottom: 16px;
  }

  .color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .color-label {
    font-size: 12px;
    color: #b0b8d4;
  }

  input[type="color"] {
    width: 40px;
    height: 28px;
    border: 2px solid #00b894;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  input[type="color"]:hover {
    transform: scale(1.05);
    box-shadow: 0 0 8px #00b894;
  }

  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 4px;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .action-btn {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #ffffff;
  }

  .export-btn {
    background: #00b894;
  }

  .export-btn:hover {
    background: #00cec9;
    transform: scale(1.05);
    box-shadow: 0 0 8px #00b894;
  }

  .import-btn {
    background: #6c5ce7;
  }

  .import-btn:hover {
    background: #a29bfe;
    transform: scale(1.05);
    box-shadow: 0 0 8px #6c5ce7;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #16213e;
    border-radius: 10px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .modal-title {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 16px;
  }

  .modal-content {
    flex: 1;
    overflow: auto;
    margin-bottom: 16px;
  }

  .modal-content textarea {
    width: 100%;
    min-height: 200px;
    background: #1a1a2e;
    border: 1px solid rgba(0, 184, 148, 0.3);
    border-radius: 6px;
    color: #ffffff;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    resize: vertical;
    box-sizing: border-box;
  }

  .modal-content pre {
    background: #1a1a2e;
    border-radius: 6px;
    padding: 12px;
    color: #00b894;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow: auto;
  }

  .modal-buttons {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .modal-btn {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .modal-btn.primary {
    background: #00b894;
    color: #ffffff;
  }

  .modal-btn.primary:hover {
    background: #00cec9;
    transform: scale(1.05);
    box-shadow: 0 0 8px #00b894;
  }

  .modal-btn.secondary {
    background: #2d3436;
    color: #ffffff;
  }

  .modal-btn.secondary:hover {
    background: #636e72;
    transform: scale(1.05);
  }

  .section-title {
    font-size: 13px;
    color: #00b894;
    margin: 20px 0 12px 0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .section-title:first-child {
    margin-top: 0;
  }

  @media (max-width: 768px) {
    .panel-container {
      width: 100%;
      max-width: 100%;
      height: auto;
      max-height: 50vh;
      overflow-x: auto;
      overflow-y: auto;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
    }

    .panel-inner {
      display: flex;
      flex-direction: column;
      min-width: 260px;
      padding-right: 20px;
    }

    .panel-title {
      white-space: nowrap;
    }

    .control-group,
    .color-group,
    .button-group,
    .section-title {
      white-space: nowrap;
    }
  }
`;

export class UIPanel {
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private sliderElements: Map<keyof ParticleConfig, HTMLInputElement> = new Map();
  private valueElements: Map<keyof ParticleConfig, HTMLElement> = new Map();
  private startColorInput!: HTMLInputElement;
  private endColorInput!: HTMLInputElement;
  private colorMidpointSlider!: HTMLInputElement;
  private colorMidpointValue!: HTMLElement;
  private currentPreset: string = 'fire';

  constructor(container: HTMLElement, particleSystem: ParticleSystem) {
    this.container = container;
    this.particleSystem = particleSystem;
    this.init();
  }

  private init(): void {
    this.injectStyles();
    this.buildPanel();
    this.syncUIFromConfig();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  private buildPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'panel-container';

    const inner = document.createElement('div');
    inner.className = 'panel-inner';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '粒子参数控制';
    inner.appendChild(title);

    const paramsSection = this.createSectionTitle('基础参数');
    inner.appendChild(paramsSection);

    SLIDER_CONFIGS.forEach((cfg) => {
      const group = this.createSlider(cfg);
      inner.appendChild(group);
    });

    const colorSection = this.createSectionTitle('颜色设置');
    inner.appendChild(colorSection);
    inner.appendChild(this.createColorControls());

    const actionSection = this.createSectionTitle('配置操作');
    inner.appendChild(actionSection);
    inner.appendChild(this.createActionButtons());

    panel.appendChild(inner);
    this.container.appendChild(panel);
  }

  private createSectionTitle(text: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'section-title';
    el.textContent = text;
    return el;
  }

  private createSlider(cfg: SliderConfig): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = cfg.label;
    label.appendChild(labelText);

    const valueEl = document.createElement('span');
    valueEl.className = 'control-value';
    this.valueElements.set(cfg.key, valueEl);
    label.appendChild(valueEl);

    group.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(cfg.min);
    slider.max = String(cfg.max);
    slider.step = String(cfg.step);
    this.sliderElements.set(cfg.key, slider);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.updateValueDisplay(cfg.key, value, cfg.unit);
      this.particleSystem.updateEmitterParams({ [cfg.key]: value } as Partial<ParticleConfig>);
    });

    group.appendChild(slider);
    return group;
  }

  private createColorControls(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'color-group';

    const startRow = document.createElement('div');
    startRow.className = 'color-row';
    const startLabel = document.createElement('span');
    startLabel.className = 'color-label';
    startLabel.textContent = '起始颜色';
    this.startColorInput = document.createElement('input');
    this.startColorInput.type = 'color';
    this.startColorInput.addEventListener('input', () => {
      this.particleSystem.updateEmitterParams({ startColor: this.startColorInput.value });
    });
    startRow.appendChild(startLabel);
    startRow.appendChild(this.startColorInput);
    group.appendChild(startRow);

    const endRow = document.createElement('div');
    endRow.className = 'color-row';
    const endLabel = document.createElement('span');
    endLabel.className = 'color-label';
    endLabel.textContent = '结束颜色';
    this.endColorInput = document.createElement('input');
    this.endColorInput.type = 'color';
    this.endColorInput.addEventListener('input', () => {
      this.particleSystem.updateEmitterParams({ endColor: this.endColorInput.value });
    });
    endRow.appendChild(endLabel);
    endRow.appendChild(this.endColorInput);
    group.appendChild(endRow);

    const midGroup = document.createElement('div');
    midGroup.className = 'control-group';
    const midLabel = document.createElement('div');
    midLabel.className = 'control-label';
    const midLabelText = document.createElement('span');
    midLabelText.textContent = '颜色中间偏移';
    this.colorMidpointValue = document.createElement('span');
    this.colorMidpointValue.className = 'control-value';
    midLabel.appendChild(midLabelText);
    midLabel.appendChild(this.colorMidpointValue);
    midGroup.appendChild(midLabel);

    this.colorMidpointSlider = document.createElement('input');
    this.colorMidpointSlider.type = 'range';
    this.colorMidpointSlider.min = '0';
    this.colorMidpointSlider.max = '100';
    this.colorMidpointSlider.step = '5';
    this.colorMidpointSlider.addEventListener('input', () => {
      const value = parseInt(this.colorMidpointSlider.value);
      this.colorMidpointValue.textContent = `${value}%`;
      this.particleSystem.updateEmitterParams({ colorMidpoint: value });
    });
    midGroup.appendChild(this.colorMidpointSlider);
    group.appendChild(midGroup);

    return group;
  }

  private createActionButtons(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'button-group';

    const exportBtn = document.createElement('button');
    exportBtn.className = 'action-btn export-btn';
    exportBtn.textContent = '导出参数';
    exportBtn.addEventListener('click', () => this.showExportModal());
    group.appendChild(exportBtn);

    const importBtn = document.createElement('button');
    importBtn.className = 'action-btn import-btn';
    importBtn.textContent = '导入参数';
    importBtn.addEventListener('click', () => this.showImportModal());
    group.appendChild(importBtn);

    return group;
  }

  private updateValueDisplay(key: keyof ParticleConfig, value: number, unit?: string): void {
    const el = this.valueElements.get(key);
    if (el) {
      const display = Number.isInteger(value) ? value : value.toFixed(2);
      el.textContent = unit ? `${display}${unit}` : String(display);
    }
  }

  private syncUIFromConfig(): void {
    const config = this.particleSystem.getConfig();

    SLIDER_CONFIGS.forEach((cfg) => {
      const value = config[cfg.key] as number;
      const slider = this.sliderElements.get(cfg.key);
      if (slider) slider.value = String(value);
      this.updateValueDisplay(cfg.key, value, cfg.unit);
    });

    this.startColorInput.value = config.startColor;
    this.endColorInput.value = config.endColor;
    this.colorMidpointSlider.value = String(config.colorMidpoint);
    this.colorMidpointValue.textContent = `${config.colorMidpoint}%`;
  }

  private showExportModal(): void {
    const config = this.particleSystem.exportConfig();
    const jsonStr = JSON.stringify(config, null, 2);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '导出粒子参数';
    modal.appendChild(title);

    const content = document.createElement('div');
    content.className = 'modal-content';
    const pre = document.createElement('pre');
    pre.textContent = jsonStr;
    content.appendChild(pre);
    modal.appendChild(content);

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'modal-btn primary';
    copyBtn.textContent = '复制到剪贴板';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(jsonStr).then(() => {
        copyBtn.textContent = '已复制!';
        setTimeout(() => {
          copyBtn.textContent = '复制到剪贴板';
        }, 1500);
      });
    });
    buttons.appendChild(copyBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-btn secondary';
    closeBtn.textContent = '关闭';
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    buttons.appendChild(closeBtn);

    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  private showImportModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '导入粒子参数';
    modal.appendChild(title);

    const content = document.createElement('div');
    content.className = 'modal-content';
    const textarea = document.createElement('textarea');
    textarea.placeholder = '粘贴之前导出的JSON配置...';
    content.appendChild(textarea);
    modal.appendChild(content);

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn secondary';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', () => document.body.removeChild(overlay));
    buttons.appendChild(cancelBtn);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn primary';
    confirmBtn.textContent = '确定导入';
    confirmBtn.addEventListener('click', () => {
      try {
        const config = JSON.parse(textarea.value) as ParticleConfig;
        if (this.validateConfig(config)) {
          this.particleSystem.importConfig(config);
          this.syncUIFromConfig();
          document.body.removeChild(overlay);
        } else {
          alert('配置格式不正确，请检查字段是否完整');
        }
      } catch (e) {
        alert('JSON解析失败，请检查格式是否正确');
      }
    });
    buttons.appendChild(confirmBtn);

    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    setTimeout(() => textarea.focus(), 100);
  }

  private validateConfig(config: ParticleConfig): boolean {
    const requiredFields: (keyof ParticleConfig)[] = [
      'name', 'emissionRate', 'lifetime', 'startVelocityX', 'startVelocityY',
      'startSize', 'endSize', 'gravity', 'startColor', 'endColor', 'colorMidpoint'
    ];
    return requiredFields.every((field) => field in config);
  }

  setPreset(presetName: string): void {
    const preset = Presets[presetName];
    if (preset) {
      this.currentPreset = presetName;
      this.particleSystem.importConfig(preset);
      this.syncUIFromConfig();
    }
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }
}
