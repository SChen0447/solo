import { Grid } from './grid';
import { FragmentData, createFragments, hitTest, startDrag, endDrag, drawFragment } from './fragment';
import { Scene } from './scene';
import { rand, dist } from './utils';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const loadingEl = document.getElementById('loading')!;

let W = 0;
let H = 0;
let isMobile = false;
let grid: Grid;
let fragments: FragmentData[] = [];
let scene: Scene;
let dragTarget: FragmentData | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let completed = false;
let completionDrawn = false;
let sourceCanvas: HTMLCanvasElement;
let resetFlashTime = 0;
let lastHoverTime = 0;
let lastMoveX = 0;
let lastMoveY = 0;

let listenBtnHover = false;
let resetBtnHover = false;

const LISTEN_BTN_W = 160;
const LISTEN_BTN_H = 44;
const RESET_BTN_R = 15;

function getListenBtnRect() {
  return { x: W / 2 - LISTEN_BTN_W / 2, y: H - LISTEN_BTN_H - 24 };
}

function getResetBtnPos() {
  return { x: W - 40, y: 40 };
}

function resize(): void {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
  isMobile = W < 800;

  if (grid) {
    grid.rebuild(W, H, isMobile);
  }
}

function generateSourceImage(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const imgW = 390;
  const imgH = 270;
  c.width = imgW;
  c.height = imgH;
  const g = c.getContext('2d')!;

  const skyGrad = g.createLinearGradient(0, 0, 0, imgH * 0.55);
  skyGrad.addColorStop(0, '#1a0a3e');
  skyGrad.addColorStop(0.3, '#3d1566');
  skyGrad.addColorStop(0.6, '#c44e2e');
  skyGrad.addColorStop(0.85, '#e8873c');
  skyGrad.addColorStop(1, '#f5c266');
  g.fillStyle = skyGrad;
  g.fillRect(0, 0, imgW, imgH * 0.55);

  g.beginPath();
  g.moveTo(0, imgH * 0.35);
  g.lineTo(imgW * 0.1, imgH * 0.28);
  g.lineTo(imgW * 0.2, imgH * 0.32);
  g.lineTo(imgW * 0.35, imgH * 0.18);
  g.lineTo(imgW * 0.5, imgH * 0.30);
  g.lineTo(imgW * 0.6, imgH * 0.22);
  g.lineTo(imgW * 0.75, imgH * 0.35);
  g.lineTo(imgW * 0.9, imgH * 0.25);
  g.lineTo(imgW, imgH * 0.32);
  g.lineTo(imgW, imgH * 0.55);
  g.lineTo(0, imgH * 0.55);
  g.closePath();
  const mtGrad = g.createLinearGradient(0, imgH * 0.18, 0, imgH * 0.55);
  mtGrad.addColorStop(0, '#2d1045');
  mtGrad.addColorStop(1, '#4a1a3a');
  g.fillStyle = mtGrad;
  g.fill();

  const sunX = imgW * 0.7;
  const sunY = imgH * 0.4;
  const sunGrad = g.createRadialGradient(sunX, sunY, 5, sunX, sunY, 35);
  sunGrad.addColorStop(0, 'rgba(255,230,120,1)');
  sunGrad.addColorStop(0.5, 'rgba(255,180,60,0.8)');
  sunGrad.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = sunGrad;
  g.beginPath();
  g.arc(sunX, sunY, 35, 0, Math.PI * 2);
  g.fill();

  const seaY = imgH * 0.55;
  const seaGrad = g.createLinearGradient(0, seaY, 0, imgH);
  seaGrad.addColorStop(0, '#c45a20');
  seaGrad.addColorStop(0.2, '#a84020');
  seaGrad.addColorStop(0.5, '#6a2830');
  seaGrad.addColorStop(1, '#2a1030');
  g.fillStyle = seaGrad;
  g.fillRect(0, seaY, imgW, imgH - seaY);

  for (let i = 0; i < 30; i++) {
    const wy = seaY + rand(5, imgH - seaY - 5);
    const wx = rand(0, imgW);
    const ww = rand(15, 50);
    g.strokeStyle = `rgba(255,${180 + Math.floor(rand(0, 60))},${80 + Math.floor(rand(0, 80))},${rand(0.1, 0.35)})`;
    g.lineWidth = rand(0.5, 1.5);
    g.beginPath();
    g.moveTo(wx, wy);
    g.lineTo(wx + ww, wy + rand(-1, 1));
    g.stroke();
  }

  const reflGrad = g.createLinearGradient(sunX - 20, seaY, sunX + 20, imgH);
  reflGrad.addColorStop(0, 'rgba(255,200,80,0.4)');
  reflGrad.addColorStop(1, 'rgba(255,150,50,0)');
  g.fillStyle = reflGrad;
  g.fillRect(sunX - 25, seaY, 50, imgH - seaY);

  return c;
}

function playSnapSound(): void {
  try {
    const ac = new AudioContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.1);
  } catch (e) { /* ignore */ }
}

function init(): void {
  resize();
  sourceCanvas = generateSourceImage();
  grid = new Grid(W, H, isMobile);
  scene = new Scene();
  fragments = createFragments(sourceCanvas, W, H, grid.config.rows, grid.config.cols);
  completed = false;
  completionDrawn = false;

  window.addEventListener('resize', () => {
    resize();
  });

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  setTimeout(() => {
    loadingEl.classList.add('fade-out');
    setTimeout(() => {
      loadingEl.style.display = 'none';
    }, 800);
  }, 800);

  requestAnimationFrame(loop);
}

function onMouseDown(e: MouseEvent): void {
  const mx = e.clientX;
  const my = e.clientY;
  handlePointerDown(mx, my);
}

function onMouseMove(e: MouseEvent): void {
  const mx = e.clientX;
  const my = e.clientY;
  handlePointerMove(mx, my);
}

function onMouseUp(e: MouseEvent): void {
  const mx = e.clientX;
  const my = e.clientY;
  handlePointerUp(mx, my);
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length > 0) {
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}

function onTouchEnd(e: TouchEvent): void {
  handlePointerUp(lastMoveX, lastMoveY);
}

function handlePointerDown(mx: number, my: number): void {
  const resetPos = getResetBtnPos();
  if (dist(mx, my, resetPos.x, resetPos.y) < RESET_BTN_R + 5) {
    handleReset();
    return;
  }

  if (completed) {
    const btnRect = getListenBtnRect();
    if (mx >= btnRect.x && mx <= btnRect.x + LISTEN_BTN_W &&
        my >= btnRect.y && my <= btnRect.y + LISTEN_BTN_H) {
      scene.toggleListen(performance.now());
      return;
    }
    return;
  }

  for (let i = fragments.length - 1; i >= 0; i--) {
    const f = fragments[i];
    if (f.snapped) continue;
    if (f.anim && !f.anim.done) continue;
    if (hitTest(f, mx, my)) {
      dragTarget = f;
      dragOffsetX = mx - f.x;
      dragOffsetY = my - f.y;
      startDrag(f);
      fragments.splice(i, 1);
      fragments.push(f);
      break;
    }
  }
}

function handlePointerMove(mx: number, my: number): void {
  lastMoveX = mx;
  lastMoveY = my;

  const resetPos = getResetBtnPos();
  resetBtnHover = dist(mx, my, resetPos.x, resetPos.y) < RESET_BTN_R + 5;

  if (completed) {
    const btnRect = getListenBtnRect();
    listenBtnHover = mx >= btnRect.x && mx <= btnRect.x + LISTEN_BTN_W &&
                     my >= btnRect.y && my <= btnRect.y + LISTEN_BTN_H;

    scene.mouseOnSea = scene.isMouseOnSea(mx, my);
    scene.mouseOnSky = scene.isMouseOnSky(mx, my);

    const now = performance.now();
    if (now - lastHoverTime > 100) {
      scene.addHoverGlow(mx, my, now);
      lastHoverTime = now;
    }
    return;
  }

  if (dragTarget) {
    dragTarget.x = mx - dragOffsetX;
    dragTarget.y = my - dragOffsetY;
  }
}

function handlePointerUp(mx: number, my: number): void {
  if (!dragTarget) return;
  endDrag(dragTarget);

  const nearest = grid.findNearestSlot(dragTarget.x, dragTarget.y, dragTarget.targetSlot);
  if (nearest) {
    const now = performance.now();
    dragTarget.anim = grid.createSnapAnim(
      dragTarget.x, dragTarget.y, dragTarget.rot,
      nearest.index, now
    );
    dragTarget.snapped = true;
    dragTarget.slotIndex = nearest.index;
    grid.occupySlot(nearest.index, fragments.indexOf(dragTarget));
    playSnapSound();

    if (grid.isComplete() && !completed) {
      completed = true;
      scene.triggerCompletion(performance.now(), W, H);
    }
  }

  dragTarget = null;
}

function handleReset(): void {
  resetFlashTime = performance.now();

  if (completed) {
    scene.reset();
  }

  completed = false;
  completionDrawn = false;
  grid.freeAll();

  const snappedFragments: { x: number; y: number; rot: number; slotIndex: number }[] = [];
  for (const f of fragments) {
    if (f.snapped && f.slotIndex >= 0) {
      snappedFragments.push({ x: f.x, y: f.y, rot: f.rot, slotIndex: f.slotIndex });
    }
    f.snapped = false;
    f.slotIndex = -1;
    f.anim = null;
    f.dragging = false;
    f.opacity = 1;
  }

  const now = performance.now();
  const ejectAnims = grid.createEjectAnims(snappedFragments, now, W, H);
  let ai = 0;
  for (const f of fragments) {
    if (ai < ejectAnims.length && snappedFragments.some(sf => sf.x === f.x && sf.y === f.y)) {
      f.ejectAnim = ejectAnims[ai++];
    }
  }
}

function drawListenButton(ctx: CanvasRenderingContext2D, now: number): void {
  if (!completed) return;
  const btn = getListenBtnRect();
  const pulse = listenBtnHover ? 1 + 0.05 * Math.sin(now / 500 * Math.PI) : 1;

  ctx.save();
  ctx.translate(btn.x + LISTEN_BTN_W / 2, btn.y + LISTEN_BTN_H / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-LISTEN_BTN_W / 2, -LISTEN_BTN_H / 2);

  ctx.fillStyle = listenBtnHover ? '#c4a050' : '#a08040';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  const r = 6;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(LISTEN_BTN_W - r, 0);
  ctx.quadraticCurveTo(LISTEN_BTN_W, 0, LISTEN_BTN_W, r);
  ctx.lineTo(LISTEN_BTN_W, LISTEN_BTN_H - r);
  ctx.quadraticCurveTo(LISTEN_BTN_W, LISTEN_BTN_H, LISTEN_BTN_W - r, LISTEN_BTN_H);
  ctx.lineTo(r, LISTEN_BTN_H);
  ctx.quadraticCurveTo(0, LISTEN_BTN_H, 0, LISTEN_BTN_H - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.strokeStyle = 'rgba(200,180,120,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f5e6c8';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(scene.listening ? '停止回忆' : '倾听回忆', LISTEN_BTN_W / 2, LISTEN_BTN_H / 2 + 1);

  ctx.restore();
}

function drawResetButton(ctx: CanvasRenderingContext2D, now: number): void {
  const pos = getResetBtnPos();

  ctx.save();
  ctx.globalAlpha = 0.6;

  ctx.fillStyle = resetBtnHover ? 'rgba(80,60,40,0.9)' : 'rgba(50,35,20,0.7)';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, RESET_BTN_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(180,160,120,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#c4a87a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, RESET_BTN_R * 0.55, -Math.PI * 0.8, Math.PI * 0.6);
  ctx.stroke();

  const angle = Math.PI * 0.6;
  const ax = pos.x + Math.cos(angle) * RESET_BTN_R * 0.55;
  const ay = pos.y + Math.sin(angle) * RESET_BTN_R * 0.55;
  ctx.beginPath();
  ctx.moveTo(ax - 4, ay - 4);
  ctx.lineTo(ax, ay + 2);
  ctx.lineTo(ax + 4, ay - 2);
  ctx.stroke();

  ctx.restore();
}

function drawCompletedImage(ctx: CanvasRenderingContext2D, now: number): void {
  if (!completed) return;

  const elapsed = now - scene.completionTime;
  const fadeIn = Math.min(1, elapsed / 1500);

  const totalW = grid.config.cols * 130 + (grid.config.cols - 1) * 8;
  const totalH = grid.config.rows * 90 + (grid.config.rows - 1) * 8;
  const offsetX = grid.config.startX;
  const offsetY = grid.config.startY;

  ctx.save();
  ctx.globalAlpha = fadeIn;

  ctx.drawImage(
    sourceCanvas,
    0, 0, sourceCanvas.width, sourceCanvas.height,
    offsetX, offsetY, totalW, totalH
  );

  ctx.restore();
}

function loop(timestamp: number): void {
  requestAnimationFrame(loop);
  const now = performance.now();

  ctx.clearRect(0, 0, W, H);

  scene.drawBackground(ctx, W, H, now);

  if (!completed) {
    grid.draw(ctx, completed);

    for (const f of fragments) {
      drawFragment(ctx, f, now);
    }
  } else {
    scene.update(now, W, H);

    drawCompletedImage(ctx, now);

    scene.drawCompletionGlow(ctx, W, H, now);
    scene.drawParticles(ctx);
    scene.drawClouds(ctx);
    scene.drawHoverGlows(ctx, now);
    scene.drawEdgeGlow(ctx, W, H);
  }

  drawListenButton(ctx, now);
  drawResetButton(ctx, now);

  if (resetFlashTime > 0) {
    const flashElapsed = now - resetFlashTime;
    if (flashElapsed < 150) {
      ctx.save();
      ctx.globalAlpha = 0.3 * (1 - flashElapsed / 150);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    } else {
      resetFlashTime = 0;
    }
  }

  if (completed && !completionDrawn) {
    completionDrawn = true;
  }
}

init();
