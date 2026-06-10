import { TileGrid, SymmetryMode, TileChangeEvent } from './TileGrid';
import { Renderer } from './Renderer';
import { Controls } from './Controls';

const getTileKey = (t: { row: number; col: number }) => `${t.row}-${t.col}`;

function init() {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  const canvasWrapper = document.createElement('div');
  canvasWrapper.className = 'canvas-wrapper';

  const canvas = document.createElement('canvas');
  canvas.id = 'mainCanvas';
  canvasWrapper.appendChild(canvas);
  app.appendChild(canvasWrapper);

  const tileGrid = new TileGrid();
  const renderer = new Renderer(canvas);
  renderer.setTiles(tileGrid.getTiles());
  renderer.setDensity(tileGrid.getDensity());
  renderer.setSymmetry(tileGrid.getSymmetry());
  renderer.render();

  let pendingTileEdit: { row: number; col: number } | null = null;

  const controls = new Controls(app, {
    onSymmetryChange: (mode: SymmetryMode) => {
      tileGrid.setSymmetry(mode);
      renderer.setSymmetry(mode);
    },
    onDensityChange: (density: number) => {
      tileGrid.setDensity(density);
      renderer.setDensity(density);
    },
    onPaletteChange: (warm: boolean) => {
      tileGrid.setPalette(warm);
    },
    onExportPNG: () => {
      const dataUrl = renderer.exportPNG();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'mosaic-pattern.png';
      a.click();
    },
    onExportCSS: () => {
      const css = renderer.exportCSS();
      const blob = new Blob([css], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mosaic-pattern.css';
      a.click();
      URL.revokeObjectURL(url);
    },
    onPaletteColorSelect: (color: string) => {
      if (pendingTileEdit) {
        tileGrid.setTileColor(pendingTileEdit.row, pendingTileEdit.col, color);
        pendingTileEdit = null;
      }
    }
  });

  tileGrid.onChange((e: TileChangeEvent) => {
    renderer.setTiles(tileGrid.getTiles());
    renderer.handleChange(e, getTileKey);
  });

  canvas.addEventListener('dblclick', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const tilePos = renderer.getTileAt(x, y);
    if (tilePos) {
      pendingTileEdit = tilePos;
      const canvasPos = renderer.getCanvasPosition(tilePos.row, tilePos.col);
      const displayX = rect.left + canvasPos.x / scaleX;
      const displayY = rect.top + canvasPos.y / scaleY;
      controls.showPalettePopup(displayX, displayY);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
