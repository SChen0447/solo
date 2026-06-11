import { gsap } from 'gsap';
import { scaleLinear } from 'd3-scale';
import { Ecosystem } from './ecosystem';
import { Worm, WormInfo } from './worm';

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  parameters: {
    temperature?: number;
    sulfide?: number;
    currentSpeed?: number;
  };
}

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  onChange: (value: number) => void;
}

export class UIManager {
  private ecosystem: Ecosystem;
  private logEntries: LogEntry[];
  private logIdCounter: number;
  private container: HTMLElement;
  private controlPanel: HTMLElement | null;
  private logPanel: HTMLElement | null;
  private detailPanel: HTMLElement | null;
  private logButton: HTMLElement | null;
  private isLogPanelOpen: boolean;
  private onWormClickCallback: ((worm: Worm) => void) | null;

  constructor(ecosystem: Ecosystem, container: HTMLElement) {
    this.ecosystem = ecosystem;
    this.container = container;
    this.logEntries = [];
    this.logIdCounter = 0;
    this.controlPanel = null;
    this.logPanel = null;
    this.detailPanel = null;
    this.logButton = null;
    this.isLogPanelOpen = false;
    this.onWormClickCallback = null;
  }

  public init(): void {
    this.injectStyles();
    this.createControlPanel();
    this.createEcologyLogButton();
    this.createLogPanel();
    this.createDetailPanel();
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 280px;
        padding: 20px;
        background: rgba(0, 10, 20, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid #00aaff;
        border-radius: 16px;
        box-shadow: 0 0 30px rgba(0, 170, 255, 0.3),
                    inset 0 0 20px rgba(0, 170, 255, 0.1);
        z-index: 1000;
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        color: #e0f0ff;
      }

      .control-panel h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #00ddff;
        text-shadow: 0 0 10px rgba(0, 221, 255, 0.5);
        letter-spacing: 1px;
      }

      .slider-group {
        margin-bottom: 18px;
      }

      .slider-group:last-child {
        margin-bottom: 0;
      }

      .slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        color: #a0c0e0;
      }

      .slider-value {
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 12px;
        padding: 2px 8px;
        background: rgba(0, 170, 255, 0.2);
        border-radius: 4px;
        color: #00ddff;
      }

      .slider-container {
        position: relative;
        height: 6px;
        background: rgba(0, 50, 80, 0.5);
        border-radius: 3px;
        cursor: pointer;
      }

      .slider-track {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: linear-gradient(90deg, #0066aa, #00aaff);
        border-radius: 3px;
        box-shadow: 0 0 10px rgba(0, 170, 255, 0.5);
        transition: width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .slider-thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 16px;
        height: 16px;
        background: #00ddff;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0, 221, 255, 0.8),
                    inset 0 0 5px rgba(255, 255, 255, 0.5);
        cursor: grab;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.3s ease;
      }

      .slider-thumb:hover {
        transform: translate(-50%, -50%) scale(1.2);
        box-shadow: 0 0 25px rgba(0, 221, 255, 1),
                    inset 0 0 8px rgba(255, 255, 255, 0.7);
      }

      .slider-thumb.dragging {
        cursor: grabbing;
        transform: translate(-50%, -50%) scale(1.1);
      }

      .log-button {
        position: fixed;
        top: 24px;
        right: 24px;
        padding: 10px 24px;
        background: #004466;
        color: #e0f0ff;
        border: none;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        z-index: 1000;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(0, 50, 80, 0.4);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }

      .log-button:hover {
        background: #006688;
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 100, 130, 0.5);
      }

      .log-button:active {
        transform: translateY(0);
      }

      .log-panel {
        position: fixed;
        top: 0;
        left: -350px;
        width: 350px;
        height: 100vh;
        background: rgba(0, 10, 20, 0.9);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-right: 1px solid #00aaff;
        z-index: 1001;
        overflow-y: auto;
        transition: left 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Segoe UI', system-ui, sans-serif;
      }

      .log-panel.open {
        left: 0;
      }

      .log-panel-header {
        padding: 24px;
        border-bottom: 1px solid rgba(0, 170, 255, 0.3);
        position: sticky;
        top: 0;
        background: rgba(0, 10, 20, 0.95);
        z-index: 1;
      }

      .log-panel-header h3 {
        margin: 0;
        font-size: 18px;
        color: #00ddff;
        text-shadow: 0 0 10px rgba(0, 221, 255, 0.5);
      }

      .log-panel-close {
        position: absolute;
        top: 20px;
        right: 20px;
        width: 28px;
        height: 28px;
        background: none;
        border: 1px solid #00aaff;
        border-radius: 50%;
        color: #00aaff;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .log-panel-close:hover {
        background: #00aaff;
        color: #03050a;
      }

      .log-entries {
        padding: 16px;
      }

      .log-entry {
        padding: 16px;
        margin-bottom: 12px;
        background: rgba(0, 30, 50, 0.5);
        border-radius: 8px;
        border: 1px solid rgba(0, 170, 255, 0.2);
        transition: all 0.3s ease;
      }

      .log-entry:hover {
        background: rgba(0, 40, 70, 0.6);
        border-color: rgba(0, 170, 255, 0.4);
      }

      .log-entry.latest {
        border-color: #00ffaa;
        box-shadow: 0 0 20px rgba(0, 255, 170, 0.3);
      }

      .log-timestamp {
        font-size: 11px;
        color: #6080a0;
        margin-bottom: 8px;
        font-family: 'JetBrains Mono', monospace;
      }

      .log-message {
        font-size: 13px;
        color: #c0e0ff;
        line-height: 1.5;
      }

      .log-params {
        margin-top: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .log-param-tag {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(0, 170, 255, 0.2);
        border-radius: 4px;
        color: #00ddff;
        font-family: 'JetBrains Mono', monospace;
      }

      .detail-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 5, 15, 0.8);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .detail-overlay.visible {
        display: flex;
        opacity: 1;
      }

      .detail-panel {
        width: 480px;
        max-width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        padding: 32px;
        background: rgba(0, 15, 30, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid #00aaff;
        border-radius: 20px;
        box-shadow: 0 0 50px rgba(0, 170, 255, 0.4);
        transform: scale(0.8);
        opacity: 0;
        font-family: 'Segoe UI', system-ui, sans-serif;
        color: #e0f0ff;
      }

      .detail-panel.visible {
        transform: scale(1);
        opacity: 1;
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(0, 170, 255, 0.3);
      }

      .detail-header h2 {
        margin: 0;
        font-size: 22px;
        color: #00ddff;
        text-shadow: 0 0 15px rgba(0, 221, 255, 0.5);
      }

      .detail-close {
        width: 32px;
        height: 32px;
        background: none;
        border: 1px solid #ff6666;
        border-radius: 50%;
        color: #ff6666;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .detail-close:hover {
        background: #ff6666;
        color: #03050a;
      }

      .detail-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .stat-card {
        padding: 16px;
        background: rgba(0, 40, 70, 0.4);
        border-radius: 12px;
        border: 1px solid rgba(0, 170, 255, 0.2);
      }

      .stat-label {
        font-size: 12px;
        color: #6090c0;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #00ffaa;
        font-family: 'JetBrains Mono', monospace;
      }

      .stat-value.unit {
        font-size: 14px;
        color: #6090c0;
        font-weight: 400;
      }

      .chart-container {
        margin-top: 24px;
      }

      .chart-title {
        font-size: 14px;
        color: #80b0e0;
        margin-bottom: 12px;
      }

      .chart-svg {
        width: 100%;
        height: 180px;
        background: rgba(0, 20, 40, 0.5);
        border-radius: 8px;
        border: 1px solid rgba(0, 170, 255, 0.2);
      }

      .chart-line {
        fill: none;
        stroke: #00ffaa;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .chart-area {
        fill: url(#chartGradient);
        opacity: 0.3;
      }

      .chart-dot {
        fill: #00ffaa;
        filter: drop-shadow(0 0 4px rgba(0, 255, 170, 0.8));
      }

      .chart-axis {
        stroke: rgba(0, 170, 255, 0.3);
        stroke-width: 1;
      }

      .chart-label {
        fill: #6090c0;
        font-size: 10px;
        font-family: 'JetBrains Mono', monospace;
      }

      .detail-section-title {
        font-size: 14px;
        color: #80b0e0;
        margin: 20px 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 170, 255, 0.2);
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(0, 30, 50, 0.3);
        border-radius: 6px;
        font-size: 13px;
      }

      .info-key {
        color: #6090c0;
      }

      .info-val {
        color: #e0f0ff;
        font-weight: 600;
      }

      .activity-bar {
        height: 8px;
        background: rgba(0, 30, 50, 0.5);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 4px;
      }

      .activity-fill {
        height: 100%;
        background: linear-gradient(90deg, #ff4444, #ffaa00, #00ffaa);
        border-radius: 4px;
        transition: width 0.5s ease;
        box-shadow: 0 0 10px rgba(0, 255, 170, 0.5);
      }

      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(0, 20, 40, 0.3);
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(0, 170, 255, 0.4);
        border-radius: 3px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 170, 255, 0.6);
      }
    `;
    document.head.appendChild(style);
  }

  private createControlPanel(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.className = 'control-panel';
    this.controlPanel.innerHTML = `
      <h3>⚙ 环境参数控制</h3>
      <div id="slider-temperature" class="slider-group"></div>
      <div id="slider-sulfide" class="slider-group"></div>
      <div id="slider-current" class="slider-group"></div>
    `;
    this.container.appendChild(this.controlPanel);

    const sliders: SliderConfig[] = [
      {
        key: 'temperature',
        label: '🌡 热泉温度',
        min: 2,
        max: 15,
        step: 0.5,
        default: 8,
        unit: '°C',
        onChange: (value) => {
          this.ecosystem.setTemperature(value);
          this.addLogEntry({
            message: `温度调整至 ${value}°C`,
            parameters: { temperature: value }
          });
        }
      },
      {
        key: 'sulfide',
        label: '🧪 硫化物浓度',
        min: 0.1,
        max: 2.0,
        step: 0.1,
        default: 0.8,
        unit: 'mmol/L',
        onChange: (value) => {
          this.ecosystem.setSulfideConcentration(value);
          this.addLogEntry({
            message: `硫化物浓度调整至 ${value} mmol/L`,
            parameters: { sulfide: value }
          });
        }
      },
      {
        key: 'current',
        label: '🌊 洋流速度',
        min: 0,
        max: 3,
        step: 0.1,
        default: 1,
        unit: 'm/s',
        onChange: (value) => {
          this.ecosystem.setCurrentSpeed(value);
          this.addLogEntry({
            message: `洋流速度调整至 ${value} m/s`,
            parameters: { currentSpeed: value }
          });
        }
      }
    ];

    sliders.forEach(config => {
      this.createSlider(
        document.getElementById(`slider-${config.key}`)!,
        config
      );
    });
  }

  private createSlider(container: HTMLElement, config: SliderConfig): void {
    const sliderGroup = document.createElement('div');
    sliderGroup.innerHTML = `
      <div class="slider-label">
        <span>${config.label}</span>
        <span class="slider-value" id="value-${config.key}">${config.default}${config.unit}</span>
      </div>
      <div class="slider-container" id="container-${config.key}">
        <div class="slider-track" id="track-${config.key}"></div>
        <div class="slider-thumb" id="thumb-${config.key}"></div>
      </div>
    `;
    container.appendChild(sliderGroup);

    const sliderContainer = sliderGroup.querySelector(`#container-${config.key}`) as HTMLElement;
    const track = sliderGroup.querySelector(`#track-${config.key}`) as HTMLElement;
    const thumb = sliderGroup.querySelector(`#thumb-${config.key}`) as HTMLElement;
    const valueDisplay = sliderGroup.querySelector(`#value-${config.key}`) as HTMLElement;

    let currentValue = config.default;
    let isDragging = false;

    const updateSlider = (value: number, animate: boolean = false) => {
      const clampedValue = Math.max(config.min, Math.min(config.max, value));
      const percentage = ((clampedValue - config.min) / (config.max - config.min)) * 100;
      
      if (animate) {
        gsap.to(track, { width: `${percentage}%`, duration: 0.3, ease: "elastic.out(1, 0.8)" });
        gsap.to(thumb, { left: `${percentage}%`, duration: 0.3, ease: "elastic.out(1, 0.8)" });
      } else {
        track.style.width = `${percentage}%`;
        thumb.style.left = `${percentage}%`;
      }
      
      valueDisplay.textContent = `${clampedValue.toFixed(config.step < 1 ? 1 : 0)}${config.unit}`;
      
      if (clampedValue !== currentValue) {
        currentValue = clampedValue;
        config.onChange(clampedValue);
      }
    };

    const getValueFromEvent = (e: MouseEvent | Touch): number => {
      const rect = sliderContainer.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const percentage = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      const rawValue = config.min + percentage * (config.max - config.min);
      const steps = Math.round((rawValue - config.min) / config.step);
      return config.min + steps * config.step;
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      thumb.classList.add('dragging');
      e.preventDefault();
      const value = getValueFromEvent(e as any);
      updateSlider(value);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const value = getValueFromEvent(e as any);
      updateSlider(value);
    };

    const onEnd = () => {
      if (isDragging) {
        isDragging = false;
        thumb.classList.remove('dragging');
      }
    };

    sliderContainer.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    sliderContainer.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);

    updateSlider(config.default);
  }

  private createEcologyLogButton(): void {
    this.logButton = document.createElement('button');
    this.logButton.className = 'log-button';
    this.logButton.innerHTML = '📋 生态日志';
    this.logButton.addEventListener('click', () => this.toggleLogPanel());
    this.container.appendChild(this.logButton);
  }

  private createLogPanel(): void {
    this.logPanel = document.createElement('div');
    this.logPanel.className = 'log-panel';
    this.logPanel.innerHTML = `
      <div class="log-panel-header">
        <h3>🌊 生态日志</h3>
        <button class="log-panel-close" id="close-log">×</button>
      </div>
      <div class="log-entries" id="log-entries"></div>
    `;
    this.container.appendChild(this.logPanel);

    this.logPanel.querySelector('#close-log')?.addEventListener('click', () => {
      this.toggleLogPanel();
    });

    this.addLogEntry({
      message: '**系统初始化**：深海热泉生态圈已启动，所有参数已设置为默认值。',
      parameters: {
        temperature: 8,
        sulfide: 0.8,
        currentSpeed: 1
      }
    });
  }

  private createDetailPanel(): void {
    const overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.id = 'detail-overlay';
    overlay.innerHTML = `
      <div class="detail-panel" id="detail-panel">
        <div class="detail-header">
          <h2>🪱 管状蠕虫详情</h2>
          <button class="detail-close" id="detail-close">×</button>
        </div>
        <div id="detail-content"></div>
      </div>
    `;
    this.container.appendChild(overlay);

    this.detailPanel = document.getElementById('detail-panel') as HTMLElement;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hideWormDetail();
      }
    });

    document.getElementById('detail-close')?.addEventListener('click', () => {
      this.hideWormDetail();
    });
  }

  public showWormDetail(worm: Worm): void {
    const info = worm.getInfo();
    const content = document.getElementById('detail-content');
    if (!content) return;

    content.innerHTML = `
      <div class="detail-stats">
        <div class="stat-card">
          <div class="stat-label">身高</div>
          <div class="stat-value">${info.height}<span class="stat-value.unit"> 单位</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">触手分支</div>
          <div class="stat-value">${info.tentacleBranches}<span class="stat-value.unit"> 根</span></div>
        </div>
      </div>

      <div class="detail-section-title">🦠 共生菌活性</div>
      <div class="info-item">
        <span class="info-key">活性指数</span>
        <span class="info-val">${info.symbiosisActivity}%</span>
      </div>
      <div class="activity-bar">
        <div class="activity-fill" style="width: ${info.symbiosisActivity}%"></div>
      </div>

      <div class="chart-container">
        <div class="chart-title">📈 生长历史时间线</div>
        <svg class="chart-svg" id="growth-chart">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#00ffaa;stop-opacity:0.6" />
              <stop offset="100%" style="stop-color:#00ffaa;stop-opacity:0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    `;

    this.renderGrowthChart(info.growthHistory);

    const overlay = document.getElementById('detail-overlay');
    if (overlay) {
      overlay.classList.add('visible');
      gsap.fromTo(this.detailPanel,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }

  private renderGrowthChart(history: { timestamp: number; height: number }[]): void {
    const svg = document.getElementById('growth-chart') as unknown as SVGSVGElement;
    if (!svg || history.length === 0) return;

    const width = svg.clientWidth || 420;
    const height = svg.clientHeight || 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const times = history.map(h => h.timestamp);
    const heights = history.map(h => h.height);

    const xScale = scaleLinear()
      .domain([Math.min(...times), Math.max(...times)])
      .range([0, chartWidth]);

    const yScale = scaleLinear()
      .domain([Math.min(...heights) * 0.95, Math.max(...heights) * 1.05])
      .range([chartHeight, 0]);

    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', String(padding.left));
    xAxis.setAttribute('y1', String(padding.top + chartHeight));
    xAxis.setAttribute('x2', String(padding.left + chartWidth));
    xAxis.setAttribute('y2', String(padding.top + chartHeight));
    xAxis.setAttribute('class', 'chart-axis');
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', String(padding.left));
    yAxis.setAttribute('y1', String(padding.top));
    yAxis.setAttribute('x2', String(padding.left));
    yAxis.setAttribute('y2', String(padding.top + chartHeight));
    yAxis.setAttribute('class', 'chart-axis');
    svg.appendChild(yAxis);

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    let lineD = '';
    let areaD = '';

    history.forEach((point, i) => {
      const x = padding.left + xScale(point.timestamp);
      const y = padding.top + yScale(point.height);
      
      if (i === 0) {
        lineD += `M ${x} ${y}`;
        areaD += `M ${x} ${padding.top + chartHeight} L ${x} ${y}`;
      } else {
        lineD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }

      if (i === history.length - 1) {
        areaD += ` L ${x} ${padding.top + chartHeight} Z`;
      }
    });

    linePath.setAttribute('d', lineD);
    linePath.setAttribute('class', 'chart-line');
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('class', 'chart-area');

    svg.appendChild(areaPath);
    svg.appendChild(linePath);

    history.forEach((point, i) => {
      const x = padding.left + xScale(point.timestamp);
      const y = padding.top + yScale(point.height);

      if (i % Math.ceil(history.length / 5) === 0 || i === history.length - 1) {
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', String(x));
        xLabel.setAttribute('y', String(padding.top + chartHeight + 18));
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('class', 'chart-label');
        const date = new Date(point.timestamp);
        xLabel.textContent = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        svg.appendChild(xLabel);
      }

      if (i === 0 || i === history.length - 1) {
        const yLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        yLabel.setAttribute('x', String(padding.left - 8));
        yLabel.setAttribute('y', String(y + 3));
        yLabel.setAttribute('text-anchor', 'end');
        yLabel.setAttribute('class', 'chart-label');
        yLabel.textContent = point.height.toFixed(1);
        svg.appendChild(yLabel);
      }

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(y));
      dot.setAttribute('r', i === history.length - 1 ? '5' : '3');
      dot.setAttribute('class', 'chart-dot');
      svg.appendChild(dot);
    });
  }

  public hideWormDetail(): void {
    const overlay = document.getElementById('detail-overlay');
    if (overlay && this.detailPanel) {
      gsap.to(this.detailPanel, {
        scale: 0.8,
        opacity: 0,
        duration: 0.25,
        ease: "back.in(1.7)",
        onComplete: () => {
          overlay.classList.remove('visible');
        }
      });
    }
  }

  public addLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
    const newEntry: LogEntry = {
      id: ++this.logIdCounter,
      timestamp: new Date(),
      ...entry
    };

    this.logEntries.unshift(newEntry);

    if (this.logEntries.length > 50) {
      this.logEntries.pop();
    }

    this.renderLogEntries();
  }

  private renderLogEntries(): void {
    const container = document.getElementById('log-entries');
    if (!container) return;

    container.innerHTML = '';

    this.logEntries.forEach((entry, index) => {
      const entryEl = document.createElement('div');
      entryEl.className = `log-entry ${index === 0 ? 'latest' : ''}`;
      
      const paramTags = Object.entries(entry.parameters)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          const labels: Record<string, string> = {
            temperature: '🌡 温度',
            sulfide: '🧪 硫化物',
            currentSpeed: '🌊 洋流'
          };
          return `<span class="log-param-tag">${labels[k] || k}: ${v}</span>`;
        })
        .join('');

      const formattedMessage = entry.message
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#00ffaa">$1</strong>')
        .replace(/`(.*?)`/g, '<code style="background:rgba(0,170,255,0.2);padding:0 4px;border-radius:2px;font-family:monospace">$1</code>');

      entryEl.innerHTML = `
        <div class="log-timestamp">${entry.timestamp.toLocaleString('zh-CN')}</div>
        <div class="log-message">${formattedMessage}</div>
        ${paramTags ? `<div class="log-params">${paramTags}</div>` : ''}
      `;

      container.appendChild(entryEl);
    });
  }

  public toggleLogPanel(): void {
    if (!this.logPanel) return;

    this.isLogPanelOpen = !this.isLogPanelOpen;
    
    if (this.isLogPanelOpen) {
      this.logPanel.classList.add('open');
    } else {
      this.logPanel.classList.remove('open');
    }
  }

  public generateEcosystemSummary(): string {
    const temp = this.ecosystem.temperature;
    const sulfide = this.ecosystem.sulfideConcentration;
    const current = this.ecosystem.currentSpeed;

    let growthDesc = '正常';
    let glowDesc = '中等';

    if (temp > 10 || sulfide > 1.2) {
      growthDesc = '加速';
    } else if (temp < 5 || sulfide < 0.5) {
      growthDesc = '放缓';
    }

    if (sulfide > 1.0) {
      glowDesc = '强烈';
    } else if (sulfide < 0.5) {
      glowDesc = '微弱';
    }

    return `温度${temp > 10 ? '升高' : temp < 5 ? '降低' : '维持'}至 **${temp}°C**，` +
           `硫化物浓度${sulfide > 1.2 ? '上升' : sulfide < 0.5 ? '下降' : '稳定'}，` +
           `蠕虫生长${growthDesc}，菌落发光${glowDesc}`;
  }

  public setOnWormClickCallback(callback: (worm: Worm) => void): void {
    this.onWormClickCallback = callback;
  }

  public dispose(): void {
    if (this.controlPanel) this.controlPanel.remove();
    if (this.logPanel) this.logPanel.remove();
    if (this.logButton) this.logButton.remove();
    
    const overlay = document.getElementById('detail-overlay');
    if (overlay) overlay.remove();
  }
}
