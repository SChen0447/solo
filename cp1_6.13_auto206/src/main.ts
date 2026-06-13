import { Feather, FloatMode, PALETTE } from './feather';
import { Renderer } from './renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const state = renderer.getState();

let prevTime = performance.now();
let isDragging = false;
let dragMoved = false;
let draggedFeathers: Feather[] = [];
let globalScale = 1;
let pendingMerges: Map<number, number> = new Map();

function init(): void {
  renderer.resize();
  window.addEventListener('resize', onResize);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('mouseenter', onMouseEnter);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('click', onCanvasClick);
  window.addEventListener('keydown', onKeyDown);
  canvas.style.cursor = 'none';
  requestAnimationFrame(loop);
}

function onResize(): void {
  const oldW = renderer.getWidth();
  const oldH = renderer.getHeight();
  renderer.resize();
  const newW = renderer.getWidth();
  const newH = renderer.getHeight();
  if (oldW === 0 || oldH === 0) return;
  const scaleX = newW / oldW;
  const scaleY = newH / oldH;
  for (const f of state.feathers) {
    f.x *= scaleX;
    f.y *= scaleY;
  }
}

function getCanvasPos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function isPanelIconClick(pos: { x: number; y: number }): boolean {
  const iconX = renderer.getWidth() - 30;
  const iconY = renderer.getHeight() - 30;
  return Math.sqrt((pos.x - iconX) ** 2 + (pos.y - iconY) ** 2) < 22;
}

function onCanvasClick(e: MouseEvent): void {
  const pos = getCanvasPos(e);
  if (isPanelIconClick(pos)) {
    renderer.togglePanel();
    return;
  }
  if (isDragging || dragMoved) return;
  const feather = new Feather(pos.x, pos.y);
  state.feathers.push(feather);
  state.featherCount = state.feathers.length;
  renderer.addSparkles(pos.x, pos.y, feather.baseColor, Math.floor(Math.random() * 6 + 10));
  renderer.addHistory(`点击生成羽毛(x:${Math.round(pos.x)},y:${Math.round(pos.y)})`);
}

let mouseDownPos = { x: 0, y: 0 };

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  const pos = getCanvasPos(e);
  mouseDownPos = pos;
  isDragging = false;
  dragMoved = false;
  draggedFeathers = [];
  for (const f of state.feathers) {
    if (f.distanceTo(pos.x, pos.y) < 80) {
      f.isDragging = true;
      draggedFeathers.push(f);
    }
  }
}

function onMouseMove(e: MouseEvent): void {
  const pos = getCanvasPos(e);
  state.mouseX = pos.x;
  state.mouseY = pos.y;

  const dx = pos.x - mouseDownPos.x;
  const dy = pos.y - mouseDownPos.y;
  if (draggedFeathers.length > 0 && Math.sqrt(dx * dx + dy * dy) > 5) {
    isDragging = true;
    dragMoved = true;
  }

  if (isDragging && draggedFeathers.length > 0) {
    for (const f of draggedFeathers) {
      const fdx = pos.x - f.x;
      const fdy = pos.y - f.y;
      f.x += fdx * 0.3;
      f.y += fdy * 0.3;
      renderer.addTrail(f.x, f.y, f.baseColor);
    }
  } else {
    for (const f of state.feathers) {
      if (f.isDragging) continue;
      const dist = f.distanceTo(pos.x, pos.y);
      if (dist < 80) {
        const adx = pos.x - f.x;
        const ady = pos.y - f.y;
        const targetAngle = Math.atan2(ady, adx);
        let angleDiff = targetAngle - f.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        f.targetAngle = f.angle + Math.max(-0.52, Math.min(0.52, angleDiff));
        f.glowIntensity = Math.min(1.2, f.glowIntensity + 0.02);
      } else {
        f.targetAngle = f.angle * 0.95;
        f.glowIntensity = Math.max(1, f.glowIntensity - 0.01);
      }
    }
  }
}

function onMouseUp(): void {
  for (const f of draggedFeathers) {
    f.isDragging = false;
  }
  draggedFeathers = [];
  setTimeout(() => {
    isDragging = false;
    dragMoved = false;
  }, 50);
}

function onMouseLeave(): void {
  state.mouseOnCanvas = false;
  for (const f of draggedFeathers) {
    f.isDragging = false;
  }
  draggedFeathers = [];
  isDragging = false;
  dragMoved = false;
}

function onMouseEnter(): void {
  state.mouseOnCanvas = true;
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  globalScale = Math.max(0.5, Math.min(2.5, globalScale + delta));

  const canvasW = renderer.getWidth();
  const canvasH = renderer.getHeight();
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  for (const f of state.feathers) {
    const relX = (f.x - cx) / f.scale;
    const relY = (f.y - cy) / f.scale;
    f.scale = globalScale;
    f.x = cx + relX * globalScale;
    f.y = cy + relY * globalScale;
  }
  renderer.addHistory(`缩放羽毛(${globalScale.toFixed(1)}x)`);
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    state.mode = ((state.mode % 3) + 1) as FloatMode;
    for (const f of state.feathers) {
      f.scatterStart = 0;
      f.orbitAngle = Math.random() * Math.PI * 2;
    }
    const modeNames: Record<FloatMode, string> = {
      [FloatMode.Drift]: '飘动模式一',
      [FloatMode.Gather]: '飘动模式二',
      [FloatMode.Scatter]: '飘动模式三',
    };
    renderer.addHistory(`模式切换→${modeNames[state.mode]}`);
    renderer.addSparkles(renderer.getWidth() / 2, renderer.getHeight() / 2, PALETTE[Math.floor(Math.random() * PALETTE.length)], 12);
  }

  if (e.code === 'KeyC') {
    state.feathers = [];
    state.featherCount = 0;
    draggedFeathers = [];
    pendingMerges.clear();
    renderer.addHistory('清空画布');
  }
}

function checkMerges(time: number): void {
  const toRemove = new Set<number>();
  const toAdd: Feather[] = [];

  for (let i = 0; i < state.feathers.length; i++) {
    if (toRemove.has(state.feathers[i].id)) continue;
    if (state.feathers[i].mergedInfo) continue;

    for (let j = i + 1; j < state.feathers.length; j++) {
      if (toRemove.has(state.feathers[j].id)) continue;
      if (state.feathers[j].mergedInfo) continue;
      if (pendingMerges.has(state.feathers[i].id) || pendingMerges.has(state.feathers[j].id)) continue;

      const result = Feather.checkFusion(state.feathers[i], state.feathers[j]);
      if (result === 'merge') {
        const merged = Feather.merge(state.feathers[i], state.feathers[j], time);
        toRemove.add(state.feathers[i].id);
        toRemove.add(state.feathers[j].id);
        toAdd.push(merged);
        pendingMerges.set(merged.id, time);
        renderer.addHistory('羽毛合并');
        renderer.addSparkles(merged.x, merged.y, merged.baseColor, 10);
        break;
      }
    }
  }

  if (toRemove.size > 0) {
    state.feathers = state.feathers.filter(f => !toRemove.has(f.id));
    state.feathers.push(...toAdd);
    state.featherCount = state.feathers.length;
  }

  const mergeTimeout = 6000;
  for (const [id, startTime] of pendingMerges) {
    if (time - startTime > mergeTimeout) {
      pendingMerges.delete(id);
    }
  }
}

function checkSplits(time: number): void {
  const toSplit: Feather[] = [];
  const toRemove: number[] = [];

  for (const f of state.feathers) {
    if (f.mergedInfo && time > f.mergedInfo.splitAt) {
      toSplit.push(f);
      toRemove.push(f.id);
    }
  }

  for (const f of toSplit) {
    const f1 = new Feather(f.x - 15, f.y);
    const f2 = new Feather(f.x + 15, f.y);
    state.feathers.push(f1, f2);
    renderer.addSparkles(f.x, f.y, f.baseColor, 8);
    renderer.addHistory('羽毛分裂');
  }

  if (toRemove.length > 0) {
    state.feathers = state.feathers.filter(f => !toRemove.includes(f.id));
    state.featherCount = state.feathers.length;
  }
}

function loop(now: number): void {
  const dt = Math.min(now - prevTime, 50);
  prevTime = now;

  const canvasW = renderer.getWidth();
  const canvasH = renderer.getHeight();

  for (const f of state.feathers) {
    f.update(now, dt, state.mode, state.mouseX, state.mouseY, canvasW, canvasH);
  }

  checkMerges(now);
  checkSplits(now);

  state.featherCount = state.feathers.length;

  renderer.render(now, dt);

  requestAnimationFrame(loop);
}

init();
