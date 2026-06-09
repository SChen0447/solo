export interface ControlPanelState {
  lightX: number;
  lightY: number;
  lightZ: number;
  intensity: number;
  growthSpeed: number;
}

export class ControlPanel {
  private container: HTMLElement;
  private state: ControlPanelState;
  private onStateChange: (state: ControlPanelState) => void;
  private onReset: () => void;
  private panel: HTMLElement;
  private toggleBtn: HTMLElement;

  constructor(
    containerId: string,
    initialState: ControlPanelState,
    onStateChange: (state: ControlPanelState) => void,
    onReset: () => void
  ) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    this.container = container;
    this.state = { ...initialState };
    this.onStateChange = onStateChange;
    this.onReset = onReset;

    this.panel = document.getElementById('control-panel')!;
    this.toggleBtn = document.getElementById('panel-toggle')!;

    this.buildUI();
    this.bindPanelToggle();
    this.bindResetButton();
  }

  private buildUI() {
    const sliders = [
      {
        key: 'lightX' as const,
        label: '光源 X',
        min: -10,
        max: 10,
        step: 0.1,
        value: this.state.lightX,
        unit: ''
      },
      {
        key: 'lightY' as const,
        label: '光源 Y',
        min: -10,
        max: 10,
        step: 0.1,
        value: this.state.lightY,
        unit: ''
      },
      {
        key: 'lightZ' as const,
        label: '光源 Z',
        min: -10,
        max: 10,
        step: 0.1,
        value: this.state.lightZ,
        unit: ''
      },
      {
        key: 'intensity' as const,
        label: '光照强度',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        value: this.state.intensity,
        unit: ''
      },
      {
        key: 'growthSpeed' as const,
        label: '生长速度',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        value: this.state.growthSpeed,
        unit: 'x'
      }
    ];

    sliders.forEach((sliderConfig) => {
      const group = this.createSliderGroup(sliderConfig);
      this.container.appendChild(group);
    });
  }

  private createSliderGroup(config: {
    key: keyof ControlPanelState;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    unit: string;
  }): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'control-label';

    const labelText = document.createElement('span');
    labelText.textContent = config.label;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'control-value';
    valueDisplay.textContent = `${config.unit}${config.value.toFixed(1)}`;

    labelRow.appendChild(labelText);
    labelRow.appendChild(valueDisplay);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'slider';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.step = config.step.toString();
    slider.value = config.value.toString();
    slider.dataset.key = config.key;

    slider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const newValue = parseFloat(target.value);
      this.state[config.key] = newValue;
      valueDisplay.textContent = `${config.unit}${newValue.toFixed(1)}`;
      this.onStateChange({ ...this.state });

      slider.style.transform = 'scale(1.02)';
      setTimeout(() => {
        slider.style.transform = '';
      }, 100);
    });

    sliderContainer.appendChild(slider);
    group.appendChild(labelRow);
    group.appendChild(sliderContainer);

    return group;
  }

  private bindPanelToggle() {
    this.toggleBtn.addEventListener('click', () => {
      this.panel.classList.toggle('open');
      this.toggleBtn.classList.toggle('open');
      if (this.toggleBtn.classList.contains('open')) {
        this.toggleBtn.textContent = '✕';
      } else {
        this.toggleBtn.textContent = '☰';
      }
    });
  }

  private bindResetButton() {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.onReset();
      });
    }
  }

  public getState(): ControlPanelState {
    return { ...this.state };
  }
}
