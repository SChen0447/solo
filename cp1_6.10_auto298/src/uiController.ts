import type { MeasurementCombination, MeasurementResult } from './particleSystem';

export interface MeasurementStats {
  'up-up': number;
  'up-down': number;
  'down-up': number;
  'down-down': number;
  total: number;
  history: MeasurementResult[];
}

const BAR_CONFIG: { key: MeasurementCombination; label: string; className: string }[] = [
  { key: 'up-up', label: '上上', className: 'bar-up-up' },
  { key: 'up-down', label: '上下', className: 'bar-up-down' },
  { key: 'down-up', label: '下上', className: 'bar-down-up' },
  { key: 'down-down', label: '下下', className: 'bar-down-down' }
];

const MAX_HISTORY = 50;
const CHART_MAX_HEIGHT = 140;

export class UIController {
  private readonly controlPanel: HTMLElement;
  private readonly chartContainer: HTMLElement;
  private readonly measureCountSpan: HTMLElement;
  private readonly measureBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly barElements: Map<MeasurementCombination, { bar: HTMLElement; value: HTMLElement }> = new Map();

  private readonly onMeasureCallback: () => void;
  private readonly onResetCallback: () => void;

  constructor(
    onMeasure: () => void,
    onReset: () => void
  ) {
    this.onMeasureCallback = onMeasure;
    this.onResetCallback = onReset;

    const controlPanelEl = document.getElementById('control-panel');
    const chartContainerEl = document.getElementById('chart-container');
    const measureCountEl = document.getElementById('measure-count');

    if (!controlPanelEl || !chartContainerEl || !measureCountEl) {
      throw new Error('Required DOM elements not found');
    }

    this.controlPanel = controlPanelEl;
    this.chartContainer = chartContainerEl;
    this.measureCountSpan = measureCountEl;

    this.measureBtn = this.createMeasureButton();
    this.resetBtn = this.createResetButton();
    this.controlPanel.appendChild(this.measureBtn);
    this.controlPanel.appendChild(this.resetBtn);

    this.createChartBars();
  }

  private createMeasureButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '测量';
    btn.addEventListener('click', (e) => {
      this.createRipple(btn, e);
      this.onMeasureCallback();
    });
    return btn;
  }

  private createResetButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'btn btn-reset';
    btn.textContent = '重置';
    btn.addEventListener('click', (e) => {
      this.createRipple(btn, e);
      this.onResetCallback();
    });
    return btn;
  }

  private createRipple(btn: HTMLElement, event: MouseEvent): void {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    btn.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  private createChartBars(): void {
    for (const config of BAR_CONFIG) {
      const wrapper = document.createElement('div');
      wrapper.className = 'bar-wrapper';

      const valueEl = document.createElement('div');
      valueEl.className = 'bar-value';
      valueEl.textContent = '0';

      const bar = document.createElement('div');
      bar.className = `bar ${config.className}`;
      bar.style.height = '2px';

      const labelEl = document.createElement('div');
      labelEl.className = 'bar-label';
      labelEl.textContent = config.label;

      wrapper.appendChild(valueEl);
      wrapper.appendChild(bar);
      wrapper.appendChild(labelEl);

      this.chartContainer.appendChild(wrapper);
      this.barElements.set(config.key, { bar, value: valueEl });
    }
  }

  updateStats(stats: MeasurementStats, highlightKey?: MeasurementCombination): void {
    this.measureCountSpan.textContent = String(stats.total);

    const maxCount = Math.max(
      stats['up-up'],
      stats['up-down'],
      stats['down-up'],
      stats['down-down'],
      1
    );

    requestAnimationFrame(() => {
      for (const config of BAR_CONFIG) {
        const elements = this.barElements.get(config.key);
        if (!elements) continue;

        const count = stats[config.key];
        const heightPx = Math.max(2, (count / maxCount) * CHART_MAX_HEIGHT);
        elements.bar.style.height = `${heightPx}px`;
        elements.value.textContent = String(count);

        if (highlightKey === config.key) {
          elements.bar.classList.remove('flash');
          void elements.bar.offsetWidth;
          elements.bar.classList.add('flash');

          setTimeout(() => {
            elements.bar.classList.remove('flash');
          }, 650);
        }
      }
    });
  }

  setMeasuringState(isMeasuring: boolean): void {
    this.measureBtn.disabled = isMeasuring;
    this.resetBtn.disabled = isMeasuring;
  }

  dispose(): void {
    while (this.controlPanel.firstChild) {
      this.controlPanel.removeChild(this.controlPanel.firstChild);
    }
    while (this.chartContainer.firstChild) {
      this.chartContainer.removeChild(this.chartContainer.firstChild);
    }
    this.barElements.clear();
  }

  static createEmptyStats(): MeasurementStats {
    return {
      'up-up': 0,
      'up-down': 0,
      'down-up': 0,
      'down-down': 0,
      total: 0,
      history: []
    };
  }

  static addMeasurement(
    stats: MeasurementStats,
    result: MeasurementResult
  ): MeasurementStats {
    const newHistory = [...stats.history, result];
    while (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    const newStats: MeasurementStats = {
      'up-up': 0,
      'up-down': 0,
      'down-up': 0,
      'down-down': 0,
      total: newHistory.length,
      history: newHistory
    };

    for (const r of newHistory) {
      newStats[r.combination]++;
    }

    return newStats;
  }
}
