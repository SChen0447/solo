import {
  computeTrajectory,
  findKeyPoints,
  calculateScore,
  DEFAULT_PARAMS,
  START_X,
  START_Y,
  GROUND_Y,
  FRAME_COUNT,
  FPS,
  DT,
} from './physics';
import type { JumpParams, TrajectoryPoint, KeyPoints, ScoreResult } from './physics';
import {
  render,
  drawMiniTrajectory,
  isPointInCircle,
} from './renderer';

interface HistoryItem {
  params: JumpParams;
  trajectory: TrajectoryPoint[];
}

interface SliderConfig {
  key: keyof JumpParams;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'gravity', label: '重力系数', min: 0.5, max: 4.0, step: 0.1, default: 2.0 },
  { key: 'vx', label: '水平速度', min: 50, max: 300, step: 10, default: 150 },
  { key: 'vy', label: '垂直初速度', min: -400, max: -100, step: 10, default: -250 },
];

const MAX_HISTORY = 5;

const app = document.getElementById('app')!;
const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let width = 0;
let height = 0;

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let params: JumpParams = { ...DEFAULT_PARAMS };
let trajectory: TrajectoryPoint[] = [];
let keyPoints: KeyPoints = { start: { x: START_X, y: START_Y, vx: 0, vy: 0, frame: 0 }, peak: null, landing: null };
let currentIndex = 0;
let lastTime = 0;
let frameAccumulator = 0;
let animating = true;
let score: ScoreResult | null = null;
let hoveredKey: 'start' | 'peak' | 'landing' | null = null;
let mouseX = 0;
let mouseY = 0;
let history: HistoryItem[] = [];

const uiPanel = createUIPanel();
const historyPanel = createHistoryPanel();

function updateTrajectory() {
  trajectory = computeTrajectory(params);
  keyPoints = findKeyPoints(trajectory);
  currentIndex = 0;
  frameAccumulator = 0;
  score = null;
  animating = true;
}

updateTrajectory();

function createUIPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: #16213e;
    padding: 20px;
    display: flex;
    gap: 30px;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    border-top: 1px solid #0f3460;
    z-index: 10;
  `;
  app.appendChild(panel);

  SLIDER_CONFIGS.forEach((cfg) => {
    const group = document.createElement('div');
    group.style.cssText = 'display: flex; align-items: center; gap: 12px;';

    const label = document.createElement('span');
    label.textContent = cfg.label;
    label.style.cssText = 'color: #ccc; font-size: 14px; min-width: 80px;';
    group.appendChild(label);

    const track = document.createElement('div');
    track.style.cssText = `
      position: relative;
      width: 220px;
      height: 8px;
      background: linear-gradient(to right, #533483, #e94560);
      border-radius: 4px;
      cursor: pointer;
    `;
    group.appendChild(track);

    const thumb = document.createElement('div');
    thumb.style.cssText = `
      position: absolute;
      top: 50%;
      width: 20px;
      height: 20px;
      background: #0f3460;
      border: 2px solid #e94560;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    `;
    track.appendChild(thumb);

    const valueLabel = document.createElement('span');
    valueLabel.style.cssText = 'color: #fff; font-size: 14px; min-width: 60px; font-family: monospace;';
    group.appendChild(valueLabel);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    resetBtn.style.cssText = `
      padding: 5px 12px;
      background: #0f3460;
      color: #fff;
      border: 1px solid #533483;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    resetBtn.addEventListener('mouseenter', () => resetBtn.style.background = '#533483');
    resetBtn.addEventListener('mouseleave', () => resetBtn.style.background = '#0f3460');
    resetBtn.addEventListener('click', () => {
      params[cfg.key] = cfg.default;
      updateSlider();
      updateTrajectory();
    });
    group.appendChild(resetBtn);

    function updateSlider() {
      const val = params[cfg.key];
      const range = cfg.max - cfg.min;
      const pct = (val - cfg.min) / range;
      thumb.style.left = `${pct * 100}%`;
      valueLabel.textContent = val.toString();
    }
    updateSlider();

    let dragging = false;
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const rect = track.getBoundingClientRect();
      let pct = (e.clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      let val = cfg.min + pct * (cfg.max - cfg.min);
      val = Math.round(val / cfg.step) * cfg.step;
      val = Math.max(cfg.min, Math.min(cfg.max, val));
      if (params[cfg.key] !== val) {
        params[cfg.key] = val;
        updateSlider();
        updateTrajectory();
      }
    };
    const onUp = () => { dragging = false; };

    track.addEventListener('mousedown', (e) => {
      dragging = true;
      onMove(e);
    });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    panel.appendChild(group);
  });

  const recordBtn = document.createElement('button');
  recordBtn.textContent = '记录当前曲线';
  recordBtn.style.cssText = `
    padding: 10px 20px;
    background: linear-gradient(to right, #533483, #e94560);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    margin-left: 20px;
  `;
  recordBtn.addEventListener('mouseenter', () => recordBtn.style.opacity = '0.85');
  recordBtn.addEventListener('mouseleave', () => recordBtn.style.opacity = '1');
  recordBtn.addEventListener('click', saveToHistory);
  panel.appendChild(recordBtn);

  return panel;
}

function createHistoryPanel() {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #00000080;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    gap: 10px;
    z-index: 10;
    backdrop-filter: blur(4px);
  `;
  const title = document.createElement('div');
  title.textContent = '历史记录';
  title.style.cssText = 'color: #fff; font-size: 12px; margin-bottom: 8px; position: absolute; top: -22px; left: 0;';
  panel.appendChild(title);
  app.appendChild(panel);
  return panel;
}

function saveToHistory() {
  const item: HistoryItem = {
    params: { ...params },
    trajectory: [...trajectory],
  };
  history.unshift(item);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  renderHistory();
}

function renderHistory() {
  while (historyPanel.children.length > 1) {
    historyPanel.removeChild(historyPanel.lastChild!);
  }

  history.forEach((item, idx) => {
    const card = document.createElement('div');
    card.style.cssText = `
      width: 100px;
      height: 80px;
      background: #16213e;
      border-radius: 8px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transition: transform 0.15s;
      position: relative;
      border: 1px solid #0f3460;
    `;

    const summary = document.createElement('div');
    summary.style.cssText = 'color: #ccc; font-size: 10px; margin-bottom: 4px; text-align: center; line-height: 1.3;';
    summary.textContent = `重力${item.params.gravity}/水平${item.params.vx}/初速${item.params.vy}`;
    card.appendChild(summary);

    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 50;
    miniCanvas.height = 20;
    miniCanvas.style.cssText = 'border-radius: 3px;';
    const miniCtx = miniCanvas.getContext('2d')!;
    drawMiniTrajectory(miniCtx, item.trajectory, 50, 20);
    card.appendChild(miniCanvas);

    const delBtn = document.createElement('div');
    delBtn.textContent = '×';
    delBtn.style.cssText = `
      position: absolute;
      top: 2px;
      right: 6px;
      color: #e74c3c;
      font-size: 18px;
      cursor: pointer;
      display: none;
      font-weight: bold;
    `;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      history.splice(idx, 1);
      renderHistory();
    });
    card.appendChild(delBtn);

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.1)';
      delBtn.style.display = 'block';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'scale(1)';
      delBtn.style.display = 'none';
    });

    card.addEventListener('click', () => {
      params = { ...item.params };
      uiPanel.querySelectorAll('div[style*="display: flex; align-items: center"]').forEach((group, i) => {
        const cfg = SLIDER_CONFIGS[i];
        const track = group.children[1] as HTMLElement;
        const thumb = track.children[0] as HTMLElement;
        const valLabel = group.children[2] as HTMLElement;
        const val = params[cfg.key];
        const pct = (val - cfg.min) / (cfg.max - cfg.min);
        thumb.style.left = `${pct * 100}%`;
        valLabel.textContent = val.toString();
      });
      updateTrajectory();
    });

    historyPanel.appendChild(card);
  });
}

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  hoveredKey = null;

  const keys: Array<'start' | 'peak' | 'landing'> = ['start', 'peak', 'landing'];
  for (const k of keys) {
    const p = keyPoints[k];
    if (p && isPointInCircle(mouseX, mouseY, p.x, p.y, 10)) {
      hoveredKey = k;
      break;
    }
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredKey = null;
});

function tick(now: number) {
  if (!lastTime) lastTime = now;
  const elapsed = (now - lastTime) / 1000;
  lastTime = now;

  if (animating && trajectory.length > 1) {
    frameAccumulator += elapsed * FPS;
    while (frameAccumulator >= 1 && currentIndex < trajectory.length - 1) {
      currentIndex++;
      frameAccumulator -= 1;
    }
    if (currentIndex >= trajectory.length - 1) {
      currentIndex = trajectory.length - 1;
      animating = false;
      score = calculateScore(trajectory);
    }
  }

  const currentPoint = trajectory[Math.min(currentIndex, trajectory.length - 1)] || {
    x: START_X, y: START_Y, vx: 0, vy: 0, frame: 0,
  };

  render(ctx, width, height, {
    trajectory,
    keyPoints,
    currentPoint,
    score,
    hoveredKey,
    mouseX,
    mouseY,
  });

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
