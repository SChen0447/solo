import { GLAZE_RECIPES, GlazeRecipe, CurvePoint } from './glaze';

export interface UICallbacks {
  onGlazeDragStart: (recipe: GlazeRecipe, e: DragEvent) => void;
  onFireKiln: () => void;
  onReductionChange: (value: number) => void;
  onCurveChange: (points: CurvePoint[]) => void;
}

const CHART_PADDING = { top: 10, right: 20, bottom: 25, left: 40 };
const MAX_TIME = 12;
const MAX_TEMP = 1300;
const HANDLE_RADIUS = 6;

let curvePoints: CurvePoint[] = [];
let draggingPointIndex = -1;
let callbacks: UICallbacks | null = null;
let chartCanvas: HTMLCanvasElement | null = null;
let chartCtx: CanvasRenderingContext2D | null = null;

export function initUI(cb: UICallbacks): void {
  callbacks = cb;
  setupGlazeList();
  setupReductionSlider();
  setupChart();
  setupFireButton();
}

function setupGlazeList(): void {
  const list = document.getElementById('glaze-list');
  if (!list) return;

  GLAZE_RECIPES.forEach((recipe) => {
    const card = document.createElement('div');
    card.className = 'glaze-card';
    card.draggable = true;
    card.dataset.recipeId = recipe.id;

    const colorBox = document.createElement('div');
    colorBox.className = 'glaze-color';
    colorBox.style.background = recipe.initialColor;

    const nameLabel = document.createElement('div');
    nameLabel.className = 'glaze-name';
    nameLabel.textContent = recipe.name;

    card.appendChild(colorBox);
    card.appendChild(nameLabel);

    card.addEventListener('dragstart', (e) => {
      if (!callbacks) return;
      e.dataTransfer?.setData('text/plain', recipe.id);
      callbacks.onGlazeDragStart(recipe, e);
    });

    list.appendChild(card);
  });
}

function setupReductionSlider(): void {
  const slider = document.getElementById('reduction-slider') as HTMLInputElement | null;
  const valueLabel = document.getElementById('reduction-value');
  const container = document.getElementById('reduction-container');
  if (!slider || !valueLabel || !container) return;

  const updateGlow = (value: number) => {
    const t = value / 100;
    const r1 = 255, g1 = 140, b1 = 0;
    const r2 = 112, g2 = 128, b2 = 144;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    container.style.setProperty('--glow-color', `rgb(${r},${g},${b})`);
    const pseudo = container.querySelector('::before');
    if (pseudo) {
      (pseudo as HTMLElement).style.background = `rgb(${r},${g},${b})`;
    }
    container.style.setProperty('background', `rgba(${r},${g},${b},0.08)`);
  };

  slider.addEventListener('input', () => {
    const value = parseInt(slider.value, 10);
    valueLabel.textContent = `${value}%`;
    updateGlow(value);
    if (callbacks) callbacks.onReductionChange(value);
  });

  updateGlow(parseInt(slider.value, 10));
}

function setupChart(): void {
  chartCanvas = document.getElementById('temperature-chart') as HTMLCanvasElement | null;
  if (!chartCanvas) return;

  chartCtx = chartCanvas.getContext('2d');
  if (!chartCtx) return;

  const defaultHeatRate = 150;
  const holdHours = 2;
  const coolRate = 120;
  const peakTemp = Math.min(1300, defaultHeatRate * 6);
  const heatHours = peakTemp / defaultHeatRate;
  const coolStart = heatHours + holdHours;
  const coolEnd = Math.min(MAX_TIME, coolStart + peakTemp / coolRate);

  curvePoints = [
    { time: 0, temperature: 20 },
    { time: heatHours, temperature: peakTemp },
    { time: coolStart, temperature: peakTemp },
    { time: coolEnd, temperature: 200 }
  ];

  drawChart();

  let isDragging = false;
  let hoverIndex = -1;

  const getChartCoords = (e: MouseEvent) => {
    const rect = chartCanvas!.getBoundingClientRect();
    const x = e.clientX - rect.left - CHART_PADDING.left;
    const y = e.clientY - rect.top - CHART_PADDING.top;
    const chartW = chartCanvas!.width - CHART_PADDING.left - CHART_PADDING.right;
    const chartH = chartCanvas!.height - CHART_PADDING.top - CHART_PADDING.bottom;
    return {
      time: (x / chartW) * MAX_TIME,
      temperature: (1 - y / chartH) * MAX_TEMP,
      x: x + CHART_PADDING.left,
      y: y + CHART_PADDING.top
    };
  };

  const findNearestPoint = (e: MouseEvent) => {
    const coords = getChartCoords(e);
    let nearest = -1;
    let minDist = Infinity;

    curvePoints.forEach((pt, i) => {
      if (i === 0 || i === curvePoints.length - 1) return;
      const { x, y } = pointToPixel(pt);
      const d = Math.sqrt((coords.x - x) ** 2 + (coords.y - y) ** 2);
      if (d < HANDLE_RADIUS + 6 && d < minDist) {
        minDist = d;
        nearest = i;
      }
    });
    return nearest;
  };

  chartCanvas.addEventListener('mousedown', (e) => {
    const idx = findNearestPoint(e);
    if (idx >= 0) {
      isDragging = true;
      draggingPointIndex = idx;
      chartCanvas!.style.cursor = 'grabbing';
    }
  });

  chartCanvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggingPointIndex >= 0) {
      const coords = getChartCoords(e);
      const clampedTime = Math.max(
        curvePoints[draggingPointIndex - 1].time + 0.2,
        Math.min(curvePoints[draggingPointIndex + 1].time - 0.2, coords.time)
      );
      const clampedTemp = Math.max(100, Math.min(MAX_TEMP, coords.temperature));
      curvePoints[draggingPointIndex] = {
        time: clampedTime,
        temperature: clampedTemp
      };
      drawChart();
      if (callbacks) callbacks.onCurveChange([...curvePoints]);
    } else {
      const idx = findNearestPoint(e);
      if (idx !== hoverIndex) {
        hoverIndex = idx;
        chartCanvas!.style.cursor = idx >= 0 ? 'grab' : 'default';
        drawChart(hoverIndex);
      }
    }
  });

  const endDrag = () => {
    if (isDragging) {
      isDragging = false;
      draggingPointIndex = -1;
      chartCanvas!.style.cursor = hoverIndex >= 0 ? 'grab' : 'default';
      drawChart(hoverIndex);
    }
  };

  chartCanvas.addEventListener('mouseup', endDrag);
  chartCanvas.addEventListener('mouseleave', endDrag);
}

function pointToPixel(pt: CurvePoint): { x: number; y: number } {
  const chartW = chartCanvas!.width - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = chartCanvas!.height - CHART_PADDING.top - CHART_PADDING.bottom;
  return {
    x: CHART_PADDING.left + (pt.time / MAX_TIME) * chartW,
    y: CHART_PADDING.top + (1 - pt.temperature / MAX_TEMP) * chartH
  };
}

function drawChart(highlightIndex = -1): void {
  if (!chartCtx || !chartCanvas) return;
  const ctx = chartCtx;
  const w = chartCanvas.width;
  const h = chartCanvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#1A1410';
  ctx.fillRect(0, 0, w, h);

  const chartW = w - CHART_PADDING.left - CHART_PADDING.right;
  const chartH = h - CHART_PADDING.top - CHART_PADDING.bottom;

  ctx.strokeStyle = 'rgba(201, 169, 110, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = CHART_PADDING.top + (i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(CHART_PADDING.left, y);
    ctx.lineTo(w - CHART_PADDING.right, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const x = CHART_PADDING.left + (i / 6) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, CHART_PADDING.top);
    ctx.lineTo(x, h - CHART_PADDING.bottom);
    ctx.stroke();
  }

  ctx.fillStyle = '#C9A96E';
  ctx.font = '10px Georgia, serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const temp = Math.round((1 - i / 5) * MAX_TEMP);
    const y = CHART_PADDING.top + (i / 5) * chartH;
    ctx.fillText(`${temp}°`, CHART_PADDING.left - 5, y + 3);
  }

  ctx.textAlign = 'center';
  for (let i = 0; i <= 6; i++) {
    const time = Math.round((i / 6) * MAX_TIME);
    const x = CHART_PADDING.left + (i / 6) * chartW;
    ctx.fillText(`${time}h`, x, h - CHART_PADDING.bottom + 15);
  }

  const grad = ctx.createLinearGradient(0, CHART_PADDING.top, 0, h - CHART_PADDING.bottom);
  grad.addColorStop(0, '#FF6B35');
  grad.addColorStop(0.5, '#FFD700');
  grad.addColorStop(1, '#8B4513');

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  curvePoints.forEach((pt, i) => {
    const { x, y } = pointToPixel(pt);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  curvePoints.forEach((pt, i) => {
    const { x, y } = pointToPixel(pt);
    const isEndpoint = i === 0 || i === curvePoints.length - 1;
    const isHighlighted = i === highlightIndex || i === draggingPointIndex;
    const radius = isHighlighted ? HANDLE_RADIUS + 2 : HANDLE_RADIUS;

    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(201, 169, 110, 0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (isEndpoint) {
      ctx.fillStyle = '#3A2A1A';
    } else {
      const gradient = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, radius);
      gradient.addColorStop(0, '#C9A96E');
      gradient.addColorStop(1, '#8B6914');
      ctx.fillStyle = gradient;
    }
    ctx.fill();

    if (!isEndpoint) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}

function setupFireButton(): void {
  const btn = document.getElementById('fire-button') as HTMLButtonElement | null;
  if (!btn || !callbacks) return;
  btn.addEventListener('click', () => {
    callbacks!.onFireKiln();
  });
}

export function setFireButtonEnabled(enabled: boolean): void {
  const btn = document.getElementById('fire-button') as HTMLButtonElement | null;
  if (btn) btn.disabled = !enabled;
}

export function getCurvePoints(): CurvePoint[] {
  return [...curvePoints];
}
