import type { FractalParams, FractalType, ColorScheme } from './types';
import { COLOR_SCHEMES } from './types';

export interface UICallbacks {
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onIterationsChange: (iterations: number) => void;
  onFractalTypeChange: (type: FractalType) => void;
  onReset: () => void;
  onExport: () => void;
}

export function createColorSchemeButtons(
  container: HTMLElement,
  currentScheme: ColorScheme,
  onSelect: (scheme: ColorScheme) => void
): void {
  container.innerHTML = '';

  COLOR_SCHEMES.forEach(scheme => {
    const btn = document.createElement('button');
    btn.className = 'color-scheme-btn';
    if (scheme.id === currentScheme.id) btn.classList.add('active');
    btn.dataset.schemeId = scheme.id;

    const preview = document.createElement('div');
    preview.className = 'color-scheme-preview';
    const gradient = `linear-gradient(to right, ${scheme.stops.map(s => s.color).join(', ')})`;
    preview.style.background = gradient;

    const name = document.createElement('div');
    name.className = 'color-scheme-name';
    name.textContent = scheme.name;

    btn.appendChild(preview);
    btn.appendChild(name);

    btn.addEventListener('click', () => {
      container.querySelectorAll('.color-scheme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(scheme);
    });

    container.appendChild(btn);
  });
}

export function initUIController(
  params: FractalParams,
  callbacks: UICallbacks
): void {
  const colorSchemesContainer = document.getElementById('color-schemes') as HTMLElement;
  createColorSchemeButtons(colorSchemesContainer, params.colorScheme, callbacks.onColorSchemeChange);

  const iterSlider = document.getElementById('iter-slider') as HTMLInputElement;
  const iterValue = document.getElementById('iter-value') as HTMLElement;
  iterSlider.value = String(params.maxIterations);
  iterValue.textContent = String(params.maxIterations);

  iterSlider.addEventListener('input', () => {
    const val = parseInt(iterSlider.value, 10);
    iterValue.textContent = String(val);
    callbacks.onIterationsChange(val);
  });

  const fractalButtons = document.querySelectorAll('.fractal-btn') as NodeListOf<HTMLButtonElement>;
  fractalButtons.forEach(btn => {
    if (btn.dataset.type === params.fractalType) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      fractalButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callbacks.onFractalTypeChange(btn.dataset.type as FractalType);
    });
  });

  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  resetBtn.addEventListener('click', callbacks.onReset);

  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  exportBtn.addEventListener('click', callbacks.onExport);

  initPanelDrag();
}

function initPanelDrag(): void {
  const panel = document.getElementById('control-panel') as HTMLElement;
  const header = document.getElementById('panel-header') as HTMLElement;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  header.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    panel.classList.add('dragging');
    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    panel.style.right = 'auto';
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;

    e.preventDefault();
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, startLeft + dx));
    const newTop = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, startTop + dy));

    panel.style.left = `${newLeft}px`;
    panel.style.top = `${newTop}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    panel.classList.remove('dragging');
  });
}

export function updateIterationsDisplay(value: number): void {
  const iterValue = document.getElementById('iter-value') as HTMLElement;
  const iterSlider = document.getElementById('iter-slider') as HTMLInputElement;
  if (iterValue) iterValue.textContent = String(value);
  if (iterSlider) iterSlider.value = String(value);
}

export function updateFractalTypeDisplay(type: FractalType): void {
  const buttons = document.querySelectorAll('.fractal-btn') as NodeListOf<HTMLButtonElement>;
  buttons.forEach(btn => {
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

export function updateColorSchemeDisplay(scheme: ColorScheme): void {
  const container = document.getElementById('color-schemes') as HTMLElement;
  const buttons = container.querySelectorAll('.color-scheme-btn') as NodeListOf<HTMLButtonElement>;
  buttons.forEach(btn => {
    if (btn.dataset.schemeId === scheme.id) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
