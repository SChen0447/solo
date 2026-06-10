export interface UISettings {
  injectionRate: number;
  vortexStrength: number;
  gravityStrength: number;
  particleLifetime: number;
  starDensity: number;
}

export interface UICallbacks {
  onSettingsChange: (settings: UISettings) => void;
  onReset: () => void;
}

interface SliderConfig {
  key: keyof UISettings;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'injectionRate', label: '粒子注入速率', min: 0.5, max: 3, step: 0.1, format: v => `${v.toFixed(1)} 秒/团` },
  { key: 'vortexStrength', label: '涡流强度', min: 0, max: 2, step: 0.1, format: v => `${v.toFixed(1)} 单位/s²` },
  { key: 'gravityStrength', label: '重力强度', min: 0, max: 1, step: 0.05, format: v => `${v.toFixed(2)} 单位/s²` },
  { key: 'particleLifetime', label: '粒子寿命', min: 1, max: 10, step: 0.5, format: v => `${v.toFixed(1)} 秒` },
  { key: 'starDensity', label: '背景星点密度', min: 200, max: 800, step: 10, format: v => `${Math.floor(v)} 颗` }
];

export function createUI(initialSettings: UISettings, callbacks: UICallbacks): { updateUI: (particleCount: number) => void } {
  const style = document.createElement('style');
  style.textContent = `
    .glass-panel {
      position: fixed;
      background: rgba(10, 10, 26, 0.7);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border-radius: 8px;
      border: 1px solid rgba(136, 221, 255, 0.15);
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.08);
      z-index: 100;
    }
    #control-panel {
      top: 16px;
      left: 16px;
      padding: 12px;
      width: 260px;
      color: #aaccff;
      font-size: 12px;
    }
    #control-panel h3 {
      color: #88ddff;
      font-size: 13px;
      margin: 0 0 12px 0;
      font-weight: 600;
      letter-spacing: 1px;
      font-family: 'Courier New', monospace;
    }
    .slider-row {
      margin-bottom: 10px;
    }
    .slider-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-family: 'Courier New', monospace;
    }
    .slider-value {
      color: #88ddff;
    }
    .slider-container {
      position: relative;
      height: 6px;
      background: rgba(255, 0, 119, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }
    .slider-fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, #ff0077, #00d4ff);
      border-radius: 3px;
      transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    input[type="range"].ui-slider {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      margin: 0;
      padding: 0;
    }
    #particle-count {
      top: 16px;
      right: 16px;
      padding: 8px 14px;
      color: #88ddff;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    #reset-btn {
      position: fixed;
      bottom: 16px;
      left: 16px;
      width: 80px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: #ff0077;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
      z-index: 100;
      box-shadow: 0 0 12px rgba(255, 0, 119, 0.5);
    }
    #reset-btn:hover {
      background: #ff33aa;
    }
    #reset-btn:active {
      transform: scale(0.96);
    }
  `;
  document.head.appendChild(style);

  const settings = { ...initialSettings };

  const panel = document.createElement('div');
  panel.id = 'control-panel';
  panel.className = 'glass-panel';

  const title = document.createElement('h3');
  title.textContent = '虚数流体 · 控制台';
  panel.appendChild(title);

  const sliderFills: Map<keyof UISettings, HTMLDivElement> = new Map();
  const valueLabels: Map<keyof UISettings, HTMLSpanElement> = new Map();

  for (const cfg of SLIDERS) {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const labelRow = document.createElement('div');
    labelRow.className = 'slider-label';
    const label = document.createElement('span');
    label.textContent = cfg.label;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-value';
    valueSpan.textContent = cfg.format(settings[cfg.key]);
    labelRow.appendChild(label);
    labelRow.appendChild(valueSpan);
    valueLabels.set(cfg.key, valueSpan);

    const container = document.createElement('div');
    container.className = 'slider-container';

    const fill = document.createElement('div');
    fill.className = 'slider-fill';
    const pct = ((settings[cfg.key] - cfg.min) / (cfg.max - cfg.min)) * 100;
    fill.style.width = `${pct}%`;
    sliderFills.set(cfg.key, fill);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'ui-slider';
    input.min = String(cfg.min);
    input.max = String(cfg.max);
    input.step = String(cfg.step);
    input.value = String(settings[cfg.key]);

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      settings[cfg.key] = val;
      const p = ((val - cfg.min) / (cfg.max - cfg.min)) * 100;
      fill.style.width = `${p}%`;
      valueSpan.textContent = cfg.format(val);
      callbacks.onSettingsChange({ ...settings });
    });

    container.appendChild(fill);
    container.appendChild(input);

    row.appendChild(labelRow);
    row.appendChild(container);
    panel.appendChild(row);
  }

  document.body.appendChild(panel);

  const particleCountEl = document.createElement('div');
  particleCountEl.id = 'particle-count';
  particleCountEl.className = 'glass-panel';
  particleCountEl.textContent = '粒子数：0';
  document.body.appendChild(particleCountEl);

  const resetBtn = document.createElement('button');
  resetBtn.id = 'reset-btn';
  resetBtn.textContent = '重置';
  resetBtn.addEventListener('click', () => callbacks.onReset());
  document.body.appendChild(resetBtn);

  function updateUI(particleCount: number): void {
    particleCountEl.textContent = `粒子数：${particleCount}`;
  }

  return { updateUI };
}
