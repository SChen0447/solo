import { SymmetryMode } from './TileGrid';

export interface ControlEvents {
  onSymmetryChange: (mode: SymmetryMode) => void;
  onDensityChange: (density: number) => void;
  onPaletteChange: (warm: boolean) => void;
  onExportPNG: () => void;
  onExportCSS: () => void;
  onPaletteColorSelect: (color: string) => void;
}

const WARM_COLORS = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#f9844a', '#e07a5f'];
const COOL_COLORS = ['#577590', '#43aa8b', '#90be6d', '#277da1', '#4d908e', '#52b788'];

export class Controls {
  private container: HTMLElement;
  private events: ControlEvents;
  private palettePopup: HTMLElement | null = null;
  private currentDensity: number = 8;
  private activeWarm: boolean = true;

  constructor(container: HTMLElement, events: ControlEvents) {
    this.container = container;
    this.events = events;
    this.buildUI();
  }

  private buildUI() {
    const wrapper = document.createElement('div');
    wrapper.className = 'controls';

    wrapper.appendChild(this.buildSymmetryControl());
    wrapper.appendChild(this.buildDensityControl());
    wrapper.appendChild(this.buildColorControl());

    this.container.appendChild(wrapper);
    this.container.appendChild(this.buildExportButtons());
    this.palettePopup = this.buildPalettePopup();
    this.container.appendChild(this.palettePopup);
  }

  private buildSymmetryControl(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';
    label.textContent = '对称模式';

    const select = document.createElement('select');
    select.className = 'symmetry-select';

    const options: { value: SymmetryMode; label: string }[] = [
      { value: 'mirror', label: '镜像对称' },
      { value: 'rotate', label: '旋转对称' },
      { value: 'fractal', label: '分形对称' }
    ];

    options.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      select.appendChild(opt);
    });

    select.value = 'mirror';
    select.addEventListener('change', () => {
      this.events.onSymmetryChange(select.value as SymmetryMode);
    });

    group.appendChild(label);
    group.appendChild(select);
    return group;
  }

  private buildDensityControl(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';
    label.textContent = '密度';

    const container = document.createElement('div');
    container.className = 'density-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '4';
    slider.max = '16';
    slider.value = '8';
    slider.step = '1';
    slider.className = 'density-slider';

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'density-value';
    valueDisplay.textContent = '8x8';

    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      if (v !== this.currentDensity) {
        this.currentDensity = v;
        valueDisplay.textContent = `${v}x${v}`;
        this.events.onDensityChange(v);
      }
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);

    group.appendChild(label);
    group.appendChild(container);
    return group;
  }

  private buildColorControl(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const label = document.createElement('div');
    label.className = 'control-label';
    label.textContent = '颜色面板';

    const panel = document.createElement('div');
    panel.className = 'color-panel';

    const warmLabel = document.createElement('div');
    warmLabel.className = 'color-group-label';
    warmLabel.textContent = '暖色调';

    const warmGroup = document.createElement('div');
    warmGroup.className = 'color-group';
    WARM_COLORS.forEach((color, idx) => {
      const swatch = this.createSwatch(color, true);
      if (idx === 0) swatch.classList.add('active');
      warmGroup.appendChild(swatch);
    });

    const coolLabel = document.createElement('div');
    coolLabel.className = 'color-group-label';
    coolLabel.textContent = '冷色调';

    const coolGroup = document.createElement('div');
    coolGroup.className = 'color-group';
    COOL_COLORS.forEach(color => {
      coolGroup.appendChild(this.createSwatch(color, false));
    });

    panel.appendChild(warmLabel);
    panel.appendChild(warmGroup);
    panel.appendChild(coolLabel);
    panel.appendChild(coolGroup);

    group.appendChild(label);
    group.appendChild(panel);
    return group;
  }

  private createSwatch(color: string, isWarm: boolean): HTMLElement {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    swatch.dataset.warm = String(isWarm);

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch.active').forEach(el => el.classList.remove('active'));
      swatch.classList.add('active');
      this.activeWarm = isWarm;
      this.events.onPaletteChange(isWarm);
    });

    return swatch;
  }

  private buildExportButtons(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'export-buttons';

    const pngBtn = document.createElement('button');
    pngBtn.className = 'export-btn';
    pngBtn.textContent = '导出 PNG';
    pngBtn.addEventListener('click', () => this.events.onExportPNG());

    const cssBtn = document.createElement('button');
    cssBtn.className = 'export-btn';
    cssBtn.textContent = '导出 CSS';
    cssBtn.addEventListener('click', () => this.events.onExportCSS());

    container.appendChild(pngBtn);
    container.appendChild(cssBtn);
    return container;
  }

  private buildPalettePopup(): HTMLElement {
    const popup = document.createElement('div');
    popup.className = 'palette-popup';

    const allColors = [...WARM_COLORS, ...COOL_COLORS];
    const radius = 28;
    allColors.forEach((color, idx) => {
      const angle = (idx / allColors.length) * Math.PI * 2 - Math.PI / 2;
      const x = 40 + Math.cos(angle) * radius;
      const y = 40 + Math.sin(angle) * radius;

      const dot = document.createElement('div');
      dot.className = 'palette-color';
      dot.style.backgroundColor = color;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.events.onPaletteColorSelect(color);
        this.hidePalettePopup();
      });

      popup.appendChild(dot);
    });

    document.addEventListener('click', (e) => {
      if (this.palettePopup && this.palettePopup.classList.contains('visible')) {
        const target = e.target as HTMLElement;
        if (!this.palettePopup.contains(target)) {
          this.hidePalettePopup();
        }
      }
    });

    return popup;
  }

  showPalettePopup(x: number, y: number) {
    if (!this.palettePopup) return;
    this.palettePopup.style.left = `${x}px`;
    this.palettePopup.style.top = `${y}px`;
    this.palettePopup.classList.add('visible');
  }

  hidePalettePopup() {
    if (!this.palettePopup) return;
    this.palettePopup.classList.remove('visible');
  }
}
