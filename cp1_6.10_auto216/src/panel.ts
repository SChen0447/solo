export interface PanelValues {
  foldAmplitude: number;
  rotationX: number;
  offsetZ: number;
}

export const PANEL_UPDATE_EVENT = 'strata-panel-update';
export const PANEL_RESET_EVENT = 'strata-panel-reset';

export class ControlPanel {
  private container: HTMLElement;
  private foldSlider: HTMLInputElement;
  private tiltSlider: HTMLInputElement;
  private offsetSlider: HTMLInputElement;
  private foldValueLabel: HTMLElement;
  private tiltValueLabel: HTMLElement;
  private offsetValueLabel: HTMLElement;
  private resetButton: HTMLButtonElement;

  constructor() {
    this.container = this.createContainer();
    this.foldSlider = this.createSlider('foldAmplitude', 0, 2, 0.5, 0.01);
    this.tiltSlider = this.createSlider('rotationX', -45, 45, 0, 1);
    this.offsetSlider = this.createSlider('offsetZ', 0, 2, 0, 0.01);

    this.foldValueLabel = this.createValueLabel();
    this.tiltValueLabel = this.createValueLabel();
    this.offsetValueLabel = this.createValueLabel();

    this.resetButton = this.createResetButton();

    this.buildPanel();
    this.bindEvents();
    this.updateValueLabels();
  }

  private createContainer(): HTMLElement {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.zIndex = '1000';
    el.style.background = 'rgba(26, 26, 26, 0.85)';
    el.style.borderRadius = '10px';
    el.style.padding = '15px';
    el.style.minWidth = '260px';
    el.style.backdropFilter = 'blur(4px)';
    el.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    return el;
  }

  private createSlider(name: string, min: number, max: number, value: number, step: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.name = name;
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.step = String(step);
    slider.style.width = '200px';
    slider.style.appearance = 'none';
    slider.style.WebkitAppearance = 'none';
    slider.style.height = '6px';
    slider.style.borderRadius = '3px';
    slider.style.background = '#444';
    slider.style.outline = 'none';
    slider.style.cursor = 'pointer';
    return slider;
  }

  private createValueLabel(): HTMLElement {
    const label = document.createElement('span');
    label.style.color = '#ffffff';
    label.style.fontSize = '12px';
    label.style.marginLeft = '10px';
    label.style.minWidth = '50px';
    label.style.display = 'inline-block';
    label.style.textAlign = 'left';
    label.style.fontFamily = 'monospace';
    return label;
  }

  private createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '重置视角';
    btn.style.marginTop = '15px';
    btn.style.width = '100%';
    btn.style.minWidth = '120px';
    btn.style.height = '35px';
    btn.style.background = '#ff6b8a';
    btn.style.color = '#ffffff';
    btn.style.fontSize = '16px';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background 0.2s ease';
    btn.style.fontWeight = '500';
    btn.style.letterSpacing = '1px';

    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#e55a78';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#ff6b8a';
    });

    return btn;
  }

  private createSliderRow(labelText: string, slider: HTMLInputElement, valueLabel: HTMLElement): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'center';
    row.style.marginBottom = '15px';

    const labelRow = document.createElement('div');
    labelRow.style.display = 'flex';
    labelRow.style.alignItems = 'center';
    labelRow.style.justifyContent = 'space-between';
    labelRow.style.width = '100%';
    labelRow.style.marginBottom = '6px';

    const label = document.createElement('label');
    label.textContent = labelText;
    label.style.color = '#cccccc';
    label.style.fontSize = '12px';

    labelRow.appendChild(label);
    labelRow.appendChild(valueLabel);

    row.appendChild(labelRow);
    row.appendChild(slider);

    return row;
  }

  private buildPanel(): void {
    const title = document.createElement('div');
    title.textContent = '地脉剖面 · 控制面板';
    title.style.color = '#ffffff';
    title.style.fontSize = '14px';
    title.style.fontWeight = '600';
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    title.style.letterSpacing = '2px';
    title.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    title.style.paddingBottom = '10px';

    this.container.appendChild(title);
    this.container.appendChild(this.createSliderRow('褶皱振幅', this.foldSlider, this.foldValueLabel));
    this.container.appendChild(this.createSliderRow('倾斜角度 (°)', this.tiltSlider, this.tiltValueLabel));
    this.container.appendChild(this.createSliderRow('错动位移', this.offsetSlider, this.offsetValueLabel));
    this.container.appendChild(this.resetButton);

    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 6px rgba(79, 195, 247, 0.5);
      }
      input[type="range"]::-moz-range-thumb {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 6px rgba(79, 195, 247, 0.5);
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.container);
  }

  private bindEvents(): void {
    const emitUpdate = () => {
      this.updateValueLabels();
      const values: PanelValues = {
        foldAmplitude: parseFloat(this.foldSlider.value),
        rotationX: parseFloat(this.tiltSlider.value) * Math.PI / 180,
        offsetZ: parseFloat(this.offsetSlider.value)
      };
      const event = new CustomEvent<PanelValues>(PANEL_UPDATE_EVENT, { detail: values });
      window.dispatchEvent(event);
    };

    this.foldSlider.addEventListener('input', emitUpdate);
    this.tiltSlider.addEventListener('input', emitUpdate);
    this.offsetSlider.addEventListener('input', emitUpdate);

    this.resetButton.addEventListener('click', () => {
      this.foldSlider.value = '0.5';
      this.tiltSlider.value = '0';
      this.offsetSlider.value = '0';
      this.updateValueLabels();
      const event = new CustomEvent(PANEL_RESET_EVENT);
      window.dispatchEvent(event);
    });
  }

  private updateValueLabels(): void {
    this.foldValueLabel.textContent = parseFloat(this.foldSlider.value).toFixed(2);
    this.tiltValueLabel.textContent = `${this.tiltSlider.value}°`;
    this.offsetValueLabel.textContent = parseFloat(this.offsetSlider.value).toFixed(2);
  }

  public getValues(): PanelValues {
    return {
      foldAmplitude: parseFloat(this.foldSlider.value),
      rotationX: parseFloat(this.tiltSlider.value) * Math.PI / 180,
      offsetZ: parseFloat(this.offsetSlider.value)
    };
  }

  public resetUI(): void {
    this.foldSlider.value = '0.5';
    this.tiltSlider.value = '0';
    this.offsetSlider.value = '0';
    this.updateValueLabels();
  }
}
