import { debounce } from 'lodash';
import type { GradientConfig, GradientType } from './gradientEngine';
import type { NoiseConfig } from './noiseLayer';

export interface UIState {
  gradient: GradientConfig;
  noise: NoiseConfig;
}

type StateChangeCallback = (state: UIState) => void;

export class UIController {
  private container: HTMLElement;
  private onChange: StateChangeCallback;
  private state: UIState;
  private debouncedUpdate: () => void;

  private colorStartInput!: HTMLInputElement;
  private colorMiddleInput!: HTMLInputElement;
  private colorEndInput!: HTMLInputElement;
  private angleInput!: HTMLInputElement;
  private angleValue!: HTMLElement;
  private gradientTypeSelect!: HTMLSelectElement;
  private noiseToggle!: HTMLInputElement;
  private noiseDensityInput!: HTMLInputElement;
  private noiseDensityValue!: HTMLElement;
  private cssCodeBlock!: HTMLElement;
  private copyButton!: HTMLButtonElement;

  private sectionBasics!: HTMLElement;
  private sectionNoise!: HTMLElement;
  private sectionExport!: HTMLElement;

  constructor(container: HTMLElement, onChange: StateChangeCallback, initialState: UIState) {
    this.container = container;
    this.onChange = onChange;
    this.state = initialState;
    this.debouncedUpdate = debounce(() => this.emitChange(), 30);

    this.buildUI();
    this.bindEvents();
    this.syncUIState();
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div class="control-panel">
        <h1 class="app-title">CSS 渐变生成器</h1>

        <div class="section" data-section="basics">
          <button class="section-header" type="button">
            <span>基础渐变参数</span>
            <span class="chevron">▼</span>
          </button>
          <div class="section-content">
            <div class="control-group">
              <label>起始颜色</label>
              <div class="color-row">
                <input type="color" class="color-picker" id="colorStart" />
                <span class="color-hex" id="colorStartHex"></span>
              </div>
            </div>
            <div class="control-group">
              <label>中间颜色</label>
              <div class="color-row">
                <input type="color" class="color-picker" id="colorMiddle" />
                <span class="color-hex" id="colorMiddleHex"></span>
              </div>
            </div>
            <div class="control-group">
              <label>终止颜色</label>
              <div class="color-row">
                <input type="color" class="color-picker" id="colorEnd" />
                <span class="color-hex" id="colorEndHex"></span>
              </div>
            </div>
            <div class="control-group">
              <div class="slider-row">
                <label>渐变角度</label>
                <span class="value-display" id="angleValue">90°</span>
              </div>
              <input type="range" class="slider" id="angleInput" min="0" max="360" step="1" value="90" />
            </div>
            <div class="control-group">
              <label>渐变类型</label>
              <select class="select" id="gradientTypeSelect">
                <option value="linear">Linear (线性)</option>
                <option value="radial">Radial (径向)</option>
                <option value="conic">Conic (角度)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="section" data-section="noise">
          <button class="section-header" type="button">
            <span>噪声叠加层</span>
            <span class="chevron">▼</span>
          </button>
          <div class="section-content">
            <div class="control-group">
              <div class="toggle-row">
                <label>启用噪点</label>
                <label class="switch">
                  <input type="checkbox" id="noiseToggle" />
                  <span class="slider-toggle"></span>
                </label>
              </div>
            </div>
            <div class="control-group" id="noiseControls" style="display:none;">
              <div class="slider-row">
                <label>噪点密度</label>
                <span class="value-display" id="noiseDensityValue">0.50</span>
              </div>
              <input type="range" class="slider" id="noiseDensityInput" min="0" max="1" step="0.01" value="0.5" />
            </div>
          </div>
        </div>

        <div class="section" data-section="export">
          <button class="section-header" type="button">
            <span>CSS 代码导出</span>
            <span class="chevron">▼</span>
          </button>
          <div class="section-content">
            <div class="export-group">
              <pre class="code-block" id="cssCodeBlock"></pre>
              <button class="copy-button" id="copyButton" type="button">
                <span class="copy-text">复制代码</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.colorStartInput = this.container.querySelector('#colorStart') as HTMLInputElement;
    this.colorMiddleInput = this.container.querySelector('#colorMiddle') as HTMLInputElement;
    this.colorEndInput = this.container.querySelector('#colorEnd') as HTMLInputElement;
    this.angleInput = this.container.querySelector('#angleInput') as HTMLInputElement;
    this.angleValue = this.container.querySelector('#angleValue') as HTMLElement;
    this.gradientTypeSelect = this.container.querySelector('#gradientTypeSelect') as HTMLSelectElement;
    this.noiseToggle = this.container.querySelector('#noiseToggle') as HTMLInputElement;
    this.noiseDensityInput = this.container.querySelector('#noiseDensityInput') as HTMLInputElement;
    this.noiseDensityValue = this.container.querySelector('#noiseDensityValue') as HTMLElement;
    this.cssCodeBlock = this.container.querySelector('#cssCodeBlock') as HTMLElement;
    this.copyButton = this.container.querySelector('#copyButton') as HTMLButtonElement;

    this.sectionBasics = this.container.querySelector('[data-section="basics"]') as HTMLElement;
    this.sectionNoise = this.container.querySelector('[data-section="noise"]') as HTMLElement;
    this.sectionExport = this.container.querySelector('[data-section="export"]') as HTMLElement;
  }

  private bindEvents(): void {
    this.colorStartInput.addEventListener('input', () => {
      this.state.gradient.colors[0] = this.colorStartInput.value;
      this.updateColorHexDisplay();
      this.debouncedUpdate();
    });

    this.colorMiddleInput.addEventListener('input', () => {
      this.state.gradient.colors[1] = this.colorMiddleInput.value;
      this.updateColorHexDisplay();
      this.debouncedUpdate();
    });

    this.colorEndInput.addEventListener('input', () => {
      this.state.gradient.colors[2] = this.colorEndInput.value;
      this.updateColorHexDisplay();
      this.debouncedUpdate();
    });

    this.angleInput.addEventListener('input', () => {
      this.state.gradient.angle = Number(this.angleInput.value);
      this.angleValue.textContent = `${this.state.gradient.angle}°`;
      this.debouncedUpdate();
    });

    this.gradientTypeSelect.addEventListener('change', () => {
      this.state.gradient.type = this.gradientTypeSelect.value as GradientType;
      const isAngleDisabled = this.state.gradient.type === 'radial';
      this.angleInput.disabled = isAngleDisabled;
      this.angleInput.style.opacity = isAngleDisabled ? '0.4' : '1';
      this.emitChange();
    });

    this.noiseToggle.addEventListener('change', () => {
      this.state.noise.enabled = this.noiseToggle.checked;
      const noiseControls = this.container.querySelector('#noiseControls') as HTMLElement;
      noiseControls.style.display = this.state.noise.enabled ? 'block' : 'none';
      this.emitChange();
    });

    this.noiseDensityInput.addEventListener('input', () => {
      this.state.noise.density = Number(this.noiseDensityInput.value);
      this.noiseDensityValue.textContent = this.state.noise.density.toFixed(2);
      this.debouncedUpdate();
    });

    [this.sectionBasics, this.sectionNoise, this.sectionExport].forEach((section) => {
      const header = section.querySelector('.section-header') as HTMLElement;
      header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
      });
    });
  }

  private updateColorHexDisplay(): void {
    const startHex = this.container.querySelector('#colorStartHex') as HTMLElement;
    const middleHex = this.container.querySelector('#colorMiddleHex') as HTMLElement;
    const endHex = this.container.querySelector('#colorEndHex') as HTMLElement;
    startHex.textContent = this.colorStartInput.value.toUpperCase();
    middleHex.textContent = this.colorMiddleInput.value.toUpperCase();
    endHex.textContent = this.colorEndInput.value.toUpperCase();
  }

  private syncUIState(): void {
    this.colorStartInput.value = this.state.gradient.colors[0];
    this.colorMiddleInput.value = this.state.gradient.colors[1];
    this.colorEndInput.value = this.state.gradient.colors[2];
    this.angleInput.value = String(this.state.gradient.angle);
    this.gradientTypeSelect.value = this.state.gradient.type;
    this.noiseToggle.checked = this.state.noise.enabled;
    this.noiseDensityInput.value = String(this.state.noise.density);

    this.updateColorHexDisplay();
    this.angleValue.textContent = `${this.state.gradient.angle}°`;
    this.noiseDensityValue.textContent = this.state.noise.density.toFixed(2);

    const noiseControls = this.container.querySelector('#noiseControls') as HTMLElement;
    noiseControls.style.display = this.state.noise.enabled ? 'block' : 'none';

    const isAngleDisabled = this.state.gradient.type === 'radial';
    this.angleInput.disabled = isAngleDisabled;
    this.angleInput.style.opacity = isAngleDisabled ? '0.4' : '1';
  }

  private emitChange(): void {
    this.onChange({ ...this.state });
  }

  getState(): UIState {
    return { ...this.state };
  }

  setState(partial: Partial<UIState>): void {
    if (partial.gradient) {
      this.state.gradient = { ...this.state.gradient, ...partial.gradient };
    }
    if (partial.noise) {
      this.state.noise = { ...this.state.noise, ...partial.noise };
    }
    this.syncUIState();
  }

  updateCSSCode(code: string): void {
    this.cssCodeBlock.textContent = code;
  }

  getCopyButton(): HTMLButtonElement {
    return this.copyButton;
  }

  setupResponsiveLayout(): void {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 700;
      this.container.classList.toggle('mobile-layout', isMobile);
    };

    handleResize();
    window.addEventListener('resize', debounce(handleResize, 100));
  }
}
