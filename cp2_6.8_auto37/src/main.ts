import { DrawBoard } from './drawBoard';
import { CurveAnimator } from './curveAnimator';
import { GUI } from 'dat.gui';

let drawBoard: DrawBoard;
let curveAnimator: CurveAnimator;

function init(): void {
  drawBoard = new DrawBoard('drawBoard');
  curveAnimator = new CurveAnimator('sceneWrapper', 'threeCanvas');

  drawBoard.setOnPathChange((paths) => {
    const merged = paths.flat();
    if (merged.length >= 2) {
      curveAnimator.updateCurve(merged);
    }
  });

  setupControls();
  setupDivider();
}

function setupControls(): void {
  const clearBtn = document.getElementById('clearBtn');
  const undoBtn = document.getElementById('undoBtn');

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      drawBoard.clear();
    });
  }

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      drawBoard.undo();
    });
  }

  setupGUI();
}

function setupGUI(): void {
  const gui = new GUI();
  gui.domElement.style.position = 'absolute';
  gui.domElement.style.top = '10px';
  gui.domElement.style.right = '10px';
  gui.domElement.style.zIndex = '100';

  const params = {
    segments: 64,
    particleCount: 200,
    particleSizeScale: 1.0,
    animationSpeed: 1.0,
    curveY: 0
  };

  gui.add(params, 'segments', 32, 128, 1)
    .name('曲线分段数')
    .onChange((value: number) => {
      curveAnimator.setParams({ segments: value });
    });

  gui.add(params, 'particleCount', 50, 500, 1)
    .name('粒子数量')
    .onChange((value: number) => {
      curveAnimator.setParams({ particleCount: value });
    });

  gui.add(params, 'particleSizeScale', 0.5, 2.0, 0.01)
    .name('粒子大小缩放')
    .onChange((value: number) => {
      curveAnimator.setParams({ particleSizeScale: value });
    });

  gui.add(params, 'animationSpeed', 0.5, 3.0, 0.01)
    .name('动画速度')
    .onChange((value: number) => {
      curveAnimator.setParams({ animationSpeed: value });
    });

  gui.add(params, 'curveY', -1, 1, 0.01)
    .name('曲线垂直偏移Y')
    .onChange((value: number) => {
      curveAnimator.setParams({ curveY: value });
    });
}

function setupDivider(): void {
  const divider = document.getElementById('divider');
  const leftPanel = document.querySelector('.left-panel') as HTMLElement;
  const rightPanel = document.querySelector('.right-panel') as HTMLElement;
  const container = document.querySelector('.app-container') as HTMLElement;

  if (!divider || !leftPanel || !rightPanel || !container) return;

  let isDragging = false;

  divider.addEventListener('mousedown', (e) => {
    isDragging = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    const minWidth = 200;
    const leftPercent = Math.max(minWidth / containerWidth * 100, Math.min(80, mouseX / containerWidth * 100));
    const rightPercent = 100 - leftPercent;

    if (rightPercent * containerWidth / 100 < minWidth) return;

    leftPanel.style.width = `${leftPercent}%`;
    rightPanel.style.width = `${rightPercent}%`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.cursor = '';
  });
}

document.addEventListener('DOMContentLoaded', init);
