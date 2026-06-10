export interface AneurysmInfo {
  wss: number;
  turbulence: number;
}

let currentPanel: HTMLElement | null = null;
let hideTimeout: number | null = null;

export function showInfoPanel(screenX: number, screenY: number, info: AneurysmInfo): void {
  hideInfoPanel(true);

  const app = document.getElementById('app');
  if (!app) return;

  const panel = document.createElement('div');
  panel.id = 'aneurysm-info-panel';
  panel.style.cssText = `
    position: absolute;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 15px;
    padding: 20px 24px;
    color: #ffffff;
    font-size: 14px;
    z-index: 200;
    min-width: 260px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
    pointer-events: auto;
  `;

  const title = document.createElement('div');
  title.textContent = '动脉瘤区域分析';
  title.style.cssText = `
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 18px;
    color: #ff6b6b;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  `;
  panel.appendChild(title);

  const wssContainer = document.createElement('div');
  wssContainer.style.cssText = 'margin-bottom: 16px;';

  const wssLabel = document.createElement('div');
  const wssValue = document.createElement('span');
  const wssColor = getWSSColor(info.wss);
  wssValue.textContent = info.wss.toFixed(2) + ' Pa';
  wssValue.style.cssText = `float: right; color: ${wssColor}; font-weight: 600; font-size: 15px;`;
  wssLabel.innerHTML = '壁面剪切应力 (WSS)';
  wssLabel.appendChild(wssValue);
  wssLabel.style.cssText = 'margin-bottom: 8px;';
  wssContainer.appendChild(wssLabel);

  const wssBar = createGradientBar(info.wss, 0.5, 4.0, wssColor);
  wssContainer.appendChild(wssBar);
  panel.appendChild(wssContainer);

  const turbContainer = document.createElement('div');

  const turbLabel = document.createElement('div');
  const turbValue = document.createElement('span');
  const turbColor = getTurbulenceColor(info.turbulence);
  turbValue.textContent = Math.round(info.turbulence) + '%';
  turbValue.style.cssText = `float: right; color: ${turbColor}; font-weight: 600; font-size: 15px;`;
  turbLabel.innerHTML = '湍流强度';
  turbLabel.appendChild(turbValue);
  turbLabel.style.cssText = 'margin-bottom: 8px;';
  turbContainer.appendChild(turbLabel);

  const turbBar = createGradientBar(info.turbulence, 0, 100, turbColor);
  turbContainer.appendChild(turbBar);
  panel.appendChild(turbContainer);

  const hint = document.createElement('div');
  hint.textContent = '点击面板外任意位置关闭';
  hint.style.cssText = `
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 12px;
    color: #8b949e;
    text-align: center;
  `;
  panel.appendChild(hint);

  app.appendChild(panel);

  const panelRect = panel.getBoundingClientRect();
  let left = screenX + 15;
  let top = screenY + 15;

  const maxLeft = window.innerWidth - panel.offsetWidth - 15;
  const maxTop = window.innerHeight - panel.offsetHeight - 15;

  if (left > maxLeft) left = screenX - panel.offsetWidth - 15;
  if (top > maxTop) top = screenY - panel.offsetHeight - 15;
  if (left < 15) left = 15;
  if (top < 15) top = 15;

  panel.style.left = left + 'px';
  panel.style.top = top + 'px';

  requestAnimationFrame(() => {
    if (panel.parentNode) {
      panel.style.opacity = '1';
      panel.style.transform = 'translateY(0)';
    }
  });

  currentPanel = panel;

  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
  }, 50);
}

function createGradientBar(value: number, min: number, max: number, color: string): HTMLElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
  `;

  const fill = document.createElement('div');
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  fill.style.cssText = `
    width: ${percent}%;
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #eab308, #ef4444);
    border-radius: 4px;
    transition: width 0.5s ease-out;
  `;
  container.appendChild(fill);

  const marker = document.createElement('div');
  marker.style.cssText = `
    position: absolute;
    top: -2px;
    left: calc(${percent}% - 3px);
    width: 6px;
    height: 12px;
    background: ${color};
    border-radius: 2px;
    box-shadow: 0 0 6px ${color};
  `;
  container.appendChild(marker);

  return container;
}

function getWSSColor(wss: number): string {
  const t = Math.max(0, Math.min(1, (wss - 0.5) / 3.5));
  const r = Math.round(59 + (239 - 59) * t);
  const g = Math.round(130 + (68 - 130) * t);
  const b = Math.round(246 + (68 - 246) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTurbulenceColor(turb: number): string {
  const t = Math.max(0, Math.min(1, turb / 100));
  const r = Math.round(59 + (239 - 59) * t);
  const g = Math.round(130 + (68 - 130) * t);
  const b = Math.round(246 + (68 - 246) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function handleOutsideClick(e: MouseEvent | TouchEvent): void {
  if (!currentPanel) return;

  const target = e.target as Node;
  if (!currentPanel.contains(target)) {
    hideInfoPanel();
  }
}

export function hideInfoPanel(immediate: boolean = false): void {
  document.removeEventListener('click', handleOutsideClick, true);
  document.removeEventListener('touchstart', handleOutsideClick, true);

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  if (!currentPanel) return;

  const panel = currentPanel;
  currentPanel = null;

  if (immediate) {
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    return;
  }

  panel.style.opacity = '0';
  panel.style.transform = 'translateY(10px)';
  hideTimeout = window.setTimeout(() => {
    if (panel.parentNode) {
      panel.parentNode.removeChild(panel);
    }
    hideTimeout = null;
  }, 300);
}

export function generateAneurysmData(): AneurysmInfo {
  return {
    wss: 0.5 + Math.random() * 3.5,
    turbulence: 30 + Math.random() * 60,
  };
}
