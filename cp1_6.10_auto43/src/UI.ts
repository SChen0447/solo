export interface UIParams {
  viscosity: number;
  particleCount: number;
  timeStep: number;
}

export type ParamChangeHandler = (params: Partial<UIParams>) => void;
export type ShockwaveHandler = () => void;

const PRIMARY = '#4a9eff';
const ACCENT = '#ff6b6b';
const TEXT = '#e0e0e0';
const TEXT_DIM = '#8a8aa0';

export class UI {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private statsBar: HTMLDivElement;
  private fpsSpan: HTMLSpanElement;
  private countSpan: HTMLSpanElement;
  private speedBar: HTMLDivElement;
  private speedBarFill: HTMLDivElement;
  private timeSpan: HTMLSpanElement;
  private viscosityValue: HTMLSpanElement;
  private particleValue: HTMLSpanElement;
  private timestepValue: HTMLSpanElement;
  private onParamChange: ParamChangeHandler;
  private onShockwave: ShockwaveHandler;
  private lastStatsUpdate: number = 0;

  constructor(
    parent: HTMLElement,
    initialParams: UIParams,
    onParamChange: ParamChangeHandler,
    onShockwave: ShockwaveHandler,
  ) {
    this.container = parent;
    this.onParamChange = onParamChange;
    this.onShockwave = onShockwave;

    this.injectStyles();

    this.panel = this.createPanel(initialParams);
    this.statsBar = this.createStatsBar();

    this.fpsSpan = this.statsBar.querySelector('[data-fps]') as HTMLSpanElement;
    this.countSpan = this.statsBar.querySelector('[data-count]') as HTMLSpanElement;
    this.speedBar = this.statsBar.querySelector('[data-speed-bar]') as HTMLDivElement;
    this.speedBarFill = this.speedBar.firstElementChild as HTMLDivElement;
    this.timeSpan = this.statsBar.querySelector('[data-time]') as HTMLSpanElement;
    this.viscosityValue = this.panel.querySelector('[data-visc-val]') as HTMLSpanElement;
    this.particleValue = this.panel.querySelector('[data-particle-val]') as HTMLSpanElement;
    this.timestepValue = this.panel.querySelector('[data-ts-val]') as HTMLSpanElement;
  }

  private injectStyles(): void {
    if (document.getElementById('fluid-sim-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'fluid-sim-ui-styles';
    style.textContent = `
      .fluid-panel {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 100;
        background: rgba(20, 20, 40, 0.55);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(74, 158, 255, 0.25);
        border-radius: 12px;
        padding: 18px 20px;
        width: 260px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        color: ${TEXT};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .fluid-panel-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 14px;
        letter-spacing: 0.5px;
        color: ${PRIMARY};
        text-transform: uppercase;
      }
      .fluid-control {
        margin-bottom: 14px;
      }
      .fluid-control:last-of-type {
        margin-bottom: 16px;
      }
      .fluid-control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: ${TEXT_DIM};
        margin-bottom: 6px;
      }
      .fluid-control-value {
        color: ${PRIMARY};
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .fluid-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 4px;
        background: rgba(74, 158, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .fluid-slider:hover {
        background: rgba(74, 158, 255, 0.35);
      }
      .fluid-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: ${PRIMARY};
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(74, 158, 255, 0.6);
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .fluid-slider:hover::-webkit-slider-thumb {
        transform: scale(1.15);
        box-shadow: 0 0 14px rgba(74, 158, 255, 0.85);
      }
      .fluid-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: ${PRIMARY};
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(74, 158, 255, 0.6);
      }
      .fluid-btn {
        width: 100%;
        padding: 10px 14px;
        background: linear-gradient(135deg, ${PRIMARY}, #3377dd);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        letter-spacing: 0.5px;
        transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
        box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
      }
      .fluid-btn:hover {
        filter: brightness(1.1);
        box-shadow: 0 6px 18px rgba(74, 158, 255, 0.5);
      }
      .fluid-btn:active {
        transform: scale(0.96);
      }
      .fluid-stats {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 100;
        background: rgba(10, 10, 26, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-top: 1px solid rgba(74, 158, 255, 0.15);
        padding: 10px 24px;
        display: flex;
        align-items: center;
        gap: 32px;
        color: ${TEXT};
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
      }
      .fluid-stats-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fluid-stats-label {
        color: ${TEXT_DIM};
      }
      .fluid-stats-value {
        color: ${PRIMARY};
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        min-width: 40px;
      }
      .fluid-speed-bar {
        width: 160px;
        height: 8px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        overflow: hidden;
      }
      .fluid-speed-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a9eff, #ffffff, #ff6b6b);
        border-radius: 4px;
        transition: width 0.3s;
      }
    `;
    document.head.appendChild(style);
  }

  private createPanel(params: UIParams): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'fluid-panel';
    panel.innerHTML = `
      <div class="fluid-panel-title">流体控制面板</div>

      <div class="fluid-control">
        <div class="fluid-control-label">
          <span>粘性系数</span>
          <span class="fluid-control-value" data-visc-val>${params.viscosity.toFixed(1)}</span>
        </div>
        <input type="range" class="fluid-slider" min="0.1" max="5.0" step="0.1" value="${params.viscosity}" data-visc />
      </div>

      <div class="fluid-control">
        <div class="fluid-control-label">
          <span>粒子数量</span>
          <span class="fluid-control-value" data-particle-val>${params.particleCount}</span>
        </div>
        <input type="range" class="fluid-slider" min="500" max="20000" step="500" value="${params.particleCount}" data-particle />
      </div>

      <div class="fluid-control">
        <div class="fluid-control-label">
          <span>时间步长</span>
          <span class="fluid-control-value" data-ts-val>${params.timeStep.toFixed(2)}</span>
        </div>
        <input type="range" class="fluid-slider" min="0.01" max="0.1" step="0.01" value="${params.timeStep}" data-ts />
      </div>

      <button class="fluid-btn" data-shockwave>注入扰动</button>
    `;

    const viscSlider = panel.querySelector('[data-visc]') as HTMLInputElement;
    viscSlider.addEventListener('input', () => {
      const v = parseFloat(viscSlider.value);
      this.viscosityValue.textContent = v.toFixed(1);
      this.onParamChange({ viscosity: v });
    });

    const particleSlider = panel.querySelector('[data-particle]') as HTMLInputElement;
    particleSlider.addEventListener('input', () => {
      const n = parseInt(particleSlider.value, 10);
      this.particleValue.textContent = String(n);
      this.onParamChange({ particleCount: n });
    });

    const tsSlider = panel.querySelector('[data-ts]') as HTMLInputElement;
    tsSlider.addEventListener('input', () => {
      const dt = parseFloat(tsSlider.value);
      this.timestepValue.textContent = dt.toFixed(2);
      this.onParamChange({ timeStep: dt });
    });

    const btn = panel.querySelector('[data-shockwave]') as HTMLButtonElement;
    btn.addEventListener('click', () => this.onShockwave());

    this.container.appendChild(panel);
    return panel;
  }

  private createStatsBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'fluid-stats';
    bar.innerHTML = `
      <div class="fluid-stats-item">
        <span class="fluid-stats-label">FPS</span>
        <span class="fluid-stats-value" data-fps>60</span>
      </div>
      <div class="fluid-stats-item">
        <span class="fluid-stats-label">粒子数</span>
        <span class="fluid-stats-value" data-count>10000</span>
      </div>
      <div class="fluid-stats-item">
        <span class="fluid-stats-label">平均速度</span>
        <div class="fluid-speed-bar" data-speed-bar>
          <div class="fluid-speed-fill" style="width:0%"></div>
        </div>
      </div>
      <div class="fluid-stats-item">
        <span class="fluid-stats-label">运行时间</span>
        <span class="fluid-stats-value" data-time>00:00</span>
      </div>
    `;
    this.container.appendChild(bar);
    return bar;
  }

  updateStats(fps: number, count: number, avgSpeed: number, elapsedSec: number): void {
    const now = performance.now();
    if (now - this.lastStatsUpdate < 500) return;
    this.lastStatsUpdate = now;

    this.fpsSpan.textContent = fps.toFixed(0);
    this.countSpan.textContent = String(count);

    const speedPct = Math.min(100, (avgSpeed / 8) * 100);
    this.speedBarFill.style.width = `${speedPct}%`;

    const totalSec = Math.floor(elapsedSec);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    this.timeSpan.textContent = `${mm}:${ss}`;
  }

  dispose(): void {
    this.panel.remove();
    this.statsBar.remove();
  }
}
