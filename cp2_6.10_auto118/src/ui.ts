import { debounce } from 'lodash';
import type { LevelParams } from './generator';
import { computeDifficultyAtDistance } from './generator';

export interface Preset {
  id: number;
  params: LevelParams;
}

interface SliderConfig {
  key: keyof Omit<LevelParams, 'seed'>;
  label: string;
  min: number;
  max: number;
  step: number;
  color: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'obstacleDensity', label: '障碍物密度', min: 0.1, max: 0.5, step: 0.01, color: '#E74C3C' },
  { key: 'platformSpacing', label: '平台间距 (px)', min: 100, max: 300, step: 5, color: '#2ECC71' },
  { key: 'speedFactor', label: '速度因子', min: 0.5, max: 3.0, step: 0.1, color: '#3498DB' }
];

const CHART_WIDTH = 300;
const CHART_HEIGHT = 100;
const CHART_MAX_DISTANCE = 2000;
const CHART_MAX_DIFFICULTY = 10;
const MAX_PRESETS = 3;

export class UIController {
  private container: HTMLElement;
  private onChange: (params: LevelParams) => void;
  private params: LevelParams;
  private presets: (Preset | null)[];
  private activePresetId: number | null = null;
  private chartCanvas: HTMLCanvasElement | null = null;
  private chartCtx: CanvasRenderingContext2D | null = null;
  private lastChartUpdate: number = 0;
  private readonly CHART_UPDATE_INTERVAL: number = 100;

  private sliderElements: Map<string, HTMLInputElement> = new Map();
  private valueElements: Map<string, HTMLElement> = new Map();
  private seedInput: HTMLInputElement | null = null;
  private presetTabContainer: HTMLElement | null = null;

  constructor(container: HTMLElement, onChange: (params: LevelParams) => void, initialParams: LevelParams) {
    this.container = container;
    this.onChange = onChange;
    this.params = { ...initialParams };
    this.presets = new Array(MAX_PRESETS).fill(null);
    this.buildUI();
    this.setupResponsive();
    this.setupDragging();
    this.renderPresetTabs();
    this.startChartLoop();
  }

  getParams(): LevelParams {
    return { ...this.params };
  }

  setParams(params: LevelParams): void {
    this.params = { ...params };
    this.updateUIFromParams();
  }

  private buildUI(): void {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.textContent = '难度曲线编辑器';
    this.container.appendChild(header);

    SLIDER_CONFIGS.forEach(config => {
      const group = document.createElement('div');
      group.className = 'control-group';

      const label = document.createElement('label');
      const labelText = document.createElement('span');
      labelText.textContent = config.label;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'value';
      const initialValue = this.params[config.key] as number;
      valueSpan.textContent = config.key === 'obstacleDensity'
        ? initialValue.toFixed(2)
        : initialValue.toFixed(1);
      label.appendChild(labelText);
      label.appendChild(valueSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = config.min.toString();
      slider.max = config.max.toString();
      slider.step = config.step.toString();
      slider.value = initialValue.toString();
      slider.dataset.key = config.key;

      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const val = parseFloat(target.value);
        (this.params as Record<string, number>)[config.key] = val;
        valueSpan.textContent = config.key === 'obstacleDensity'
          ? val.toFixed(2)
          : val.toFixed(1);
        this.activePresetId = null;
        this.renderPresetTabs();
        this.debouncedOnChange();
      });

      group.appendChild(label);
      group.appendChild(slider);
      this.container.appendChild(group);

      this.sliderElements.set(config.key, slider);
      this.valueElements.set(config.key, valueSpan);
    });

    const seedSection = document.createElement('div');
    seedSection.className = 'control-group';
    const seedLabel = document.createElement('label');
    seedLabel.textContent = '种子值';
    seedSection.appendChild(seedLabel);

    const seedWrapper = document.createElement('div');
    seedWrapper.className = 'seed-group';
    const seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.value = this.params.seed.toString();
    seedInput.id = 'seed-input';
    seedInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      if (!isNaN(val)) {
        this.params.seed = val;
        this.activePresetId = null;
        this.renderPresetTabs();
        this.debouncedOnChange();
      }
    });
    seedWrapper.appendChild(seedInput);
    seedSection.appendChild(seedWrapper);
    this.container.appendChild(seedSection);
    this.seedInput = seedInput;

    const presetsSection = document.createElement('div');
    presetsSection.className = 'presets-section';
    const presetsLabel = document.createElement('div');
    presetsLabel.className = 'presets-label';
    presetsLabel.textContent = '预设配置';
    presetsSection.appendChild(presetsLabel);

    const presetTabs = document.createElement('div');
    presetTabs.className = 'preset-tabs';
    presetsSection.appendChild(presetTabs);
    this.presetTabContainer = presetTabs;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'save-preset-btn';
    saveBtn.textContent = '保存当前配置';
    saveBtn.addEventListener('click', () => this.saveCurrentPreset());
    presetsSection.appendChild(saveBtn);
    this.container.appendChild(presetsSection);

    const chartSection = document.createElement('div');
    chartSection.className = 'chart-section';
    const chartLabel = document.createElement('div');
    chartLabel.className = 'chart-label';
    chartLabel.textContent = '难度曲线 (0-2000px)';
    chartSection.appendChild(chartLabel);

    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'chart-canvas';
    chartCanvas.width = CHART_WIDTH;
    chartCanvas.height = CHART_HEIGHT;
    chartSection.appendChild(chartCanvas);
    this.chartCanvas = chartCanvas;
    this.chartCtx = chartCanvas.getContext('2d');

    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:#E74C3C"></span>障碍物密度</div>
      <div class="legend-item"><span class="legend-dot" style="background:#2ECC71"></span>平台间距</div>
      <div class="legend-item"><span class="legend-dot" style="background:#3498DB"></span>速度因子</div>
    `;
    chartSection.appendChild(legend);
    this.container.appendChild(chartSection);
  }

  private debouncedOnChange = debounce(() => {
    this.onChange({ ...this.params });
  }, 1000);

  private updateUIFromParams(): void {
    SLIDER_CONFIGS.forEach(config => {
      const slider = this.sliderElements.get(config.key);
      const valueSpan = this.valueElements.get(config.key);
      const val = this.params[config.key] as number;
      if (slider) slider.value = val.toString();
      if (valueSpan) {
        valueSpan.textContent = config.key === 'obstacleDensity'
          ? val.toFixed(2)
          : val.toFixed(1);
      }
    });
    if (this.seedInput) {
      this.seedInput.value = this.params.seed.toString();
    }
  }

  private renderPresetTabs(): void {
    if (!this.presetTabContainer) return;
    this.presetTabContainer.innerHTML = '';

    for (let i = 0; i < MAX_PRESETS; i++) {
      const preset = this.presets[i];
      const tab = document.createElement('button');
      tab.className = 'preset-tab';
      tab.style.animationDelay = `${i * 0.05}s`;

      if (preset) {
        tab.textContent = `预设 ${i + 1}`;
        if (this.activePresetId === i) {
          tab.classList.add('active');
        }
        tab.addEventListener('click', () => this.loadPreset(i));
      } else {
        tab.classList.add('empty');
        tab.textContent = `空 ${i + 1}`;
        tab.disabled = true;
      }

      this.presetTabContainer.appendChild(tab);
    }
  }

  private saveCurrentPreset(): void {
    let emptyIndex = this.presets.findIndex(p => p === null);
    if (emptyIndex === -1) {
      emptyIndex = MAX_PRESETS - 1;
    }

    this.presets[emptyIndex] = {
      id: emptyIndex,
      params: { ...this.params }
    };
    this.activePresetId = emptyIndex;
    this.renderPresetTabs();
  }

  private loadPreset(id: number): void {
    const preset = this.presets[id];
    if (!preset) return;
    this.params = { ...preset.params };
    this.activePresetId = id;
    this.updateUIFromParams();
    this.renderPresetTabs();
    this.onChange({ ...this.params });
  }

  private startChartLoop(): void {
    const tick = () => {
      const now = performance.now();
      if (now - this.lastChartUpdate >= this.CHART_UPDATE_INTERVAL) {
        this.renderChart();
        this.lastChartUpdate = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private renderChart(): void {
    if (!this.chartCtx || !this.chartCanvas) return;
    const ctx = this.chartCtx;

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < CHART_MAX_DIFFICULTY; i++) {
      const y = CHART_HEIGHT - (i / CHART_MAX_DIFFICULTY) * CHART_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CHART_WIDTH, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px sans-serif';
    ctx.fillText('0', 2, CHART_HEIGHT - 2);
    ctx.fillText('10', 2, 10);
    ctx.fillText('0', 2, CHART_HEIGHT - 2);
    ctx.fillText('2000', CHART_WIDTH - 28, CHART_HEIGHT - 2);

    const colors = {
      density: '#E74C3C',
      spacing: '#2ECC71',
      speed: '#3498DB'
    };

    const dataKeys: ('density' | 'spacing' | 'speed')[] = ['density', 'spacing', 'speed'];

    dataKeys.forEach(key => {
      ctx.strokeStyle = colors[key];
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= CHART_WIDTH; px += 2) {
        const distance = (px / CHART_WIDTH) * CHART_MAX_DISTANCE;
        const diff = computeDifficultyAtDistance(this.params, distance);
        const val = diff[key];
        const y = CHART_HEIGHT - (val / CHART_MAX_DIFFICULTY) * CHART_HEIGHT;
        if (!started) {
          ctx.moveTo(px, y);
          started = true;
        } else {
          ctx.lineTo(px, y);
        }
      }
      ctx.stroke();
    });
  }

  private setupResponsive(): void {
    const checkWidth = () => {
      const width = window.innerWidth;
      if (width < 1200) {
        this.container.classList.add('floating');
      } else {
        this.container.classList.remove('floating');
        this.container.classList.remove('dragging');
        this.container.style.left = '';
        this.container.style.top = '';
        this.container.style.right = '20px';
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
  }

  private setupDragging(): void {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    this.container.addEventListener('mousedown', (e) => {
      if (!this.container.classList.contains('floating')) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'CANVAS') return;

      isDragging = true;
      this.container.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.container.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      this.container.style.right = 'auto';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.container.style.left = `${startLeft + dx}px`;
      this.container.style.top = `${startTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.container.classList.remove('dragging');
      }
    });
  }
}
