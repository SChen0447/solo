export type ThemeColor = '#2a1a0a' | '#c0392b' | '#1a5276';

type ThemeCallback = (theme: ThemeColor) => void;
type SpeedCallback = (speed: number) => void;

const THEMES: { color: ThemeColor; label: string }[] = [
  { color: '#2a1a0a', label: '墨色' },
  { color: '#c0392b', label: '朱砂' },
  { color: '#1a5276', label: '黛青' }
];

let currentTheme: ThemeColor = '#2a1a0a';
let currentSpeed: number = 5;
const themeCallbacks: Set<ThemeCallback> = new Set();
const speedCallbacks: Set<SpeedCallback> = new Set();

export function initUI(): void {
  const panel: HTMLElement | null = document.getElementById('control-panel');
  if (!panel) return;

  buildThemeButtons(panel);
  buildSpeedSlider(panel);
  buildPoemArea(panel);
}

function buildThemeButtons(panel: HTMLElement): void {
  const themeSection: HTMLElement | null = panel.querySelector('#theme-section');
  if (!themeSection) return;

  themeSection.innerHTML = '';
  const label: HTMLDivElement = document.createElement('div');
  label.className = 'control-label';
  label.textContent = '主题色';
  themeSection.appendChild(label);

  const btnGroup: HTMLDivElement = document.createElement('div');
  btnGroup.className = 'theme-buttons';

  THEMES.forEach((t): void => {
    const btn: HTMLButtonElement = document.createElement('button');
    btn.className = 'theme-btn';
    btn.dataset.color = t.color;
    btn.title = t.label;
    btn.style.backgroundColor = t.color;
    if (t.color === currentTheme) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', (): void => {
      setTheme(t.color);
    });
    btnGroup.appendChild(btn);
  });

  themeSection.appendChild(btnGroup);
}

function buildSpeedSlider(panel: HTMLElement): void {
  const speedSection: HTMLElement | null = panel.querySelector('#speed-section');
  if (!speedSection) return;

  speedSection.innerHTML = '';

  const labelRow: HTMLDivElement = document.createElement('div');
  labelRow.className = 'control-label-row';

  const label: HTMLDivElement = document.createElement('div');
  label.className = 'control-label';
  label.textContent = '墨迹扩散';

  const value: HTMLDivElement = document.createElement('div');
  value.className = 'speed-value';
  value.id = 'speed-value';
  value.textContent = String(currentSpeed);

  labelRow.appendChild(label);
  labelRow.appendChild(value);
  speedSection.appendChild(labelRow);

  const slider: HTMLInputElement = document.createElement('input');
  slider.type = 'range';
  slider.id = 'speed-slider';
  slider.min = '1';
  slider.max = '10';
  slider.step = '1';
  slider.value = String(currentSpeed);
  slider.addEventListener('input', (e: Event): void => {
    const target: HTMLInputElement = e.target as HTMLInputElement;
    setSpeed(parseInt(target.value, 10));
  });
  speedSection.appendChild(slider);
}

function buildPoemArea(panel: HTMLElement): void {
  const poemSection: HTMLElement | null = panel.querySelector('#poem-section');
  if (!poemSection) return;

  poemSection.innerHTML = '';
  const poemContainer: HTMLDivElement = document.createElement('div');
  poemContainer.id = 'poem-container';
  poemContainer.className = 'poem-container';
  poemSection.appendChild(poemContainer);
}

export function setTheme(theme: ThemeColor): void {
  if (theme === currentTheme) return;
  currentTheme = theme;

  document.querySelectorAll('.theme-btn').forEach((btn: Element): void => {
    const el: HTMLElement = btn as HTMLElement;
    if (el.dataset.color === theme) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  themeCallbacks.forEach((cb: ThemeCallback): void => {
    try {
      cb(theme);
    } catch (e) {
      console.error('Theme callback error:', e);
    }
  });
}

export function getTheme(): ThemeColor {
  return currentTheme;
}

export function setSpeed(speed: number): void {
  const clamped: number = Math.max(1, Math.min(10, Math.floor(speed)));
  if (clamped === currentSpeed) return;
  currentSpeed = clamped;

  const valueEl: HTMLElement | null = document.getElementById('speed-value');
  if (valueEl) {
    valueEl.textContent = String(clamped);
  }

  const slider: HTMLInputElement | null = document.getElementById('speed-slider') as HTMLInputElement | null;
  if (slider) {
    slider.value = String(clamped);
  }

  speedCallbacks.forEach((cb: SpeedCallback): void => {
    try {
      cb(clamped);
    } catch (e) {
      console.error('Speed callback error:', e);
    }
  });
}

export function getSpeed(): number {
  return currentSpeed;
}

export function onThemeChange(callback: ThemeCallback): () => void {
  themeCallbacks.add(callback);
  return (): void => {
    themeCallbacks.delete(callback);
  };
}

export function onSpeedChange(callback: SpeedCallback): () => void {
  speedCallbacks.add(callback);
  return (): void => {
    speedCallbacks.delete(callback);
  };
}

export function displayPoem(poem: string, theme: ThemeColor): void {
  const container: HTMLElement | null = document.getElementById('poem-container');
  if (!container) return;

  container.innerHTML = '';
  container.style.color = theme;

  const chars: string[] = poem.split('');
  chars.forEach((char: string, index: number): void => {
    const span: HTMLSpanElement = document.createElement('span');
    span.className = 'poem-char';
    span.textContent = char;
    span.style.animationDelay = `${index * 0.3}s`;
    container.appendChild(span);
  });
}

export function updateInfoBar(dateInfo: { lunar: string; solarTerm: string }): void {
  const infoBar: HTMLElement | null = document.getElementById('info-bar');
  if (!infoBar) return;

  const content: string = `${dateInfo.lunar}　·　${dateInfo.solarTerm}`;
  infoBar.textContent = content;
}
