import { TreeParams, TreeStats } from './treeGenerator';

export interface UIUpdateCallback {
  onParamsChange: (params: TreeParams) => void;
  onGrow: () => void;
}

interface AnimatedNumber {
  element: HTMLElement;
  currentValue: number;
  targetValue: number;
  startValue: number;
  startTime: number;
  animating: boolean;
  decimals: number;
}

const style = document.createElement('style');
style.textContent = `
  .glass-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    padding: 20px;
    background: rgba(16, 49, 30, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 16px;
    border: 1px solid rgba(134, 212, 157, 0.25);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10;
    min-width: 280px;
    user-select: none;
  }

  .panel-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #c8e6c9;
    letter-spacing: 0.5px;
  }

  .slider-group {
    margin-bottom: 16px;
  }

  .slider-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: #a5d6a7;
  }

  .slider-value {
    font-weight: 600;
    color: #81c784;
    font-variant-numeric: tabular-nums;
  }

  .custom-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(90deg, #2e7d32, #66bb6a);
    outline: none;
    cursor: pointer;
    touch-action: none;
  }

  .custom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #81c784;
    cursor: grab;
    border: 2px solid #c8e6c9;
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .custom-slider::-webkit-slider-thumb:hover {
    background: #a5d6a7;
  }

  .custom-slider::-webkit-slider-thumb:active {
    transform: scale(1.2);
    background: #b9f6ca;
    cursor: grabbing;
    box-shadow: 0 4px 12px rgba(129, 199, 132, 0.5);
  }

  .custom-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #81c784;
    cursor: grab;
    border: 2px solid #c8e6c9;
    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .custom-slider::-moz-range-thumb:hover {
    background: #a5d6a7;
  }

  .custom-slider::-moz-range-thumb:active {
    transform: scale(1.2);
    background: #b9f6ca;
    cursor: grabbing;
    box-shadow: 0 4px 12px rgba(129, 199, 132, 0.5);
  }

  .grow-button {
    width: 100%;
    padding: 12px 20px;
    margin-top: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    background: linear-gradient(135deg, #43a047, #66bb6a);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
    box-shadow: 0 4px 14px rgba(67, 160, 71, 0.4);
    letter-spacing: 0.5px;
  }

  .grow-button:hover {
    box-shadow: 0 6px 20px rgba(67, 160, 71, 0.5);
  }

  .grow-button:active {
    transform: scale(0.95);
    box-shadow: 0 2px 8px rgba(67, 160, 71, 0.4);
  }

  .stats-panel {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 28px;
    background: rgba(16, 49, 30, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 14px;
    border: 1px solid rgba(134, 212, 157, 0.25);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 10;
    display: flex;
    gap: 28px;
    user-select: none;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 70px;
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: #b9f6ca;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  .stat-label {
    font-size: 11px;
    color: #81c784;
    margin-top: 4px;
    letter-spacing: 0.3px;
  }

  .stat-divider {
    width: 1px;
    background: rgba(129, 199, 132, 0.3);
    margin: 4px 0;
  }

  @media (max-width: 768px) {
    .glass-panel {
      top: 12px;
      left: 12px;
      right: 12px;
      min-width: auto;
      padding: 16px;
    }

    .custom-slider {
      height: 8px;
    }

    .custom-slider::-webkit-slider-thumb {
      width: 24px;
      height: 24px;
    }

    .custom-slider::-moz-range-thumb {
      width: 24px;
      height: 24px;
    }

    .stats-panel {
      bottom: 12px;
      left: 12px;
      right: 12px;
      transform: none;
      gap: 16px;
      padding: 12px 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .stat-item {
      min-width: 55px;
    }

    .stat-value {
      font-size: 18px;
    }

    .stat-divider {
      display: none;
    }
  }
`;
document.head.appendChild(style);

export function setupUI(container: HTMLElement, callbacks: UIUpdateCallback): {
  updateStats: (stats: TreeStats, params: TreeParams) => void;
} {
  const currentParams: TreeParams = {
    light: 1.0,
    water: 1.0,
    wind: 0.3
  };

  const animatedNumbers = new Map<string, AnimatedNumber>();

  function animateNumber(key: string, newValue: number, decimals: number = 0): void {
    const anim = animatedNumbers.get(key);
    if (!anim) return;

    anim.startValue = anim.currentValue;
    anim.targetValue = newValue;
    anim.startTime = performance.now();
    anim.animating = true;
    anim.decimals = decimals;
  }

  function updateAnimations(): void {
    const now = performance.now();
    const duration = 400;

    animatedNumbers.forEach((anim) => {
      if (!anim.animating) return;

      const elapsed = now - anim.startTime;
      if (elapsed >= duration) {
        anim.currentValue = anim.targetValue;
        anim.animating = false;
      } else {
        const t = elapsed / duration;
        const easeT = t * t * (3 - 2 * t);
        anim.currentValue = anim.startValue + (anim.targetValue - anim.startValue) * easeT;
      }

      anim.element.textContent = anim.currentValue.toFixed(anim.decimals);
    });

    requestAnimationFrame(updateAnimations);
  }

  const controlPanel = document.createElement('div');
  controlPanel.className = 'glass-panel';

  controlPanel.innerHTML = `
    <div class="panel-title">🌿 环境参数控制</div>
    <div class="slider-group">
      <div class="slider-label">
        <span>☀️ 光照强度</span>
        <span class="slider-value" id="light-value">1.00</span>
      </div>
      <input type="range" class="custom-slider" id="light-slider" min="0.5" max="2.0" step="0.01" value="1.0" />
    </div>
    <div class="slider-group">
      <div class="slider-label">
        <span>💧 水分供给</span>
        <span class="slider-value" id="water-value">1.00</span>
      </div>
      <input type="range" class="custom-slider" id="water-slider" min="0.3" max="1.5" step="0.01" value="1.0" />
    </div>
    <div class="slider-group">
      <div class="slider-label">
        <span>💨 风力大小</span>
        <span class="slider-value" id="wind-value">0.30</span>
      </div>
      <input type="range" class="custom-slider" id="wind-slider" min="0" max="1.0" step="0.01" value="0.3" />
    </div>
    <button class="grow-button" id="grow-btn">🌱 生长</button>
  `;

  container.appendChild(controlPanel);

  const statsPanel = document.createElement('div');
  statsPanel.className = 'stats-panel';

  statsPanel.innerHTML = `
    <div class="stat-item">
      <div class="stat-value" id="stat-height">0.00</div>
      <div class="stat-label">树高</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" id="stat-branches">0</div>
      <div class="stat-label">分支数</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" id="stat-leaves">0</div>
      <div class="stat-label">叶片数</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" id="stat-light">1.0</div>
      <div class="stat-label">光照</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" id="stat-water">1.0</div>
      <div class="stat-label">水分</div>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
      <div class="stat-value" id="stat-wind">0.3</div>
      <div class="stat-label">风力</div>
    </div>
  `;

  container.appendChild(statsPanel);

  animatedNumbers.set('height', {
    element: document.getElementById('stat-height')!,
    currentValue: 0,
    targetValue: 0,
    startValue: 0,
    startTime: 0,
    animating: false,
    decimals: 2
  });

  animatedNumbers.set('branches', {
    element: document.getElementById('stat-branches')!,
    currentValue: 0,
    targetValue: 0,
    startValue: 0,
    startTime: 0,
    animating: false,
    decimals: 0
  });

  animatedNumbers.set('leaves', {
    element: document.getElementById('stat-leaves')!,
    currentValue: 0,
    targetValue: 0,
    startValue: 0,
    startTime: 0,
    animating: false,
    decimals: 0
  });

  animatedNumbers.set('light', {
    element: document.getElementById('stat-light')!,
    currentValue: 1.0,
    targetValue: 1.0,
    startValue: 1.0,
    startTime: 0,
    animating: false,
    decimals: 1
  });

  animatedNumbers.set('water', {
    element: document.getElementById('stat-water')!,
    currentValue: 1.0,
    targetValue: 1.0,
    startValue: 1.0,
    startTime: 0,
    animating: false,
    decimals: 1
  });

  animatedNumbers.set('wind', {
    element: document.getElementById('stat-wind')!,
    currentValue: 0.3,
    targetValue: 0.3,
    startValue: 0.3,
    startTime: 0,
    animating: false,
    decimals: 1
  });

  updateAnimations();

  const lightSlider = document.getElementById('light-slider') as HTMLInputElement;
  const lightValue = document.getElementById('light-value')!;
  lightSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.light = value;
    lightValue.textContent = value.toFixed(2);
    callbacks.onParamsChange({ ...currentParams });
  });

  const waterSlider = document.getElementById('water-slider') as HTMLInputElement;
  const waterValue = document.getElementById('water-value')!;
  waterSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.water = value;
    waterValue.textContent = value.toFixed(2);
    callbacks.onParamsChange({ ...currentParams });
  });

  const windSlider = document.getElementById('wind-slider') as HTMLInputElement;
  const windValue = document.getElementById('wind-value')!;
  windSlider.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    currentParams.wind = value;
    windValue.textContent = value.toFixed(2);
    callbacks.onParamsChange({ ...currentParams });
  });

  const growButton = document.getElementById('grow-btn')!;
  growButton.addEventListener('click', () => {
    callbacks.onGrow();
  });

  function updateStats(stats: TreeStats, params: TreeParams): void {
    animateNumber('height', stats.height, 2);
    animateNumber('branches', stats.branchCount, 0);
    animateNumber('leaves', stats.leafCount, 0);
    animateNumber('light', params.light, 1);
    animateNumber('water', params.water, 1);
    animateNumber('wind', params.wind, 1);
  }

  return { updateStats };
}
