import type { BuildingStyle, BuildingStats } from './BuildingManager';

interface StyleConfig {
  id: BuildingStyle;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const STYLES: StyleConfig[] = [
  {
    id: 'modern',
    name: '现代玻璃',
    icon: '◈',
    description: '玻璃幕墙风格，反射光斑随视角移动',
    color: '#4a90d9'
  },
  {
    id: 'classical',
    name: '古典石质',
    icon: '▦',
    description: '石质浮雕纹理，米黄色调',
    color: '#d4b896'
  },
  {
    id: 'futuristic',
    name: '未来主义',
    icon: '✧',
    description: '流动渐变色带，粒子飘散效果',
    color: '#00ffff'
  }
];

export class UIPanel {
  private container: HTMLElement;
  private currentStyle: BuildingStyle = 'modern';
  private minHeight = 2;
  private maxHeight = 8;
  private stats: BuildingStats = { total: 0, avgHeight: 0, density: 0 };
  private eventTarget = new EventTarget();

  constructor() {
    this.container = this.createPanel();
    document.body.appendChild(this.container);
    this.setupStyles();
  }

  private setupStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .city-toolbar {
        position: fixed;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 220px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 20px 16px;
        color: #e0e6f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      }

      .city-toolbar-section {
        margin-bottom: 20px;
      }

      .city-toolbar-section:last-child {
        margin-bottom: 0;
      }

      .city-toolbar-title {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #8899bb;
        margin-bottom: 12px;
      }

      .style-buttons {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .style-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        color: #c0ccdd;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
      }

      .style-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
        transform: translateX(2px);
      }

      .style-btn.active {
        background: rgba(74, 144, 217, 0.2);
        border-color: rgba(74, 144, 217, 0.5);
        color: #ffffff;
      }

      .style-btn-icon {
        font-size: 20px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.2);
      }

      .style-btn-text {
        flex: 1;
        font-weight: 500;
      }

      .style-btn.active .style-btn-icon {
        background: rgba(74, 144, 217, 0.3);
      }

      .tooltip {
        position: absolute;
        left: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%) translateY(4px);
        background: rgba(20, 30, 50, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: #b0c0d8;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: all 0.2s ease;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        z-index: 1001;
      }

      .style-btn:hover .tooltip {
        opacity: 1;
        transform: translateY(-50%) translateY(0);
      }

      .height-slider-group {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .slider-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .slider-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #8899bb;
      }

      .slider-label-value {
        color: #e0e6f0;
        font-weight: 500;
      }

      input[type="range"] {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        background: #4a90d9;
        border: 2px solid #ffffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(74, 144, 217, 0.5);
        transition: transform 0.15s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: #4a90d9;
        border: 2px solid #ffffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(74, 144, 217, 0.5);
      }

      .stats-panel {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .stat-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }

      .stat-label {
        font-size: 12px;
        color: #8899bb;
      }

      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
      }

      .density-bar {
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 6px;
      }

      .density-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a90d9, #00ffff);
        border-radius: 2px;
        transition: width 0.3s ease;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        flex: 1;
        padding: 10px;
        background: rgba(255, 80, 80, 0.15);
        border: 1px solid rgba(255, 80, 80, 0.3);
        border-radius: 8px;
        color: #ff8080;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .action-btn:hover {
        background: rgba(255, 80, 80, 0.25);
        border-color: rgba(255, 80, 80, 0.5);
      }

      .fps-counter {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 8px 14px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        color: #88ff88;
        font-family: monospace;
        font-size: 13px;
        z-index: 1000;
      }

      .instructions {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        color: #8899bb;
        font-size: 12px;
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'city-toolbar';

    const title = document.createElement('div');
    title.style.cssText = 'text-align: center; margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #ffffff; letter-spacing: 1px;';
    title.textContent = '🏙 城市建构器';
    panel.appendChild(title);

    panel.appendChild(this.createStyleSection());
    panel.appendChild(this.createHeightSection());
    panel.appendChild(this.createStatsSection());
    panel.appendChild(this.createActionsSection());

    this.createFPSCounter();
    this.createInstructions();

    return panel;
  }

  private createStyleSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'city-toolbar-section';

    const title = document.createElement('div');
    title.className = 'city-toolbar-title';
    title.textContent = '建筑风格';
    section.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'style-buttons';

    STYLES.forEach(style => {
      const btn = document.createElement('button');
      btn.className = `style-btn ${style.id === this.currentStyle ? 'active' : ''}`;
      btn.dataset.style = style.id;

      const icon = document.createElement('span');
      icon.className = 'style-btn-icon';
      icon.style.color = style.color;
      icon.textContent = style.icon;
      btn.appendChild(icon);

      const text = document.createElement('span');
      text.className = 'style-btn-text';
      text.textContent = style.name;
      btn.appendChild(text);

      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = style.description;
      btn.appendChild(tooltip);

      btn.addEventListener('click', () => this.setStyle(style.id));
      buttons.appendChild(btn);
    });

    section.appendChild(buttons);
    return section;
  }

  private createHeightSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'city-toolbar-section';

    const title = document.createElement('div');
    title.className = 'city-toolbar-title';
    title.textContent = '高度范围';
    section.appendChild(title);

    const group = document.createElement('div');
    group.className = 'height-slider-group';

    const minRow = this.createSlider('最矮', this.minHeight, 1, 10, (val) => {
      this.minHeight = val;
      if (this.minHeight > this.maxHeight) {
        this.maxHeight = this.minHeight;
        this.updateSliderValue('max', this.maxHeight);
      }
      this.emitHeightChange();
    });
    minRow.querySelector('input')!.id = 'slider-min';

    const maxRow = this.createSlider('最高', this.maxHeight, 1, 10, (val) => {
      this.maxHeight = val;
      if (this.maxHeight < this.minHeight) {
        this.minHeight = this.maxHeight;
        this.updateSliderValue('min', this.minHeight);
      }
      this.emitHeightChange();
    });
    maxRow.querySelector('input')!.id = 'slider-max';

    group.appendChild(minRow);
    group.appendChild(maxRow);
    section.appendChild(group);

    return section;
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (value: number) => void
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'slider-label';

    const labelText = document.createElement('span');
    labelText.textContent = label;
    labelDiv.appendChild(labelText);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-label-value';
    valueSpan.textContent = value.toFixed(1);
    labelDiv.appendChild(valueSpan);

    row.appendChild(labelDiv);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = '0.5';
    slider.value = value.toString();

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valueSpan.textContent = val.toFixed(1);
      onChange(val);
    });

    row.appendChild(slider);
    return row;
  }

  private updateSliderValue(which: 'min' | 'max', value: number): void {
    const slider = document.getElementById(`slider-${which}`) as HTMLInputElement;
    if (slider) {
      slider.value = value.toString();
      const label = slider.parentElement?.querySelector('.slider-label-value');
      if (label) label.textContent = value.toFixed(1);
    }
  }

  private createStatsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'city-toolbar-section';

    const title = document.createElement('div');
    title.className = 'city-toolbar-title';
    title.textContent = '城市数据';
    section.appendChild(title);

    const stats = document.createElement('div');
    stats.className = 'stats-panel';

    const totalItem = this.createStatItem('建筑总数', '0', 'total');
    const heightItem = this.createStatItem('平均高度', '0.00', 'avgHeight');

    const densityItem = document.createElement('div');
    densityItem.className = 'stat-item';
    densityItem.dataset.stat = 'density';

    const densityLabel = document.createElement('span');
    densityLabel.className = 'stat-label';
    densityLabel.textContent = '密度';
    densityItem.appendChild(densityLabel);

    const densityValue = document.createElement('span');
    densityValue.className = 'stat-value';
    densityValue.textContent = '0.00';
    densityItem.appendChild(densityValue);

    const densityBar = document.createElement('div');
    densityBar.className = 'density-bar';
    densityBar.style.width = '100%';
    densityBar.style.gridColumn = '1 / -1';
    const densityFill = document.createElement('div');
    densityFill.className = 'density-bar-fill';
    densityFill.style.width = '0%';
    densityBar.appendChild(densityFill);

    stats.appendChild(totalItem);
    stats.appendChild(heightItem);
    stats.appendChild(densityItem);
    stats.appendChild(densityBar);

    section.appendChild(stats);
    return section;
  }

  private createStatItem(label: string, value: string, statKey: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'stat-item';
    item.dataset.stat = statKey;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'stat-label';
    labelSpan.textContent = label;
    item.appendChild(labelSpan);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'stat-value';
    valueSpan.textContent = value;
    item.appendChild(valueSpan);

    return item;
  }

  private createActionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'city-toolbar-section';

    const actions = document.createElement('div');
    actions.className = 'action-buttons';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'action-btn';
    clearBtn.textContent = '🗑 清空全部';
    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空所有建筑吗？')) {
        this.eventTarget.dispatchEvent(new CustomEvent('clearAll'));
      }
    });

    actions.appendChild(clearBtn);
    section.appendChild(actions);

    return section;
  }

  private createFPSCounter(): void {
    const fps = document.createElement('div');
    fps.className = 'fps-counter';
    fps.id = 'fps-counter';
    fps.textContent = 'FPS: --';
    document.body.appendChild(fps);
  }

  private createInstructions(): void {
    const instr = document.createElement('div');
    instr.className = 'instructions';
    instr.textContent = '🖱 左键点击地面放置建筑 | 右键旋转视角 | 滚轮缩放';
    document.body.appendChild(instr);
  }

  private setStyle(style: BuildingStyle): void {
    if (this.currentStyle === style) return;
    this.currentStyle = style;

    const buttons = this.container.querySelectorAll('.style-btn');
    buttons.forEach(btn => {
      if ((btn as HTMLElement).dataset.style === style) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.eventTarget.dispatchEvent(new CustomEvent('styleChange', { detail: { style } }));
  }

  private emitHeightChange(): void {
    this.eventTarget.dispatchEvent(new CustomEvent('heightChange', {
      detail: { min: this.minHeight, max: this.maxHeight }
    }));
  }

  updateStats(stats: BuildingStats): void {
    this.stats = stats;

    const totalItem = this.container.querySelector('[data-stat="total"] .stat-value');
    if (totalItem) totalItem.textContent = stats.total.toString();

    const avgItem = this.container.querySelector('[data-stat="avgHeight"] .stat-value');
    if (avgItem) avgItem.textContent = stats.avgHeight.toFixed(2);

    const densityItem = this.container.querySelector('[data-stat="density"] .stat-value');
    if (densityItem) densityItem.textContent = stats.density.toFixed(2) + '%';

    const densityFill = this.container.querySelector('.density-bar-fill');
    if (densityFill) {
      const percent = Math.min(stats.density * 5, 100);
      (densityFill as HTMLElement).style.width = `${percent}%`;
    }
  }

  updateFPS(fps: number): void {
    const counter = document.getElementById('fps-counter');
    if (counter) {
      const color = fps >= 50 ? '#88ff88' : fps >= 30 ? '#ffcc66' : '#ff6666';
      counter.style.color = color;
      counter.textContent = `FPS: ${Math.round(fps)}`;
    }
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.eventTarget.addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.eventTarget.removeEventListener(type, listener);
  }
}
