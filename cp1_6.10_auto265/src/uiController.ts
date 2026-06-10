import type { LeafParams } from './leafGenerator';

export interface UIControls {
  onParamsChange: (params: LeafParams) => void;
}

interface SliderConfig {
  key: keyof Omit<LeafParams, 'primaryColor' | 'secondaryColor'>;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'length', label: '叶片长度', min: 5, max: 20, step: 0.5, default: 12, unit: '' },
  { key: 'width', label: '叶片宽度', min: 2, max: 8, step: 0.2, default: 5, unit: '' },
  { key: 'veinDensity', label: '叶脉密度', min: 3, max: 12, step: 1, default: 7, unit: ' 条' },
  { key: 'serrationDepth', label: '锯齿深度', min: 0, max: 5, step: 0.2, default: 2, unit: '' },
  { key: 'petioleLength', label: '叶柄长度', min: 1, max: 5, step: 0.2, default: 3, unit: '' }
];

const DEFAULT_PARAMS: LeafParams = {
  length: 12,
  width: 5,
  veinDensity: 7,
  serrationDepth: 2,
  petioleLength: 3,
  primaryColor: '#2d5a27',
  secondaryColor: '#4a8c3f'
};

export class UIController {
  private container: HTMLElement;
  private params: LeafParams;
  private controls: UIControls;
  private sliderContainers: Map<string, HTMLElement> = new Map();
  private bubbleTimer: Map<string, number> = new Map();
  private isMobile: boolean;
  private drawerVisible: boolean = false;

  constructor(container: HTMLElement, controls: UIControls) {
    this.container = container;
    this.controls = controls;
    this.params = { ...DEFAULT_PARAMS };
    this.isMobile = window.innerWidth < 768;
    this.buildUI();
    this.attachResponsiveListener();
  }

  getParams(): LeafParams {
    return { ...this.params };
  }

  private buildUI(): void {
    this.container.innerHTML = '';
    this.container.className = 'leaf-control-panel';

    if (this.isMobile) {
      this.buildMobileUI();
    } else {
      this.buildDesktopUI();
    }
  }

  private buildDesktopUI(): void {
    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '叶脉织机 · 参数控制';
    this.container.appendChild(title);

    const slidersRow = document.createElement('div');
    slidersRow.className = 'sliders-row';

    for (const config of SLIDER_CONFIGS) {
      const sliderWrap = this.createSlider(config);
      slidersRow.appendChild(sliderWrap);
    }

    const colorsRow = document.createElement('div');
    colorsRow.className = 'colors-row';

    colorsRow.appendChild(this.createColorPicker('primaryColor', '主色', this.params.primaryColor));
    colorsRow.appendChild(this.createColorPicker('secondaryColor', '副色', this.params.secondaryColor));

    this.container.appendChild(slidersRow);
    this.container.appendChild(colorsRow);
  }

  private buildMobileUI(): void {
    const toggle = document.createElement('button');
    toggle.className = 'drawer-toggle';
    toggle.innerHTML = '<span class="toggle-icon">⚙</span><span>调节参数</span>';
    toggle.addEventListener('click', () => this.toggleDrawer());
    this.container.appendChild(toggle);

    const drawer = document.createElement('div');
    drawer.className = 'drawer-content';
    drawer.id = 'mobile-drawer';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '叶脉织机 · 参数控制';
    drawer.appendChild(title);

    const slidersWrap = document.createElement('div');
    slidersWrap.className = 'sliders-column';

    for (const config of SLIDER_CONFIGS) {
      const sliderWrap = this.createSlider(config);
      slidersWrap.appendChild(sliderWrap);
    }

    const colorsWrap = document.createElement('div');
    colorsWrap.className = 'colors-row';
    colorsWrap.appendChild(this.createColorPicker('primaryColor', '主色', this.params.primaryColor));
    colorsWrap.appendChild(this.createColorPicker('secondaryColor', '副色', this.params.secondaryColor));

    drawer.appendChild(slidersWrap);
    drawer.appendChild(colorsWrap);
    this.container.appendChild(drawer);
  }

  private toggleDrawer(): void {
    this.drawerVisible = !this.drawerVisible;
    const drawer = this.container.querySelector('#mobile-drawer') as HTMLElement | null;
    if (drawer) {
      drawer.style.display = this.drawerVisible ? 'block' : 'none';
    }
  }

  private createSlider(config: SliderConfig): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'slider-wrap';

    const header = document.createElement('div');
    header.className = 'slider-header';

    const label = document.createElement('span');
    label.className = 'slider-label';
    label.textContent = config.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'slider-value';
    const currentVal = this.params[config.key];
    valueDisplay.textContent = `${currentVal}${config.unit ?? ''}`;

    header.appendChild(label);
    header.appendChild(valueDisplay);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    sliderContainer.dataset.key = config.key;

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(config.min);
    input.max = String(config.max);
    input.step = String(config.step);
    input.value = String(this.params[config.key]);
    input.className = 'custom-slider';

    const bubble = document.createElement('div');
    bubble.className = 'slider-bubble';
    bubble.textContent = `${this.params[config.key]}${config.unit ?? ''}`;

    sliderContainer.appendChild(input);
    sliderContainer.appendChild(bubble);
    this.sliderContainers.set(config.key, sliderContainer);

    input.addEventListener('input', () => {
      const numVal = parseFloat(input.value);
      (this.params[config.key] as number) = numVal;
      valueDisplay.textContent = `${numVal}${config.unit ?? ''}`;
      this.showBubble(config.key, `${numVal}${config.unit ?? ''}`);
      this.controls.onParamsChange({ ...this.params });
    });

    input.addEventListener('mouseup', () => this.hideBubble(config.key));
    input.addEventListener('touchend', () => this.hideBubble(config.key));
    input.addEventListener('blur', () => this.hideBubble(config.key));

    wrap.appendChild(header);
    wrap.appendChild(sliderContainer);
    return wrap;
  }

  private createColorPicker(key: 'primaryColor' | 'secondaryColor', label: string, defaultColor: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'color-picker-wrap';

    const labelEl = document.createElement('span');
    labelEl.className = 'color-label';
    labelEl.textContent = label;

    const pickerContainer = document.createElement('div');
    pickerContainer.className = 'color-picker-container';

    const colorSwatch = document.createElement('div');
    colorSwatch.className = 'color-swatch';
    colorSwatch.style.backgroundColor = defaultColor;

    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'color';
    hiddenInput.value = defaultColor;
    hiddenInput.className = 'hidden-color-input';
    hiddenInput.addEventListener('input', () => {
      const val = hiddenInput.value;
      (this.params[key] as string) = val;
      colorSwatch.style.backgroundColor = val;
      hexDisplay.textContent = val.toUpperCase();
      this.controls.onParamsChange({ ...this.params });
    });

    const hexDisplay = document.createElement('span');
    hexDisplay.className = 'color-hex';
    hexDisplay.textContent = defaultColor.toUpperCase();

    pickerContainer.appendChild(colorSwatch);
    pickerContainer.appendChild(hiddenInput);
    pickerContainer.appendChild(hexDisplay);

    pickerContainer.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('color-swatch') ||
          (e.target as HTMLElement).classList.contains('color-hex') ||
          (e.target as HTMLElement).classList.contains('color-picker-container')) {
        hiddenInput.click();
      }
    });

    wrap.appendChild(labelEl);
    wrap.appendChild(pickerContainer);
    return wrap;
  }

  private showBubble(key: string, text: string): void {
    const container = this.sliderContainers.get(key);
    if (!container) return;
    const bubble = container.querySelector('.slider-bubble') as HTMLElement | null;
    const input = container.querySelector('.custom-slider') as HTMLInputElement | null;
    if (!bubble || !input) return;

    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const percent = ((val - min) / (max - min)) * 100;
    bubble.style.left = `${percent}%`;
    bubble.textContent = text;
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateX(-50%) translateY(-38px)';

    const existing = this.bubbleTimer.get(key);
    if (existing) window.clearTimeout(existing);
  }

  private hideBubble(key: string): void {
    const existing = this.bubbleTimer.get(key);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      const container = this.sliderContainers.get(key);
      if (!container) return;
      const bubble = container.querySelector('.slider-bubble') as HTMLElement | null;
      if (bubble) {
        bubble.style.opacity = '0';
        bubble.style.transform = 'translateX(-50%) translateY(-30px)';
      }
      this.bubbleTimer.delete(key);
    }, 600);
    this.bubbleTimer.set(key, timer);
  }

  private attachResponsiveListener(): void {
    window.addEventListener('resize', () => {
      const nowMobile = window.innerWidth < 768;
      if (nowMobile !== this.isMobile) {
        this.isMobile = nowMobile;
        this.drawerVisible = false;
        this.buildUI();
      }
    });
  }
}
