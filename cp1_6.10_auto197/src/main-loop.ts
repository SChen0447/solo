import { initCanvas, getCanvasInfo, onResize } from './canvas-setup';
import {
  type Chime,
  type Shape,
  createChimes,
  resetChimes,
  startRearrange,
  updateChimes,
  drawChimes,
  findChimeAtPoint,
  isPointInHoverRange
} from './wind-chime';
import {
  type SoundWave,
  createWaveFromChime,
  createRipple,
  addWave,
  updateWaves,
  drawWaves,
  playNote
} from './sound-wave';

interface HistoryItem {
  shape: Shape;
  color: string;
  timestamp: number;
}

let chimes: Chime[] = [];
let soundWaves: SoundWave[] = [];
const history: HistoryItem[] = [];

let mouseX = 0;
let mouseY = 0;
let draggingChime: Chime | null = null;
let dragStartX = 0;
let dragStartY = 0;
let hasMoved = false;
let ctx: CanvasRenderingContext2D | null = null;
let width = 0;
let height = 0;
let lastRippleFrame = 0;
let frameCount = 0;

const shapeSvg: Record<Shape, string> = {
  triangle: '<svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,13 1,13" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  circle: '<svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  hexagon: '<svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 12.5,4 12.5,10 7,13 1.5,10 1.5,4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
};

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function updateHistoryPanel(): void {
  const list = document.getElementById('history-list');
  if (!list) return;

  if (history.length === 0) {
    list.innerHTML = '<div class="empty-hint">点击风铃开始演奏...</div>';
    return;
  }

  list.innerHTML = history.map(item => `
    <div class="history-item">
      ${shapeSvg[item.shape]}
      <span class="color-dot" style="background:${item.color}"></span>
      <span class="time">${formatTime(item.timestamp)}</span>
    </div>
  `).join('');
}

function addHistory(chime: Chime): void {
  history.unshift({
    shape: chime.shape,
    color: chime.color,
    timestamp: Date.now()
  });
  if (history.length > 5) {
    history.splice(5);
  }
  updateHistoryPanel();
}

function drawBackground(): void {
  const gradient = ctx!.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  ctx!.fillStyle = gradient;
  ctx!.fillRect(0, 0, width, height);
}

function updateHoverState(): void {
  for (const chime of chimes) {
    const wasHovered = chime.isHovered;
    chime.isHovered = !draggingChime && isPointInHoverRange(chime, mouseX, mouseY);
    if (!wasHovered && chime.isHovered) {
      chime.hoverRotation = 0;
    }
  }

  const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
  if (canvasEl) {
    if (draggingChime) {
      canvasEl.style.cursor = 'grabbing';
    } else {
      const hovered = chimes.find(c => c.isHovered);
      canvasEl.style.cursor = hovered ? 'pointer' : 'default';
    }
  }
}

function update(): void {
  frameCount++;

  if (draggingChime && frameCount - lastRippleFrame >= 3) {
    const ripple = createRipple(draggingChime);
    if (ripple) addWave(soundWaves, ripple);
    lastRippleFrame = frameCount;
  }

  updateChimes(chimes, width, height);
  updateWaves(soundWaves);
  updateHoverState();
}

function draw(): void {
  drawBackground();
  drawChimes(ctx!, chimes, width, mouseX, mouseY, draggingChime);
  drawWaves(ctx!, soundWaves);
}

function loop(): void {
  update();
  draw();
  requestAnimationFrame(loop);
}

function onMouseMove(e: MouseEvent): void {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  if (draggingChime) {
    const dx = mouseX - dragStartX;
    const dy = mouseY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved = true;
    }
    draggingChime.x = mouseX;
    draggingChime.y = mouseY;
    draggingChime.anchorX = mouseX;
    draggingChime.anchorY = mouseY;
    draggingChime.vx = 0;
    draggingChime.vy = 0;
  }
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const hit = findChimeAtPoint(chimes, x, y, width);
  if (hit) {
    draggingChime = hit;
    draggingChime.isDragging = true;
    dragStartX = x;
    dragStartY = y;
    hasMoved = false;

    const canvasEl = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvasEl) canvasEl.style.cursor = 'grabbing';
  }
}

function onMouseUp(): void {
  if (draggingChime) {
    const released = draggingChime;
    released.isDragging = false;

    if (!hasMoved) {
      const wave = createWaveFromChime(released);
      if (wave) addWave(soundWaves, wave);
      released.glowPulse = 1;
      playNote();
      addHistory(released);
    }

    draggingChime = null;
    hasMoved = false;
  }
}

function onMouseLeave(): void {
  if (draggingChime) {
    draggingChime.isDragging = false;
    draggingChime = null;
  }
  for (const chime of chimes) {
    chime.isHovered = false;
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    startRearrange(chimes, width, height);
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    resetChimes(chimes, width, height);
    soundWaves.length = 0;
  }
}

function handleResize(): void {
  const info = getCanvasInfo();
  width = info.width;
  height = info.height;
}

function init(): void {
  const info = initCanvas('canvas');
  ctx = info.ctx;
  width = info.width;
  height = info.height;

  const chimeCount = Math.floor(12 + Math.random() * 7);
  chimes = createChimes(chimeCount, width, height);

  onResize(handleResize);

  const canvasEl = document.getElementById('canvas');
  if (canvasEl) {
    canvasEl.addEventListener('mousemove', onMouseMove);
    canvasEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvasEl.addEventListener('mouseleave', onMouseLeave);
  }

  window.addEventListener('keydown', onKeyDown);

  requestAnimationFrame(loop);
}

init();
