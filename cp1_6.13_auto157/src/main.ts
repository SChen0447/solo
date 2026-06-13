import { Block, DisplaySize } from './block';
import { ChoreographyManager } from './choreography';
import { UIController } from './ui';

interface RandomFormationAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  targets: Map<number, { startX: number; startY: number; endX: number; endY: number; phase: number; targetColor: string }>;
}

const APP = {
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  blocks: [] as Block[],
  choreoManager: null as ChoreographyManager | null,
  ui: null as UIController | null,
  draggedBlockId: null as number | null,
  randomAnim: null as RandomFormationAnimation | null,
  display: { w: 800, h: 600 },
  rafId: 0 as number,
  lastTrailTime: 0 as number,
};

const BLOCK_SIZE = 32;
const BLOCK_SPACING = 4;
const TRAIL_INTERVAL = 80;

function initBlocks(canvasW: number, canvasH: number, count: number = 10): Block[] {
  const blocks: Block[] = [];
  const totalWidth = count * BLOCK_SIZE + (count - 1) * BLOCK_SPACING;
  const startX = (canvasW - totalWidth) / 2;
  const y = (canvasH - BLOCK_SIZE) / 2;

  for (let i = 0; i < count; i++) {
    const x = startX + i * (BLOCK_SIZE + BLOCK_SPACING);
    const block = new Block(i, x, y);
    block.setSize(BLOCK_SIZE);
    blocks.push(block);
  }
  return blocks;
}

function reinitBlocksForViewport(canvasW: number, canvasH: number): void {
  if (!APP.choreoManager) return;
  const allAnimating = APP.choreoManager.getPlayState() === 'playing';
  if (allAnimating) return;

  const count = APP.blocks.length || 10;
  const newBlocks: Block[] = [];
  const totalWidth = count * BLOCK_SIZE + (count - 1) * BLOCK_SPACING;
  const startX = (canvasW - totalWidth) / 2;
  const y = (canvasH - BLOCK_SIZE) / 2;

  for (let i = 0; i < count; i++) {
    const existing = APP.blocks[i];
    if (existing && !existing.isDragging) {
      const scaleW = canvasW / UIController.CANVAS_W;
      const scaleH = canvasH / UIController.CANVAS_H;
      const newX = Math.round(existing.x * scaleW);
      const newY = Math.round(existing.y * scaleH);
      const block = new Block(i, Math.max(0, Math.min(canvasW - BLOCK_SIZE, newX)), Math.max(0, Math.min(canvasH - BLOCK_SIZE, newY)));
      block.setSize(BLOCK_SIZE);
      block.baseColor = existing.baseColor;
      block.currentColor = existing.currentColor;
      newBlocks.push(block);
    } else if (existing && existing.isDragging) {
      newBlocks.push(existing);
    } else {
      const x = startX + i * (BLOCK_SIZE + BLOCK_SPACING);
      const block = new Block(i, x, y);
      block.setSize(BLOCK_SIZE);
      newBlocks.push(block);
    }
  }
  APP.blocks = newBlocks;
  APP.blocks.forEach((b) => APP.choreoManager!.registerBlock(b));
}

function handlePointerDown(e: PointerEvent): void {
  if (!APP.canvas || !APP.ctx) return;
  const rect = APP.canvas.getBoundingClientRect();
  const scaleX = APP.display.w / rect.width;
  const scaleY = APP.display.h / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if (APP.randomAnim?.active) return;
  if (APP.choreoManager?.getPlayState() === 'playing') return;

  for (let i = APP.blocks.length - 1; i >= 0; i--) {
    const block = APP.blocks[i];
    if (block.containsPoint(x, y)) {
      block.startDrag(x, y);
      APP.draggedBlockId = block.id;
      (APP.canvas as HTMLCanvasElement).setPointerCapture(e.pointerId);
      break;
    }
  }
}

function handlePointerMove(e: PointerEvent): void {
  if (APP.draggedBlockId === null || !APP.canvas) return;
  const rect = APP.canvas.getBoundingClientRect();
  const scaleX = APP.display.w / rect.width;
  const scaleY = APP.display.h / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const block = APP.blocks.find((b) => b.id === APP.draggedBlockId);
  if (block) {
    block.updateDrag(x, y, APP.display.w, APP.display.h);
  }
}

function handlePointerUp(e: PointerEvent): void {
  if (APP.draggedBlockId === null) return;
  const block = APP.blocks.find((b) => b.id === APP.draggedBlockId);
  if (block) {
    block.endDrag();
  }
  APP.draggedBlockId = null;
  if (APP.canvas) {
    try {
      APP.canvas.releasePointerCapture(e.pointerId);
    } catch (_) {
      /* noop */
    }
  }
}

function triggerRandomFormation(): void {
  if (!APP.choreoManager || !APP.ui) return;
  if (APP.choreoManager.getPlayState() === 'playing') return;

  const duration = 500;
  const now = performance.now();
  const targets = new Map<number, { startX: number; startY: number; endX: number; endY: number; phase: number; targetColor: string }>();

  APP.blocks.forEach((block) => {
    const rangeX = APP.display.w - BLOCK_SIZE - 100;
    const rangeY = APP.display.h - BLOCK_SIZE - 100;
    const isSmall = APP.ui?.getIsSmallViewport() ?? false;
    const endX = 50 + Math.random() * (isSmall ? rangeX * 0.85 : 700);
    const endY = 50 + Math.random() * (isSmall ? rangeY * 0.85 : 500);
    const targetColor = Block.randomColor();
    targets.set(block.id, {
      startX: block.x,
      startY: block.y,
      endX: Math.min(APP.display.w - BLOCK_SIZE - 4, Math.max(4, endX)),
      endY: Math.min(APP.display.h - BLOCK_SIZE - 4, Math.max(4, endY)),
      phase: Math.random() * Math.PI * 2,
      targetColor,
    });
  });

  APP.randomAnim = {
    active: true,
    startTime: now,
    duration,
    targets,
  };

  APP.ui.setRandomButtonActive(true);
  setTimeout(() => {
    if (APP.ui) APP.ui.setRandomButtonActive(false);
  }, duration);
}

function updateRandomFormation(now: number): void {
  if (!APP.randomAnim || !APP.randomAnim.active) return;

  const anim = APP.randomAnim;
  const elapsed = now - anim.startTime;
  const progress = Math.min(elapsed / anim.duration, 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  APP.blocks.forEach((block) => {
    const target = anim.targets.get(block.id);
    if (!target) return;

    const baseX = target.startX + (target.endX - target.startX) * eased;
    const baseY = target.startY + (target.endY - target.startY) * eased;

    const dx = target.endX - target.startX;
    const dy = target.endY - target.startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    let perpX = 0, perpY = 0;
    if (len > 0) {
      perpX = -dy / len;
      perpY = dx / len;
    }
    const sineOffset = Math.sin((progress * Math.PI * 2) * 0.5 + target.phase) * 8 * (1 - Math.abs(progress - 0.5) * 2);

    block.x = baseX + perpX * sineOffset;
    block.y = baseY + perpY * sineOffset;
    block.setTargetColor(target.targetColor, anim.duration);
  });

  if (progress >= 1) {
    APP.randomAnim.active = false;
    APP.blocks.forEach((block) => {
      const target = anim.targets.get(block.id);
      if (target) {
        block.x = target.endX;
        block.y = target.endY;
        block.baseColor = target.targetColor;
        block.currentColor = target.targetColor;
        block.targetColor = null;
      }
    });
  }
}

function draw(now: number): void {
  if (!APP.ctx || !APP.canvas) return;

  APP.ctx.clearRect(0, 0, APP.canvas.width, APP.canvas.height);
  APP.ctx.fillStyle = '#2b2b2b';
  APP.ctx.fillRect(0, 0, APP.canvas.width, APP.canvas.height);

  updateRandomFormation(now);

  if (APP.choreoManager) {
    APP.choreoManager.update(now);
  }

  APP.blocks.forEach((b) => b.update(now));

  const playing = APP.choreoManager?.getPlayState() === 'playing';
  if (playing && now - APP.lastTrailTime > TRAIL_INTERVAL) {
    APP.blocks.forEach((b) => {
      if (APP.choreoManager?.isBlockAnimating(b.id)) {
        b.addTrailPoint();
      }
    });
    APP.lastTrailTime = now;
  }

  const displayInfo: DisplaySize = {
    canvasWidth: APP.display.w,
    canvasHeight: APP.display.h,
    isSmall: (APP.ui?.getIsSmallViewport()) ?? false,
  };

  APP.blocks.forEach((block) => {
    const trailsOn = playing && !!APP.choreoManager?.isBlockAnimating(block.id);
    block.draw(APP.ctx!, displayInfo, APP.choreoManager?.getBpm() ?? 120, trailsOn);
  });
}

function loop(now: number): void {
  draw(now);
  APP.rafId = requestAnimationFrame(loop);
}

function handleChoreoToggle(enabled: boolean): void {
  if (!APP.ui) return;
  APP.ui.setChoreoMode(enabled);
}

function handleRehearse(): void {
  if (!APP.choreoManager || !APP.ui) return;
  const state = APP.choreoManager.getPlayState();
  if (state === 'playing') {
    APP.choreoManager.stopPlayback();
    APP.ui.setRehearseButton(false);
    APP.blocks.forEach((b) => {
      b.trail = [];
    });
  } else {
    if (APP.randomAnim?.active) return;
    const started = APP.choreoManager.startPlayback();
    if (started) {
      APP.ui.setRehearseButton(true);
      APP.blocks.forEach((b) => {
        b.trail = [];
      });
      APP.lastTrailTime = performance.now();
    }
  }
}

function handleBpmChange(bpm: number): void {
  if (!APP.choreoManager || !APP.ui) return;
  APP.choreoManager.setBpm(bpm);
  APP.ui.setBpmLabel(bpm);
}

function resizeCanvas(): void {
  if (!APP.canvas || !APP.ui) return;
  const dims = APP.ui.getCanvasDimensions();
  APP.canvas.width = dims.w;
  APP.canvas.height = dims.h;
  APP.display = { w: dims.w, h: dims.h };

  Object.assign(APP.canvas.style, {
    width: `${dims.w}px`,
    height: `${dims.h}px`,
  });

  reinitBlocksForViewport(dims.w, dims.h);
  APP.ui.setBlocks(APP.blocks);
}

function init(): void {
  const appContainer = document.getElementById('app') as HTMLElement;
  const canvasWrapper = document.getElementById('canvas-wrapper') as HTMLElement;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  APP.canvas = canvas;
  APP.ctx = canvas.getContext('2d')!;
  APP.draggedBlockId = null;
  APP.lastTrailTime = 0;

  APP.choreoManager = new ChoreographyManager();
  APP.choreoManager.onAnimationComplete = () => {
    if (APP.ui) APP.ui.setRehearseButton(false);
  };

  APP.ui = new UIController(
    appContainer,
    canvasWrapper,
    {
      onChoreoToggle: handleChoreoToggle,
      onRehearse: handleRehearse,
      onRandomFormation: triggerRandomFormation,
      onBpmChange: handleBpmChange,
    },
    APP.choreoManager
  );

  const dims = APP.ui.getCanvasDimensions();
  APP.display = { w: dims.w, h: dims.h };
  canvas.width = dims.w;
  canvas.height = dims.h;
  Object.assign(canvas.style, {
    width: `${dims.w}px`,
    height: `${dims.h}px`,
    touchAction: 'none',
  });

  APP.blocks = initBlocks(dims.w, dims.h);
  APP.blocks.forEach((b) => APP.choreoManager!.registerBlock(b));
  APP.ui.setBlocks(APP.blocks);

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  window.addEventListener('resize', resizeCanvas);

  APP.rafId = requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
