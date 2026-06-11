import { gsap } from 'gsap';
import { MaterialPreset } from './MaterialSwitcher';

export interface UIPanelCallbacks {
  onMaterialSelect: (index: number) => void;
  onLightIntensityChange: (intensity: number) => void;
  onAmbientColorToggle: () => void;
  onResetView: () => void;
}

export class UIPanel {
  private container: HTMLElement;
  private callbacks: UIPanelCallbacks;
  private materialButtons: HTMLButtonElement[] = [];
  private currentMaterialIndex: number = 0;
  private isWarmColor: boolean = true;

  constructor(
    containerId: string,
    presets: MaterialPreset[],
    callbacks: UIPanelCallbacks
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI(presets);
  }

  private buildUI(presets: MaterialPreset[]): void {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '材质预览沙盘';
    this.container.appendChild(title);

    const materialSection = document.createElement('div');
    materialSection.className = 'panel-section';
    
    const materialLabel = document.createElement('div');
    materialLabel.className = 'section-label';
    materialLabel.textContent = '材质选择';
    materialSection.appendChild(materialLabel);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'material-buttons';

    presets.forEach((preset, index) => {
      const btn = this.createMaterialButton(preset, index);
      buttonsContainer.appendChild(btn);
      this.materialButtons.push(btn);
    });

    materialSection.appendChild(buttonsContainer);
    this.container.appendChild(materialSection);

    const divider1 = document.createElement('div');
    divider1.className = 'divider';
    this.container.appendChild(divider1);

    const lightSection = document.createElement('div');
    lightSection.className = 'panel-section';

    const lightLabel = document.createElement('div');
    lightLabel.className = 'section-label';
    lightLabel.textContent = '光照强度';
    lightSection.appendChild(lightLabel);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.2';
    slider.max = '2.0';
    slider.step = '0.1';
    slider.value = '1.0';

    const sliderValue = document.createElement('div');
    sliderValue.className = 'slider-value';
    sliderValue.textContent = '1.0';

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      sliderValue.textContent = value.toFixed(1);
      this.callbacks.onLightIntensityChange(value);
    });

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(sliderValue);
    lightSection.appendChild(sliderContainer);
    this.container.appendChild(lightSection);

    const divider2 = document.createElement('div');
    divider2.className = 'divider';
    this.container.appendChild(divider2);

    const ambientBtn = document.createElement('button');
    ambientBtn.className = 'action-btn';
    ambientBtn.innerHTML = '<span>🌙 切换夜晚冷色</span>';
    ambientBtn.addEventListener('click', () => {
      this.isWarmColor = !this.isWarmColor;
      if (this.isWarmColor) {
        ambientBtn.innerHTML = '<span>🌙 切换夜晚冷色</span>';
      } else {
        ambientBtn.innerHTML = '<span>☀️ 切换白天暖色</span>';
      }
      this.callbacks.onAmbientColorToggle();
    });
    this.container.appendChild(ambientBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'action-btn';
    resetBtn.innerHTML = '<span>🔄 重置视角</span>';
    resetBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
    this.container.appendChild(resetBtn);

    this.updateActiveButton(0);
  }

  private createMaterialButton(preset: MaterialPreset, index: number): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'material-btn';
    btn.dataset.index = index.toString();

    const swatch = document.createElement('div');
    swatch.className = 'material-swatch';
    swatch.style.backgroundColor = preset.swatchColor;

    const label = document.createElement('span');
    label.textContent = preset.name;

    btn.appendChild(swatch);
    btn.appendChild(label);

    btn.addEventListener('click', () => {
      this.selectMaterial(index);
    });

    return btn;
  }

  private selectMaterial(index: number): void {
    if (index === this.currentMaterialIndex) {
      this.triggerButtonPulse(this.materialButtons[index]);
      return;
    }

    this.updateActiveButton(index);
    this.callbacks.onMaterialSelect(index);
  }

  private updateActiveButton(index: number): void {
    this.materialButtons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('active');
        this.triggerButtonPulse(btn);
      } else {
        btn.classList.remove('active');
      }
    });
    this.currentMaterialIndex = index;
  }

  private triggerButtonPulse(btn: HTMLButtonElement): void {
    gsap.fromTo(btn,
      { boxShadow: '0 0 0 rgba(0, 212, 255, 0.8)' },
      {
        boxShadow: '0 0 25px rgba(0, 212, 255, 0.6)',
        duration: 0.15,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      }
    );
  }

  setActiveMaterial(index: number): void {
    if (index >= 0 && index < this.materialButtons.length) {
      this.updateActiveButton(index);
    }
  }

  destroy(): void {
    this.container.innerHTML = '';
    this.materialButtons = [];
  }
}
