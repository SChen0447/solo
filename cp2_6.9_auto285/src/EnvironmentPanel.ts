export interface EnvironmentParams {
  light: number;
  flow: number;
  nutrients: number;
}

export type EnvironmentCallback = (params: EnvironmentParams) => void;

interface SliderConfig {
  key: keyof EnvironmentParams;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  unit: string;
  description: string;
}

export class EnvironmentPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private params: EnvironmentParams;
  private callback: EnvironmentCallback;

  private sliders: Map<keyof EnvironmentParams, HTMLInputElement> = new Map();
  private valueLabels: Map<keyof EnvironmentParams, HTMLElement> = new Map();

  private isCollapsed: boolean = false;
  private isMobile: boolean = false;
  private panelBody: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;

  private sliderConfigs: SliderConfig[] = [
    {
      key: 'light',
      label: '光照强度',
      min: 0,
      max: 100,
      defaultValue: 60,
      unit: '%',
      description: '高光照促使分支变细长'
    },
    {
      key: 'flow',
      label: '水流速度',
      min: 0,
      max: 10,
      defaultValue: 3,
      unit: 'm/s',
      description: '高水流使分支变粗短'
    },
    {
      key: 'nutrients',
      label: '营养盐浓度',
      min: 0,
      max: 100,
      defaultValue: 30,
      unit: 'ppm',
      description: '高营养盐促进藻类共生'
    }
  ];

  constructor(anchor: HTMLElement, callback: EnvironmentCallback) {
    this.container = anchor;
    this.callback = callback;
    this.params = {
      light: 60,
      flow: 3,
      nutrients: 30
    };

    this.checkMobile();
    this.createPanel();
    this.bindResize();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private bindResize(): void {
    let resizeTimeout: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        const wasMobile = this.isMobile;
        this.checkMobile();
        if (wasMobile !== this.isMobile) {
          this.rebuildPanel();
        }
      }, 200);
    });
  }

  private rebuildPanel(): void {
    if (this.panel) {
      this.panel.remove();
    }
    this.sliders.clear();
    this.valueLabels.clear();
    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.applyPanelStyles(this.panel);

    const header = this.createHeader();
    this.panel.appendChild(header);

    this.panelBody = document.createElement('div');
    this.applyPanelBodyStyles(this.panelBody);

    for (const config of this.sliderConfigs) {
      const sliderRow = this.createSliderRow(config);
      this.panelBody.appendChild(sliderRow);
    }

    const legend = this.createLegend();
    this.panelBody.appendChild(legend);

    this.panel.appendChild(this.panelBody);
    this.container.appendChild(this.panel);

    if (this.isMobile && this.isCollapsed) {
      this.panelBody.style.display = 'none';
    }
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid #3A5A7A;
      cursor: ${this.isMobile ? 'pointer' : 'default'};
      user-select: none;
    `;

    const titleWrapper = document.createElement('div');
    titleWrapper.style.display = 'flex';
    titleWrapper.style.alignItems = 'center';
    titleWrapper.style.gap = '10px';

    const icon = document.createElement('div');
    icon.innerHTML = '🪸';
    icon.style.fontSize = '20px';

    const title = document.createElement('h2');
    title.textContent = '环境控制';
    title.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      color: #E0F0FF;
      margin: 0;
      letter-spacing: 0.3px;
    `;

    titleWrapper.appendChild(icon);
    titleWrapper.appendChild(title);

    header.appendChild(titleWrapper);

    if (this.isMobile) {
      this.toggleButton = document.createElement('div');
      this.toggleButton.innerHTML = this.isCollapsed ? '▲' : '▼';
      this.toggleButton.style.cssText = `
        font-size: 12px;
        color: #6CB4EE;
        transition: transform 0.3s ease;
        transform: rotate(${this.isCollapsed ? '0deg' : '180deg'});
      `;
      header.appendChild(this.toggleButton);

      header.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('input')) return;
        this.toggleCollapse();
      });
    }

    return header;
  }

  private toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.panelBody) {
      if (this.isCollapsed) {
        this.panelBody.style.display = 'none';
      } else {
        this.panelBody.style.display = 'block';
      }
    }
    if (this.toggleButton) {
      this.toggleButton.style.transform = `rotate(${this.isCollapsed ? '0deg' : '180deg'})`;
    }
  }

  private createSliderRow(config: SliderConfig): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      padding: 16px 0;
      border-bottom: 1px solid rgba(58, 90, 122, 0.4);
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    `;

    const label = document.createElement('label');
    label.textContent = config.label;
    label.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: #B0D0F0;
    `;

    const valueLabel = document.createElement('span');
    valueLabel.textContent = `${config.defaultValue}${config.unit}`;
    valueLabel.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      color: #6CB4EE;
      font-variant-numeric: tabular-nums;
      min-width: 60px;
      text-align: right;
    `;
    this.valueLabels.set(config.key, valueLabel);

    labelRow.appendChild(label);
    labelRow.appendChild(valueLabel);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = config.min.toString();
    slider.max = config.max.toString();
    slider.step = config.key === 'flow' ? '0.1' : '1';
    slider.value = config.defaultValue.toString();
    this.applySliderStyles(slider);
    this.sliders.set(config.key, slider);

    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.params[config.key] = value;
      valueLabel.textContent = `${this.formatValue(value, config.key)}${config.unit}`;
      this.callback({ ...this.params });
    });

    const description = document.createElement('p');
    description.textContent = config.description;
    description.style.cssText = `
      font-size: 11px;
      color: #7A9ABA;
      margin: 8px 0 0 0;
      line-height: 1.4;
    `;

    row.appendChild(labelRow);
    row.appendChild(slider);
    row.appendChild(description);

    return row;
  }

  private formatValue(value: number, key: keyof EnvironmentParams): string {
    if (key === 'flow') {
      return value.toFixed(1);
    }
    return Math.round(value).toString();
  }

  private createLegend(): HTMLElement {
    const legend = document.createElement('div');
    legend.style.cssText = `
      padding: 16px 0 8px 0;
    `;

    const legendTitle = document.createElement('div');
    legendTitle.textContent = '颜色图例';
    legendTitle.style.cssText = `
      font-size: 12px;
      font-weight: 600;
      color: #B0D0F0;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    legend.appendChild(legendTitle);

    const items = [
      { color: '#D4A574', label: '健康珊瑚' },
      { color: '#5B8C5A', label: '藻类共生' },
      { color: '#8B4513', label: '衰退珊瑚' },
      { color: '#C5E17A', label: '生长指示' }
    ];

    const itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    `;

    for (const item of items) {
      const itemEl = document.createElement('div');
      itemEl.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${item.color};
        box-shadow: 0 0 6px ${item.color}55;
      `;

      const text = document.createElement('span');
      text.textContent = item.label;
      text.style.cssText = `
        font-size: 12px;
        color: #9AB0C8;
      `;

      itemEl.appendChild(dot);
      itemEl.appendChild(text);
      itemsContainer.appendChild(itemEl);
    }

    legend.appendChild(itemsContainer);
    return legend;
  }

  private applyPanelStyles(el: HTMLElement): void {
    if (this.isMobile) {
      el.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(26, 42, 58, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid #3A5A7A;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        pointer-events: auto;
        max-height: 60vh;
        overflow-y: auto;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
      `;
    } else {
      el.style.cssText = `
        position: absolute;
        top: 24px;
        right: 24px;
        width: 280px;
        background: rgba(26, 42, 58, 0.9);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid #3A5A7A;
        border-radius: 12px;
        pointer-events: auto;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      `;
    }
  }

  private applyPanelBodyStyles(el: HTMLElement): void {
    el.style.cssText = `
      padding: 4px 20px 20px 20px;
    `;
  }

  private applySliderStyles(slider: HTMLInputElement): void {
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: #2A4A6A;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
    `;

    const styleId = 'coral-slider-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #6CB4EE;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #8FD0FF;
          transition: box-shadow 0.2s ease, transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 8px #4FC3F7, 0 0 16px rgba(79, 195, 247, 0.4);
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #6CB4EE;
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid #8FD0FF;
          transition: box-shadow 0.2s ease, transform 0.15s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          box-shadow: 0 0 8px #4FC3F7, 0 0 16px rgba(79, 195, 247, 0.4);
          transform: scale(1.1);
        }
        input[type="range"]:hover {
          box-shadow: 0 0 8px #4FC3F7;
        }
        input[type="range"]:focus {
          outline: none;
        }
        input[type="range"]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 8px #4FC3F7, 0 0 16px rgba(79, 195, 247, 0.4);
        }
      `;
      document.head.appendChild(style);
    }
  }

  getParams(): EnvironmentParams {
    return { ...this.params };
  }

  setParams(params: Partial<EnvironmentParams>): void {
    for (const key of Object.keys(params) as (keyof EnvironmentParams)[]) {
      const value = params[key];
      if (value !== undefined) {
        this.params[key] = value;
        const slider = this.sliders.get(key);
        const label = this.valueLabels.get(key);
        if (slider) slider.value = value.toString();
        if (label) {
          const config = this.sliderConfigs.find(c => c.key === key);
          if (config) {
            label.textContent = `${this.formatValue(value, key)}${config.unit}`;
          }
        }
      }
    }
  }

  dispose(): void {
    if (this.panel) {
      this.panel.remove();
    }
    this.sliders.clear();
    this.valueLabels.clear();
  }
}
