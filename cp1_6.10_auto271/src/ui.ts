import { UVSimulator, SKIN_TYPES, STAGE_INFO, Stage } from './uvSimulator';

interface UICallbacks {
  onSkinTypeChange: (id: number) => void;
  onUVChange: (value: number) => void;
}

export class UIManager {
  private simulator: UVSimulator;
  private callbacks: UICallbacks;
  private container: HTMLElement;
  private skinButtons: HTMLButtonElement[] = [];
  private stageIcons: HTMLElement[] = [];
  private uvSlider!: HTMLInputElement;
  private uvValueDisplay!: HTMLElement;
  private uvAdviceDisplay!: HTMLElement;
  private infoSkinType!: HTMLElement;
  private infoUV!: HTMLElement;
  private infoRedness!: HTMLElement;
  private infoPigment!: HTMLElement;
  private infoBurnTime!: HTMLElement;
  private stageDescription!: HTMLElement;
  private stageAdvice!: HTMLElement;

  constructor(simulator: UVSimulator, callbacks: UICallbacks) {
    this.simulator = simulator;
    this.callbacks = callbacks;
    this.container = document.getElementById('app')!;
    this._createStyles();
    this._createBottomControlPanel();
    this._createStageIndicator();
    this._createInfoPanel();
    this._bindEvents();
    this.update();
  }

  private _createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #skin-type-panel {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        width: 80%;
        max-width: 800px;
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        z-index: 10;
      }

      #skin-type-buttons {
        display: flex;
        justify-content: center;
        gap: 16px;
      }

      .skin-type-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        position: relative;
        overflow: visible;
        transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        background: transparent;
        padding: 0;
      }

      .skin-type-btn:hover {
        transform: scale(1.05);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .skin-type-btn-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        display: block;
      }

      .skin-type-btn.active {
        border-color: #ffffff;
      }

      .skin-type-btn .skin-label {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        white-space: nowrap;
        pointer-events: none;
      }

      #uv-slider-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 8px;
      }

      #uv-slider-track {
        position: relative;
        height: 8px;
        border-radius: 4px;
        background: linear-gradient(to right,
          #4CAF50 0%, #4CAF50 18.18%,
          #FFC107 18.18%, #FFC107 45.45%,
          #FF9800 45.45%, #FF9800 63.64%,
          #F44336 63.64%, #F44336 100%
        );
      }

      #uv-slider {
        position: absolute;
        top: 50%;
        left: 0;
        width: 100%;
        height: 24px;
        transform: translateY(-50%);
        -webkit-appearance: none;
        appearance: none;
        background: transparent;
        cursor: pointer;
        outline: none;
        margin: 0;
        padding: 0;
      }

      #uv-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        cursor: pointer;
        transition: transform 0.15s ease;
      }

      #uv-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }

      #uv-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        cursor: pointer;
      }

      #uv-info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      #uv-value {
        font-weight: 600;
        font-size: 15px;
        color: #ffffff;
      }

      #uv-advice {
        color: rgba(255, 255, 255, 0.75);
        font-size: 12px;
      }

      #stage-indicator {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        flex-direction: column;
        gap: 40px;
        z-index: 10;
        align-items: center;
      }

      .stage-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        position: relative;
      }

      .stage-icon {
        font-size: 24px;
        line-height: 1;
        transition: transform 0.3s ease, filter 0.3s ease;
        filter: grayscale(0.7) brightness(0.6);
        cursor: default;
      }

      .stage-icon.active {
        filter: grayscale(0) brightness(1);
      }

      .stage-name {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        white-space: nowrap;
      }

      .stage-name.active {
        color: #ffffff;
        font-weight: 600;
      }

      #stage-text-panel {
        position: absolute;
        right: 70px;
        top: 50%;
        transform: translateY(-50%);
        width: 180px;
        padding: 12px;
        z-index: 10;
      }

      #stage-text-panel .stage-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 6px;
      }

      #stage-text-panel .stage-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.75);
        margin-bottom: 8px;
        line-height: 1.4;
      }

      #stage-text-panel .stage-advice-label {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 3px;
      }

      #stage-text-panel .stage-advice-text {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.4;
      }

      #info-panel {
        position: absolute;
        left: 20px;
        bottom: 130px;
        width: 200px;
        padding: 14px 16px;
        z-index: 10;
      }

      #info-panel .info-title {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 10px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 12px;
      }

      .info-row .info-label {
        color: rgba(255, 255, 255, 0.6);
      }

      .info-row .info-value {
        color: #ffffff;
        font-weight: 600;
      }

      .info-divider {
        height: 1px;
        background: rgba(255, 255, 255, 0.1);
        margin: 8px 0;
      }
    `;
    document.head.appendChild(style);
  }

  private _createBottomControlPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'skin-type-panel';
    panel.className = 'glass-panel';

    const btnContainer = document.createElement('div');
    btnContainer.id = 'skin-type-buttons';

    SKIN_TYPES.forEach(skinType => {
      const btn = document.createElement('button');
      btn.className = 'skin-type-btn';
      btn.dataset.skinId = String(skinType.id);

      const inner = document.createElement('span');
      inner.className = 'skin-type-btn-inner';
      inner.style.background = skinType.baseColor;
      btn.appendChild(inner);

      const label = document.createElement('span');
      label.className = 'skin-label';
      label.textContent = skinType.name;
      btn.appendChild(label);

      btn.addEventListener('click', (e) => {
        this._createRipple(btn, e);
        this.callbacks.onSkinTypeChange(skinType.id);
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.transform = 'scale(1)';
        }
      });

      this.skinButtons.push(btn);
      btnContainer.appendChild(btn);
    });

    const sliderContainer = document.createElement('div');
    sliderContainer.id = 'uv-slider-container';

    const sliderTrack = document.createElement('div');
    sliderTrack.id = 'uv-slider-track';

    this.uvSlider = document.createElement('input');
    this.uvSlider.id = 'uv-slider';
    this.uvSlider.type = 'range';
    this.uvSlider.min = '0';
    this.uvSlider.max = '11';
    this.uvSlider.step = '0.1';
    this.uvSlider.value = '0';
    sliderTrack.appendChild(this.uvSlider);

    const infoRow = document.createElement('div');
    infoRow.id = 'uv-info-row';

    this.uvValueDisplay = document.createElement('span');
    this.uvValueDisplay.id = 'uv-value';
    this.uvAdviceDisplay = document.createElement('span');
    this.uvAdviceDisplay.id = 'uv-advice';

    infoRow.appendChild(this.uvValueDisplay);
    infoRow.appendChild(this.uvAdviceDisplay);

    sliderContainer.appendChild(sliderTrack);
    sliderContainer.appendChild(infoRow);

    panel.appendChild(btnContainer);
    panel.appendChild(sliderContainer);
    this.container.appendChild(panel);
  }

  private _createStageIndicator(): void {
    const indicator = document.createElement('div');
    indicator.id = 'stage-indicator';

    const stages: Stage[] = [Stage.SAFE, Stage.WARNING, Stage.DANGER, Stage.BURN];

    stages.forEach(stage => {
      const info = STAGE_INFO[stage];
      const item = document.createElement('div');
      item.className = 'stage-item';
      item.dataset.stage = stage;

      const icon = document.createElement('span');
      icon.className = 'stage-icon';
      icon.textContent = info.icon;
      icon.style.color = info.color;

      const name = document.createElement('span');
      name.className = 'stage-name';
      name.textContent = info.name;

      item.appendChild(icon);
      item.appendChild(name);
      this.stageIcons.push(item);
      indicator.appendChild(item);
    });

    this.container.appendChild(indicator);

    const textPanel = document.createElement('div');
    textPanel.id = 'stage-text-panel';
    textPanel.className = 'glass-panel';

    const title = document.createElement('div');
    title.className = 'stage-title';
    title.id = 'stage-current-title';

    const desc = document.createElement('div');
    desc.className = 'stage-desc';
    desc.id = 'stage-current-desc';

    const adviceLabel = document.createElement('div');
    adviceLabel.className = 'stage-advice-label';
    adviceLabel.textContent = '应对建议';

    const adviceText = document.createElement('div');
    adviceText.className = 'stage-advice-text';
    adviceText.id = 'stage-current-advice';

    textPanel.appendChild(title);
    textPanel.appendChild(desc);
    textPanel.appendChild(adviceLabel);
    textPanel.appendChild(adviceText);

    this.stageDescription = desc;
    this.stageAdvice = adviceText;
    this.container.appendChild(textPanel);
  }

  private _createInfoPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.className = 'glass-panel';

    const title = document.createElement('div');
    title.className = 'info-title';
    title.textContent = '实时数据';

    const skinTypeRow = this._createInfoRow('皮肤类型', 'skin-type-value');
    const uvRow = this._createInfoRow('UV指数', 'uv-index-value');

    const divider1 = document.createElement('div');
    divider1.className = 'info-divider';

    const rednessRow = this._createInfoRow('泛红面积', 'redness-value');
    const pigmentRow = this._createInfoRow('色素加深', 'pigment-value');

    const divider2 = document.createElement('div');
    divider2.className = 'info-divider';

    const burnRow = this._createInfoRow('预估晒伤', 'burn-time-value');

    panel.appendChild(title);
    panel.appendChild(skinTypeRow);
    panel.appendChild(uvRow);
    panel.appendChild(divider1);
    panel.appendChild(rednessRow);
    panel.appendChild(pigmentRow);
    panel.appendChild(divider2);
    panel.appendChild(burnRow);

    this.infoSkinType = skinTypeRow.querySelector('.info-value') as HTMLElement;
    this.infoUV = uvRow.querySelector('.info-value') as HTMLElement;
    this.infoRedness = rednessRow.querySelector('.info-value') as HTMLElement;
    this.infoPigment = pigmentRow.querySelector('.info-value') as HTMLElement;
    this.infoBurnTime = burnRow.querySelector('.info-value') as HTMLElement;

    this.container.appendChild(panel);
  }

  private _createInfoRow(label: string, valueId: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'info-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'info-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'info-value';
    valueEl.id = valueId;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  private _createRipple(element: HTMLElement, event: MouseEvent): void {
    const rect = element.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = 60;
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 300);
  }

  private _bindEvents(): void {
    this.uvSlider.addEventListener('input', () => {
      const value = parseFloat(this.uvSlider.value);
      this.callbacks.onUVChange(value);
    });
  }

  update(): void {
    const simulator = this.simulator;
    const skinType = simulator.currentSkinType;
    const uvIndex = simulator.uvIndex;
    const stage = simulator.getCurrentStage();
    const stageInfo = STAGE_INFO[stage];

    this.skinButtons.forEach(btn => {
      const id = parseInt(btn.dataset.skinId!);
      if (id === skinType.id) {
        btn.classList.add('active', 'skin-btn-active');
      } else {
        btn.classList.remove('active', 'skin-btn-active');
        btn.style.transform = 'scale(1)';
      }
    });

    this.uvValueDisplay.textContent = `UV ${uvIndex.toFixed(1)}`;
    this.uvAdviceDisplay.textContent = simulator.getUVAdviceText();

    this.stageIcons.forEach(item => {
      const itemStage = item.dataset.stage as Stage;
      const icon = item.querySelector('.stage-icon') as HTMLElement;
      const name = item.querySelector('.stage-name') as HTMLElement;
      if (itemStage === stage) {
        icon.classList.add('active', 'stage-active');
        name.classList.add('active');
      } else {
        icon.classList.remove('active', 'stage-active');
        name.classList.remove('active');
      }
    });

    const titleEl = document.getElementById('stage-current-title') as HTMLElement;
    titleEl.textContent = stageInfo.name;
    titleEl.style.color = stageInfo.color;
    this.stageDescription.textContent = stageInfo.description;
    this.stageAdvice.textContent = stageInfo.advice;

    this.infoSkinType.textContent = skinType.name;
    this.infoUV.textContent = uvIndex.toFixed(1);
    this.infoRedness.textContent = `${simulator.getRednessPercentage()}%`;
    this.infoPigment.textContent = `${simulator.getPigmentationPercentage()}%`;

    const burnTime = simulator.getEstimatedBurnTime();
    this.infoBurnTime.textContent = burnTime === Infinity ? '安全' : `${burnTime}分钟`;
  }
}
