import { presets, NebulaPreset, defaultPhysicsParams } from './presets';

export interface ControlState {
  selectedPreset: NebulaPreset;
  mixWeight: number;
  starWind: number;
  gravity: number;
  lifetime: number;
  onPresetChange?: (preset: NebulaPreset) => void;
  onMixWeightChange?: (value: number) => void;
  onStarWindChange?: (value: number) => void;
  onGravityChange?: (value: number) => void;
  onLifetimeChange?: (value: number) => void;
  onCapture?: () => void;
  onReset?: () => void;
}

export class Controls {
  state: ControlState;
  private colorPalette: HTMLElement;
  private mixWeightSlider: HTMLInputElement;
  private mixWeightValue: HTMLElement;
  private starWindSlider: HTMLInputElement;
  private starWindValue: HTMLElement;
  private gravitySlider: HTMLInputElement;
  private gravityValue: HTMLElement;
  private lifetimeSlider: HTMLInputElement;
  private lifetimeValue: HTMLElement;
  private captureBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private presetBtns: NodeListOf<HTMLElement>;
  private nebulaName: HTMLElement;
  private previewModal: HTMLElement;
  private previewImage: HTMLImageElement;
  private downloadLink: HTMLAnchorElement;
  private closeModal: HTMLElement;

  constructor() {
    this.state = {
      selectedPreset: presets[0],
      mixWeight: 50,
      starWind: defaultPhysicsParams.starWind,
      gravity: defaultPhysicsParams.gravity,
      lifetime: defaultPhysicsParams.lifetime,
    };

    this.colorPalette = document.getElementById('color-palette')!;
    this.mixWeightSlider = document.getElementById('mix-weight') as HTMLInputElement;
    this.mixWeightValue = document.getElementById('mix-weight-value')!;
    this.starWindSlider = document.getElementById('star-wind') as HTMLInputElement;
    this.starWindValue = document.getElementById('star-wind-value')!;
    this.gravitySlider = document.getElementById('gravity') as HTMLInputElement;
    this.gravityValue = document.getElementById('gravity-value')!;
    this.lifetimeSlider = document.getElementById('lifetime') as HTMLInputElement;
    this.lifetimeValue = document.getElementById('lifetime-value')!;
    this.captureBtn = document.getElementById('capture-btn')!;
    this.resetBtn = document.getElementById('reset-btn')!;
    this.presetBtns = document.querySelectorAll('.preset-btn');
    this.nebulaName = document.getElementById('nebula-name')!;
    this.previewModal = document.getElementById('preview-modal')!;
    this.previewImage = document.getElementById('preview-image') as HTMLImageElement;
    this.downloadLink = document.getElementById('download-link') as HTMLAnchorElement;
    this.closeModal = document.getElementById('close-modal')!;

    this.initColorPalette();
    this.bindEvents();
    this.updateUI();
  }

  private initColorPalette(): void {
    this.colorPalette.innerHTML = '';
    for (const preset of presets) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.dataset.presetId = preset.id;
      swatch.style.backgroundColor = preset.color;
      swatch.style.color = preset.color;
      swatch.title = preset.name;

      if (preset.id === this.state.selectedPreset.id) {
        swatch.classList.add('selected');
      }

      swatch.addEventListener('click', () => {
        this.selectPreset(preset.id);
      });

      this.colorPalette.appendChild(swatch);
    }
  }

  private bindEvents(): void {
    this.mixWeightSlider.addEventListener('input', () => {
      const value = parseInt(this.mixWeightSlider.value);
      this.state.mixWeight = value;
      this.mixWeightValue.textContent = `${value}%`;
      if (this.state.onMixWeightChange) {
        this.state.onMixWeightChange(value);
      }
    });

    this.starWindSlider.addEventListener('input', () => {
      const value = parseInt(this.starWindSlider.value);
      this.state.starWind = value;
      this.starWindValue.textContent = value.toString();
      if (this.state.onStarWindChange) {
        this.state.onStarWindChange(value);
      }
    });

    this.gravitySlider.addEventListener('input', () => {
      const value = parseInt(this.gravitySlider.value);
      this.state.gravity = value;
      this.gravityValue.textContent = value.toString();
      if (this.state.onGravityChange) {
        this.state.onGravityChange(value);
      }
    });

    this.lifetimeSlider.addEventListener('input', () => {
      const value = parseFloat(this.lifetimeSlider.value);
      this.state.lifetime = value;
      this.lifetimeValue.textContent = `${value}s`;
      if (this.state.onLifetimeChange) {
        this.state.onLifetimeChange(value);
      }
    });

    this.captureBtn.addEventListener('click', () => {
      if (this.state.onCapture) {
        this.state.onCapture();
      }
    });

    this.resetBtn.addEventListener('click', () => {
      if (this.state.onReset) {
        this.state.onReset();
      }
    });

    this.presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.dataset.preset;
        if (presetId) {
          this.selectPreset(presetId);
        }
      });
    });

    this.closeModal.addEventListener('click', () => {
      this.hidePreview();
    });

    const overlay = this.previewModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this.hidePreview();
      });
    }
  }

  private selectPreset(presetId: string): void {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    this.state.selectedPreset = preset;
    this.updateNebulaName();
    this.updateColorPaletteSelection();
    this.updatePresetBtnSelection();

    if (this.state.onPresetChange) {
      this.state.onPresetChange(preset);
    }
  }

  private updateColorPaletteSelection(): void {
    const swatches = this.colorPalette.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      const el = swatch as HTMLElement;
      if (el.dataset.presetId === this.state.selectedPreset.id) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  private updatePresetBtnSelection(): void {
    this.presetBtns.forEach((btn) => {
      if (btn.dataset.preset === this.state.selectedPreset.id) {
        btn.style.borderColor = '#00bcd4';
        btn.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.5)';
      } else {
        btn.style.borderColor = 'rgba(0, 188, 212, 0.5)';
        btn.style.boxShadow = 'none';
      }
    });
  }

  private updateNebulaName(): void {
    this.nebulaName.textContent = this.state.selectedPreset.name;
    this.nebulaName.style.color = this.state.selectedPreset.color;
  }

  private updateUI(): void {
    this.updateNebulaName();
    this.updateColorPaletteSelection();
    this.updatePresetBtnSelection();

    this.mixWeightSlider.value = this.state.mixWeight.toString();
    this.mixWeightValue.textContent = `${this.state.mixWeight}%`;

    this.starWindSlider.value = this.state.starWind.toString();
    this.starWindValue.textContent = this.state.starWind.toString();

    this.gravitySlider.value = this.state.gravity.toString();
    this.gravityValue.textContent = this.state.gravity.toString();

    this.lifetimeSlider.value = this.state.lifetime.toString();
    this.lifetimeValue.textContent = `${this.state.lifetime}s`;
  }

  showPreview(dataUrl: string): void {
    this.previewImage.src = dataUrl;
    this.downloadLink.href = dataUrl;
    this.previewModal.classList.remove('hidden');
  }

  hidePreview(): void {
    this.previewModal.classList.add('hidden');
  }

  resetToDefaults(): void {
    this.state.starWind = defaultPhysicsParams.starWind;
    this.state.gravity = defaultPhysicsParams.gravity;
    this.state.lifetime = defaultPhysicsParams.lifetime;
    this.state.mixWeight = 50;
    this.updateUI();
  }

  getMixColor(
    baseR: number,
    baseG: number,
    baseB: number
  ): { r: number; g: number; b: number } {
    const t = this.state.mixWeight / 100;
    const preset = this.state.selectedPreset;
    return {
      r: Math.round(baseR + (preset.r - baseR) * t),
      g: Math.round(baseG + (preset.g - baseG) * t),
      b: Math.round(baseB + (preset.b - baseB) * t),
    };
  }
}
