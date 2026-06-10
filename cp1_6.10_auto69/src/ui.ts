export interface UIState {
  isPlaying: boolean;
  speedMultiplier: number;
  showTrails: boolean;
}

export interface UICallbacks {
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onTrailsToggle: (show: boolean) => void;
  onResetView: () => void;
  onResetSimulation: () => void;
}

export interface PerformanceStats {
  fps: number;
  particleCount: number;
  renderTime: number;
}

let state: UIState = {
  isPlaying: true,
  speedMultiplier: 1.0,
  showTrails: false,
};

let fpsElement: HTMLElement | null = null;
let particlesElement: HTMLElement | null = null;
let renderTimeElement: HTMLElement | null = null;
let playPauseBtn: HTMLElement | null = null;
let trailsToggle: HTMLElement | null = null;

export function initUI(callbacks: UICallbacks): UIState {
  createControlPanel(callbacks);
  createPerformanceDashboard();
  return state;
}

function createControlPanel(callbacks: UICallbacks): void {
  const app = document.getElementById('app');
  if (!app) return;

  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.style.cssText = `
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(30, 30, 30, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    padding: 18px;
    color: #ffffff;
    font-size: 14px;
    z-index: 100;
    min-width: 240px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease-out;
  `;

  const title = document.createElement('div');
  title.textContent = '血流动力学控制台';
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 14px;
    color: #58a6ff;
    letter-spacing: 0.5px;
  `;
  panel.appendChild(title);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;';

  playPauseBtn = document.createElement('button');
  playPauseBtn.textContent = '⏸ 暂停';
  styleButton(playPauseBtn);
  playPauseBtn.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    playPauseBtn!.textContent = state.isPlaying ? '⏸ 暂停' : '▶ 播放';
    callbacks.onPlayPause();
  });
  btnRow.appendChild(playPauseBtn);

  const resetViewBtn = document.createElement('button');
  resetViewBtn.textContent = '⟲ 视角';
  styleButton(resetViewBtn);
  resetViewBtn.addEventListener('click', () => callbacks.onResetView());
  btnRow.appendChild(resetViewBtn);

  const resetSimBtn = document.createElement('button');
  resetSimBtn.textContent = '⟳ 模拟';
  styleButton(resetSimBtn);
  resetSimBtn.addEventListener('click', () => callbacks.onResetSimulation());
  btnRow.appendChild(resetSimBtn);

  panel.appendChild(btnRow);

  const speedContainer = document.createElement('div');
  speedContainer.style.cssText = 'margin-bottom: 14px;';

  const speedLabel = document.createElement('div');
  const speedValue = document.createElement('span');
  speedValue.textContent = '1.0x';
  speedValue.style.cssText = 'float: right; color: #58a6ff; font-weight: 500;';
  speedLabel.innerHTML = '血流速度';
  speedLabel.appendChild(speedValue);
  speedLabel.style.cssText = 'margin-bottom: 6px;';
  speedContainer.appendChild(speedLabel);

  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '0.5';
  speedSlider.max = '3.0';
  speedSlider.step = '0.1';
  speedSlider.value = '1.0';
  speedSlider.style.cssText = `
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  `;
  const sliderStyle = document.createElement('style');
  sliderStyle.textContent = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #58a6ff;
      cursor: pointer;
      transition: transform 0.15s ease;
      box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #58a6ff;
      cursor: pointer;
      border: none;
      box-shadow: 0 0 8px rgba(88, 166, 255, 0.5);
    }
  `;
  document.head.appendChild(sliderStyle);

  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    state.speedMultiplier = val;
    speedValue.textContent = val.toFixed(1) + 'x';
    callbacks.onSpeedChange(val);
  });
  speedContainer.appendChild(speedSlider);
  panel.appendChild(speedContainer);

  const toggleContainer = document.createElement('div');
  toggleContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';

  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = '显示粒子轨迹';
  toggleContainer.appendChild(toggleLabel);

  trailsToggle = document.createElement('div');
  trailsToggle.style.cssText = `
    width: 44px;
    height: 24px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    position: relative;
    cursor: pointer;
    transition: background 0.3s ease-out;
  `;

  const toggleKnob = document.createElement('div');
  toggleKnob.style.cssText = `
    width: 20px;
    height: 20px;
    background: #ffffff;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s ease-out;
  `;
  trailsToggle.appendChild(toggleKnob);

  trailsToggle.addEventListener('click', () => {
    state.showTrails = !state.showTrails;
    if (state.showTrails) {
      trailsToggle!.style.background = '#58a6ff';
      toggleKnob.style.left = '22px';
    } else {
      trailsToggle!.style.background = 'rgba(255, 255, 255, 0.15)';
      toggleKnob.style.left = '2px';
    }
    callbacks.onTrailsToggle(state.showTrails);
  });
  toggleContainer.appendChild(trailsToggle);
  panel.appendChild(toggleContainer);

  const mobileStyle = document.createElement('style');
  mobileStyle.textContent = `
    @media (max-width: 768px) {
      #control-panel {
        top: auto !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        border-radius: 12px 12px 0 0 !important;
        min-width: auto !important;
        width: 100% !important;
        display: flex !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        padding: 12px !important;
        gap: 16px !important;
        white-space: nowrap !important;
      }
      #control-panel > div {
        flex-shrink: 0 !important;
        margin-bottom: 0 !important;
      }
      #control-panel > div:first-child {
        display: none !important;
      }
      #perf-dashboard {
        bottom: 90px !important;
        left: 12px !important;
        right: auto !important;
        width: auto !important;
        font-size: 11px !important;
        padding: 10px 12px !important;
      }
    }
  `;
  document.head.appendChild(mobileStyle);

  app.appendChild(panel);
}

function styleButton(btn: HTMLElement): void {
  btn.style.cssText = `
    background: rgba(88, 166, 255, 0.2);
    color: #ffffff;
    border: 1px solid rgba(88, 166, 255, 0.3);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease-out;
    font-family: inherit;
    flex: 1;
    min-width: 70px;
  `;
  btn.addEventListener('mouseenter', () => {
    (btn as HTMLElement).style.background = 'rgba(88, 166, 255, 0.35)';
    (btn as HTMLElement).style.filter = 'brightness(1.15)';
  });
  btn.addEventListener('mouseleave', () => {
    (btn as HTMLElement).style.background = 'rgba(88, 166, 255, 0.2)';
    (btn as HTMLElement).style.filter = 'brightness(1)';
  });
  btn.addEventListener('mousedown', () => {
    (btn as HTMLElement).style.transform = 'scale(0.95)';
  });
  btn.addEventListener('mouseup', () => {
    (btn as HTMLElement).style.transform = 'scale(1)';
  });
  btn.addEventListener('touchstart', () => {
    (btn as HTMLElement).style.transform = 'scale(0.95)';
  });
  btn.addEventListener('touchend', () => {
    (btn as HTMLElement).style.transform = 'scale(1)';
  });
}

function createPerformanceDashboard(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const dashboard = document.createElement('div');
  dashboard.id = 'perf-dashboard';
  dashboard.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    background: rgba(30, 30, 30, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    padding: 14px 18px;
    color: #ffffff;
    font-size: 13px;
    z-index: 100;
    min-width: 180px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease-out;
    font-family: 'Consolas', 'Monaco', monospace;
  `;

  const title = document.createElement('div');
  title.textContent = '性能监控';
  title.style.cssText = `
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 10px;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 1px;
  `;
  dashboard.appendChild(title);

  fpsElement = createMetricRow('FPS', '--', '#3fb950');
  dashboard.appendChild(fpsElement);

  particlesElement = createMetricRow('粒子数', '--', '#58a6ff');
  dashboard.appendChild(particlesElement);

  renderTimeElement = createMetricRow('渲染耗时', '-- ms', '#d29922');
  dashboard.appendChild(renderTimeElement);

  app.appendChild(dashboard);
}

function createMetricRow(label: string, value: string, color: string): HTMLElement {
  const row = document.createElement('div');
  row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 3px 0;';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.cssText = 'color: #8b949e;';
  row.appendChild(labelEl);

  const valueEl = document.createElement('span');
  valueEl.textContent = value;
  valueEl.style.cssText = `color: ${color}; font-weight: 600;`;
  row.appendChild(valueEl);

  (row as any)._valueEl = valueEl;
  return row;
}

export function updatePerformanceStats(stats: PerformanceStats): void {
  if (fpsElement && (fpsElement as any)._valueEl) {
    const valueEl = (fpsElement as any)._valueEl as HTMLElement;
    valueEl.textContent = String(Math.round(stats.fps));
    if (stats.fps > 55) {
      valueEl.style.color = '#3fb950';
    } else if (stats.fps >= 35) {
      valueEl.style.color = '#d29922';
    } else {
      valueEl.style.color = '#f85149';
    }
  }

  if (particlesElement && (particlesElement as any)._valueEl) {
    const valueEl = (particlesElement as any)._valueEl as HTMLElement;
    valueEl.textContent = String(stats.particleCount);
  }

  if (renderTimeElement && (renderTimeElement as any)._valueEl) {
    const valueEl = (renderTimeElement as any)._valueEl as HTMLElement;
    valueEl.textContent = stats.renderTime.toFixed(1) + ' ms';
  }
}

export function getUIState(): UIState {
  return { ...state };
}
