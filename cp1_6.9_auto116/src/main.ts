import { PaletteManager } from './paletteManager';
import { SketchManager } from './sketchManager';

function bootstrap(): void {
  const paletteManager = new PaletteManager();
  const sketchManager = new SketchManager(paletteManager);

  buildPaletteUI(paletteManager);

  sketchManager.init('canvas-container');

  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      sketchManager.clearCanvas();
    });
  }
}

function buildPaletteUI(paletteManager: PaletteManager): void {
  const palettePanel = document.getElementById('palette-panel');
  if (!palettePanel) return;

  const palette = paletteManager.getPalette();
  let activeSwatch: HTMLDivElement | null = null;

  palette.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color.hex;
    swatch.title = color.name;
    swatch.dataset.hex = color.hex;

    if (index === 0) {
      swatch.classList.add('active');
      activeSwatch = swatch;
    }

    swatch.addEventListener('click', () => {
      if (activeSwatch) {
        activeSwatch.classList.remove('active');
      }
      swatch.classList.add('active');
      activeSwatch = swatch;
      paletteManager.setCurrentColor(color.hex);
    });

    palettePanel.appendChild(swatch);
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
