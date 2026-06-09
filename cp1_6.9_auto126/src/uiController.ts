export interface UICallbacks {
  onHumidityChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
  onSoilOpacityChange: (value: number) => void;
  onReset: () => void;
}

interface SliderElements {
  input: HTMLInputElement;
  valueSpan: HTMLElement;
  group: HTMLDivElement;
}

export class UIController {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private humiditySlider: HTMLInputElement | null = null;
  private temperatureSlider: HTMLInputElement | null = null;
  private soilOpacitySlider: HTMLInputElement | null = null;
  private humidityValue: HTMLElement | null = null;
  private temperatureValue: HTMLElement | null = null;
  private soilOpacityValue: HTMLElement | null = null;
  private resetButton: HTMLButtonElement | null = null;
  private tooltipTimeout: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.buildUI();
  }

  private buildUI(): void {
    const humidityEls = this.createSliderControl(
      '湿度',
      20, 80, 1, 50,
      '%',
      (v) => {
        if (this.humidityValue) this.humidityValue.textContent = `${v}%`;
        this.callbacks.onHumidityChange(v);
      }
    );
    this.humiditySlider = humidityEls.input;
    this.humidityValue = humidityEls.valueSpan;

    const tempEls = this.createSliderControl(
      '温度',
      10, 35, 0.5, 22,
      '°C',
      (v) => {
        if (this.temperatureValue) this.temperatureValue.textContent = `${v}°C`;
        this.callbacks.onTemperatureChange(v);
      }
    );
    this.temperatureSlider = tempEls.input;
    this.temperatureValue = tempEls.valueSpan;

    const opacityEls = this.createSliderControl(
      '土壤透明度',
      0, 100, 1, 60,
      '%',
      (v) => {
        if (this.soilOpacityValue) this.soilOpacityValue.textContent = `${v}%`;
        this.callbacks.onSoilOpacityChange(v / 100);
      }
    );
    this.soilOpacitySlider = opacityEls.input;
    this.soilOpacityValue = opacityEls.valueSpan;

    this.resetButton = document.createElement('button');
    this.resetButton.className = 'btn';
    this.resetButton.textContent = '🔄 重置生长';
    this.resetButton.addEventListener('click', () => {
      this.callbacks.onReset();
    });
    this.container.appendChild(this.resetButton);
  }

  private createSliderControl(
    label: string,
    min: number,
    max: number,
    step: number,
    defaultValue: number,
    unit: string,
    onChange: (value: number) => void
  ): SliderElements {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelEl = document.createElement('label');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    valueSpan.textContent = `${defaultValue}${unit}`;

    labelEl.appendChild(nameSpan);
    labelEl.appendChild(valueSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(defaultValue);

    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseFloat(target.value);
      onChange(val);
    });

    group.appendChild(labelEl);
    group.appendChild(input);
    this.container.appendChild(group);

    return { input, valueSpan, group };
  }

  public showTooltip(
    x: number,
    y: number,
    title: string,
    rows: Array<{ label: string; value: string }>,
    duration: number = 2000
  ): string {
    this.removeTooltip('temp');

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.id = 'tooltip-temp';

    const titleEl = document.createElement('div');
    titleEl.className = 'tooltip-title';
    titleEl.textContent = title;
    tooltip.appendChild(titleEl);

    rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'tooltip-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'tooltip-label';
      labelEl.textContent = row.label;

      const valueEl = document.createElement('span');
      valueEl.textContent = row.value;

      rowEl.appendChild(labelEl);
      rowEl.appendChild(valueEl);
      tooltip.appendChild(rowEl);
    });

    document.body.appendChild(tooltip);

    const rect = tooltip.getBoundingClientRect();
    let posX = x + 15;
    let posY = y - rect.height - 15;

    if (posX + rect.width > window.innerWidth) {
      posX = x - rect.width - 15;
    }
    if (posY < 0) {
      posY = y + 15;
    }

    tooltip.style.left = `${posX}px`;
    tooltip.style.top = `${posY}px`;

    const timeoutId = setTimeout(() => {
      this.removeTooltip('temp');
    }, duration);

    this.tooltipTimeout.set('temp', timeoutId);

    return 'temp';
  }

  public removeTooltip(id: string): void {
    const tooltip = document.getElementById(`tooltip-${id}`);
    if (tooltip) {
      tooltip.remove();
    }
    const timeoutId = this.tooltipTimeout.get(id);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      this.tooltipTimeout.delete(id);
    }
  }

  public showSoilLabel(
    x: number,
    y: number,
    name: string,
    thickness: number,
    nutrient: number
  ): string {
    this.removeTooltip('soil');

    const label = document.createElement('div');
    label.className = 'soil-label';
    label.id = 'tooltip-soil';
    label.innerHTML = `
      <div class="tooltip-title">${name}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">厚度：</span>
        <span>${thickness.toFixed(1)} 单位</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">养分值：</span>
        <span>${(nutrient * 100).toFixed(0)}%</span>
      </div>
    `;

    document.body.appendChild(label);

    const rect = label.getBoundingClientRect();
    let posX = x + 15;
    let posY = y - rect.height - 15;
    if (posX + rect.width > window.innerWidth) posX = x - rect.width - 15;
    if (posY < 0) posY = y + 15;

    label.style.left = `${posX}px`;
    label.style.top = `${posY}px`;

    const timeoutId = setTimeout(() => {
      this.removeTooltip('soil');
    }, 3000);
    this.tooltipTimeout.set('soil', timeoutId);

    return 'soil';
  }

  public showHoverHalo(x: number, y: number): void {
    let halo = document.getElementById('hover-halo-effect');
    if (!halo) {
      halo = document.createElement('div');
      halo.className = 'hover-halo';
      halo.id = 'hover-halo-effect';
      document.body.appendChild(halo);
    }
    halo.style.left = `${x}px`;
    halo.style.top = `${y}px`;

    halo.style.animation = 'none';
    void halo.offsetWidth;
    halo.style.animation = '';
  }

  public setHumidity(value: number): void {
    if (this.humiditySlider) {
      this.humiditySlider.value = String(value);
    }
    if (this.humidityValue) {
      this.humidityValue.textContent = `${value}%`;
    }
  }

  public setTemperature(value: number): void {
    if (this.temperatureSlider) {
      this.temperatureSlider.value = String(value);
    }
    if (this.temperatureValue) {
      this.temperatureValue.textContent = `${value}°C`;
    }
  }

  public setSoilOpacity(value: number): void {
    const percent = Math.round(value * 100);
    if (this.soilOpacitySlider) {
      this.soilOpacitySlider.value = String(percent);
    }
    if (this.soilOpacityValue) {
      this.soilOpacityValue.textContent = `${percent}%`;
    }
  }
}
