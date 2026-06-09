import type { SporeSettings } from './growth';

export interface PanelSettings extends SporeSettings {}

function applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles);
}

let currentSettings: PanelSettings = {
  growthSpeed: 0.3,
  colorLifespan: 60,
  sporeDensity: 15,
};

let settingsChangeCallback: ((settings: PanelSettings) => void) | null = null;
let panelElement: HTMLElement | null = null;
let mobileToggleButton: HTMLElement | null = null;

export function createPanel(
  onChange?: (settings: PanelSettings) => void
): HTMLElement {
  if (onChange) {
    settingsChangeCallback = onChange;
  }

  const existingPanel = document.getElementById('control-panel');
  if (existingPanel) {
    panelElement = existingPanel;
    return existingPanel;
  }

  panelElement = document.createElement('div');
  panelElement.id = 'control-panel';
  applyPanelStyles(panelElement);

  const title = document.createElement('div');
  title.textContent = '时间地衣';
  applyStyles(title, {
    color: '#D4C4A8',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '20px',
    letterSpacing: '2px',
    textAlign: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid #4A3F35',
  });
  panelElement.appendChild(title);

  createSlider(
    panelElement,
    '生长速度',
    'growthSpeed',
    0.1,
    1.5,
    0.3,
    0.05,
    'px/帧'
  );
  createSlider(
    panelElement,
    '颜色寿命',
    'colorLifespan',
    30,
    120,
    60,
    1,
    '秒'
  );
  createSlider(
    panelElement,
    '孢子密度',
    'sporeDensity',
    5,
    30,
    15,
    1,
    '个/百像素'
  );

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.id = 'panel-close-btn';
  applyStyles(closeBtn, {
    position: 'absolute',
    top: '8px',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: '#8B7A66',
    fontSize: '24px',
    cursor: 'pointer',
    lineHeight: '1',
    display: 'none',
  });
  closeBtn.addEventListener('click', () => {
    if (panelElement) {
      panelElement.classList.remove('panel-expanded');
      panelElement.style.display = 'none';
      if (mobileToggleButton) {
        mobileToggleButton.style.display = 'flex';
      }
    }
  });
  panelElement.appendChild(closeBtn);

  document.body.appendChild(panelElement);

  createMobileToggleButton();

  checkResponsive();
  window.addEventListener('resize', checkResponsive);

  return panelElement;
}

function applyPanelStyles(el: HTMLElement): void {
  applyStyles(el, {
    position: 'fixed',
    left: '20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '220px',
    backgroundColor: 'rgba(30, 27, 22, 0.85)',
    borderRadius: '8px',
    border: '1px solid #4A3F35',
    padding: '20px 16px',
    zIndex: '100',
    backdropFilter: 'blur(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  });
}

function createSlider(
  parent: HTMLElement,
  label: string,
  key: keyof PanelSettings,
  min: number,
  max: number,
  defaultValue: number,
  step: number,
  unit: string
): void {
  const container = document.createElement('div');
  applyStyles(container, {
    marginBottom: '20px',
  });

  const labelRow = document.createElement('div');
  applyStyles(labelRow, {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  });

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  applyStyles(labelEl, {
    color: '#B8A88F',
    fontSize: '13px',
  });

  const valueEl = document.createElement('span');
  valueEl.textContent = `${defaultValue.toFixed(step < 1 ? 2 : 0)}${unit}`;
  applyStyles(valueEl, {
    color: '#D4C4A8',
    fontSize: '12px',
    fontFamily: 'monospace',
  });

  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueEl);
  container.appendChild(labelRow);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(defaultValue);
  slider.dataset.key = key;

  applyStyles(slider, {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: '#3A2E28',
    outline: 'none',
    cursor: 'pointer',
    webkitAppearance: 'none',
    appearance: 'none',
    transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
  });

  slider.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const value = parseFloat(target.value);
    const k = target.dataset.key as keyof PanelSettings;
    currentSettings[k] = value as never;
    valueEl.textContent = `${value.toFixed(step < 1 ? 2 : 0)}${unit}`;

    if (settingsChangeCallback) {
      settingsChangeCallback({ ...currentSettings });
    }
  });

  slider.addEventListener('pointerdown', () => {
    slider.style.transform = 'scaleY(1.3)';
  });

  slider.addEventListener('pointerup', () => {
    slider.style.transform = 'scaleY(1)';
  });

  slider.addEventListener('pointerleave', () => {
    slider.style.transform = 'scaleY(1)';
  });

  const styleId = 'slider-thumb-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #8B7A66;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        background: #A89680;
        transform: scale(1.15);
      }
      input[type="range"]::-webkit-slider-thumb:active {
        transform: scale(0.95);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #8B7A66;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      }
      input[type="range"]::-moz-range-track {
        height: 6px;
        border-radius: 3px;
        background: #3A2E28;
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(slider);
  parent.appendChild(container);
}

function createMobileToggleButton(): void {
  mobileToggleButton = document.createElement('button');
  mobileToggleButton.id = 'panel-toggle-btn';
  mobileToggleButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4C4A8" stroke-width="2.5" stroke-linecap="round">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  `;
  applyStyles(mobileToggleButton, {
    position: 'fixed',
    right: '24px',
    bottom: '88px',
    width: '30px',
    height: '30px',
    backgroundColor: '#6B5A4A',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '99',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
    transition: 'background 0.2s ease, transform 0.2s ease',
  });

  mobileToggleButton.addEventListener('mouseenter', () => {
    if (mobileToggleButton) {
      mobileToggleButton.style.background = '#8B7A66';
    }
  });
  mobileToggleButton.addEventListener('mouseleave', () => {
    if (mobileToggleButton) {
      mobileToggleButton.style.background = '#6B5A4A';
    }
  });

  mobileToggleButton.addEventListener('click', () => {
    if (panelElement) {
      panelElement.style.display = 'block';
      panelElement.classList.add('panel-expanded');
      const closeBtn = document.getElementById('panel-close-btn');
      if (closeBtn) {
        closeBtn.style.display = 'block';
      }
      panelElement.style.left = '50%';
      panelElement.style.top = '50%';
      panelElement.style.transform = 'translate(-50%, -50%)';
      if (mobileToggleButton) {
        mobileToggleButton.style.display = 'none';
      }
    }
  });

  document.body.appendChild(mobileToggleButton);
}

function checkResponsive(): void {
  const isMobile = window.innerWidth < 768;

  if (panelElement && mobileToggleButton) {
    if (isMobile) {
      if (!panelElement.classList.contains('panel-expanded')) {
        panelElement.style.display = 'none';
      }
      mobileToggleButton.style.display = 'flex';
    } else {
      panelElement.style.display = 'block';
      panelElement.style.left = '20px';
      panelElement.style.top = '50%';
      panelElement.style.transform = 'translateY(-50%)';
      panelElement.classList.remove('panel-expanded');
      const closeBtn = document.getElementById('panel-close-btn');
      if (closeBtn) {
        closeBtn.style.display = 'none';
      }
      mobileToggleButton.style.display = 'none';
    }
  }
}

export function getSettings(): PanelSettings {
  return { ...currentSettings };
}

export function updateSettings(newSettings: Partial<PanelSettings>): void {
  currentSettings = { ...currentSettings, ...newSettings };
  if (settingsChangeCallback) {
    settingsChangeCallback({ ...currentSettings });
  }
}
