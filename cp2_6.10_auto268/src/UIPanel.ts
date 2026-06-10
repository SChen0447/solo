import * as THREE from 'three';
import { BuildingData, BlinkMode, TimePeriod } from './CityModule';

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type TimeChangeCallback = (period: TimePeriod, progress: number) => void;
type BuildingSelectCallback = (buildingId: string | null) => void;
type ColorTempChangeCallback = (buildingId: string, kelvin: number) => void;
type BlinkModeChangeCallback = (buildingId: string, mode: BlinkMode) => void;
type BrightnessChangeCallback = (buildingId: string, brightness: number) => void;
type AreaActionCallback = (action: 'dim' | 'warm', bounds: Bounds) => void;

export const TIME_PERIODS: TimePeriod[] = [
  {
    id: 'dusk',
    name: '黄昏',
    ambientBrightness: 0.6,
    backgroundTint: new THREE.Color(0xff8855),
    birdActivity: 0.7,
    birdCountMultiplier: 0.6,
    speedMultiplier: 0.8
  },
  {
    id: 'night',
    name: '深夜',
    ambientBrightness: 0.2,
    backgroundTint: new THREE.Color(0x1a2a5a),
    birdActivity: 1.0,
    birdCountMultiplier: 1.0,
    speedMultiplier: 1.0
  },
  {
    id: 'dawn',
    name: '黎明',
    ambientBrightness: 0.5,
    backgroundTint: new THREE.Color(0xffaa77),
    birdActivity: 0.8,
    birdCountMultiplier: 0.7,
    speedMultiplier: 0.9
  }
];

export class UIPanel {
  private container: HTMLElement;
  private statsPanel: HTMLElement;
  private buildingPanel: HTMLElement;
  private timelineContainer: HTMLElement;
  private timelineSlider: HTMLInputElement;
  private periodSelect: HTMLSelectElement;
  private selectionBox: HTMLElement;

  private totalBirdsEl: HTMLElement;
  private affectedPctEl: HTMLElement;
  private avgSpeedEl: HTMLElement;

  private tempSlider: HTMLInputElement | null = null;
  private tempValueEl: HTMLElement | null = null;
  private brightnessSlider: HTMLInputElement | null = null;
  private brightnessValueEl: HTMLElement | null = null;

  private onTimeChangeCallback: TimeChangeCallback | null = null;
  private onBuildingSelectCallback: BuildingSelectCallback | null = null;
  private onColorTempChangeCallback: ColorTempChangeCallback | null = null;
  private onBlinkModeChangeCallback: BlinkModeChangeCallback | null = null;
  private onBrightnessChangeCallback: BrightnessChangeCallback | null = null;
  private onAreaActionCallback: AreaActionCallback | null = null;

  private selectedBuildingId: string | null = null;
  private isSelecting: boolean = false;
  private selectionStart: { x: number; y: number } | null = null;
  private areaActionsContainer: HTMLElement;
  private isSmallScreen: boolean = false;

  constructor() {
    this.container = document.getElementById('app')!;
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());

    this.statsPanel = this.createStatsPanel();
    this.buildingPanel = this.createBuildingPanel();
    this.timelineContainer = this.createTimeline();
    this.areaActionsContainer = this.createAreaActions();
    this.selectionBox = this.createSelectionBox();

    this.totalBirdsEl = this.statsPanel.querySelector('#total-birds') as HTMLElement;
    this.affectedPctEl = this.statsPanel.querySelector('#affected-pct') as HTMLElement;
    this.avgSpeedEl = this.statsPanel.querySelector('#avg-speed') as HTMLElement;
    this.timelineSlider = this.timelineContainer.querySelector('#timeline-slider') as HTMLInputElement;
    this.periodSelect = this.timelineContainer.querySelector('#period-select') as HTMLSelectElement;

    this.setupEventListeners();
  }

  private checkScreenSize(): void {
    this.isSmallScreen = window.innerWidth < 1400;
    if (this.statsPanel) {
      if (this.isSmallScreen) {
        this.statsPanel.classList.add('collapsed');
      } else {
        this.statsPanel.classList.remove('collapsed');
      }
    }
    if (this.buildingPanel) {
      if (this.isSmallScreen) {
        this.buildingPanel.classList.add('collapsed');
      }
    }
  }

  private createStatsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'stats-panel';
    panel.className = 'glass-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">实时数据</span>
        <button class="toggle-btn" data-panel="stats" title="展开/收起">◀</button>
      </div>
      <div class="panel-content">
        <div class="stat-item">
          <div class="stat-label">鸟群总数</div>
          <div class="stat-value" id="total-birds">0</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">受影响比例</div>
          <div class="stat-value highlight" id="affected-pct">0%</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">平均飞行速度</div>
          <div class="stat-value" id="avg-speed">0</div>
        </div>
      </div>
    `;
    this.container.appendChild(panel);
    return panel;
  }

  private createBuildingPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'building-panel';
    panel.className = 'glass-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">建筑灯光控制</span>
        <button class="toggle-btn" data-panel="building" title="展开/收起">▶</button>
      </div>
      <div class="panel-content">
        <div class="empty-state">点击建筑以调整灯光参数</div>
      </div>
    `;
    this.container.appendChild(panel);
    return panel;
  }

  private createTimeline(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'timeline-container';
    container.className = 'glass-panel';
    container.innerHTML = `
      <div class="timeline-header">
        <span class="panel-title">时间控制</span>
        <select id="period-select" class="period-select">
          <option value="0">黄昏</option>
          <option value="1" selected>深夜</option>
          <option value="2">黎明</option>
        </select>
      </div>
      <div class="timeline-track">
        <input type="range" id="timeline-slider" min="0" max="100" value="50" />
        <div class="timeline-labels">
          <span>黄昏</span>
          <span>深夜</span>
          <span>黎明</span>
        </div>
      </div>
    `;
    this.container.appendChild(container);
    return container;
  }

  private createAreaActions(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'area-actions';
    container.className = 'glass-panel';
    container.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">区域操作</span>
      </div>
      <div class="panel-content">
        <div class="action-hint">在3D场景中按住鼠标拖拽框选区域</div>
        <div class="action-buttons">
          <button class="action-btn dim-btn" data-action="dim">降低亮度</button>
          <button class="action-btn warm-btn" data-action="warm">切换暖色</button>
        </div>
      </div>
    `;
    this.container.appendChild(container);
    return container;
  }

  private createSelectionBox(): HTMLElement {
    const box = document.createElement('div');
    box.id = 'selection-box';
    box.style.display = 'none';
    this.container.appendChild(box);
    return box;
  }

  private setupEventListeners(): void {
    const style = document.createElement('style');
    style.textContent = `
      .glass-panel {
        position: absolute;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: #b0b8d0;
        font-size: 13px;
        z-index: 20;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      .glass-panel.collapsed {
        width: 40px !important;
        min-width: 40px !important;
      }
      .glass-panel.collapsed .panel-content {
        display: none;
      }
      .glass-panel.collapsed .panel-title {
        display: none;
      }
      .glass-panel.collapsed .toggle-btn {
        transform: rotate(180deg);
      }
      #stats-panel {
        left: 20px;
        bottom: 20px;
        width: 200px;
        min-width: 200px;
      }
      #building-panel {
        right: 20px;
        top: 80px;
        width: 260px;
        min-width: 260px;
        opacity: 0;
        transform: translateX(20px);
        pointer-events: none;
      }
      #building-panel.visible {
        opacity: 1;
        transform: translateX(0);
        pointer-events: auto;
      }
      #timeline-container {
        top: 20px;
        right: 20px;
        width: 320px;
        padding: 12px 16px;
      }
      #area-actions {
        left: 20px;
        top: 80px;
        width: 200px;
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .panel-title {
        font-size: 14px;
        font-weight: 500;
        color: #d0d8f0;
        letter-spacing: 1px;
      }
      .toggle-btn {
        background: none;
        border: none;
        color: #b0b8d0;
        cursor: pointer;
        font-size: 12px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      .toggle-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .panel-content {
        padding: 16px;
      }
      .stat-item {
        margin-bottom: 14px;
      }
      .stat-item:last-child {
        margin-bottom: 0;
      }
      .stat-label {
        font-size: 11px;
        color: #8088a0;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .stat-value {
        font-size: 24px;
        font-weight: 300;
        color: #e0e8ff;
      }
      .stat-value.highlight {
        color: #ff8866;
      }
      .empty-state {
        color: #606880;
        text-align: center;
        padding: 20px 0;
        font-size: 12px;
      }
      .building-info {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .building-name {
        font-size: 14px;
        color: #d0d8f0;
        margin-bottom: 4px;
      }
      .building-dims {
        font-size: 11px;
        color: #707890;
      }
      .control-group {
        margin-bottom: 18px;
      }
      .control-group:last-child {
        margin-bottom: 0;
      }
      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #9098b0;
        margin-bottom: 8px;
      }
      .control-value {
        font-weight: 500;
        color: #c0c8e0;
        font-size: 13px;
      }
      input[type="range"] {
        width: 100%;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66aaff, #8888ff);
        cursor: pointer;
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.5);
        transition: all 0.2s;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 12px rgba(100, 150, 255, 0.7);
      }
      input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #66aaff, #8888ff);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(100, 150, 255, 0.5);
      }
      .blink-mode-buttons {
        display: flex;
        gap: 6px;
      }
      .blink-btn {
        flex: 1;
        padding: 6px 8px;
        font-size: 11px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #9098b0;
        cursor: pointer;
        transition: all 0.2s;
      }
      .blink-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #d0d8f0;
      }
      .blink-btn.active {
        background: rgba(100, 150, 255, 0.2);
        border-color: rgba(100, 150, 255, 0.5);
        color: #aaccff;
      }
      .timeline-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .period-select {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        color: #b0b8d0;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
        outline: none;
      }
      .period-select:hover {
        background: rgba(255, 255, 255, 0.12);
      }
      .timeline-track {
        position: relative;
      }
      .timeline-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 10px;
        color: #606880;
      }
      .action-hint {
        font-size: 11px;
        color: #707890;
        margin-bottom: 12px;
        line-height: 1.5;
      }
      .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .action-btn {
        padding: 10px;
        font-size: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }
      .dim-btn {
        background: linear-gradient(135deg, rgba(80, 100, 160, 0.4), rgba(60, 80, 140, 0.4));
        color: #a0b0e0;
        border: 1px solid rgba(100, 140, 220, 0.3);
      }
      .dim-btn:hover {
        background: linear-gradient(135deg, rgba(100, 130, 200, 0.5), rgba(80, 110, 180, 0.5));
        transform: translateY(-1px);
      }
      .warm-btn {
        background: linear-gradient(135deg, rgba(255, 160, 80, 0.3), rgba(255, 120, 60, 0.3));
        color: #ffc090;
        border: 1px solid rgba(255, 160, 80, 0.4);
      }
      .warm-btn:hover {
        background: linear-gradient(135deg, rgba(255, 180, 100, 0.4), rgba(255, 140, 80, 0.4));
        transform: translateY(-1px);
      }
      #selection-box {
        position: absolute;
        border: 2px dashed rgba(100, 180, 255, 0.8);
        background: rgba(100, 180, 255, 0.1);
        border-radius: 4px;
        pointer-events: none;
        z-index: 50;
      }
      @media (max-width: 1280px) {
        #stats-panel, #area-actions {
          width: 160px;
          min-width: 160px;
        }
        #building-panel {
          width: 220px;
          min-width: 220px;
        }
        #timeline-container {
          width: 260px;
        }
      }
    `;
    document.head.appendChild(style);

    this.statsPanel.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.statsPanel.classList.toggle('collapsed');
      });
    });

    this.buildingPanel.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.buildingPanel.classList.toggle('collapsed');
      });
    });

    this.timelineSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.handleTimeChange(value);
    });

    this.periodSelect.addEventListener('change', (e) => {
      const idx = parseInt((e.target as HTMLSelectElement).value);
      const sliderValue = idx * 50;
      this.timelineSlider.value = sliderValue.toString();
      this.handleTimeChange(sliderValue);
    });

    this.areaActionsContainer.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action') as 'dim' | 'warm';
        if (action && this.onAreaActionCallback) {
          this.onAreaActionCallback(action, { minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
        }
      });
    });
  }

  private handleTimeChange(sliderValue: number): void {
    let periodIdx: number;
    if (sliderValue < 33) {
      periodIdx = 0;
    } else if (sliderValue < 66) {
      periodIdx = 1;
    } else {
      periodIdx = 2;
    }
    this.periodSelect.value = periodIdx.toString();

    const period = TIME_PERIODS[periodIdx];
    const progress = sliderValue / 100;

    if (this.onTimeChangeCallback) {
      this.onTimeChangeCallback(period, progress);
    }
  }

  updateStats(total: number, affectedPct: number, avgSpeed: number): void {
    if (this.totalBirdsEl) this.totalBirdsEl.textContent = total.toString();
    if (this.affectedPctEl) this.affectedPctEl.textContent = `${affectedPct.toFixed(1)}%`;
    if (this.avgSpeedEl) this.avgSpeedEl.textContent = avgSpeed.toFixed(0);
  }

  showBuildingPanel(buildingData: BuildingData): void {
    this.selectedBuildingId = buildingData.id;
    this.buildingPanel.classList.add('visible');

    const content = this.buildingPanel.querySelector('.panel-content')!;
    content.innerHTML = `
      <div class="building-info">
        <div class="building-name">建筑 #${buildingData.id.substring(0, 6)}</div>
        <div class="building-dims">
          尺寸: ${buildingData.width.toFixed(1)} × ${buildingData.depth.toFixed(1)} × ${buildingData.height.toFixed(1)}m
        </div>
      </div>
      <div class="control-group">
        <div class="control-label">
          <span>色温</span>
          <span class="control-value" id="temp-value">${Math.round(buildingData.colorTemperature)}K</span>
        </div>
        <input type="range" id="temp-slider" min="2700" max="6500" value="${Math.round(buildingData.colorTemperature)}" />
      </div>
      <div class="control-group">
        <div class="control-label">
          <span>亮度</span>
          <span class="control-value" id="brightness-value">${Math.round(buildingData.brightness * 100)}%</span>
        </div>
        <input type="range" id="brightness-slider" min="0" max="100" value="${Math.round(buildingData.brightness * 100)}" />
      </div>
      <div class="control-group">
        <div class="control-label">
          <span>闪烁模式</span>
        </div>
        <div class="blink-mode-buttons">
          <button class="blink-btn ${buildingData.blinkMode === 'steady' ? 'active' : ''}" data-mode="steady">常亮</button>
          <button class="blink-btn ${buildingData.blinkMode === 'slow' ? 'active' : ''}" data-mode="slow">慢闪</button>
          <button class="blink-btn ${buildingData.blinkMode === 'fast' ? 'active' : ''}" data-mode="fast">快闪</button>
        </div>
      </div>
    `;

    this.tempSlider = content.querySelector('#temp-slider') as HTMLInputElement;
    this.tempValueEl = content.querySelector('#temp-value') as HTMLElement;
    this.brightnessSlider = content.querySelector('#brightness-slider') as HTMLInputElement;
    this.brightnessValueEl = content.querySelector('#brightness-value') as HTMLElement;

    this.tempSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (this.tempValueEl) this.tempValueEl.textContent = `${value}K`;
      if (this.onColorTempChangeCallback && this.selectedBuildingId) {
        this.onColorTempChangeCallback(this.selectedBuildingId, value);
      }
    });

    this.brightnessSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      if (this.brightnessValueEl) this.brightnessValueEl.textContent = `${value}%`;
      if (this.onBrightnessChangeCallback && this.selectedBuildingId) {
        this.onBrightnessChangeCallback(this.selectedBuildingId, value / 100);
      }
    });

    content.querySelectorAll('.blink-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        content.querySelectorAll('.blink-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode') as BlinkMode;
        if (this.onBlinkModeChangeCallback && this.selectedBuildingId) {
          this.onBlinkModeChangeCallback(this.selectedBuildingId, mode);
        }
      });
    });
  }

  hideBuildingPanel(): void {
    this.selectedBuildingId = null;
    this.buildingPanel.classList.remove('visible');
  }

  startSelection(x: number, y: number): void {
    this.isSelecting = true;
    this.selectionStart = { x, y };
    this.selectionBox.style.display = 'block';
    this.selectionBox.style.left = `${x}px`;
    this.selectionBox.style.top = `${y}px`;
    this.selectionBox.style.width = '0px';
    this.selectionBox.style.height = '0px';
  }

  updateSelection(x: number, y: number): Bounds | null {
    if (!this.isSelecting || !this.selectionStart) return null;

    const left = Math.min(this.selectionStart.x, x);
    const top = Math.min(this.selectionStart.y, y);
    const width = Math.abs(x - this.selectionStart.x);
    const height = Math.abs(y - this.selectionStart.y);

    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;

    return { minX: left, maxX: left + width, minZ: top, maxZ: top + height };
  }

  endSelection(): Bounds | null {
    if (!this.isSelecting || !this.selectionStart) return null;

    const rect = this.selectionBox.getBoundingClientRect();
    this.isSelecting = false;
    this.selectionStart = null;
    this.selectionBox.style.display = 'none';

    if (rect.width < 10 || rect.height < 10) return null;

    return { minX: rect.left, maxX: rect.right, minZ: rect.top, maxZ: rect.bottom };
  }

  onTimeChange(callback: TimeChangeCallback): void {
    this.onTimeChangeCallback = callback;
  }

  onBuildingSelect(callback: BuildingSelectCallback): void {
    this.onBuildingSelectCallback = callback;
  }

  onColorTempChange(callback: ColorTempChangeCallback): void {
    this.onColorTempChangeCallback = callback;
  }

  onBlinkModeChange(callback: BlinkModeChangeCallback): void {
    this.onBlinkModeChangeCallback = callback;
  }

  onBrightnessChange(callback: BrightnessChangeCallback): void {
    this.onBrightnessChangeCallback = callback;
  }

  onAreaAction(callback: AreaActionCallback): void {
    this.onAreaActionCallback = callback;
  }
}
