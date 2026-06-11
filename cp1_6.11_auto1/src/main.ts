import { PixelGrid } from './grid';
import { Toolbar } from './toolbar';

const PRESET_COLORS = [
  '#000000',
  '#333333',
  '#ffffff',
  '#ff0000',
  '#ff8800',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0088ff',
  '#8800ff',
  '#ff00ff',
  '#884400'
];

const GRID_WIDTH = 50;
const GRID_HEIGHT = 50;
const INITIAL_COLOR = '#000000';

function init(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  setupLayout(app);

  const toolbarContainer = document.getElementById('toolbar');
  const canvasContainer = document.getElementById('canvas-container');
  const canvasWrapper = document.getElementById('canvas-wrapper');

  if (!toolbarContainer || !canvasContainer || !canvasWrapper) {
    console.error('Required containers not found');
    return;
  }

  const canvas = document.createElement('canvas');
  canvasWrapper.appendChild(canvas);

  const grid = new PixelGrid(canvas, {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    cellSize: 10,
    bgColor: '#1a1a2e',
    gridColor: 'rgba(255, 255, 255, 0.08)',
    hoverColor: 'rgba(255, 255, 255, 0.12)',
    maxHistory: 20
  });

  grid.setCurrentColor(INITIAL_COLOR);

  const toolbar = new Toolbar(toolbarContainer, {
    currentColor: INITIAL_COLOR,
    presetColors: PRESET_COLORS,
    onColorChange: (color: string) => {
      grid.setCurrentColor(color);
    },
    onUndo: () => {
      grid.undo();
      updateUndoRedoState();
    },
    onRedo: () => {
      grid.redo();
      updateUndoRedoState();
    }
  });

  function updateUndoRedoState(): void {
    toolbar.updateUndoRedoState(grid.canUndo(), grid.canRedo());
  }

  updateUndoRedoState();

  const updateGridSize = (): void => {
    const rect = canvasContainer.getBoundingClientRect();
    const padding = 40;
    const maxWidth = rect.width - padding;
    const maxHeight = rect.height - padding;
    grid.resize(maxWidth, maxHeight);
  };

  let resizeTimeout: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
      updateGridSize();
    }, 100);
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (grid.canUndo()) {
        grid.undo();
        updateUndoRedoState();
      }
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (grid.canRedo()) {
        grid.redo();
        updateUndoRedoState();
      }
    }
  });

  requestAnimationFrame(() => {
    updateGridSize();
  });
}

function setupLayout(app: HTMLElement): void {
  app.style.display = 'flex';
  app.style.width = '100vw';
  app.style.height = '100vh';
  app.style.margin = '0';
  app.style.padding = '0';
  app.style.overflow = 'hidden';
  app.style.backgroundColor = '#0f0f1a';
  app.style.fontFamily = 'monospace';
  app.style.color = '#e0e0e0';

  const toolbar = document.createElement('div');
  toolbar.id = 'toolbar';
  app.appendChild(toolbar);

  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'canvas-container';
  canvasContainer.style.flex = '1';
  canvasContainer.style.display = 'flex';
  canvasContainer.style.alignItems = 'center';
  canvasContainer.style.justifyContent = 'center';
  canvasContainer.style.padding = '20px';
  canvasContainer.style.overflow = 'auto';
  app.appendChild(canvasContainer);

  const canvasWrapper = document.createElement('div');
  canvasWrapper.id = 'canvas-wrapper';
  canvasWrapper.style.position = 'relative';
  canvasWrapper.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
  canvasWrapper.style.border = '4px solid #16213e';
  canvasContainer.appendChild(canvasWrapper);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
