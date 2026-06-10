import { ParticleParams } from './FluidParticleSystem';

export type ParamChangeCallback = (params: Partial<ParticleParams>) => void;
export type ExportCallback = () => void;

export class GUIController {
  private params: ParticleParams;
  private onParamChange: ParamChangeCallback;
  private onExport: ExportCallback;

  private flowSpeedInput: HTMLInputElement;
  private turbulenceInput: HTMLInputElement;
  private hueOffsetInput: HTMLInputElement;
  private particleSizeInput: HTMLInputElement;
  private emissionRateInput: HTMLInputElement;

  private flowSpeedValue: HTMLElement;
  private turbulenceValue: HTMLElement;
  private hueOffsetValue: HTMLElement;
  private particleSizeValue: HTMLElement;
  private emissionRateValue: HTMLElement;

  private guiPanel: HTMLElement;
  private mobileToggle: HTMLElement;
  private isMobileOpen: boolean = false;

  constructor(
    onParamChange: ParamChangeCallback,
    onExport: ExportCallback
  ) {
    this.onParamChange = onParamChange;
    this.onExport = onExport;

    this.params = {
      flowSpeed: 1.2,
      turbulence: 0.4,
      hueOffset: 180,
      particleSize: 0.3,
      emissionRate: 0.6
    };

    this.flowSpeedInput = document.getElementById('flowSpeed') as HTMLInputElement;
    this.turbulenceInput = document.getElementById('turbulence') as HTMLInputElement;
    this.hueOffsetInput = document.getElementById('hueOffset') as HTMLInputElement;
    this.particleSizeInput = document.getElementById('particleSize') as HTMLInputElement;
    this.emissionRateInput = document.getElementById('emissionRate') as HTMLInputElement;

    this.flowSpeedValue = document.getElementById('flowSpeed-value') as HTMLElement;
    this.turbulenceValue = document.getElementById('turbulence-value') as HTMLElement;
    this.hueOffsetValue = document.getElementById('hueOffset-value') as HTMLElement;
    this.particleSizeValue = document.getElementById('particleSize-value') as HTMLElement;
    this.emissionRateValue = document.getElementById('emissionRate-value') as HTMLElement;

    this.guiPanel = document.getElementById('gui-panel') as HTMLElement;
    this.mobileToggle = document.getElementById('mobile-toggle') as HTMLElement;

    this.bindEvents();
    this.updateValueDisplays();
  }

  private bindEvents(): void {
    this.flowSpeedInput.addEventListener('input', this.handleFlowSpeedChange.bind(this));
    this.turbulenceInput.addEventListener('input', this.handleTurbulenceChange.bind(this));
    this.hueOffsetInput.addEventListener('input', this.handleHueOffsetChange.bind(this));
    this.particleSizeInput.addEventListener('input', this.handleParticleSizeChange.bind(this));
    this.emissionRateInput.addEventListener('input', this.handleEmissionRateChange.bind(this));

    this.addSliderHighlight(this.flowSpeedInput);
    this.addSliderHighlight(this.turbulenceInput);
    this.addSliderHighlight(this.hueOffsetInput);
    this.addSliderHighlight(this.particleSizeInput);
    this.addSliderHighlight(this.emissionRateInput);

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.onExport());
    }

    this.mobileToggle.addEventListener('click', this.toggleMobilePanel.bind(this));
  }

  private addSliderHighlight(input: HTMLInputElement): void {
    input.addEventListener('mousedown', () => {
      input.parentElement?.classList.add('slider-active');
    });
    input.addEventListener('mouseup', () => {
      input.parentElement?.classList.remove('slider-active');
    });
    input.addEventListener('touchstart', () => {
      input.parentElement?.classList.add('slider-active');
    });
    input.addEventListener('touchend', () => {
      input.parentElement?.classList.remove('slider-active');
    });
  }

  private handleFlowSpeedChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.params.flowSpeed = parseFloat(target.value);
    this.flowSpeedValue.textContent = this.params.flowSpeed.toFixed(1);
    this.onParamChange({ flowSpeed: this.params.flowSpeed });
  }

  private handleTurbulenceChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.params.turbulence = parseFloat(target.value);
    this.turbulenceValue.textContent = this.params.turbulence.toFixed(2);
    this.onParamChange({ turbulence: this.params.turbulence });
  }

  private handleHueOffsetChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.params.hueOffset = parseInt(target.value, 10);
    this.hueOffsetValue.textContent = `${this.params.hueOffset}°`;
    this.onParamChange({ hueOffset: this.params.hueOffset });
  }

  private handleParticleSizeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.params.particleSize = parseFloat(target.value);
    this.particleSizeValue.textContent = this.params.particleSize.toFixed(2);
    this.onParamChange({ particleSize: this.params.particleSize });
  }

  private handleEmissionRateChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.params.emissionRate = parseFloat(target.value);
    this.emissionRateValue.textContent = this.params.emissionRate.toFixed(2);
    this.onParamChange({ emissionRate: this.params.emissionRate });
  }

  private toggleMobilePanel(): void {
    this.isMobileOpen = !this.isMobileOpen;
    if (this.isMobileOpen) {
      this.guiPanel.classList.add('mobile-open');
      this.mobileToggle.classList.add('expanded');
    } else {
      this.guiPanel.classList.remove('mobile-open');
      this.mobileToggle.classList.remove('expanded');
    }
  }

  private updateValueDisplays(): void {
    this.flowSpeedValue.textContent = this.params.flowSpeed.toFixed(1);
    this.turbulenceValue.textContent = this.params.turbulence.toFixed(2);
    this.hueOffsetValue.textContent = `${this.params.hueOffset}°`;
    this.particleSizeValue.textContent = this.params.particleSize.toFixed(2);
    this.emissionRateValue.textContent = this.params.emissionRate.toFixed(2);
  }

  getParams(): ParticleParams {
    return { ...this.params };
  }
}
