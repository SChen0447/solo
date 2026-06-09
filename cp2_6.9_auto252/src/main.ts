import {
  Person,
  ControlParams,
  Stats,
  SIRDataPoint,
  initializePopulation,
  updateDay,
  computeStats,
  findPersonAt,
  getStatusLabel,
  getGridSize
} from './simulation';

import {
  RenderConfig,
  computeRenderConfig,
  clearCanvas,
  drawGrid,
  drawPeople,
  drawSIRChart,
  updateTooltip,
  screenToGrid
} from './renderer';

const BASE_DAYS_PER_SECOND = 10;

let people: Person[] = [];
let sirData: SIRDataPoint[] = [];
let currentDay = 0;
let stats: Stats;
let gridSize: number;
let renderConfig: RenderConfig;

const controlParams: ControlParams = {
  lockdown: false,
  vaccine: false,
  maskRate: 0.05,
  socialDistance: false
};

let speedMultiplier = 1;
let accumulatedTime = 0;
let lastTime = 0;

let canvas: HTMLCanvasElement;
let canvasContainer: HTMLElement;
let tooltip: HTMLElement;
let controlPanelAnchor: HTMLElement;

let statInfectedEl: HTMLElement;
let statRecoveredEl: HTMLElement;
let currentDayEl: HTMLElement;

function init(): void {
  canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  canvasContainer = document.getElementById('canvas-container') as HTMLElement;
  tooltip = document.getElementById('tooltip') as HTMLElement;
  controlPanelAnchor = document.getElementById('control-panel-anchor') as HTMLElement;

  buildControlPanel();
  resizeCanvas();
  resetSimulation();

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', () => {
    updateTooltip(tooltip, false, 0, 0, '');
  });

  lastTime = performance.now();
  requestAnimationFrame(mainLoop);
}

function resizeCanvas(): void {
  const isSmall = window.innerWidth < 900;
  const containerWidth = isSmall
    ? canvasContainer.clientWidth
    : Math.max(640, canvasContainer.clientWidth);
  const containerHeight = isSmall
    ? Math.max(400, canvasContainer.clientHeight)
    : canvasContainer.clientHeight;

  gridSize = getGridSize(window.innerWidth);
  renderConfig = computeRenderConfig(canvas, gridSize, containerWidth, containerHeight);
}

function resetSimulation(): void {
  people = initializePopulation(gridSize);
  sirData = [];
  currentDay = 0;
  accumulatedTime = 0;
  stats = computeStats(people);
  sirData.push({
    day: 0,
    susceptible: stats.susceptible,
    infected: stats.infected,
    recovered: stats.recovered
  });
  updateStatsDisplay();
}

function buildControlPanel(): void {
  const isSmall = window.innerWidth < 900;

  controlPanelAnchor.innerHTML = '';
  const panel = document.createElement('div');
  panel.id = 'control-panel';

  Object.assign(panel.style, {
    width: isSmall ? '100%' : '280px',
    background: 'rgba(42, 42, 62, 0.9)',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    flexDirection: isSmall ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: '12px',
    overflowY: isSmall ? 'hidden' : 'auto',
    overflowX: isSmall ? 'auto' : 'hidden',
    maxHeight: isSmall ? 'auto' : '100vh',
    color: '#ffffff',
    fontSize: '14px',
    boxShadow: '0 0 20px rgba(0, 255, 204, 0.15)'
  } as CSSStyleDeclaration);

  const title = document.createElement('div');
  title.textContent = '疫情模拟器';
  Object.assign(title.style, {
    color: '#00FFCC',
    fontSize: '20px',
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadow: '0 0 10px #00FFCC, 0 0 20px #00FFCC',
    marginBottom: isSmall ? '0' : '8px',
    width: '100%'
  } as CSSStyleDeclaration);
  panel.appendChild(title);

  const chartSection = document.createElement('div');
  chartSection.id = 'chart-section';
  Object.assign(chartSection.style, {
    width: isSmall ? '260px' : '100%',
    flexShrink: '0'
  } as CSSStyleDeclaration);

  const chartCanvas = document.createElement('canvas');
  chartCanvas.id = 'chart-canvas';
  Object.assign(chartCanvas.style, {
    width: '100%',
    height: '180px',
    display: 'block',
    borderRadius: '4px'
  } as CSSStyleDeclaration);
  chartSection.appendChild(chartCanvas);
  panel.appendChild(chartSection);

  const newOutbreakBtn = createButton('新建疫情', () => {
    resetSimulation();
  });
  Object.assign(newOutbreakBtn.style, {
    width: isSmall ? 'auto' : '100%',
    margin: isSmall ? '0' : '4px 0'
  } as CSSStyleDeclaration);
  panel.appendChild(newOutbreakBtn);

  const dayDisplay = document.createElement('div');
  dayDisplay.id = 'day-display';
  dayDisplay.textContent = '第 0 天';
  Object.assign(dayDisplay.style, {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#00FFCC',
    width: isSmall ? 'auto' : '100%'
  } as CSSStyleDeclaration);
  panel.appendChild(dayDisplay);
  currentDayEl = dayDisplay;

  const lockdownControl = createToggleControl('封城', 'lockdown', controlParams.lockdown);
  panel.appendChild(lockdownControl);

  const vaccineControl = createToggleControl('疫苗', 'vaccine', controlParams.vaccine);
  panel.appendChild(vaccineControl);

  const socialDistControl = createToggleControl('社交距离', 'socialDistance', controlParams.socialDistance);
  panel.appendChild(socialDistControl);

  const maskControl = createSliderControl(
    '口罩防护',
    'maskRate',
    controlParams.maskRate,
    0.01,
    0.08,
    0.01
  );
  panel.appendChild(maskControl);

  const speedSection = document.createElement('div');
  Object.assign(speedSection.style, {
    display: 'flex',
    gap: '8px',
    background: '#1E1E2E',
    borderRadius: '6px',
    padding: '8px',
    width: isSmall ? 'auto' : '100%',
    justifyContent: 'center'
  } as CSSStyleDeclaration);

  const speedLabel = document.createElement('div');
  speedLabel.textContent = '速度:';
  Object.assign(speedLabel.style, {
    alignSelf: 'center',
    marginRight: '4px',
    color: '#AAAAAA'
  } as CSSStyleDeclaration);
  speedSection.appendChild(speedLabel);

  const speed1x = createSpeedButton('1x', 1);
  const speed2x = createSpeedButton('2x', 2);
  const speed5x = createSpeedButton('5x', 5);
  speedSection.appendChild(speed1x);
  speedSection.appendChild(speed2x);
  speedSection.appendChild(speed5x);
  panel.appendChild(speedSection);

  const statsSection = document.createElement('div');
  Object.assign(statsSection.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: '#0F0F1F',
    borderRadius: '6px',
    padding: '12px',
    width: isSmall ? 'auto' : '100%'
  } as CSSStyleDeclaration);

  const totalInfectedLabel = document.createElement('div');
  totalInfectedLabel.innerHTML = '累计感染: <span id="stat-infected" style="color:#FF4444; font-weight:bold;">0</span>';
  statInfectedEl = totalInfectedLabel.querySelector('#stat-infected') as HTMLElement;

  const totalRecoveredLabel = document.createElement('div');
  totalRecoveredLabel.innerHTML = '累计康复: <span id="stat-recovered" style="color:#44FF44; font-weight:bold;">0</span>';
  statRecoveredEl = totalRecoveredLabel.querySelector('#stat-recovered') as HTMLElement;

  statsSection.appendChild(totalInfectedLabel);
  statsSection.appendChild(totalRecoveredLabel);
  panel.appendChild(statsSection);

  controlPanelAnchor.appendChild(panel);
}

function createButton(label: string, onClick: () => void): HTMLElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  Object.assign(btn.style, {
    background: '#3A3A4E',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.1s ease',
    fontFamily: 'inherit'
  } as CSSStyleDeclaration);

  btn.addEventListener('mouseenter', () => {
    btn.style.background = '#5A5A6E';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = '#3A3A4E';
  });
  btn.addEventListener('mousedown', () => {
    btn.style.transform = 'scale(0.95)';
  });
  btn.addEventListener('mouseup', () => {
    btn.style.transform = 'scale(1)';
  });
  btn.addEventListener('click', onClick);
  return btn;
}

function createSpeedButton(label: string, multiplier: number): HTMLElement {
  const btn = createButton(label, () => {
    speedMultiplier = multiplier;
    document.querySelectorAll('.speed-btn').forEach(el => {
      (el as HTMLElement).style.background = '#3A3A4E';
      (el as HTMLElement).style.color = '#ffffff';
    });
    btn.style.background = '#00FFCC';
    btn.style.color = '#1B1B2F';
  });
  btn.classList.add('speed-btn');
  Object.assign(btn.style, {
    padding: '6px 14px',
    fontSize: '13px'
  } as CSSStyleDeclaration);
  if (multiplier === 1) {
    btn.style.background = '#00FFCC';
    btn.style.color = '#1B1B2F';
  }
  return btn;
}

function createToggleControl(
  label: string,
  paramKey: keyof ControlParams,
  initialValue: boolean
): HTMLElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    background: '#0F0F1F',
    borderRadius: '6px',
    padding: '8px 12px',
    minWidth: isMobile() ? '180px' : 'auto'
  } as CSSStyleDeclaration);

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const toggle = document.createElement('button');
  toggle.textContent = initialValue ? '开启' : '关闭';
  Object.assign(toggle.style, {
    background: initialValue ? '#00FFCC' : '#3A3A4E',
    color: initialValue ? '#1B1B2F' : '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.1s ease',
    fontFamily: 'inherit'
  } as CSSStyleDeclaration);

  let active = initialValue;
  toggle.addEventListener('click', () => {
    active = !active;
    (controlParams as unknown as Record<string, boolean>)[paramKey] = active;
    toggle.textContent = active ? '开启' : '关闭';
    toggle.style.background = active ? '#00FFCC' : '#3A3A4E';
    toggle.style.color = active ? '#1B1B2F' : '#ffffff';
  });
  toggle.addEventListener('mouseenter', () => {
    if (!active) toggle.style.background = '#5A5A6E';
  });
  toggle.addEventListener('mouseleave', () => {
    if (!active) toggle.style.background = '#3A3A4E';
  });

  container.appendChild(labelEl);
  container.appendChild(toggle);
  return container;
}

function createSliderControl(
  label: string,
  paramKey: keyof ControlParams,
  initialValue: number,
  min: number,
  max: number,
  step: number
): HTMLElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    background: '#0F0F1F',
    borderRadius: '6px',
    padding: '8px 12px',
    minWidth: isMobile() ? '180px' : 'auto'
  } as CSSStyleDeclaration);

  const labelRow = document.createElement('div');
  labelRow.style.display = 'flex';
  labelRow.style.justifyContent = 'space-between';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.textContent = initialValue.toFixed(2);
  valueEl.style.color = '#00FFCC';
  valueEl.style.fontWeight = 'bold';

  labelRow.appendChild(labelEl);
  labelRow.appendChild(valueEl);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initialValue);
  Object.assign(slider.style, {
    width: '100%',
    accentColor: '#00FFCC'
  } as CSSStyleDeclaration);

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    (controlParams as unknown as Record<string, number>)[paramKey] = val;
    valueEl.textContent = val.toFixed(2);
  });

  container.appendChild(labelRow);
  container.appendChild(slider);
  return container;
}

function isMobile(): boolean {
  return window.innerWidth < 900;
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const { gridX, gridY, inside } = screenToGrid(renderConfig, mouseX, mouseY);

  if (!inside) {
    updateTooltip(tooltip, false, 0, 0, '');
    return;
  }

  const person = findPersonAt(people, gridX, gridY);
  if (person) {
    const content = `状态: ${getStatusLabel(person.status)} | 位置: (${gridX}, ${gridY})`;
    updateTooltip(tooltip, true, e.clientX, e.clientY, content);
  } else {
    updateTooltip(tooltip, false, 0, 0, '');
  }
}

function mainLoop(currentTime: number): void {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  accumulatedTime += deltaTime * speedMultiplier;
  const daysPerSecond = BASE_DAYS_PER_SECOND;
  const daysToProcess = Math.floor(accumulatedTime * daysPerSecond);

  if (daysToProcess > 0) {
    for (let i = 0; i < daysToProcess; i++) {
      currentDay++;
      stats = updateDay(people, gridSize, currentDay, controlParams);
      sirData.push({
        day: currentDay,
        susceptible: stats.susceptible,
        infected: stats.infected,
        recovered: stats.recovered
      });
      if (sirData.length > 500) {
        sirData.shift();
      }
    }
    accumulatedTime -= daysToProcess / daysPerSecond;
    updateStatsDisplay();
  }

  render();
  requestAnimationFrame(mainLoop);
}

function updateStatsDisplay(): void {
  if (statInfectedEl) {
    statInfectedEl.textContent = String(stats.totalInfected);
  }
  if (statRecoveredEl) {
    statRecoveredEl.textContent = String(stats.totalRecovered);
  }
  if (currentDayEl) {
    currentDayEl.textContent = `第 ${currentDay} 天`;
  }
}

function render(): void {
  clearCanvas(renderConfig);
  drawGrid(renderConfig);
  drawPeople(renderConfig, people);

  const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
  if (chartCanvas) {
    const chartCtx = chartCanvas.getContext('2d');
    if (chartCtx) {
      const dpr = window.devicePixelRatio || 1;
      const rect = chartCanvas.getBoundingClientRect();
      chartCanvas.width = rect.width * dpr;
      chartCanvas.height = rect.height * dpr;
      chartCtx.scale(dpr, dpr);
      chartCtx.clearRect(0, 0, rect.width, rect.height);
      drawSIRChart(chartCtx, sirData, {
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
