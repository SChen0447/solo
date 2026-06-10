import type { StarInfo } from './starField';

export class UI {
  private container: HTMLElement;
  private infoPanel: HTMLElement;
  private controlPanel: HTMLElement;
  private cameraPosEl: HTMLElement;
  private starCountEl: HTMLElement;
  private lastMeteorEl: HTMLElement;
  private selectedStarEl: HTMLElement;
  private frequencySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private frequencyValue: HTMLElement;
  private speedValue: HTMLElement;

  private frequencyCallback: ((v: number) => void) | null = null;
  private speedCallback: ((v: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.injectStyles();

    this.infoPanel = this.createInfoPanel();
    this.controlPanel = this.createControlPanel();

    this.cameraPosEl = this.infoPanel.querySelector('[data-camera-pos]') as HTMLElement;
    this.starCountEl = this.infoPanel.querySelector('[data-star-count]') as HTMLElement;
    this.lastMeteorEl = this.infoPanel.querySelector('[data-last-meteor]') as HTMLElement;
    this.selectedStarEl = this.infoPanel.querySelector('[data-selected-star]') as HTMLElement;

    this.frequencySlider = this.controlPanel.querySelector('[data-freq-slider]') as HTMLInputElement;
    this.speedSlider = this.controlPanel.querySelector('[data-speed-slider]') as HTMLInputElement;
    this.frequencyValue = this.controlPanel.querySelector('[data-freq-value]') as HTMLElement;
    this.speedValue = this.controlPanel.querySelector('[data-speed-value]') as HTMLElement;

    this.bindEvents();
    this.container.appendChild(this.infoPanel);
    this.container.appendChild(this.controlPanel);

    setTimeout(() => {
      this.infoPanel.style.opacity = '1';
      this.controlPanel.style.opacity = '1';
    }, 50);
  }

  private injectStyles(): void {
    if (document.getElementById('star-map-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'star-map-ui-styles';
    style.textContent = `
      .sm-panel {
        position: fixed;
        padding: 16px 20px;
        border-radius: 12px;
        background: rgba(10, 10, 30, 0.8);
        border: 1px solid #4fc3f7;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #e0f7fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        line-height: 1.7;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(79, 195, 247, 0.15);
      }
      .sm-info-panel {
        left: 20px;
        bottom: 20px;
        min-width: 220px;
        max-width: 280px;
      }
      .sm-info-panel h3 {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: #4fc3f7;
        letter-spacing: 0.5px;
      }
      .sm-info-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 2px 0;
      }
      .sm-info-label {
        color: #90a4ae;
        flex-shrink: 0;
      }
      .sm-info-value {
        color: #ffffff;
        font-weight: 500;
        text-align: right;
      }
      .sm-star-info {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(79, 195, 247, 0.3);
        min-height: 48px;
      }
      .sm-star-info.empty {
        color: #546e7a;
        font-style: italic;
      }
      .sm-control-panel {
        right: 20px;
        bottom: 20px;
        min-width: 220px;
        pointer-events: auto;
      }
      .sm-control-panel h3 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #4fc3f7;
        letter-spacing: 0.5px;
      }
      .sm-slider-group {
        margin-bottom: 14px;
      }
      .sm-slider-group:last-child {
        margin-bottom: 0;
      }
      .sm-slider-label {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        color: #90a4ae;
        font-size: 12px;
      }
      .sm-slider-label span:last-child {
        color: #4fc3f7;
        font-weight: 600;
      }
      .sm-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(79, 195, 247, 0.2);
        outline: none;
        cursor: pointer;
      }
      .sm-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.6);
        transition: transform 0.15s ease;
      }
      .sm-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .sm-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #4fc3f7;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(79, 195, 247, 0.6);
      }
      @media (max-width: 768px) {
        .sm-panel {
          font-size: 11px;
          padding: 12px 14px;
        }
        .sm-info-panel {
          left: 10px;
          bottom: 10px;
          min-width: 170px;
          max-width: 45vw;
        }
        .sm-control-panel {
          right: 10px;
          bottom: 10px;
          min-width: 170px;
          max-width: 45vw;
        }
        .sm-info-panel h3,
        .sm-control-panel h3 {
          font-size: 12px;
        }
      }
      @media (max-width: 480px) {
        .sm-info-panel,
        .sm-control-panel {
          max-width: calc(50vw - 15px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createInfoPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'sm-panel sm-info-panel';
    panel.innerHTML = `
      <h3>✦ 星图信息</h3>
      <div class="sm-info-row">
        <span class="sm-info-label">视角坐标</span>
        <span class="sm-info-value" data-camera-pos>X: 0.0 Y: 0.0 Z: 0.0</span>
      </div>
      <div class="sm-info-row">
        <span class="sm-info-label">星星总数</span>
        <span class="sm-info-value" data-star-count>0</span>
      </div>
      <div class="sm-info-row">
        <span class="sm-info-label">最近流星</span>
        <span class="sm-info-value" data-last-meteor>--:--:--</span>
      </div>
      <div class="sm-star-info empty" data-selected-star>点击星星查看详情</div>
    `;
    return panel;
  }

  private createControlPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'sm-panel sm-control-panel';
    panel.innerHTML = `
      <h3>⚙ 流星雨控制</h3>
      <div class="sm-slider-group">
        <div class="sm-slider-label">
          <span>出现频率</span>
          <span data-freq-value>10s</span>
        </div>
        <input type="range" class="sm-slider" data-freq-slider min="1" max="30" step="1" value="10" />
      </div>
      <div class="sm-slider-group">
        <div class="sm-slider-label">
          <span>移动速度</span>
          <span data-speed-value>1.0x</span>
        </div>
        <input type="range" class="sm-slider" data-speed-slider min="0.5" max="2" step="0.1" value="1" />
      </div>
    `;
    return panel;
  }

  private bindEvents(): void {
    this.frequencySlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.frequencyValue.textContent = `${val}s`;
      if (this.frequencyCallback) this.frequencyCallback(val);
    });

    this.speedSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = `${val.toFixed(1)}x`;
      if (this.speedCallback) this.speedCallback(val);
    });
  }

  updateCameraPosition(x: number, y: number, z: number): void {
    this.cameraPosEl.textContent = `X: ${x.toFixed(1)} Y: ${y.toFixed(1)} Z: ${z.toFixed(1)}`;
  }

  updateStarCount(count: number): void {
    this.starCountEl.textContent = count.toString();
  }

  updateLastMeteorTime(date: Date | null): void {
    if (!date) {
      this.lastMeteorEl.textContent = '--:--:--';
      return;
    }
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    this.lastMeteorEl.textContent = `${hh}:${mm}:${ss}`;
  }

  updateSelectedStar(info: StarInfo | null): void {
    if (!info) {
      this.selectedStarEl.className = 'sm-star-info empty';
      this.selectedStarEl.textContent = '点击星星查看详情';
      return;
    }
    this.selectedStarEl.className = 'sm-star-info';
    this.selectedStarEl.innerHTML = `
      <div class="sm-info-row">
        <span class="sm-info-label">星星编号</span>
        <span class="sm-info-value">#${info.id}</span>
      </div>
      <div class="sm-info-row">
        <span class="sm-info-label">亮度值</span>
        <span class="sm-info-value">${info.brightness}</span>
      </div>
      <div class="sm-info-row">
        <span class="sm-info-label">所属星座</span>
        <span class="sm-info-value" style="color:#ffeb3b">${info.constellation}</span>
      </div>
    `;
  }

  onFrequencyChange(callback: (v: number) => void): void {
    this.frequencyCallback = callback;
  }

  onSpeedChange(callback: (v: number) => void): void {
    this.speedCallback = callback;
  }

  dispose(): void {
    this.infoPanel.remove();
    this.controlPanel.remove();
  }
}
