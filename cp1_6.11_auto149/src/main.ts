import { initStarField, updateStarField, setCanvasSize, hitTestCelestialBody, getCelestialBodies } from './starField';
import { generateChartConfig, renderChart, generateProphecy, isChartAnimating, resetChart } from './starChart';
import { initUI, createZodiacRing, showInfoPanel, hideInfoPanel, showProphecy, getDrawChartBtn, updateZodiacRingRotation } from './ui';
import { CelestialBody, Aspect, ASPECT_TYPES } from './types';

const domeCanvas = document.getElementById('dome-canvas') as HTMLCanvasElement;
const trailCanvas = document.getElementById('star-trail-canvas') as HTMLCanvasElement;
const chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;

const domeCtx = domeCanvas.getContext('2d')!;
const trailCtx = trailCanvas.getContext('2d')!;
const chartCtx = chartCanvas.getContext('2d')!;

let rotation = 0;
let scale = 1;
let rotationVelocity = 0;

let isDragging = false;
let dragStartX = 0;
let lastDragX = 0;

let selectedBodies: CelestialBody[] = [];
let currentAspects: Aspect[] = [];
let chartDrawn = false;

let lastTime = 0;

function resize(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  domeCanvas.width = w;
  domeCanvas.height = h;
  trailCanvas.width = w;
  trailCanvas.height = h;
  setCanvasSize(w, h);
  createZodiacRing();
}

function computeAspects(bodies: CelestialBody[]): Aspect[] {
  const aspects: Aspect[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const angleDiff = Math.abs(bodies[i].longitude - bodies[j].longitude);
      for (const at of ASPECT_TYPES) {
        if (Math.abs(angleDiff - at.angle) < 15) {
          aspects.push({
            type: at.type,
            source: bodies[i],
            target: bodies[j],
            color: at.color,
            label: at.label,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  lastDragX = e.clientX;
  rotationVelocity = 0;
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging) return;
  const dx = e.clientX - lastDragX;
  rotationVelocity = dx * 0.005;
  rotation += rotationVelocity;
  lastDragX = e.clientX;

  drawTrailEffect();
}

function onMouseUp(_e: MouseEvent): void {
  isDragging = false;
}

function drawTrailEffect(): void {
  trailCtx.fillStyle = 'rgba(14, 20, 40, 0.15)';
  trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);

  const cx = trailCanvas.width / 2;
  const cy = trailCanvas.height / 2;
  const radius = Math.min(cx, cy) * 0.5;

  trailCtx.beginPath();
  trailCtx.arc(cx, cy, radius, rotation - 0.1, rotation + 0.1);
  trailCtx.strokeStyle = 'rgba(201, 168, 76, 0.1)';
  trailCtx.lineWidth = 2;
  trailCtx.stroke();
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  scale = Math.max(0.5, Math.min(3, scale + delta));
}

function onClick(e: MouseEvent): void {
  if (isDragging) return;

  const body = hitTestCelestialBody(e.clientX, e.clientY, rotation);
  if (body) {
    if (!chartDrawn && !selectedBodies.find(b => b.name === body.name)) {
      selectedBodies.push(body);
    }
    currentAspects = computeAspects(getCelestialBodies());
    showInfoPanel(body, currentAspects);
  } else {
    const target = e.target as HTMLElement;
    if (!target.closest('#info-panel') && !target.closest('#draw-chart-btn') && !target.closest('#prophecy-scroll')) {
      hideInfoPanel();
    }
  }
}

function onDrawChart(): void {
  if (chartDrawn) {
    resetChart();
    chartDrawn = false;
    chartCanvas.style.display = 'none';
    if (prophecyScrollEl) prophecyScrollEl.style.display = 'none';
    const btn = getDrawChartBtn();
    if (btn) btn.textContent = '绘制星盘';
    return;
  }

  if (selectedBodies.length < 2) {
    selectedBodies = [...getCelestialBodies()];
  }

  const config = generateChartConfig(selectedBodies);
  currentAspects = config.aspects;

  chartCanvas.style.display = 'block';
  chartDrawn = true;

  const btn = getDrawChartBtn();
  if (btn) btn.textContent = '重置星盘';

  setTimeout(() => {
    const prophecy = generateProphecy(config);
    showProphecy(prophecy);
  }, 2500);
}

let prophecyScrollEl: HTMLElement | null = null;

function gameLoop(timestamp: number): void {
  const deltaTime = lastTime === 0 ? 16 : timestamp - lastTime;
  lastTime = timestamp;

  if (!isDragging) {
    rotation += rotationVelocity;
    rotationVelocity *= 0.9;
    if (Math.abs(rotationVelocity) < 0.0001) rotationVelocity = 0;
  }

  trailCtx.fillStyle = 'rgba(14, 20, 40, 0.06)';
  trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);

  updateStarField(domeCtx, rotation, scale, timestamp, trailCtx);

  updateZodiacRingRotation(rotation);

  if (chartDrawn) {
    const stillAnimating = renderChart(chartCtx, deltaTime);
    if (stillAnimating) {
      chartCanvas.style.display = 'block';
    }
  }

  requestAnimationFrame(gameLoop);
}

function init(): void {
  initStarField();
  initUI();
  resize();

  prophecyScrollEl = document.getElementById('prophecy-scroll');

  window.addEventListener('resize', resize);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('click', onClick);

  const drawBtn = getDrawChartBtn();
  if (drawBtn) {
    drawBtn.addEventListener('click', onDrawChart);
  }

  requestAnimationFrame(gameLoop);
}

init();
