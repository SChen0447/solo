import { StarField } from './starField';
import { PuzzleManager } from './puzzleManager';
import type { Particle } from './starField';

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const slotEl = document.getElementById('puzzle-slot') as HTMLElement;
  const completedWordsEl = document.getElementById('completed-words') as HTMLElement;
  const counterEl = document.getElementById('word-count') as HTMLElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  if (!canvas || !slotEl || !completedWordsEl || !counterEl || !resetBtn) {
    console.error('[星语拼图] 缺少必要的DOM元素');
    return;
  }

  const starField = new StarField(canvas);
  const puzzleManager = new PuzzleManager(slotEl, completedWordsEl, counterEl);

  starField.initParticles(puzzleManager.getCharPool());

  let draggingParticle: Particle | null = null;

  starField.setCallbacks({
    onParticleClick: (particle) => {
      draggingParticle = particle;
    },
    onParticleDragEnd: (particle, x, y) => {
      if (puzzleManager.isPointInSlot(x, y)) {
        const added = puzzleManager.addParticleToSlot(particle);
        if (added) {
          starField.markParticleInSlot(particle.id);
        }
      }
      draggingParticle = null;
      puzzleManager.setSlotDragOver(false);
    },
  });

  puzzleManager.setCallbacks({
    onWordSuccess: () => {
      const center = starField.getCenter();
      starField.spawnFountain(center.x, center.y);
    },
    onCharReturn: (particleId) => {
      starField.returnParticleToField(particleId);
    },
  });

  const getCanvasCoords = (e: MouseEvent): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasCoords(e);
    starField.handleMouseMove(x, y);

    if (draggingParticle) {
      const overSlot = puzzleManager.isPointInSlot(e.clientX, e.clientY);
      puzzleManager.setSlotDragOver(overSlot);
    }
  });

  canvas.addEventListener('mouseleave', () => {
    starField.handleMouseLeave();
    puzzleManager.setSlotDragOver(false);
  });

  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getCanvasCoords(e);
    starField.handleMouseDown(x, y);
  });

  window.addEventListener('mouseup', (e) => {
    const { x, y } = getCanvasCoords(e);
    starField.handleMouseUp(x, y);
  });

  window.addEventListener('resize', () => {
    starField.resize();
  });

  resetBtn.addEventListener('click', () => {
    puzzleManager.reset();
    starField.reset();
  });

  let lastTime = performance.now();

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    starField.update(dt);
    starField.render();

    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
