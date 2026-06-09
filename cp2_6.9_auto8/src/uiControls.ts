import type { ColorMapType } from './surfaceBuilder';

export interface UIControlsCallbacks {
  onColorMapChange: (colorMap: ColorMapType) => void;
  onOpacityChange: (opacity: number) => void;
  onResetView: () => void;
}

export interface UIHandlers {
  updateStats: (fps: number, vertexCount: number) => void;
  showTooltip: (x: number, y: number, lon: number, lat: number, value: number) => void;
  hideTooltip: () => void;
}

const colorMapOptions: { value: ColorMapType; label: string }[] = [
  { value: 'blue-red', label: '蓝 - 红' },
  { value: 'green-purple', label: '绿 - 紫' },
  { value: 'heatmap', label: '热力图' }
];

export function createUIControls(callbacks: UIControlsCallbacks): UIHandlers {
  const controlPanel = document.createElement('div');
  controlPanel.id = 'control-panel';
  Object.assign(controlPanel.style, {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '20px',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '12px',
    border: '1px solid rgba(160, 210, 240, 0.2)',
    color: '#a0d2f0',
    minWidth: '240px',
    zIndex: '10',
    transition: 'all 0.3s ease-out',
    userSelect: 'none'
  } as CSSStyleDeclaration);

  const title = document.createElement('div');
  title.textContent = '海洋探测数据控制台';
  Object.assign(title.style, {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#d0eaff',
    letterSpacing: '0.5px'
  } as CSSStyleDeclaration);
  controlPanel.appendChild(title);

  const colorMapLabel = document.createElement('label');
  colorMapLabel.textContent = '颜色映射方案';
  Object.assign(colorMapLabel.style, {
    display: 'block',
    fontSize: '13px',
    marginBottom: '6px',
    opacity: '0.9'
  } as CSSStyleDeclaration);
  controlPanel.appendChild(colorMapLabel);

  const colorMapSelect = document.createElement('select');
  colorMapOptions.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    colorMapSelect.appendChild(option);
  });
  Object.assign(colorMapSelect.style, {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    background: 'rgba(10, 30, 60, 0.6)',
    color: '#a0d2f0',
    border: '1px solid rgba(160, 210, 240, 0.3)',
    borderRadius: '6px',
    outline: 'none',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'all 0.2s ease-out'
  } as CSSStyleDeclaration);
  colorMapSelect.addEventListener('change', () => {
    callbacks.onColorMapChange(colorMapSelect.value as ColorMapType);
  });
  addHoverEffects(colorMapSelect);
  controlPanel.appendChild(colorMapSelect);

  const opacityLabel = document.createElement('label');
  opacityLabel.textContent = `曲面透明度：85%`;
  Object.assign(opacityLabel.style, {
    display: 'block',
    fontSize: '13px',
    marginBottom: '6px',
    opacity: '0.9'
  } as CSSStyleDeclaration);
  controlPanel.appendChild(opacityLabel);

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.min = '0.2';
  opacitySlider.max = '1.0';
  opacitySlider.step = '0.01';
  opacitySlider.value = '0.85';
  Object.assign(opacitySlider.style, {
    width: '100%',
    marginBottom: '20px',
    accentColor: '#4ea8de'
  } as CSSStyleDeclaration);
  opacitySlider.addEventListener('input', () => {
    const val = parseFloat(opacitySlider.value);
    opacityLabel.textContent = `曲面透明度：${Math.round(val * 100)}%`;
    callbacks.onOpacityChange(val);
  });
  controlPanel.appendChild(opacitySlider);

  const resetButton = document.createElement('button');
  resetButton.textContent = '重置视角';
  Object.assign(resetButton.style, {
    width: '100%',
    padding: '10px 16px',
    fontSize: '13px',
    background: 'linear-gradient(135deg, rgba(78, 168, 222, 0.3), rgba(78, 168, 222, 0.15))',
    color: '#a0d2f0',
    border: '1px solid rgba(160, 210, 240, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    letterSpacing: '0.5px'
  } as CSSStyleDeclaration);
  resetButton.addEventListener('click', () => callbacks.onResetView());
  addHoverEffects(resetButton);
  controlPanel.appendChild(resetButton);

  document.body.appendChild(controlPanel);

  const statsBox = document.createElement('div');
  Object.assign(statsBox.style, {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '10px 16px',
    background: 'rgba(0, 10, 30, 0.6)',
    borderRadius: '8px',
    color: '#a0d2f0',
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    zIndex: '10',
    border: '1px solid rgba(160, 210, 240, 0.15)',
    pointerEvents: 'none'
  } as CSSStyleDeclaration);
  statsBox.innerHTML = '<div id="fps">FPS: 0</div><div id="vertices">顶点: 0</div>';
  document.body.appendChild(statsBox);

  const tooltip = document.createElement('div');
  Object.assign(tooltip.style, {
    position: 'absolute',
    padding: '10px 14px',
    background: 'rgba(0, 10, 30, 0.9)',
    border: '1px solid rgba(160, 210, 240, 0.4)',
    borderRadius: '8px',
    color: '#d0eaff',
    fontSize: '13px',
    lineHeight: '1.5',
    pointerEvents: 'none',
    display: 'none',
    zIndex: '20',
    fontFamily: 'Consolas, "Courier New", monospace',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    transition: 'opacity 0.15s ease-out'
  } as CSSStyleDeclaration);
  document.body.appendChild(tooltip);

  function updateStats(fps: number, vertexCount: number): void {
    const fpsEl = statsBox.querySelector('#fps');
    const vertEl = statsBox.querySelector('#vertices');
    if (fpsEl) fpsEl.textContent = `FPS: ${fps.toFixed(0)}`;
    if (vertEl) vertEl.textContent = `顶点: ${vertexCount.toLocaleString()}`;
  }

  function showTooltip(x: number, y: number, lon: number, lat: number, value: number): void {
    tooltip.style.display = 'block';
    tooltip.style.opacity = '0';
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
    });
    tooltip.innerHTML = `
      <div>经度: ${lon.toFixed(4)}°</div>
      <div>纬度: ${lat.toFixed(4)}°</div>
      <div>探测值: ${value.toFixed(4)}</div>
    `;
    const rect = tooltip.getBoundingClientRect();
    const pad = 12;
    let left = x + pad;
    let top = y + pad;
    if (left + rect.width > window.innerWidth) left = x - rect.width - pad;
    if (top + rect.height > window.innerHeight) top = y - rect.height - pad;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function hideTooltip(): void {
    tooltip.style.opacity = '0';
    setTimeout(() => {
      tooltip.style.display = 'none';
    }, 150);
  }

  applyResponsiveStyles(controlPanel);

  return { updateStats, showTooltip, hideTooltip };
}

function addHoverEffects(el: HTMLElement): void {
  el.style.transition = 'all 0.2s ease-out';
  el.addEventListener('mouseenter', () => {
    if (el instanceof HTMLButtonElement) {
      el.style.background = 'linear-gradient(135deg, rgba(78, 168, 222, 0.5), rgba(78, 168, 222, 0.25))';
      el.style.transform = 'scale(1.02)';
    } else if (el instanceof HTMLSelectElement) {
      el.style.borderColor = 'rgba(160, 210, 240, 0.6)';
      el.style.background = 'rgba(20, 50, 90, 0.7)';
    }
  });
  el.addEventListener('mouseleave', () => {
    if (el instanceof HTMLButtonElement) {
      el.style.background = 'linear-gradient(135deg, rgba(78, 168, 222, 0.3), rgba(78, 168, 222, 0.15))';
      el.style.transform = 'scale(1)';
    } else if (el instanceof HTMLSelectElement) {
      el.style.borderColor = 'rgba(160, 210, 240, 0.3)';
      el.style.background = 'rgba(10, 30, 60, 0.6)';
    }
  });
  el.addEventListener('mousedown', () => {
    if (el instanceof HTMLButtonElement) {
      el.style.transform = 'scale(0.98)';
    }
  });
  el.addEventListener('mouseup', () => {
    if (el instanceof HTMLButtonElement) {
      el.style.transform = 'scale(1.02)';
    }
  });
}

function applyResponsiveStyles(panel: HTMLDivElement): void {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      #control-panel {
        top: 10px !important;
        left: 10px !important;
        right: 10px !important;
        min-width: unset !important;
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 12px !important;
        padding: 12px !important;
        align-items: center !important;
      }
      #control-panel > div:first-child {
        width: 100% !important;
        margin-bottom: 4px !important;
      }
      #control-panel label, #control-panel select, #control-panel input, #control-panel button {
        margin-bottom: 0 !important;
        flex: 1 !important;
        min-width: 120px !important;
      }
      #control-panel label {
        flex: 0 0 auto !important;
        min-width: 80px !important;
        display: flex !important;
        align-items: center !important;
      }
    }
  `;
  document.head.appendChild(style);
}
