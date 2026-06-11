import { Pane } from 'tweakpane';
import { GenotypeParams, DEFAULT_PARAMS, DEFAULT_GRADIENT, PresetConfig } from '../types/genotype';
import { CoralSystem } from './CoralSystem';

const PRESETS: PresetConfig[] = [
  {
    name: '海葵模式',
    params: {
      branchDensity: 1.8,
      spiralAngle: 60,
      branchLength: 0.6,
      recursionDepth: 3,
      colorVariation: 0.6,
      stemTwist: 3.5,
      tipBulge: 1.5,
      growthSpeed: 1.0
    },
    gradient: { bottom: '#ff4500', top: '#ffd700' }
  },
  {
    name: '鹿角珊瑚',
    params: {
      branchDensity: 0.7,
      spiralAngle: 20,
      branchLength: 1.6,
      recursionDepth: 5,
      colorVariation: 0.2,
      stemTwist: 1,
      tipBulge: 0.9,
      growthSpeed: 2.0
    },
    gradient: { bottom: '#0066cc', top: '#00ffff' }
  },
  {
    name: '随机变异',
    params: {},
    gradient: { bottom: '#3b0a45', top: '#ff6b35' }
  }
];

export class GenotypeController {
  private container: HTMLElement;
  private coralSystem: CoralSystem;
  private pane: Pane | null = null;
  private params: GenotypeParams;
  private gradient: { bottom: string; top: string };
  private onParamsChange: ((params: GenotypeParams) => void) | null = null;
  private presetButtons: HTMLButtonElement[] = [];
  private mobileToggle: HTMLButtonElement | null = null;
  private panelElement: HTMLElement | null = null;
  private isPanelOpen: boolean = true;

  constructor(container: HTMLElement, coralSystem: CoralSystem) {
    this.container = container;
    this.coralSystem = coralSystem;
    this.params = { ...DEFAULT_PARAMS };
    this.gradient = { ...DEFAULT_GRADIENT };

    this.createPanel();
    this.setupResponsive();
  }

  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'genotype-panel';
    panel.id = 'genotype-panel';
    this.panelElement = panel;

    const header = document.createElement('div');
    header.className = 'panel-header';
    
    const title = document.createElement('h2');
    title.textContent = '基因参数';
    title.className = 'panel-title';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-toggle';
    toggleBtn.innerHTML = '☰';
    toggleBtn.title = '展开/收起';
    toggleBtn.addEventListener('click', () => this.togglePanel());
    this.mobileToggle = toggleBtn;
    
    header.appendChild(title);
    header.appendChild(toggleBtn);

    const paneContainer = document.createElement('div');
    paneContainer.className = 'pane-container';

    panel.appendChild(header);
    panel.appendChild(paneContainer);

    this.container.appendChild(panel);

    this.pane = new Pane({
      container: paneContainer,
      title: ''
    });

    this.setupSliders();
    this.setupPresets();
  }

  private setupSliders(): void {
    if (!this.pane) return;

    const sliderConfig = [
      { key: 'branchDensity', label: '分支密度', min: 0.5, max: 2.0, step: 0.1 },
      { key: 'spiralAngle', label: '螺旋角度', min: 0, max: 90, step: 1, unit: '°' },
      { key: 'branchLength', label: '分支长度', min: 0.5, max: 2.0, step: 0.1 },
      { key: 'recursionDepth', label: '递归深度', min: 1, max: 6, step: 1 },
      { key: 'colorVariation', label: '颜色变异', min: 0, max: 1, step: 0.05 },
      { key: 'stemTwist', label: '主茎扭曲', min: 0, max: 5, step: 0.5, unit: '°/u' },
      { key: 'tipBulge', label: '末端膨大量', min: 0.8, max: 2.0, step: 0.1 },
      { key: 'growthSpeed', label: '生长速度', min: 0.5, max: 3.0, step: 0.1, unit: 's/层' }
    ];

    for (const config of sliderConfig) {
      const folder = this.pane.addFolder({
        title: config.label,
        expanded: true
      });

      const binding = folder.addBinding(
        this.params,
        config.key as keyof GenotypeParams,
        {
          min: config.min,
          max: config.max,
          step: config.step
        }
      );

      binding.on('change', (ev) => {
        this.handleParamChange(config.key as keyof GenotypeParams, ev.value as number);
      });

      const resetBtn = document.createElement('button');
      resetBtn.className = 'reset-btn';
      resetBtn.textContent = '复位';
      resetBtn.title = '重置为默认值';
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetParam(config.key as keyof GenotypeParams);
      });

      const folderElement = folder.element as HTMLElement;
      const titleElement = folderElement.querySelector('.tp-fldv_titl') as HTMLElement;
      if (titleElement) {
        titleElement.style.display = 'flex';
        titleElement.style.justifyContent = 'space-between';
        titleElement.style.alignItems = 'center';
        titleElement.appendChild(resetBtn);
      }
    }
  }

  private setupPresets(): void {
    if (!this.pane) return;

    const presetFolder = this.pane.addFolder({
      title: '预设形态',
      expanded: true
    });

    const presetContainer = document.createElement('div');
    presetContainer.className = 'preset-buttons';

    for (const preset of PRESETS) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.name;
      btn.style.background = this.getPresetGradient(preset);
      btn.addEventListener('click', (e) => {
        this.createRipple(e);
        this.applyPreset(preset);
      });
      presetContainer.appendChild(btn);
      this.presetButtons.push(btn);
    }

    const folderElement = presetFolder.element as HTMLElement;
    const contentElement = folderElement.querySelector('.tp-fldv_cont') as HTMLElement;
    if (contentElement) {
      contentElement.appendChild(presetContainer);
    }
  }

  private getPresetGradient(preset: PresetConfig): string {
    if (preset.name === '随机变异') {
      return 'linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4)';
    }
    return `linear-gradient(135deg, ${preset.gradient.bottom}, ${preset.gradient.top})`;
  }

  private createRipple(event: MouseEvent): void {
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 300);
  }

  private applyPreset(preset: PresetConfig): void {
    if (preset.name === '随机变异') {
      this.applyRandomPreset();
      return;
    }

    const newParams = { ...this.params, ...preset.params };
    const newGradient = { ...preset.gradient };

    this.updateParamsUI(newParams);
    this.coralSystem.setGradient(newGradient);
    this.coralSystem.setParams(preset.params);
    this.gradient = newGradient;
    this.params = newParams;

    if (this.onParamsChange) {
      this.onParamsChange(newParams);
    }
  }

  private applyRandomPreset(): void {
    const randomParams: GenotypeParams = {
      branchDensity: 0.5 + Math.random() * 1.5,
      spiralAngle: Math.random() * 90,
      branchLength: 0.5 + Math.random() * 1.5,
      recursionDepth: Math.floor(1 + Math.random() * 5),
      colorVariation: Math.random(),
      stemTwist: Math.random() * 5,
      tipBulge: 0.8 + Math.random() * 1.2,
      growthSpeed: 0.5 + Math.random() * 2.5
    };

    const hue1 = Math.random();
    const hue2 = (hue1 + 0.3 + Math.random() * 0.4) % 1;
    
    const bottomColor = this.hslToHex(hue1, 0.8, 0.3);
    const topColor = this.hslToHex(hue2, 0.9, 0.6);
    const randomGradient = { bottom: bottomColor, top: topColor };

    this.updateParamsUI(randomParams);
    this.coralSystem.setGradient(randomGradient);
    this.coralSystem.setParams(randomParams);
    this.gradient = randomGradient;
    this.params = randomParams;

    if (this.onParamsChange) {
      this.onParamsChange(randomParams);
    }
  }

  private hslToHex(h: number, s: number, l: number): string {
    const tempDiv = document.createElement('div');
    tempDiv.style.color = `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
    document.body.appendChild(tempDiv);
    const rgb = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    const rgbMatch = rgb.match(/\d+/g);
    if (!rgbMatch) return '#ffffff';
    
    const r = parseInt(rgbMatch[0]);
    const g = parseInt(rgbMatch[1]);
    const b = parseInt(rgbMatch[2]);
    
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  private updateParamsUI(params: GenotypeParams): void {
    this.params = { ...params };
    if (this.pane) {
      this.pane.refresh();
    }
  }

  private handleParamChange(key: keyof GenotypeParams, value: number): void {
    (this.params as Record<string, number>)[key] = value;
    this.coralSystem.setParams({ [key]: value } as Partial<GenotypeParams>);

    if (this.onParamsChange) {
      this.onParamsChange(this.params);
    }
  }

  private resetParam(key: keyof GenotypeParams): void {
    const defaultValue = DEFAULT_PARAMS[key];
    (this.params as Record<string, number>)[key] = defaultValue;
    
    if (this.pane) {
      this.pane.refresh();
    }
    
    this.coralSystem.setParams({ [key]: defaultValue } as Partial<GenotypeParams>);

    if (this.onParamsChange) {
      this.onParamsChange(this.params);
    }
  }

  private setupResponsive(): void {
    const checkResponsive = () => {
      if (window.innerWidth < 768) {
        this.panelElement?.classList.add('mobile');
        if (!this.isPanelOpen) {
          this.panelElement?.classList.add('collapsed');
        }
      } else {
        this.panelElement?.classList.remove('mobile');
        this.panelElement?.classList.remove('collapsed');
      }
    };

    window.addEventListener('resize', checkResponsive);
    checkResponsive();
  }

  private togglePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    this.panelElement?.classList.toggle('collapsed');
  }

  setOnParamsChange(callback: (params: GenotypeParams) => void): void {
    this.onParamsChange = callback;
  }

  getParams(): GenotypeParams {
    return { ...this.params };
  }

  dispose(): void {
    if (this.pane) {
      this.pane.dispose();
    }
    this.presetButtons.forEach(btn => btn.remove());
    this.mobileToggle?.remove();
    this.panelElement?.remove();
  }
}
