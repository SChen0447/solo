type CrystalType = 'hexagon' | 'triangle' | 'diamond';

interface ControlPanelOptions {
  onTemperatureChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onStirSpeedChange: (value: number) => void;
  onCrystalTypeChange: (type: CrystalType) => void;
}

export class ControlPanel {
  private container: HTMLDivElement;
  private options: ControlPanelOptions;
  private temperatureValue: number = 250;
  private saturationValue: number = 1.0;
  private stirSpeedValue: number = 10;
  private crystalTypeValue: CrystalType = 'hexagon';

  constructor(options: ControlPanelOptions) {
    this.options = options;
    this.container = this.createContainer();
    this.injectStyles();
    this.buildPanel();
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .crystal-control-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        padding: 20px;
        background: rgba(26, 26, 46, 0.75);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid #4A4A6E;
        border-radius: 12px;
        color: #E0E0FF;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }
      .crystal-control-panel h2 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 20px;
        color: #8FD3FF;
        letter-spacing: 0.5px;
        text-align: center;
      }
      .control-group {
        margin-bottom: 18px;
      }
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
      }
      .control-label-name {
        color: #B8B8D8;
      }
      .control-label-value {
        color: #8FD3FF;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .control-slider {
        width: 100%;
        height: 6px;
        -webkit-appearance: none;
        appearance: none;
        background: #2A2A4A;
        border-radius: 3px;
        outline: none;
        cursor: pointer;
      }
      .control-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #4FC3F7;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.5);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .control-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 0 12px rgba(79, 195, 247, 0.8);
      }
      .control-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #4FC3F7;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.5);
      }
      .crystal-type-group {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      .crystal-type-btn {
        flex: 1;
        padding: 8px 4px;
        background: #2A2A4A;
        border: 1px solid #4A4A6E;
        border-radius: 6px;
        color: #B8B8D8;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .crystal-type-btn:hover {
        background: #3A3A5A;
        border-color: #6A6A8E;
      }
      .crystal-type-btn.active {
        background: rgba(79, 195, 247, 0.2);
        border-color: #4FC3F7;
        color: #8FD3FF;
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.3);
      }
      .panel-hint {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #3A3A5A;
        font-size: 11px;
        color: #7878A0;
        line-height: 1.6;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'crystal-control-panel';
    return div;
  }

  private buildPanel(): void {
    this.container.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = '晶体生长控制台';
    this.container.appendChild(title);

    this.buildTemperatureControl();
    this.buildSaturationControl();
    this.buildStirSpeedControl();
    this.buildCrystalTypeControl();

    const hint = document.createElement('div');
    hint.className = 'panel-hint';
    hint.innerHTML = '点击溶液内部放置晶种<br>拖拽旋转视角 · 滚轮缩放';
    this.container.appendChild(hint);
  }

  private buildTemperatureControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';

    const name = document.createElement('span');
    name.className = 'control-label-name';
    name.textContent = '温度';

    const value = document.createElement('span');
    value.className = 'control-label-value';
    value.id = 'temp-value';
    value.textContent = `${this.temperatureValue} °C`;

    label.appendChild(name);
    label.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'control-slider';
    slider.min = '100';
    slider.max = '400';
    slider.step = '1';
    slider.value = String(this.temperatureValue);

    slider.addEventListener('input', (e) => {
      this.temperatureValue = Number((e.target as HTMLInputElement).value);
      value.textContent = `${this.temperatureValue} °C`;
      this.options.onTemperatureChange(this.temperatureValue);
    });

    group.appendChild(label);
    group.appendChild(slider);
    this.container.appendChild(group);
  }

  private buildSaturationControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';

    const name = document.createElement('span');
    name.className = 'control-label-name';
    name.textContent = '饱和度';

    const value = document.createElement('span');
    value.className = 'control-label-value';
    value.id = 'sat-value';
    value.textContent = this.saturationValue.toFixed(1);

    label.appendChild(name);
    label.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'control-slider';
    slider.min = '0.1';
    slider.max = '2.0';
    slider.step = '0.1';
    slider.value = String(this.saturationValue);

    slider.addEventListener('input', (e) => {
      this.saturationValue = Number((e.target as HTMLInputElement).value);
      value.textContent = this.saturationValue.toFixed(1);
      this.options.onSaturationChange(this.saturationValue);
    });

    group.appendChild(label);
    group.appendChild(slider);
    this.container.appendChild(group);
  }

  private buildStirSpeedControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';

    const name = document.createElement('span');
    name.className = 'control-label-name';
    name.textContent = '搅拌速度';

    const value = document.createElement('span');
    value.className = 'control-label-value';
    value.id = 'stir-value';
    value.textContent = `${this.stirSpeedValue} rpm`;

    label.appendChild(name);
    label.appendChild(value);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'control-slider';
    slider.min = '0';
    slider.max = '50';
    slider.step = '1';
    slider.value = String(this.stirSpeedValue);

    slider.addEventListener('input', (e) => {
      this.stirSpeedValue = Number((e.target as HTMLInputElement).value);
      value.textContent = `${this.stirSpeedValue} rpm`;
      this.options.onStirSpeedChange(this.stirSpeedValue);
    });

    group.appendChild(label);
    group.appendChild(slider);
    this.container.appendChild(group);
  }

  private buildCrystalTypeControl(): void {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';

    const name = document.createElement('span');
    name.className = 'control-label-name';
    name.textContent = '晶种类型';

    label.appendChild(name);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'crystal-type-group';

    const types: { value: CrystalType; label: string }[] = [
      { value: 'hexagon', label: '六边形' },
      { value: 'triangle', label: '三角形' },
      { value: 'diamond', label: '菱形' }
    ];

    types.forEach(({ value, label }) => {
      const btn = document.createElement('button');
      btn.className = 'crystal-type-btn';
      btn.textContent = label;
      if (value === this.crystalTypeValue) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', () => {
        this.crystalTypeValue = value;
        this.options.onCrystalTypeChange(value);
        btnGroup.querySelectorAll('.crystal-type-btn').forEach((b) => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });

      btnGroup.appendChild(btn);
    });

    group.appendChild(label);
    group.appendChild(btnGroup);
    this.container.appendChild(group);
  }
}
