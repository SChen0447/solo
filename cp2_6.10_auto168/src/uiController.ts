import { HSL, BlendMode, Color } from './colorMixer';

export interface ColorState {
  colorA: { hsl: HSL; alpha: number };
  colorB: { hsl: HSL; alpha: number };
  mode: BlendMode;
}

export interface HistoryItem {
  id: string;
  state: ColorState;
  thumbnail: string;
  mixedColorHSL: HSL;
  timestamp: number;
}

export interface UICallbacks {
  onStateChange: (state: ColorState) => void;
  onHistoryRestore: (state: ColorState) => void;
  onHistoryDelete: (id: string) => void;
  onClearHistory: () => void;
}

const MODE_COLORS: Record<BlendMode, string> = {
  normal: '#607d8b',
  multiply: '#ff5722',
  screen: '#00bcd4',
  overlay: '#9c27b0',
  'soft-light': '#ffc107',
};

let currentState: ColorState;
let callbacks: UICallbacks;
let modeButtons: HTMLButtonElement[] = [];
let historyListEl: HTMLElement;
let historyItems: HistoryItem[] = [];

let colorAHue: HTMLInputElement;
let colorASat: HTMLInputElement;
let colorALig: HTMLInputElement;
let colorAAlpha: HTMLInputElement;
let colorBHue: HTMLInputElement;
let colorBSat: HTMLInputElement;
let colorBLig: HTMLInputElement;
let colorBAlpha: HTMLInputElement;

let colorADot: HTMLElement;
let colorBDot: HTMLElement;

let colorAHslEl: HTMLElement;
let colorAHexEl: HTMLElement;
let colorBHslEl: HTMLElement;
let colorBHexEl: HTMLElement;
let mixedHslEl: HTMLElement;
let mixedHexEl: HTMLElement;
let mixedLabelEl: HTMLElement;

function createModeBar(container: HTMLElement, modes: BlendMode[]) {
  const bar = document.createElement('div');
  bar.className = 'mode-bar';

  modes.forEach((mode) => {
    const btn = document.createElement('button');
    btn.className = 'mode-btn';
    btn.textContent = mode;
    btn.dataset.mode = mode;
    btn.addEventListener('click', () => {
      currentState.mode = mode;
      setActiveMode(mode);
      callbacks.onStateChange({ ...currentState });
    });
    modeButtons.push(btn);
    bar.appendChild(btn);
  });

  container.appendChild(bar);
}

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  isHue: boolean = false,
  suffix: string = ''
): { input: HTMLInputElement; valueEl: HTMLElement; group: HTMLElement } {
  const group = document.createElement('div');
  group.className = 'slider-group';

  const row = document.createElement('div');
  row.className = 'slider-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'slider-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'slider-value';
  valueEl.textContent = value + suffix;

  row.appendChild(labelEl);
  row.appendChild(valueEl);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  if (isHue) input.className = 'hue-slider';

  group.appendChild(row);
  group.appendChild(input);

  return { input, valueEl, group };
}

function createColorGroup(
  container: HTMLElement,
  title: string,
  dotColor: string,
  hsl: HSL,
  alpha: number,
  prefix: 'A' | 'B'
) {
  const group = document.createElement('div');
  group.className = 'color-group';

  const titleRow = document.createElement('div');
  titleRow.className = 'color-group-title';

  const dot = document.createElement('span');
  dot.className = 'color-dot';
  dot.style.background = dotColor;
  if (prefix === 'A') colorADot = dot;
  else colorBDot = dot;

  const titleText = document.createElement('span');
  titleText.textContent = title;

  titleRow.appendChild(dot);
  titleRow.appendChild(titleText);
  group.appendChild(titleRow);

  const hue = createSlider('Hue 色相', 0, 360, 1, hsl.h, true, '°');
  const sat = createSlider('Saturation 饱和度', 0, 100, 1, hsl.s, false, '%');
  const lig = createSlider('Lightness 亮度', 20, 80, 1, hsl.l, false, '%');
  const alp = createSlider('Alpha 透明度', 10, 100, 5, alpha * 100, false, '%');

  if (prefix === 'A') {
    colorAHue = hue.input;
    colorASat = sat.input;
    colorALig = lig.input;
    colorAAlpha = alp.input;
  } else {
    colorBHue = hue.input;
    colorBSat = sat.input;
    colorBLig = lig.input;
    colorBAlpha = alp.input;
  }

  const updateState = () => {
    if (prefix === 'A') {
      currentState.colorA = {
        hsl: {
          h: Number(colorAHue.value),
          s: Number(colorASat.value),
          l: Number(colorALig.value),
        },
        alpha: Number(colorAAlpha.value) / 100,
      };
      hue.valueEl.textContent = colorAHue.value + '°';
      sat.valueEl.textContent = colorASat.value + '%';
      lig.valueEl.textContent = colorALig.value + '%';
      alp.valueEl.textContent = colorAAlpha.value + '%';
    } else {
      currentState.colorB = {
        hsl: {
          h: Number(colorBHue.value),
          s: Number(colorBSat.value),
          l: Number(colorBLig.value),
        },
        alpha: Number(colorBAlpha.value) / 100,
      };
      hue.valueEl.textContent = colorBHue.value + '°';
      sat.valueEl.textContent = colorBSat.value + '%';
      lig.valueEl.textContent = colorBLig.value + '%';
      alp.valueEl.textContent = colorBAlpha.value + '%';
    }
    callbacks.onStateChange({ ...currentState });
  };

  hue.input.addEventListener('input', updateState);
  sat.input.addEventListener('input', updateState);
  lig.input.addEventListener('input', updateState);
  alp.input.addEventListener('input', updateState);

  group.appendChild(hue.group);
  group.appendChild(sat.group);
  group.appendChild(lig.group);
  group.appendChild(alp.group);

  container.appendChild(group);
}

function createControlPanel(container: HTMLElement) {
  const panel = document.createElement('div');
  panel.className = 'control-panel';

  createColorGroup(panel, '色块 A', '#ff4d4d', currentState.colorA.hsl, currentState.colorA.alpha, 'A');
  createColorGroup(panel, '色块 B', '#4d4dff', currentState.colorB.hsl, currentState.colorB.alpha, 'B');

  container.appendChild(panel);
}

function createCanvasSection(container: HTMLElement): { canvas: HTMLCanvasElement } {
  const section = document.createElement('div');
  section.className = 'canvas-section';

  const wrapper = document.createElement('div');
  wrapper.className = 'canvas-wrapper';

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  wrapper.appendChild(canvas);

  const infoPanel = document.createElement('div');
  infoPanel.className = 'color-info-panel';

  const colA = document.createElement('div');
  colA.className = 'color-info-col';
  const labelA = document.createElement('span');
  labelA.className = 'color-info-label';
  labelA.textContent = '色块 A';
  colorAHslEl = document.createElement('span');
  colorAHslEl.className = 'color-info-hsl';
  colorAHexEl = document.createElement('span');
  colorAHexEl.className = 'color-info-hex';
  colA.appendChild(labelA);
  colA.appendChild(colorAHslEl);
  colA.appendChild(colorAHexEl);

  const colB = document.createElement('div');
  colB.className = 'color-info-col';
  const labelB = document.createElement('span');
  labelB.className = 'color-info-label';
  labelB.textContent = '色块 B';
  colorBHslEl = document.createElement('span');
  colorBHslEl.className = 'color-info-hsl';
  colorBHexEl = document.createElement('span');
  colorBHexEl.className = 'color-info-hex';
  colB.appendChild(labelB);
  colB.appendChild(colorBHslEl);
  colB.appendChild(colorBHexEl);

  const colMix = document.createElement('div');
  colMix.className = 'color-info-col';
  mixedLabelEl = document.createElement('span');
  mixedLabelEl.className = 'color-info-label';
  mixedLabelEl.textContent = '混合结果';
  mixedHslEl = document.createElement('span');
  mixedHslEl.className = 'color-info-hsl';
  mixedHexEl = document.createElement('span');
  mixedHexEl.className = 'color-info-hex';
  colMix.appendChild(mixedLabelEl);
  colMix.appendChild(mixedHslEl);
  colMix.appendChild(mixedHexEl);

  infoPanel.appendChild(colA);
  infoPanel.appendChild(colB);
  infoPanel.appendChild(colMix);

  section.appendChild(wrapper);
  section.appendChild(infoPanel);

  container.appendChild(section);

  return { canvas };
}

function createHistoryPanel(container: HTMLElement) {
  const panel = document.createElement('div');
  panel.className = 'history-panel';

  const title = document.createElement('div');
  title.className = 'history-title';
  title.textContent = '对比历史';
  panel.appendChild(title);

  historyListEl = document.createElement('div');
  historyListEl.className = 'history-list';
  panel.appendChild(historyListEl);
  renderHistoryEmpty();

  const clearBtn = document.createElement('button');
  clearBtn.className = 'clear-history-btn';
  clearBtn.textContent = '清空历史';
  clearBtn.addEventListener('click', () => {
    historyItems = [];
    renderHistoryEmpty();
    callbacks.onClearHistory();
  });
  panel.appendChild(clearBtn);

  container.appendChild(panel);
}

function renderHistoryEmpty() {
  historyListEl.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'history-empty';
  empty.textContent = '暂无历史记录';
  historyListEl.appendChild(empty);
}

export function initUI(
  container: HTMLElement,
  initialState: ColorState,
  cb: UICallbacks
): HTMLCanvasElement {
  currentState = { ...initialState };
  callbacks = cb;

  const title = document.createElement('h1');
  title.textContent = '色彩混合演示';
  container.appendChild(title);

  const modes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'soft-light'];
  createModeBar(container, modes);
  setActiveMode(currentState.mode);

  const mainLayout = document.createElement('div');
  mainLayout.className = 'main-layout';

  createControlPanel(mainLayout);
  const { canvas } = createCanvasSection(mainLayout);
  createHistoryPanel(mainLayout);

  container.appendChild(mainLayout);

  return canvas;
}

export function getState(): ColorState {
  return { ...currentState };
}

export function setState(state: ColorState) {
  currentState = { ...state };

  colorAHue.value = String(state.colorA.hsl.h);
  colorASat.value = String(state.colorA.hsl.s);
  colorALig.value = String(state.colorA.hsl.l);
  colorAAlpha.value = String(state.colorA.alpha * 100);

  colorBHue.value = String(state.colorB.hsl.h);
  colorBSat.value = String(state.colorB.hsl.s);
  colorBLig.value = String(state.colorB.hsl.l);
  colorBAlpha.value = String(state.colorB.alpha * 100);

  setActiveMode(state.mode);
}

export function setActiveMode(mode: BlendMode) {
  modeButtons.forEach((btn) => {
    const btnMode = btn.dataset.mode as BlendMode;
    btn.classList.remove(
      'active-normal',
      'active-multiply',
      'active-screen',
      'active-overlay',
      'active-soft-light'
    );
    if (btnMode === mode) {
      btn.classList.add('active-' + mode);
    }
  });
}

export function updateColorInfo(colorA: Color, colorB: Color, mixed: Color) {
  colorAHslEl.textContent = `hsl(${colorA.hsl.h}, ${colorA.hsl.s}%, ${colorA.hsl.l}%)`;
  colorAHexEl.textContent = colorA.hex.toUpperCase();
  colorAHslEl.style.color = colorA.hex;
  colorAHexEl.style.color = colorA.hex;
  colorADot.style.background = colorA.hex;

  colorBHslEl.textContent = `hsl(${colorB.hsl.h}, ${colorB.hsl.s}%, ${colorB.hsl.l}%)`;
  colorBHexEl.textContent = colorB.hex.toUpperCase();
  colorBHslEl.style.color = colorB.hex;
  colorBHexEl.style.color = colorB.hex;
  colorBDot.style.background = colorB.hex;

  mixedHslEl.textContent = `hsl(${mixed.hsl.h}, ${mixed.hsl.s}%, ${mixed.hsl.l}%)`;
  mixedHexEl.textContent = mixed.hex.toUpperCase();
  mixedHslEl.style.color = mixed.hex;
  mixedHexEl.style.color = mixed.hex;
  mixedLabelEl.style.color = mixed.hex;
}

export function addHistoryItem(item: HistoryItem) {
  historyItems = [item, ...historyItems].slice(0, 5);
  renderHistoryList();
}

export function removeHistoryItem(id: string) {
  historyItems = historyItems.filter((i) => i.id !== id);
  if (historyItems.length === 0) {
    renderHistoryEmpty();
  } else {
    renderHistoryList();
  }
}

export function clearHistory() {
  historyItems = [];
  renderHistoryEmpty();
}

function renderHistoryList() {
  historyListEl.innerHTML = '';

  historyItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'history-item';

    const thumb = document.createElement('div');
    thumb.className = 'history-thumb';
    thumb.style.background = `linear-gradient(135deg, hsl(${item.state.colorA.hsl.h},${item.state.colorA.hsl.s}%,${item.state.colorA.hsl.l}%) 0%, hsl(${item.state.colorB.hsl.h},${item.state.colorB.hsl.s}%,${item.state.colorB.hsl.l}%) 100%)`;

    const info = document.createElement('div');
    info.className = 'history-info';

    const hslText = document.createElement('span');
    hslText.className = 'history-hsl';
    hslText.textContent = `hsl(${item.mixedColorHSL.h}, ${item.mixedColorHSL.s}%, ${item.mixedColorHSL.l}%)`;

    const modeText = document.createElement('span');
    modeText.className = 'history-mode';
    modeText.textContent = item.state.mode;

    info.appendChild(hslText);
    info.appendChild(modeText);

    const delBtn = document.createElement('button');
    delBtn.className = 'history-delete';
    delBtn.textContent = '×';
    delBtn.title = '删除此记录';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onHistoryDelete(item.id);
    });

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(delBtn);

    row.addEventListener('click', () => {
      callbacks.onHistoryRestore({ ...item.state });
    });

    historyListEl.appendChild(row);
  });
}

export { MODE_COLORS };
