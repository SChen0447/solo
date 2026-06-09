import {
  Gear,
  generateBackgroundGears,
  drawBackgroundGear,
  BackgroundGearConfig,
  GEAR_PRESETS,
  GearType
} from './gear';
import { InteractionManager } from './interaction';
import { AnimationManager } from './animation';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const DRIVER_ANGULAR_VELOCITY = 1.2;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let gears: Gear[] = [];
let driverGear: Gear;
let targetGear: Gear;
let backgroundGears: BackgroundGearConfig[];
let interactionManager: InteractionManager;
let animationManager: AnimationManager;
let lastTime = 0;
let won = false;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }
  const c = canvas.getContext('2d');
  if (!c) {
    throw new Error('Cannot get 2D context');
  }
  ctx = c;

  backgroundGears = generateBackgroundGears(18, CANVAS_WIDTH, CANVAS_HEIGHT);

  driverGear = new Gear({
    type: 'driver',
    x: 400,
    y: 300,
    radius: 30,
    teeth: 12,
    colorStart: '#8B6508',
    colorEnd: '#DAA520',
    angularVelocity: DRIVER_ANGULAR_VELOCITY,
    isFixed: true
  });
  driverGear.isEngaged = true;

  targetGear = new Gear({
    type: 'target',
    x: 650,
    y: 300,
    radius: 35,
    teeth: 14,
    colorStart: '#5a3a1a',
    colorEnd: '#8a5a2a',
    isFixed: true
  });

  gears = [driverGear, targetGear];

  animationManager = new AnimationManager();
  interactionManager = new InteractionManager(canvas, gears, driverGear, targetGear, 6);

  interactionManager.onEngage = (g1: Gear, g2: Gear): void => {
    animationManager.addFlash(g1, g2, performance.now());
    checkWinCondition();
  };

  interactionManager.onDisengage = (): void => {
    if (won && !interactionManager.isTargetDriven()) {
      won = false;
      animationManager.closeDoor();
    }
    updateStatusUI();
  };

  drawGearPreviews();
  bindToolbarButtons();
  bindGearLibrary();
  updateStatusUI();
  updateGearCountUI();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function drawGearPreviews(): void {
  const types: Array<Exclude<GearType, 'driver' | 'target'>> = ['small', 'medium', 'large'];
  for (const type of types) {
    const preview = document.querySelector(
      `.gear-preview[data-type="${type}"]`
    ) as HTMLCanvasElement | null;
    if (!preview) continue;
    const pctx = preview.getContext('2d');
    if (!pctx) continue;
    const preset = GEAR_PRESETS[type];
    const previewGear = new Gear({
      type,
      x: preview.width / 2,
      y: preview.height / 2,
      ...preset
    });
    previewGear.rotation = -Math.PI / 2;
    pctx.clearRect(0, 0, preview.width, preview.height);
    previewGear.draw(pctx);
  }
}

function bindToolbarButtons(): void {
  const resetBtn = document.getElementById('reset-btn');
  const hintBtn = document.getElementById('hint-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', handleReset);
  }
  if (hintBtn) {
    hintBtn.addEventListener('click', handleHint);
  }
}

function bindGearLibrary(): void {
  const slots = document.querySelectorAll('.gear-slot');
  slots.forEach((slot) => {
    const type = slot.getAttribute('data-type') as Exclude<GearType, 'driver' | 'target'>;
    if (!type) return;
    slot.addEventListener('mousedown', (e: Event) => {
      if (!interactionManager.canAddGear()) return;
      const me = e as MouseEvent;
      me.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (me.clientX - rect.left) * scaleX;
      const y = (me.clientY - rect.top) * scaleY;
      interactionManager.createGhostGear(type, x, y);

      const onMove = (moveEvent: MouseEvent): void => {
        const mx = (moveEvent.clientX - rect.left) * scaleX;
        const my = (moveEvent.clientY - rect.top) * scaleY;
        if (interactionManager.ghostGear) {
          interactionManager.ghostGear.x = mx;
          interactionManager.ghostGear.y = my;
        }
      };

      const onUp = (): void => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        interactionManager.releaseGhost(type);
        updateGearCountUI();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

function handleReset(): void {
  won = false;
  interactionManager.reset();
  animationManager.reset();
  updateStatusUI();
  updateGearCountUI();
}

function handleHint(): void {
  animationManager.triggerHint(targetGear, performance.now());
}

function checkWinCondition(): void {
  const chainLength = interactionManager.getChainLengthToTarget();
  const isDriven = interactionManager.isTargetDriven();
  if (isDriven && chainLength >= 3 && !won) {
    won = true;
    animationManager.triggerSteamBurst(targetGear.x, targetGear.y, performance.now());
    setTimeout(() => {
      animationManager.openDoor();
    }, 400);
  }
  updateStatusUI();
  updateGearCountUI();
}

function updateStatusUI(): void {
  const ratioEl = document.getElementById('gear-ratio');
  const statusEl = document.getElementById('target-status');
  if (ratioEl) {
    const ratio = interactionManager.getGearRatio();
    ratioEl.textContent = ratio > 0 ? ratio.toFixed(2) : '--';
  }
  if (statusEl) {
    const isDriven = interactionManager.isTargetDriven();
    const chainLength = interactionManager.getChainLengthToTarget();
    const reached = isDriven && chainLength >= 3;
    statusEl.textContent = reached ? '✓' : '✗';
    statusEl.className = 'status-value ' + (reached ? 'success' : 'fail');
  }
}

function updateGearCountUI(): void {
  const countEl = document.getElementById('gear-count');
  if (countEl) {
    countEl.textContent = String(interactionManager.getGearCount());
  }
  const slots = document.querySelectorAll('.gear-slot');
  const canAdd = interactionManager.canAddGear();
  slots.forEach((slot) => {
    if (canAdd) {
      slot.classList.remove('disabled');
    } else {
      slot.classList.add('disabled');
    }
  });
}

function drawTargetChain(ctx: CanvasRenderingContext2D): void {
  if (!targetGear.isEngaged) {
    const cx = targetGear.x;
    const cy = targetGear.y;
    const r = targetGear.radius;
    ctx.save();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    const links = 8;
    for (let i = 0; i < links; i++) {
      const angle = (i / links) * Math.PI * 2;
      const lx = cx + Math.cos(angle) * (r + 6);
      const ly = cy + Math.sin(angle) * (r + 6);
      ctx.beginPath();
      ctx.ellipse(lx, ly, 4, 2.5, angle, 0, Math.PI * 2);
      ctx.fillStyle = '#5a5a5a';
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#8a8a8a';
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('🔒', cx, cy);
    ctx.restore();
  } else {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      targetGear.x, targetGear.y, targetGear.radius * 0.2,
      targetGear.x, targetGear.y, targetGear.radius * 1.5
    );
    gradient.addColorStop(0, 'rgba(255,140,0,0.3)');
    gradient.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(targetGear.x, targetGear.y, targetGear.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function render(now: number): void {
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const bg of backgroundGears) {
    drawBackgroundGear(ctx, bg);
  }

  const vignette = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.2,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.7
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const gear of gears) {
    if (gear === targetGear) continue;
    if (gear === interactionManager.draggingGear) continue;
    gear.draw(ctx);
  }

  targetGear.draw(ctx);
  drawTargetChain(ctx);

  if (interactionManager.draggingGear) {
    interactionManager.draggingGear.draw(ctx, 0.55);
  }

  if (interactionManager.ghostGear) {
    interactionManager.ghostGear.draw(ctx, 0.45);
  }

  animationManager.draw(ctx, now);
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  for (const gear of gears) {
    gear.update(dt);
  }
  if (interactionManager.ghostGear) {
    interactionManager.ghostGear.update(dt);
  }
  animationManager.update(dt, timestamp);

  if (interactionManager.draggingGear == null) {
    interactionManager.tryEngageDependents();
  }

  render(timestamp);

  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
