import p5 from 'p5';
import {
  Vine,
  VineDrawerConfig,
  createVineDrawerConfig,
  createVine,
  addMousePoint,
  finishVine,
  updateVine,
  drawVine,
  checkVineCollisions,
} from './vineDrawer';

const vines: Vine[] = [];
let activeVine: Vine | null = null;
const config: VineDrawerConfig = createVineDrawerConfig();
let speedMultiplier = 1;

const sketch = (p: p5): void => {
  let container: HTMLElement | null = null;

  p.setup = (): void => {
    container = document.getElementById('canvas-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const canvas = p.createCanvas(w, h);
    canvas.parent('canvas-container');

    setupControls();

    window.addEventListener('resize', () => {
      if (container) {
        p.resizeCanvas(container.clientWidth, container.clientHeight);
      }
    });
  };

  p.draw = (): void => {
    p.background(245, 240, 232, 30);

    for (const vine of vines) {
      updateVine(p, vine, config, speedMultiplier);
      drawVine(p, vine);
    }

    checkVineCollisions(vines);
  };

  p.mousePressed = (): void => {
    if (p.mouseButton !== p.LEFT) return;
    if (!isMouseOnCanvas(p)) return;

    const pos = getCanvasMousePos(p);
    activeVine = createVine(pos.x, pos.y);
    vines.push(activeVine);
  };

  p.mouseDragged = (): void => {
    if (!activeVine) return;
    if (!isMouseOnCanvas(p)) return;

    const pos = getCanvasMousePos(p);
    addMousePoint(activeVine, pos.x, pos.y);
  };

  p.mouseReleased = (): void => {
    if (activeVine) {
      finishVine(activeVine);
      activeVine = null;
    }
  };

  p.touchStarted = (): void => {
    if (!isMouseOnCanvas(p)) return;
    const pos = getCanvasMousePos(p);
    activeVine = createVine(pos.x, pos.y);
    vines.push(activeVine);
    return false;
  };

  p.touchMoved = (): void => {
    if (!activeVine) return;
    if (!isMouseOnCanvas(p)) return;
    const pos = getCanvasMousePos(p);
    addMousePoint(activeVine, pos.x, pos.y);
    return false;
  };

  p.touchEnded = (): void => {
    if (activeVine) {
      finishVine(activeVine);
      activeVine = null;
    }
  };
};

function isMouseOnCanvas(p: p5): boolean {
  return p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
}

function getCanvasMousePos(p: p5): { x: number; y: number } {
  return { x: p.mouseX, y: p.mouseY };
}

function setupControls(): void {
  const clearBtn = document.getElementById('clear-btn');
  const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
  const speedValue = document.getElementById('speed-value');
  const densitySelect = document.getElementById('density-select') as HTMLSelectElement;
  const panelToggle = document.getElementById('panel-toggle');
  const controlPanel = document.getElementById('control-panel');

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      vines.length = 0;
      activeVine = null;
    });
  }

  if (speedSlider && speedValue) {
    speedSlider.addEventListener('input', () => {
      speedMultiplier = parseInt(speedSlider.value, 10);
      speedValue.textContent = `${speedMultiplier}x`;
    });
  }

  if (densitySelect) {
    densitySelect.addEventListener('change', () => {
      config.flowerDensity = densitySelect.value as 'low' | 'medium' | 'high';
    });
  }

  if (panelToggle && controlPanel) {
    panelToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('open');
    });
  }
}

new p5(sketch);
