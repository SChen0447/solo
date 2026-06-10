import type { GameState } from './physics';
import { getBlockAt, startBlockRemoval, undoLastAction } from './physics';
import type { UIState } from './renderer';
import { isPointInButton } from './renderer';

export interface UICallbacks {
  onReset: () => void;
}

export function createUIState(): UIState {
  return {
    hoveredBlockId: null,
    draggingBlockId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    mouseX: 0,
    mouseY: 0,
    resetBtnHover: false,
    resetBtnPressed: false,
    resetBtnRotation: 0,
    resetBtnScale: 1,
    undoBtnHover: false,
    undoBtnPressed: false,
    undoBtnRotation: 0,
    undoBtnScale: 1,
    canUndo: false
  };
}

function getCanvasCoords(canvas: HTMLCanvasElement, e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function getResetBtnPos(w: number, h: number): { x: number; y: number; r: number } {
  return { x: w - 50, y: h - 50, r: 30 };
}

function getUndoBtnPos(w: number, h: number): { x: number; y: number; r: number } {
  return { x: w - 120, y: h - 50, r: 30 };
}

export function setupEventHandlers(
  canvas: HTMLCanvasElement,
  state: GameState,
  uiState: UIState,
  callbacks: UICallbacks
): () => void {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragThreshold = 20;
  let dragMoved = false;

  const onMouseMove = (e: MouseEvent) => {
    const { x, y } = getCanvasCoords(canvas, e);
    uiState.mouseX = x;
    uiState.mouseY = y;

    const w = canvas.width;
    const h = canvas.height;

    const resetBtn = getResetBtnPos(w, h);
    const undoBtn = getUndoBtnPos(w, h);

    uiState.resetBtnHover = isPointInButton(x, y, resetBtn.x, resetBtn.y, resetBtn.r);
    uiState.undoBtnHover = isPointInButton(x, y, undoBtn.x, undoBtn.y, undoBtn.r) && uiState.canUndo;

    canvas.style.cursor = 'default';
    if (uiState.resetBtnHover || uiState.undoBtnHover) {
      canvas.style.cursor = 'pointer';
    } else if (!isDragging) {
      const block = getBlockAt(state, x, y);
      uiState.hoveredBlockId = block ? block.id : null;
      if (block && !state.isCollapsed) {
        canvas.style.cursor = 'grab';
      }
    }

    if (isDragging && uiState.draggingBlockId) {
      const dx = x - dragStartX;
      if (Math.abs(dx) > dragThreshold) {
        dragMoved = true;
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    const { x, y } = getCanvasCoords(canvas, e);
    const w = canvas.width;
    const h = canvas.height;

    const resetBtn = getResetBtnPos(w, h);
    if (isPointInButton(x, y, resetBtn.x, resetBtn.y, resetBtn.r)) {
      uiState.resetBtnPressed = true;
      animateResetButton(uiState);
      callbacks.onReset();
      return;
    }

    const undoBtn = getUndoBtnPos(w, h);
    if (isPointInButton(x, y, undoBtn.x, undoBtn.y, undoBtn.r) && uiState.canUndo) {
      uiState.undoBtnPressed = true;
      animateUndoButton(uiState);
      undoLastAction(state);
      uiState.canUndo = state.history.length > 0;
      return;
    }

    if (state.isCollapsed) return;

    const block = getBlockAt(state, x, y);
    if (block) {
      isDragging = true;
      dragMoved = false;
      dragStartX = x;
      dragStartY = y;
      uiState.draggingBlockId = block.id;
      uiState.dragOffsetX = block.x - x;
      uiState.dragOffsetY = block.y - y;
      canvas.style.cursor = 'grabbing';
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    const { x, y } = getCanvasCoords(canvas, e);

    uiState.resetBtnPressed = false;
    uiState.undoBtnPressed = false;

    if (isDragging && uiState.draggingBlockId) {
      const dx = x - dragStartX;
      if (dragMoved && Math.abs(dx) > dragThreshold) {
        const direction = dx > 0 ? 1 : -1;
        startBlockRemoval(state, uiState.draggingBlockId, direction);
        uiState.canUndo = state.history.length > 0;
      }
      isDragging = false;
      uiState.draggingBlockId = null;
      canvas.style.cursor = 'default';
    }
  };

  const onMouseLeave = () => {
    uiState.hoveredBlockId = null;
    uiState.resetBtnHover = false;
    uiState.undoBtnHover = false;
    if (isDragging) {
      isDragging = false;
      uiState.draggingBlockId = null;
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      onMouseDown(mouseEvent);
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      onMouseMove(mouseEvent);
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (touch) {
      const mouseEvent = new MouseEvent('mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      onMouseUp(mouseEvent);
    }
  };

  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  return () => {
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
  };
}

function animateResetButton(uiState: UIState): void {
  let t = 0;
  const duration = 200;
  const start = performance.now();

  const animate = (now: number) => {
    t = (now - start) / duration;
    if (t >= 1) {
      uiState.resetBtnRotation = Math.PI;
      uiState.resetBtnScale = 1;
      setTimeout(() => {
        uiState.resetBtnRotation = 0;
      }, 100);
      return;
    }

    if (t < 0.5) {
      uiState.resetBtnRotation = Math.PI * t * 2;
      uiState.resetBtnScale = 1 - t * 0.4;
    } else {
      uiState.resetBtnRotation = Math.PI;
      uiState.resetBtnScale = 0.8 + (t - 0.5) * 0.4;
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

function animateUndoButton(uiState: UIState): void {
  let t = 0;
  const duration = 200;
  const start = performance.now();

  const animate = (now: number) => {
    t = (now - start) / duration;
    if (t >= 1) {
      uiState.undoBtnRotation = -Math.PI;
      uiState.undoBtnScale = 1;
      setTimeout(() => {
        uiState.undoBtnRotation = 0;
      }, 100);
      return;
    }

    if (t < 0.5) {
      uiState.undoBtnRotation = -Math.PI * t * 2;
      uiState.undoBtnScale = 1 - t * 0.4;
    } else {
      uiState.undoBtnRotation = -Math.PI;
      uiState.undoBtnScale = 0.8 + (t - 0.5) * 0.4;
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

export function updateUIState(uiState: UIState, state: GameState): void {
  uiState.canUndo = state.history.length > 0 && !state.isCollapsed;
}
