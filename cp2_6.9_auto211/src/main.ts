import { Maze } from './maze';
import { CircuitComponent, renderComponentIcon, type ComponentType } from './component';
import { GameState, type GameStateData } from './state';

interface DragState {
  isDragging: boolean;
  type: ComponentType | null;
  ghost: HTMLElement | null;
}

interface HoverState {
  component: CircuitComponent | null;
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctxResult = canvas.getContext('2d');
  if (!ctxResult) {
    console.error('Could not get 2D context');
    return;
  }
  const ctx: CanvasRenderingContext2D = ctxResult;

  const maze = new Maze();
  const gameState = new GameState(maze);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = maze.getWidth() * dpr;
  canvas.height = maze.getHeight() * dpr;
  canvas.style.width = `${maze.getWidth()}px`;
  canvas.style.height = `${maze.getHeight()}px`;
  ctx.scale(dpr, dpr);

  const dragState: DragState = { isDragging: false, type: null, ghost: null };
  const hoverState: HoverState = { component: null };
  let lastTime = performance.now();
  let prevConnectedCount = 0;
  let prevLoopStatus = false;

  const countEl = document.getElementById('component-count') as HTMLElement;
  const loopEl = document.getElementById('loop-status') as HTMLElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  renderComponentIcon(document.getElementById('icon-wire')!, 'wire');
  renderComponentIcon(document.getElementById('icon-resistor')!, 'resistor');
  renderComponentIcon(document.getElementById('icon-capacitor')!, 'capacitor');
  renderComponentIcon(document.getElementById('icon-switch')!, 'switch');
  renderComponentIcon(document.getElementById('icon-led')!, 'led');

  function updateUI(_state: GameStateData): void {
    const displayCount = Math.round(gameState.getDisplayCount());
    if (countEl && parseInt(countEl.textContent || '0') !== displayCount) {
      countEl.textContent = String(displayCount);
      if (displayCount > prevConnectedCount) {
        countEl.classList.remove('bump');
        void countEl.offsetWidth;
        countEl.classList.add('bump');
        setTimeout(() => countEl.classList.remove('bump'), 300);
      }
    }
    prevConnectedCount = displayCount;

    if (loopEl) {
      const isLoop = _state.hasClosedLoop;
      if (isLoop !== prevLoopStatus) {
        loopEl.textContent = isLoop ? '✓' : '✗';
        loopEl.classList.toggle('success', isLoop);
        loopEl.classList.toggle('error', !isLoop);
        loopEl.classList.remove('bump');
        void loopEl.offsetWidth;
        loopEl.classList.add('bump');
        setTimeout(() => loopEl.classList.remove('bump'), 300);
      }
      prevLoopStatus = isLoop;
    }
  }

  gameState.subscribe(updateUI);

  function render(): void {
    const state = gameState.getState();
    maze.renderBackground(ctx);
    maze.renderPulse(ctx, state.pulseOpacity);
    maze.renderPowerSource(ctx);

    for (const comp of state.placedComponents) {
      comp.render(ctx);
    }

    maze.renderBulb(ctx, state.isBulbLit, state.bulbGlowRadius);

    if (dragState.isDragging && dragState.type) {
      const rect = canvas.getBoundingClientRect();
      const mx = (dragState.ghost as any)._mouseX - rect.left;
      const my = (dragState.ghost as any)._mouseY - rect.top;
      if (mx >= 0 && mx <= maze.getWidth() && my >= 0 && my <= maze.getHeight()) {
        const snap = maze.snapToGrid(mx, my);
        ctx.save();
        ctx.globalAlpha = 0.4;
        const preview = new CircuitComponent(dragState.type!, snap);
        preview.render(ctx);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(snap.x, snap.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function loop(now: number): void {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    gameState.updateAnimations(delta);
    updateUI(gameState.getState());
    render();

    requestAnimationFrame(loop);
  }

  function getCanvasPos(e: MouseEvent | DragEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e as MouseEvent).clientX - rect.left,
      y: (e as MouseEvent).clientY - rect.top,
    };
  }

  document.querySelectorAll('.component-item').forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      const type = (item as HTMLElement).dataset.type as ComponentType;
      if (!type) return;
      dragState.isDragging = true;
      dragState.type = type;

      const ghost = document.createElement('div');
      ghost.id = 'dragging-ghost';
      ghost.style.width = '60px';
      ghost.style.height = '60px';
      ghost.innerHTML = (item.querySelector('.component-icon') as HTMLElement)?.innerHTML || '';
      document.body.appendChild(ghost);
      dragState.ghost = ghost;

      const dt = (e as DragEvent).dataTransfer;
      if (dt) {
        dt.effectAllowed = 'copy';
        dt.setData('text/plain', type);
        const img = document.createElement('canvas');
        img.width = 1;
        img.height = 1;
        dt.setDragImage(img, 0, 0);
      }
    });
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (dragState.ghost) {
      dragState.ghost.style.left = `${e.clientX}px`;
      dragState.ghost.style.top = `${e.clientY}px`;
      (dragState.ghost as any)._mouseX = e.clientX;
      (dragState.ghost as any)._mouseY = e.clientY;
    }
  });

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    (e as DragEvent).dataTransfer!.dropEffect = 'copy';
  });

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!dragState.isDragging || !dragState.type) return;

    const pos = getCanvasPos(e);
    if (pos.x < 0 || pos.x > maze.getWidth() || pos.y < 0 || pos.y > maze.getHeight()) {
      cleanupDrag();
      return;
    }

    const gridPoint = maze.snapToGrid(pos.x, pos.y);

    if (maze.isPowerPoint(gridPoint) || maze.isBulbPoint(gridPoint)) {
      cleanupDrag();
      return;
    }

    const existing = gameState.getState().placedComponents.find(
      (c) => c.gridPos.col === gridPoint.col && c.gridPos.row === gridPoint.row
    );
    if (existing) {
      cleanupDrag();
      return;
    }

    const newComp = new CircuitComponent(dragState.type, gridPoint);
    gameState.addComponent(newComp);
    cleanupDrag();
  });

  function cleanupDrag(): void {
    dragState.isDragging = false;
    dragState.type = null;
    if (dragState.ghost) {
      dragState.ghost.remove();
      dragState.ghost = null;
    }
  }

  document.addEventListener('dragend', cleanupDrag);

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const comp = gameState.getComponentAt(pos.x, pos.y);
    if (comp) {
      comp.rotate();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const pos = getCanvasPos(e);
    const comp = gameState.getComponentAt(pos.x, pos.y);

    if (hoverState.component !== comp) {
      if (hoverState.component) {
        hoverState.component.isHovered = false;
      }
      hoverState.component = comp;
      if (comp) {
        comp.isHovered = true;
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoverState.component) {
      hoverState.component.isHovered = false;
      hoverState.component = null;
    }
  });

  canvas.addEventListener('click', (e) => {
    const pos = getCanvasPos(e);
    const comp = gameState.getComponentAt(pos.x, pos.y);
    if (comp && comp.type === 'switch') {
      comp.toggleSwitch();
      gameState.updateLoopStatus();
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    const pos = getCanvasPos(e);
    const comp = gameState.getComponentAt(pos.x, pos.y);
    if (comp) {
      gameState.removeComponent(comp);
    }
  });

  resetBtn.addEventListener('click', () => {
    gameState.reset();
  });

  requestAnimationFrame((t) => {
    lastTime = t;
    loop(t);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
