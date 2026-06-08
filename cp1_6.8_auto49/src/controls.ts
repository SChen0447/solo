import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ControlParams {
  colorStart: string;
  colorEnd: string;
  particleDensity: number;
  waveSpeed: number;
}

export type ControlChangeCallback = (params: ControlParams) => void;

export class UIControls {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;
  private onParamsChange: ControlChangeCallback;
  private params: ControlParams;
  private panel: HTMLDivElement;
  private toggleButton: HTMLButtonElement;
  private isPanelOpen: boolean = true;
  private isMobile: boolean = false;
  private colorStartInput: HTMLInputElement;
  private colorEndInput: HTMLInputElement;
  private densitySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private densityValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    initialParams: ControlParams,
    onParamsChange: ControlChangeCallback
  ) {
    this.container = container;
    this.camera = camera;
    this.renderer = renderer;
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupOrbitControls();

    this.panel = document.createElement('div');
    this.toggleButton = document.createElement('button');
    this.colorStartInput = document.createElement('input');
    this.colorEndInput = document.createElement('input');
    this.densitySlider = document.createElement('input');
    this.speedSlider = document.createElement('input');
    this.densityValue = document.createElement('span');
    this.speedValue = document.createElement('span');

    this.checkMobile();
    this.createPanel();
    this.setupEventListeners();
  }

  private setupOrbitControls(): void {
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.enablePan = true;
    this.orbitControls.enableZoom = true;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 50;
    this.orbitControls.minPolarAngle = 0.1;
    this.orbitControls.maxPolarAngle = Math.PI - 0.1;
    this.orbitControls.screenSpacePanning = true;
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private createPanel(): void {
    this.panel.className = 'control-panel';
    this.panel.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 280px;
      padding: 20px;
      background: rgba(20, 20, 30, 0.6);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 14px;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.33, 1, 0.68, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    const title = document.createElement('div');
    title.textContent = '极光控制台';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
      letter-spacing: 1px;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    `;
    this.panel.appendChild(title);

    const colorSection = this.createColorSection();
    this.panel.appendChild(colorSection);

    const densitySection = this.createSliderSection(
      '粒子密度',
      'density',
      this.params.particleDensity,
      4000,
      12000,
      100,
      this.densitySlider,
      this.densityValue,
      '个'
    );
    this.panel.appendChild(densitySection);

    const speedSection = this.createSliderSection(
      '波动速度',
      'speed',
      this.params.waveSpeed,
      0.1,
      3.0,
      0.1,
      this.speedSlider,
      this.speedValue,
      'x'
    );
    this.panel.appendChild(speedSection);

    this.container.appendChild(this.panel);

    this.createToggleButton();

    if (this.isMobile) {
      this.closePanel();
    }
  }

  private createColorSection(): HTMLDivElement {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';

    const label = document.createElement('div');
    label.textContent = '极光颜色';
    label.style.cssText = `
      margin-bottom: 8px;
      font-size: 13px;
      opacity: 0.9;
    `;
    section.appendChild(label);

    const colorContainer = document.createElement('div');
    colorContainer.style.cssText = `
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    const startLabel = document.createElement('span');
    startLabel.textContent = '起始';
    startLabel.style.fontSize = '11px';
    startLabel.style.opacity = '0.7';

    this.colorStartInput.type = 'color';
    this.colorStartInput.value = this.params.colorStart;
    this.colorStartInput.style.cssText = `
      width: 50px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    const gradientPreview = document.createElement('div');
    gradientPreview.style.cssText = `
      flex: 1;
      height: 20px;
      border-radius: 10px;
      background: linear-gradient(90deg, ${this.params.colorStart}, ${this.params.colorEnd});
      transition: background 0.3s ease;
    `;
    gradientPreview.className = 'gradient-preview';

    const endLabel = document.createElement('span');
    endLabel.textContent = '结束';
    endLabel.style.fontSize = '11px';
    endLabel.style.opacity = '0.7';

    this.colorEndInput.type = 'color';
    this.colorEndInput.value = this.params.colorEnd;
    this.colorEndInput.style.cssText = `
      width: 50px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    `;

    colorContainer.appendChild(startLabel);
    colorContainer.appendChild(this.colorStartInput);
    colorContainer.appendChild(gradientPreview);
    colorContainer.appendChild(this.colorEndInput);
    colorContainer.appendChild(endLabel);

    section.appendChild(colorContainer);

    return section;
  }

  private createSliderSection(
    label: string,
    name: string,
    value: number,
    min: number,
    max: number,
    step: number,
    slider: HTMLInputElement,
    valueDisplay: HTMLSpanElement,
    unit: string
  ): HTMLDivElement {
    const section = document.createElement('div');
    section.style.marginBottom = '16px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    `;

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelText.style.cssText = `
      font-size: 13px;
      opacity: 0.9;
    `;

    valueDisplay.textContent = name === 'density' 
      ? Math.round(value).toString() + unit 
      : value.toFixed(1) + unit;
    valueDisplay.style.cssText = `
      font-size: 13px;
      font-weight: 600;
      color: #a78bfa;
      min-width: 50px;
      text-align: right;
      transition: color 0.3s ease;
    `;

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueDisplay);
    section.appendChild(labelRow);

    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = value.toString();
    slider.name = name;
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
    `;

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover,
      input[type="range"]:active::-webkit-slider-thumb {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
      }
      input[type="range"]::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #fff;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      input[type="color"]::-webkit-color-swatch-wrapper {
        padding: 0;
      }
      input[type="color"]::-webkit-color-swatch {
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
      }
    `;
    document.head.appendChild(sliderStyle);

    section.appendChild(slider);

    return section;
  }

  private createToggleButton(): void {
    this.toggleButton.className = 'control-toggle';
    this.toggleButton.innerHTML = '⚡';
    this.toggleButton.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: rgba(139, 92, 246, 0.8);
      backdrop-filter: blur(10px);
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      z-index: 1001;
      display: none;
      transition: all 0.3s cubic-bezier(0.33, 1, 0.68, 1);
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
    `;
    this.container.appendChild(this.toggleButton);
  }

  private setupEventListeners(): void {
    this.colorStartInput.addEventListener('input', () => {
      this.params.colorStart = this.colorStartInput.value;
      this.updateGradientPreview();
      this.notifyChange();
    });

    this.colorEndInput.addEventListener('input', () => {
      this.params.colorEnd = this.colorEndInput.value;
      this.updateGradientPreview();
      this.notifyChange();
    });

    this.densitySlider.addEventListener('input', () => {
      const value = parseFloat(this.densitySlider.value);
      this.params.particleDensity = value;
      this.densityValue.textContent = Math.round(value).toString() + '个';
      this.notifyChange();
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.params.waveSpeed = value;
      this.speedValue.textContent = value.toFixed(1) + 'x';
      this.notifyChange();
    });

    this.toggleButton.addEventListener('click', () => {
      if (this.isPanelOpen) {
        this.closePanel();
      } else {
        this.openPanel();
      }
    });

    window.addEventListener('resize', () => {
      this.checkMobile();
      if (this.isMobile) {
        this.closePanel();
      } else {
        this.openPanel();
      }
    });

    [this.colorStartInput, this.colorEndInput].forEach(input => {
      input.addEventListener('mousedown', () => {
        input.style.transform = 'scale(1.1)';
        input.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
      });
      input.addEventListener('mouseup', () => {
        input.style.transform = 'scale(1)';
        input.style.boxShadow = 'none';
      });
      input.addEventListener('mouseleave', () => {
        input.style.transform = 'scale(1)';
        input.style.boxShadow = 'none';
      });
    });
  }

  private updateGradientPreview(): void {
    const preview = this.panel.querySelector('.gradient-preview') as HTMLDivElement;
    if (preview) {
      preview.style.background = `linear-gradient(90deg, ${this.params.colorStart}, ${this.params.colorEnd})`;
    }
  }

  private openPanel(): void {
    this.isPanelOpen = true;
    this.panel.style.display = 'block';
    this.panel.style.opacity = '1';
    this.panel.style.transform = 'translateY(0)';
    this.toggleButton.style.display = 'none';
  }

  private closePanel(): void {
    this.isPanelOpen = false;
    this.panel.style.opacity = '0';
    this.panel.style.transform = 'translateY(20px)';
    setTimeout(() => {
      if (!this.isPanelOpen) {
        this.panel.style.display = 'none';
      }
    }, 300);
    this.toggleButton.style.display = 'flex';
    this.toggleButton.style.alignItems = 'center';
    this.toggleButton.style.justifyContent = 'center';
  }

  private notifyChange(): void {
    this.onParamsChange({ ...this.params });
  }

  public update(): void {
    this.orbitControls.update();
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.orbitControls.dispose();
    this.panel.remove();
    this.toggleButton.remove();
  }
}
