import type { SamplingPoint } from './dataManager';

interface MetricOption {
  id: string;
  label: string;
  selected: boolean;
}

const CHEMICAL_COLORS: Record<string, string> = {
  重金属: '#e53935',
  农药: '#8e24aa',
  工业溶剂: '#1e88e5',
};

const POLLUTION_LEVELS = [
  { color: '#66bb6a', label: '低', desc: '0-20：水质优良' },
  { color: '#ffee58', label: '较低', desc: '20-40：轻度污染' },
  { color: '#ffa726', label: '中', desc: '40-60：中度污染' },
  { color: '#ef5350', label: '高', desc: '60-80：重度污染' },
  { color: '#b71c1c', label: '极高', desc: '80-100：严重污染' },
];

const MONTH_LABELS = [
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
];

export class UIManager {
  private container: HTMLElement;
  private onMonthChange: ((month: number) => void) | null = null;
  private onResetView: (() => void) | null = null;
  private onToggleSidebar: (() => void) | null = null;
  private currentMonth: number = 0;
  private metrics: MetricOption[] = [
    { id: 'total', label: '总污染指数', selected: true },
    { id: 'microplastic', label: '微塑料浓度', selected: false },
    { id: 'chemical', label: '化学污染物风险等级', selected: false },
  ];
  private sidebarCollapsed: boolean = false;
  private legendExpanded: boolean = false;
  private avgAnimFrame: number | null = null;
  private maxAnimFrame: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.buildLayout();
    this.attachGlobalStyles();
    this.handleResponsive();
    window.addEventListener('resize', () => this.handleResponsive());
  }

  setOnMonthChange(callback: (month: number) => void): void {
    this.onMonthChange = callback;
  }

  setOnResetView(callback: () => void): void {
    this.onResetView = callback;
  }

  setOnToggleSidebar(callback: () => void): void {
    this.onToggleSidebar = callback;
  }

  getCanvasContainer(): HTMLElement {
    return this.container.querySelector('#canvas-container') as HTMLElement;
  }

  private attachGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .app-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      }

      .top-nav {
        height: 48px;
        background: rgba(10, 20, 40, 0.8);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 20px;
        flex-shrink: 0;
        z-index: 100;
        border-bottom: 1px solid rgba(0, 188, 212, 0.15);
      }

      .app-title {
        color: #e0f7fa;
        font-size: 18px;
        font-weight: 500;
        letter-spacing: 2px;
      }

      .nav-actions {
        display: flex;
        gap: 10px;
      }

      .nav-btn {
        padding: 6px 16px;
        border: none;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        cursor: pointer;
        transition: all 200ms ease-in-out;
        font-weight: 500;
      }

      .btn-reset {
        background: #00acc1;
      }
      .btn-reset:hover {
        background: #00838f;
      }

      .btn-export {
        background: #26a69a;
      }
      .btn-export:hover {
        background: #1e8e82;
      }

      .sidebar-toggle-btn {
        display: none;
        background: rgba(0, 188, 212, 0.3);
        border: 1px solid rgba(0, 188, 212, 0.5);
        color: #e0f7fa;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 18px;
        margin-right: 10px;
        transition: all 200ms ease-in-out;
      }
      .sidebar-toggle-btn:hover {
        background: rgba(0, 188, 212, 0.5);
      }

      .main-content {
        flex: 1;
        display: flex;
        overflow: hidden;
        position: relative;
      }

      .data-panel {
        width: 40%;
        background: rgba(10, 20, 40, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        overflow-y: auto;
        flex-shrink: 0;
        transition: transform 300ms ease-in-out;
        border-right: 1px solid rgba(0, 188, 212, 0.15);
        z-index: 50;
      }

      .data-panel.collapsed {
        transform: translateX(-100%);
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 320px;
      }

      .panel-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .section-title {
        font-size: 14px;
        color: #80deea;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }

      .section-title .arrow {
        transition: transform 200ms ease-in-out;
        font-size: 12px;
      }

      .section-title.collapsed .arrow {
        transform: rotate(-90deg);
      }

      .section-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow: hidden;
        transition: max-height 300ms ease-in-out;
        max-height: 500px;
      }

      .section-content.hidden {
        max-height: 0;
      }

      .metric-option {
        display: flex;
        align-items: center;
        padding: 10px 14px;
        background: rgba(0, 188, 212, 0.08);
        border: 1px solid rgba(0, 188, 212, 0.15);
        border-radius: 8px;
        cursor: pointer;
        transition: all 200ms ease-in-out;
        font-size: 14px;
        color: #b2ebf2;
      }

      .metric-option:hover {
        background: rgba(0, 188, 212, 0.15);
        border-color: rgba(0, 188, 212, 0.3);
      }

      .metric-option.selected {
        background: rgba(0, 188, 212, 0.25);
        border-color: #00bcd4;
        color: #e0f7fa;
      }

      .metric-option .checkbox {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 188, 212, 0.5);
        border-radius: 4px;
        margin-right: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 200ms ease-in-out;
      }

      .metric-option.selected .checkbox {
        background: #00bcd4;
        border-color: #00bcd4;
      }

      .metric-option.selected .checkbox::after {
        content: '✓';
        color: #fff;
        font-size: 11px;
        font-weight: bold;
      }

      .time-slider-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .time-labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #80deea;
      }

      .time-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: linear-gradient(to right, #00bcd4, #ff5722);
        outline: none;
        cursor: pointer;
      }

      .time-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #00bcd4;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        transition: all 200ms ease-in-out;
      }

      .time-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
      }

      .time-slider::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #00bcd4;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      .current-month-label {
        text-align: center;
        font-size: 15px;
        color: #e0f7fa;
        font-weight: 600;
        padding: 4px 0;
      }

      .stats-cards {
        display: flex;
        gap: 12px;
      }

      .stat-card {
        flex: 1;
        background: rgba(0, 188, 212, 0.08);
        border: 1px solid rgba(0, 188, 212, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .stat-label {
        font-size: 12px;
        color: #80deea;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #00bcd4;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .stat-unit {
        font-size: 12px;
        color: #80deea;
      }

      .canvas-container {
        flex: 1;
        position: relative;
        background: #0b1a2e;
      }

      #main-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .legend-btn {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #ffffff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        transition: all 200ms ease-in-out;
        z-index: 60;
      }

      .legend-btn:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      }

      .legend-panel {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 150px;
        background: rgba(10, 20, 40, 0.9);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transform: translateY(100%);
        transition: transform 300ms ease-out;
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 55;
        border-top: 1px solid rgba(0, 188, 212, 0.2);
      }

      .legend-panel.expanded {
        transform: translateY(0);
      }

      .legend-title {
        color: #e0f7fa;
        font-size: 14px;
        font-weight: 600;
      }

      .legend-items {
        display: flex;
        gap: 20px;
        overflow-x: auto;
        padding-bottom: 8px;
      }

      .legend-items::-webkit-scrollbar {
        height: 4px;
      }
      .legend-items::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
      }
      .legend-items::-webkit-scrollbar-thumb {
        background: rgba(0, 188, 212, 0.4);
        border-radius: 2px;
      }

      .legend-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }

      .legend-color-block {
        width: 100px;
        height: 30px;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      .legend-label {
        font-size: 12px;
        color: #e0f7fa;
        font-weight: 500;
      }

      .legend-desc {
        font-size: 11px;
        color: #80deea;
        white-space: nowrap;
      }

      .popup-card {
        position: absolute;
        width: 200px;
        background: rgba(10, 20, 40, 0.85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        border-radius: 12px;
        padding: 14px;
        color: #e0f7fa;
        font-size: 12px;
        z-index: 70;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 188, 212, 0.2);
        display: none;
        pointer-events: none;
      }

      .popup-card.visible {
        display: block;
      }

      .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 188, 212, 0.2);
      }

      .popup-id {
        font-weight: 600;
        font-size: 13px;
        color: #00bcd4;
      }

      .popup-coords {
        font-size: 11px;
        color: #80deea;
      }

      .popup-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .popup-label {
        color: #80deea;
      }

      .popup-value {
        font-weight: 600;
      }

      .microplastic-bar-container {
        margin: 8px 0;
      }

      .microplastic-bar {
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 4px;
      }

      .microplastic-bar-fill {
        height: 100%;
        background: linear-gradient(to right, #00bcd4, #26a69a);
        border-radius: 4px;
        width: 0;
        transition: width 600ms ease-in-out;
      }

      .chemical-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }

      .chemical-tag {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        color: #fff;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 200;
      }

      .modal-overlay.visible {
        display: flex;
      }

      .modal {
        width: 400px;
        background: #1a2a4a;
        border-radius: 16px;
        padding: 32px;
        text-align: center;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 188, 212, 0.2);
      }

      .modal-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .modal-title {
        font-size: 18px;
        color: #e0f7fa;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .modal-subtitle {
        font-size: 13px;
        color: #80deea;
        margin-bottom: 24px;
      }

      .modal-btn {
        padding: 10px 32px;
        background: #00acc1;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        font-weight: 500;
        transition: all 200ms ease-in-out;
      }
      .modal-btn:hover {
        background: #00838f;
      }

      @media (max-width: 900px) {
        .sidebar-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .data-panel {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 320px;
          transform: translateX(-100%);
        }

        .data-panel.mobile-open {
          transform: translateX(0);
        }

        .canvas-container {
          width: 100%;
        }
      }

      .sidebar-overlay {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 40;
      }

      .sidebar-overlay.visible {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  private buildLayout(): void {
    this.container.innerHTML = `
      <div class="app-container">
        <nav class="top-nav">
          <div style="display: flex; align-items: center;">
            <button class="sidebar-toggle-btn" id="sidebar-toggle">☰</button>
            <div class="app-title">🌊 洁净深蓝</div>
          </div>
          <div class="nav-actions">
            <button class="nav-btn btn-reset" id="reset-view">重置视角</button>
            <button class="nav-btn btn-export" id="export-report">导出报告</button>
          </div>
        </nav>

        <div class="main-content">
          <aside class="data-panel" id="data-panel">
            <div class="panel-section">
              <div class="section-title" id="metrics-toggle">
                <span>📊 监测指标</span>
                <span class="arrow">▼</span>
              </div>
              <div class="section-content" id="metrics-content">
                ${this.metrics
                  .map(
                    (m) => `
                  <div class="metric-option ${m.selected ? 'selected' : ''}" data-metric="${m.id}">
                    <div class="checkbox"></div>
                    <span>${m.label}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="panel-section">
              <div class="section-title" id="time-toggle">
                <span>📅 时间轴</span>
                <span class="arrow">▼</span>
              </div>
              <div class="section-content" id="time-content">
                <div class="time-slider-container">
                  <div class="time-labels">
                    <span>2025-01</span>
                    <span>2025-12</span>
                  </div>
                  <input type="range" class="time-slider" id="time-slider" min="0" max="11" step="1" value="0" />
                  <div class="current-month-label" id="current-month">2025年01月</div>
                </div>
              </div>
            </div>

            <div class="panel-section">
              <div class="section-title">
                <span>📈 统计摘要</span>
              </div>
              <div class="section-content">
                <div class="stats-cards">
                  <div class="stat-card">
                    <span class="stat-label">平均污染指数</span>
                    <span class="stat-value" id="stat-avg">0.0</span>
                    <span class="stat-unit">单位：PI</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-label">最高污染指数</span>
                    <span class="stat-value" id="stat-max">0.0</span>
                    <span class="stat-unit">单位：PI</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div class="sidebar-overlay" id="sidebar-overlay"></div>

          <div class="canvas-container" id="canvas-container">
            <canvas id="main-canvas"></canvas>

            <button class="legend-btn" id="legend-btn">🌊</button>

            <div class="legend-panel" id="legend-panel">
              <div class="legend-title">污染指数等级说明</div>
              <div class="legend-items">
                ${POLLUTION_LEVELS.map(
                  (lvl) => `
                  <div class="legend-item">
                    <div class="legend-color-block" style="background: ${lvl.color};"></div>
                    <div class="legend-label">${lvl.label}</div>
                    <div class="legend-desc">${lvl.desc}</div>
                  </div>
                `
                ).join('')}
              </div>
            </div>

            <div class="popup-card" id="popup-card">
              <div class="popup-header">
                <span class="popup-id" id="popup-id">采样点 #1</span>
                <span class="popup-coords" id="popup-coords">0.00, 0.00</span>
              </div>
              <div class="popup-row">
                <span class="popup-label">污染指数</span>
                <span class="popup-value" id="popup-pollution" style="color: #00bcd4;">0.0</span>
              </div>
              <div class="microplastic-bar-container">
                <div class="popup-label" style="margin-bottom: 4px;">微塑料占比</div>
                <div class="microplastic-bar">
                  <div class="microplastic-bar-fill" id="mp-bar-fill"></div>
                </div>
                <div style="text-align: right; margin-top: 2px; font-size: 11px; color: #00bcd4; font-weight: 600;" id="mp-text">0%</div>
              </div>
              <div>
                <span class="popup-label">化学污染物</span>
                <div class="chemical-tags" id="chemical-tags"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="export-modal">
          <div class="modal">
            <div class="modal-icon">📄</div>
            <div class="modal-title">报告已生成</div>
            <div class="modal-subtitle">近海塑料污染监测报告已准备就绪，即将开始下载。</div>
            <button class="modal-btn" id="modal-close">关闭</button>
          </div>
        </div>
      </div>
    `;

    this.bindUIEvents();
  }

  private bindUIEvents(): void {
    const slider = this.container.querySelector('#time-slider') as HTMLInputElement;
    slider.addEventListener('input', (e) => {
      const month = parseInt((e.target as HTMLInputElement).value, 10);
      this.currentMonth = month;
      this.updateMonthLabel(month);
      if (this.onMonthChange) {
        this.onMonthChange(month);
      }
    });

    this.container.querySelectorAll('.metric-option').forEach((el) => {
      el.addEventListener('click', () => {
        const metricId = el.getAttribute('data-metric');
        this.metrics = this.metrics.map((m) => ({
          ...m,
          selected: m.id === metricId,
        }));
        this.container.querySelectorAll('.metric-option').forEach((opt) => {
          opt.classList.toggle(
            'selected',
            opt.getAttribute('data-metric') === metricId
          );
        });
      });
    });

    const metricsToggle = this.container.querySelector('#metrics-toggle');
    const metricsContent = this.container.querySelector('#metrics-content');
    metricsToggle?.addEventListener('click', () => {
      metricsToggle.classList.toggle('collapsed');
      metricsContent?.classList.toggle('hidden');
    });

    const timeToggle = this.container.querySelector('#time-toggle');
    const timeContent = this.container.querySelector('#time-content');
    timeToggle?.addEventListener('click', () => {
      timeToggle.classList.toggle('collapsed');
      timeContent?.classList.toggle('hidden');
    });

    const resetBtn = this.container.querySelector('#reset-view');
    resetBtn?.addEventListener('click', () => {
      if (this.onResetView) this.onResetView();
    });

    const exportBtn = this.container.querySelector('#export-report');
    const exportModal = this.container.querySelector('#export-modal');
    const modalClose = this.container.querySelector('#modal-close');
    exportBtn?.addEventListener('click', () => {
      exportModal?.classList.add('visible');
    });
    modalClose?.addEventListener('click', () => {
      exportModal?.classList.remove('visible');
    });
    exportModal?.addEventListener('click', (e) => {
      if (e.target === exportModal) {
        exportModal.classList.remove('visible');
      }
    });

    const legendBtn = this.container.querySelector('#legend-btn');
    const legendPanel = this.container.querySelector('#legend-panel');
    legendBtn?.addEventListener('click', () => {
      this.legendExpanded = !this.legendExpanded;
      legendPanel?.classList.toggle('expanded', this.legendExpanded);
    });

    const sidebarToggle = this.container.querySelector('#sidebar-toggle');
    const sidebarOverlay = this.container.querySelector('#sidebar-overlay');
    const dataPanel = this.container.querySelector('#data-panel');
    sidebarToggle?.addEventListener('click', () => this.toggleMobileSidebar());
    sidebarOverlay?.addEventListener('click', () => this.toggleMobileSidebar(false));
  }

  private toggleMobileSidebar(force?: boolean): void {
    const dataPanel = this.container.querySelector('#data-panel');
    const sidebarOverlay = this.container.querySelector('#sidebar-overlay');
    const shouldOpen = force !== undefined ? force : !dataPanel?.classList.contains('mobile-open');
    dataPanel?.classList.toggle('mobile-open', shouldOpen);
    sidebarOverlay?.classList.toggle('visible', shouldOpen);
  }

  private handleResponsive(): void {
    const isMobile = window.innerWidth < 900;
    const dataPanel = this.container.querySelector('#data-panel');
    if (!isMobile) {
      dataPanel?.classList.remove('mobile-open');
      this.container.querySelector('#sidebar-overlay')?.classList.remove('visible');
    }
  }

  private updateMonthLabel(month: number): void {
    const labelEl = this.container.querySelector('#current-month');
    if (labelEl) {
      const [year, m] = MONTH_LABELS[month].split('-');
      labelEl.textContent = `${year}年${parseInt(m, 10).toString().padStart(2, '0')}月`;
    }
  }

  private animateNumber(element: HTMLElement, from: number, to: number): void {
    const duration = 600;
    const startTime = performance.now();
    const frameKey = element.id === 'stat-avg' ? 'avgAnimFrame' : 'maxAnimFrame';

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const current = from + (to - from) * eased;
      element.textContent = current.toFixed(1);

      if (t < 1) {
        (this as any)[frameKey] = requestAnimationFrame(step);
      }
    };

    if ((this as any)[frameKey] !== null) {
      cancelAnimationFrame((this as any)[frameKey]);
    }
    (this as any)[frameKey] = requestAnimationFrame(step);
  }

  updateSummary(avg: number, max: number): void {
    const avgEl = this.container.querySelector('#stat-avg') as HTMLElement;
    const maxEl = this.container.querySelector('#stat-max') as HTMLElement;
    const currentAvg = parseFloat(avgEl.textContent || '0');
    const currentMax = parseFloat(maxEl.textContent || '0');

    if (!isNaN(currentAvg)) {
      this.animateNumber(avgEl, currentAvg, avg);
    } else {
      avgEl.textContent = avg.toFixed(1);
    }

    if (!isNaN(currentMax)) {
      this.animateNumber(maxEl, currentMax, max);
    } else {
      maxEl.textContent = max.toFixed(1);
    }
  }

  showPopup(pointData: SamplingPoint, canvasX: number, canvasY: number): void {
    const popup = this.container.querySelector('#popup-card') as HTMLElement;
    const canvasContainer = this.container.querySelector('#canvas-container') as HTMLElement;
    if (!popup || !canvasContainer) return;

    (this.container.querySelector('#popup-id') as HTMLElement).textContent = `采样点 #${pointData.id}`;
    (this.container.querySelector('#popup-coords') as HTMLElement).textContent =
      `${pointData.lat.toFixed(2)}, ${pointData.lng.toFixed(2)}`;
    (this.container.querySelector('#popup-pollution') as HTMLElement).textContent =
      pointData.pollutionIndex.toFixed(1);

    const mpPercent = Math.round(pointData.microplasticRatio * 100);
    setTimeout(() => {
      const barFill = this.container.querySelector('#mp-bar-fill') as HTMLElement;
      if (barFill) barFill.style.width = `${mpPercent}%`;
    }, 50);
    (this.container.querySelector('#mp-text') as HTMLElement).textContent = `${mpPercent}%`;

    const tagsContainer = this.container.querySelector('#chemical-tags') as HTMLElement;
    tagsContainer.innerHTML = pointData.chemicalTypes.length
      ? pointData.chemicalTypes
          .slice(0, 3)
          .map(
            (type) =>
              `<span class="chemical-tag" style="background: ${CHEMICAL_COLORS[type] || '#666'};">${type}</span>`
          )
          .join('')
      : '<span class="popup-label" style="font-size: 11px; color: #80deea;">未检测到</span>';

    popup.classList.add('visible');

    const popupWidth = 200;
    const popupHeight = 160;
    const containerRect = canvasContainer.getBoundingClientRect();
    let left = canvasX + 20;
    let top = canvasY - popupHeight / 2;

    if (left + popupWidth > containerRect.width - 10) {
      left = canvasX - popupWidth - 20;
    }
    if (top < 10) top = 10;
    if (top + popupHeight > containerRect.height - 10) {
      top = containerRect.height - popupHeight - 10;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  hidePopup(): void {
    const popup = this.container.querySelector('#popup-card');
    popup?.classList.remove('visible');
    const barFill = this.container.querySelector('#mp-bar-fill') as HTMLElement;
    if (barFill) barFill.style.width = '0';
  }

  destroy(): void {
    if (this.avgAnimFrame !== null) cancelAnimationFrame(this.avgAnimFrame);
    if (this.maxAnimFrame !== null) cancelAnimationFrame(this.maxAnimFrame);
  }
}
