import type { IllusionType, IllusionParams, HerrmannParams, KanizsaParams, SnakesParams } from './illusionRenderer';
import { DEFAULT_PARAMS } from './illusionRenderer';

interface ParamConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

const ILLUSION_CONFIG: Record<IllusionType, {
  name: string;
  subtitle: string;
  params: ParamConfig[];
}> = {
  herrmann: {
    name: '赫尔曼网格',
    subtitle: '调整网格参数观察交叉点的灰点错觉',
    params: [
      { key: 'lineWidth', label: '线宽', min: 1, max: 20, step: 1, unit: 'px' },
      { key: 'gridSpacing', label: '格间距', min: 20, max: 100, step: 1, unit: 'px' },
      { key: 'cornerRadius', label: '交叉点圆角', min: 0, max: 15, step: 1, unit: 'px' }
    ]
  },
  kanizsa: {
    name: '卡尼莎三角形',
    subtitle: '调整参数观察主观轮廓三角形的形成',
    params: [
      { key: 'pacmanRadius', label: '吃豆人半径', min: 20, max: 90, step: 1, unit: 'px' },
      { key: 'triangleSize', label: '三角形大小', min: 100, max: 320, step: 1, unit: 'px' },
      { key: 'pacmanRotation', label: '旋转角度', min: -60, max: 60, step: 1, unit: '°' },
      { key: 'outlineOpacity', label: '轮廓透明度', min: 0, max: 1, step: 0.01 }
    ]
  },
  snakes: {
    name: '旋转蛇错觉',
    subtitle: '调整参数观察视觉上的旋转运动效果',
    params: [
      { key: 'rotationSpeed', label: '旋转速度', min: 0, max: 3, step: 0.1, unit: 'x' },
      { key: 'ringCount', label: '圆环数量', min: 1, max: 6, step: 1 },
      { key: 'segmentCount', label: '分段数量', min: 4, max: 24, step: 1 },
      { key: 'scale', label: '缩放比例', min: 0.5, max: 2, step: 0.05, unit: 'x' },
      { key: 'contrast', label: '对比度', min: 0.3, max: 2, step: 0.05, unit: 'x' }
    ]
  }
};

type ParamChangeCallback = (illusionType: IllusionType, params: IllusionParams) => void;
type TabChangeCallback = (illusionType: IllusionType) => void;

export class UIController {
  private currentIllusion: IllusionType = 'herrmann';
  private params: Record<IllusionType, IllusionParams> = {
    herrmann: { ...DEFAULT_PARAMS.herrmann } as HerrmannParams,
    kanizsa: { ...DEFAULT_PARAMS.kanizsa } as KanizsaParams,
    snakes: { ...DEFAULT_PARAMS.snakes } as SnakesParams
  };
  private onParamChange: ParamChangeCallback;
  private onTabChange: TabChangeCallback;
  private controlsContainer: HTMLElement;
  private illusionNameEl: HTMLElement;
  private panelSubtitleEl: HTMLElement;
  private tabBtns: NodeListOf<HTMLButtonElement>;
  private canvasWrapper: HTMLElement;

  constructor(
    onParamChange: ParamChangeCallback,
    onTabChange: TabChangeCallback
  ) {
    this.onParamChange = onParamChange;
    this.onTabChange = onTabChange;

    const controlsContainer = document.getElementById('controlsContainer');
    const illusionNameEl = document.getElementById('illusionName');
    const panelSubtitleEl = document.getElementById('panelSubtitle');
    const canvasWrapper = document.querySelector('.canvas-wrapper');

    if (!controlsContainer || !illusionNameEl || !panelSubtitleEl || !canvasWrapper) {
      throw new Error('UI元素缺失');
    }

    this.controlsContainer = controlsContainer;
    this.illusionNameEl = illusionNameEl;
    this.panelSubtitleEl = panelSubtitleEl;
    this.canvasWrapper = canvasWrapper;

    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.bindTabEvents();
    this.bindResetBtn();
    this.renderControls();
    this.updateIllusionName();
  }

  private bindTabEvents(): void {
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const illusion = btn.dataset.illusion as IllusionType;
        if (illusion && illusion !== this.currentIllusion) {
          this.switchIllusion(illusion);
        }
      });
    });
  }

  private bindResetBtn(): void {
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetParams();
      });
    }
  }

  private switchIllusion(illusion: IllusionType): void {
    this.currentIllusion = illusion;

    this.tabBtns.forEach(btn => {
      if (btn.dataset.illusion === illusion) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.canvasWrapper.classList.remove('fade-in');
    void this.canvasWrapper.offsetWidth;
    this.canvasWrapper.classList.add('fade-in');

    this.updateIllusionName();
    this.renderControls();
    this.onTabChange(illusion);
    this.emitChange();
  }

  private updateIllusionName(): void {
    this.illusionNameEl.textContent = ILLUSION_CONFIG[this.currentIllusion].name;
    this.panelSubtitleEl.textContent = ILLUSION_CONFIG[this.currentIllusion].subtitle;
  }

  private renderControls(): void {
    this.controlsContainer.innerHTML = '';
    const config = ILLUSION_CONFIG[this.currentIllusion];
    const currentParams = this.params[this.currentIllusion] as Record<string, number>;

    config.params.forEach(param => {
      const control = this.createSliderControl(
        param.key,
        param.label,
        currentParams[param.key],
        param.min,
        param.max,
        param.step,
        param.unit
      );
      this.controlsContainer.appendChild(control);
    });
  }

  private createSliderControl(
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit?: string
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'slider-control';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'slider-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.className = 'slider-value';
    valueEl.textContent = unit ? `${value}${unit}` : String(value.toFixed(step < 1 ? 2 : 0));

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const progress = document.createElement('div');
    progress.className = 'slider-progress';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'custom-slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const updateProgress = () => {
      const percent = ((parseFloat(slider.value) - min) / (max - min)) * 100;
      progress.style.width = `${percent}%`;
    };
    updateProgress();

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      const formattedValue = step < 1 ? val.toFixed(2) : String(val);
      valueEl.textContent = unit ? `${formattedValue}${unit}` : formattedValue;
      updateProgress();
      (this.params[this.currentIllusion] as Record<string, number>)[key] = val;
      this.emitChange();
    });

    sliderContainer.appendChild(progress);
    sliderContainer.appendChild(slider);

    wrapper.appendChild(header);
    wrapper.appendChild(sliderContainer);

    return wrapper;
  }

  private emitChange(): void {
    this.onParamChange(this.currentIllusion, this.params[this.currentIllusion]);
  }

  private resetParams(): void {
    this.params[this.currentIllusion] = { ...DEFAULT_PARAMS[this.currentIllusion] } as IllusionParams;
    this.renderControls();
    this.emitChange();
  }

  getCurrentIllusion(): IllusionType {
    return this.currentIllusion;
  }

  getCurrentParams(): IllusionParams {
    return this.params[this.currentIllusion];
  }
}
