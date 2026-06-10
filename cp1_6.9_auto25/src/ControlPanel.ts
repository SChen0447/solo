export interface ControlPanelCallbacks {
  onHueChange: (hue: number) => void;
  onEnergyChange: (energy: number) => void;
  onWavelengthChange: (wavelength: number) => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private hueSlider: HTMLInputElement;
  private energySlider: HTMLInputElement;
  private wavelengthInput: HTMLInputElement;
  private hueValueDisplay: HTMLElement;
  private energyValueDisplay: HTMLElement;
  private callbacks: ControlPanelCallbacks;

  private currentHue = 50;
  private currentEnergy = 0.5;
  private currentWavelength = 560;

  constructor(callbacks: ControlPanelCallbacks) {
    this.callbacks = callbacks;
    this.container = this.createContainer();
    this.hueSlider = this.createHueSlider();
    this.energySlider = this.createEnergySlider();
    this.wavelengthInput = this.createWavelengthInput();
    this.hueValueDisplay = this.createValueDisplay();
    this.energyValueDisplay = this.createValueDisplay();

    this.buildPanel();
    this.bindEvents();

    document.getElementById('app')!.appendChild(this.container);
  }

  private createContainer(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.top = '24px';
    panel.style.right = '24px';
    panel.style.width = '280px';
    panel.style.padding = '24px';
    panel.style.background = 'rgba(20, 20, 30, 0.7)';
    panel.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    panel.style.borderRadius = '12px';
    panel.style.backdropFilter = 'blur(10px)';
    panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
    panel.style.color = '#fff';
    panel.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    panel.style.zIndex = '100';
    panel.style.userSelect = 'none';
    return panel;
  }

  private createHueSlider(): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '360';
    slider.step = '1';
    slider.value = this.currentHue.toString();
    return slider;
  }

  private createEnergySlider(): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.1';
    slider.max = '1.0';
    slider.step = '0.05';
    slider.value = this.currentEnergy.toString();
    return slider;
  }

  private createWavelengthInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '380';
    input.max = '780';
    input.step = '1';
    input.value = this.currentWavelength.toString();
    return input;
  }

  private createValueDisplay(): HTMLElement {
    const span = document.createElement('span');
    span.style.float = 'right';
    span.style.color = '#00d4ff';
    span.style.fontFamily = 'monospace';
    span.style.fontSize = '13px';
    return span;
  }

  private styleSlider(slider: HTMLInputElement): void {
    slider.style.width = '100%';
    slider.style.height = '6px';
    slider.style.appearance = 'none';
    slider.style.background = 'rgba(255, 255, 255, 0.1)';
    slider.style.borderRadius = '3px';
    slider.style.outline = 'none';
    slider.style.cursor = 'pointer';
    slider.style.marginTop = '8px';
  }

  private styleInput(input: HTMLInputElement): void {
    input.style.width = '100%';
    input.style.padding = '10px 12px';
    input.style.background = 'rgba(255, 255, 255, 0.05)';
    input.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    input.style.borderRadius = '6px';
    input.style.color = '#fff';
    input.style.fontSize = '14px';
    input.style.fontFamily = 'monospace';
    input.style.outline = 'none';
    input.style.transition = 'border-color 0.2s ease, box-shadow 0.2s ease';
    input.style.marginTop = '8px';
    input.style.boxSizing = 'border-box';
  }

  private createLabel(text: string): HTMLLabelElement {
    const label = document.createElement('label');
    label.textContent = text;
    label.style.display = 'block';
    label.style.fontSize = '13px';
    label.style.color = 'rgba(255, 255, 255, 0.8)';
    label.style.marginTop = '16px';
    label.style.letterSpacing = '0.5px';
    return label;
  }

  private createTitle(): HTMLElement {
    const title = document.createElement('div');
    title.textContent = '光 能 控 制 面 板';
    title.style.fontSize = '14px';
    title.style.fontWeight = '600';
    title.style.letterSpacing = '3px';
    title.style.marginBottom = '8px';
    title.style.color = '#fff';
    title.style.textAlign = 'center';
    return title;
  }

  private createDivider(): HTMLElement {
    const divider = document.createElement('div');
    divider.style.height = '1px';
    divider.style.background = 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)';
    divider.style.margin = '12px 0 4px 0';
    return divider;
  }

  private buildPanel(): void {
    this.styleSlider(this.hueSlider);
    this.styleSlider(this.energySlider);
    this.styleInput(this.wavelengthInput);

    this.container.appendChild(this.createTitle());
    this.container.appendChild(this.createDivider());

    const hueLabel = this.createLabel('色相 (Hue)');
    hueLabel.appendChild(this.hueValueDisplay);
    this.hueValueDisplay.textContent = `${this.currentHue}°`;
    this.container.appendChild(hueLabel);
    this.container.appendChild(this.hueSlider);

    const energyLabel = this.createLabel('能量强度 (Energy)');
    energyLabel.appendChild(this.energyValueDisplay);
    this.energyValueDisplay.textContent = `${Math.round(this.currentEnergy * 100)}%`;
    this.container.appendChild(energyLabel);
    this.container.appendChild(this.energySlider);

    const wavelengthLabel = this.createLabel('波长 (Wavelength / nm)');
    this.container.appendChild(wavelengthLabel);
    this.container.appendChild(this.wavelengthInput);

    this.injectStyles();
  }

  private injectStyles(): void {
    const styleId = 'crystal-control-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00d4ff;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 18px rgba(0, 212, 255, 0.9);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #00d4ff;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 0 12px rgba(0, 212, 255, 0.6);
      }
      input[type="number"]:focus {
        border-color: #00d4ff !important;
        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2) !important;
      }
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.hueSlider.addEventListener('input', (e) => {
      const hue = parseFloat((e.target as HTMLInputElement).value);
      this.currentHue = hue;
      this.hueValueDisplay.textContent = `${hue}°`;
      this.currentWavelength = Math.round(this.hueToWavelength(hue));
      this.wavelengthInput.value = this.currentWavelength.toString();
      this.callbacks.onHueChange(hue);
      this.callbacks.onWavelengthChange(this.currentWavelength);
    });

    this.energySlider.addEventListener('input', (e) => {
      const energy = parseFloat((e.target as HTMLInputElement).value);
      this.currentEnergy = energy;
      this.energyValueDisplay.textContent = `${Math.round(energy * 100)}%`;
      this.callbacks.onEnergyChange(energy);
    });

    this.wavelengthInput.addEventListener('input', (e) => {
      let wavelength = parseFloat((e.target as HTMLInputElement).value);
      wavelength = Math.max(380, Math.min(780, wavelength));
      if (!isNaN(wavelength)) {
        this.currentWavelength = wavelength;
        const hue = this.wavelengthToHue(wavelength);
        this.currentHue = hue;
        this.hueSlider.value = hue.toString();
        this.hueValueDisplay.textContent = `${Math.round(hue)}°`;
        this.callbacks.onWavelengthChange(wavelength);
        this.callbacks.onHueChange(hue);
      }
    });
  }

  private wavelengthToHue(wavelength: number): number {
    const clamped = Math.max(380, Math.min(780, wavelength));
    const normalized = (clamped - 380) / 400;
    return normalized * 300;
  }

  private hueToWavelength(hue: number): number {
    const normalized = (hue % 360) / 300;
    return 380 + Math.max(0, Math.min(1, normalized)) * 400;
  }

  setHue(hue: number): void {
    this.currentHue = hue;
    this.hueSlider.value = hue.toString();
    this.hueValueDisplay.textContent = `${Math.round(hue)}°`;
  }

  setEnergy(energy: number): void {
    this.currentEnergy = energy;
    this.energySlider.value = energy.toString();
    this.energyValueDisplay.textContent = `${Math.round(energy * 100)}%`;
  }

  setWavelength(wavelength: number): void {
    this.currentWavelength = wavelength;
    this.wavelengthInput.value = wavelength.toString();
  }

  dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
