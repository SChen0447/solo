import './style.css';
import { Sandpile } from './sandpile';
import { Renderer } from './renderer';
import { UIController } from './ui';

const GRID_SIZE = 50;
const CELL_SIZE = 50;
const AUTO_ADD_INTERVAL_MS = 1000;

function main(): void {
  const canvasEl = document.getElementById('sandpile-canvas') as HTMLCanvasElement | null;
  if (!canvasEl) {
    console.error('Canvas element not found');
    return;
  }
  const canvas: HTMLCanvasElement = canvasEl;

  const hoverInfoEl = document.getElementById('hover-info') as HTMLElement | null;
  if (!hoverInfoEl) {
    console.error('Hover info element not found');
    return;
  }
  const hoverInfo: HTMLElement = hoverInfoEl;

  const sandpile = new Sandpile(GRID_SIZE);
  const renderer = new Renderer(canvas, sandpile, CELL_SIZE);
  const ui = new UIController(
    sandpile,
    renderer,
    'auto-add-toggle',
    'avalanche-speed',
    'speed-value',
    'reset-btn'
  );

  let isAvalanching = false;
  let lastAutoAddTime = 0;

  function addSandAndStartAvalanche(x?: number, y?: number): void {
    sandpile.addSand(x, y);
    if (sandpile.hasUnstableCells()) {
      isAvalanching = true;
      sandpile.startAvalancheTracking();
    }
  }

  canvas.addEventListener('click', (e: MouseEvent) => {
    if (isAvalanching) return;
    const cell = renderer.getCellFromPosition(e.clientX, e.clientY);
    if (cell) {
      addSandAndStartAvalanche(cell.x, cell.y);
    } else {
      addSandAndStartAvalanche();
    }
  });

  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const cell = renderer.getCellFromPosition(e.clientX, e.clientY);
    renderer.setHoverCell(cell);
    renderer.updateHoverInfo(hoverInfo);
  });

  canvas.addEventListener('mouseleave', () => {
    renderer.setHoverCell(null);
    renderer.updateHoverInfo(hoverInfo);
  });

  ui.setOnResetCallback(() => {
    isAvalanching = false;
    lastAutoAddTime = 0;
  });

  function fitCanvasSize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width;
    const maxHeight = containerRect.height;
    const totalSize = GRID_SIZE * CELL_SIZE;

    let scale = 1;
    if (totalSize > maxWidth || totalSize > maxHeight) {
      scale = Math.min(maxWidth / totalSize, maxHeight / totalSize);
    }

    canvas.style.width = `${totalSize * scale}px`;
    canvas.style.height = `${totalSize * scale}px`;
  }

  fitCanvasSize();
  window.addEventListener('resize', fitCanvasSize);

  function loop(timestamp: number): void {
    const state = ui.getState();

    if (!isAvalanching && state.autoAdd) {
      if (timestamp - lastAutoAddTime >= AUTO_ADD_INTERVAL_MS) {
        addSandAndStartAvalanche();
        lastAutoAddTime = timestamp;
      }
    }

    if (isAvalanching) {
      const stepsPerFrame = state.avalancheSpeed;
      for (let i = 0; i < stepsPerFrame; i++) {
        if (!sandpile.hasUnstableCells()) {
          break;
        }
        const result = sandpile.stepAvalanche();
        renderer.addHighlightCells(result.cells);
        if (result.finished) {
          break;
        }
      }

      if (!sandpile.hasUnstableCells()) {
        const totalAffected = sandpile.finishAvalancheTracking();
        renderer.setAvalancheSize(totalAffected);
        isAvalanching = false;
      } else {
        const currentTracked = sandpile.getAvalancheCells().size;
        renderer.setAvalancheSize(currentTracked);
      }
    }

    renderer.render();
    renderer.updateHoverInfo(hoverInfo);
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(timestamp => {
    lastAutoAddTime = timestamp;
    renderer.render();
    requestAnimationFrame(loop);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
