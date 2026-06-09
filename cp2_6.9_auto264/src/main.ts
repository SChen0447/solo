import { PixelCanvas } from './canvas';
import type { ToolType, BrushSize, PixelMatrix } from './canvas';
import { ToolPanel } from './tools';
import { AnimationManager } from './animation';

function initApp(): void {
  const canvasEl = document.getElementById('mainCanvas') as HTMLCanvasElement;
  if (!canvasEl) {
    throw new Error('找不到主画布元素');
  }

  let pixelCanvas: PixelCanvas;
  let toolPanel: ToolPanel;
  let animationManager: AnimationManager;

  animationManager = new AnimationManager({
    onFrameChange: (pixels: PixelMatrix) => {
      pixelCanvas.setPixels(pixels);
    },
    getCurrentPixels: () => pixelCanvas.getPixels()
  });

  pixelCanvas = new PixelCanvas(canvasEl, {
    onPixelChange: () => {
      animationManager.updateCurrentThumbnail();
    },
    onColorPick: (color: string) => {
      toolPanel.setColor(color);
    }
  });

  toolPanel = new ToolPanel({
    onToolChange: (tool: ToolType) => {
      pixelCanvas.setTool(tool);
    },
    onColorChange: (color: string) => {
      pixelCanvas.setColor(color);
    },
    onBrushSizeChange: (size: BrushSize) => {
      pixelCanvas.setBrushSize(size);
    },
    onFlipHorizontal: () => {
      pixelCanvas.flipHorizontal();
    },
    onFlipVertical: () => {
      pixelCanvas.flipVertical();
    },
    onRotate90: () => {
      pixelCanvas.rotate90();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
