import './style.css';
import { PixelCanvas } from './pixelCanvas.js';
import { AnimationManager } from './animation.js';
import { UIManager } from './ui.js';
import { Tool, LoopMode, PICO8_PALETTE, ProjectData } from './types.js';

let pixelCanvas: PixelCanvas;
let animation: AnimationManager;
let ui: UIManager;
let canvasSize: number = 32;
let palette: string[] = [...PICO8_PALETTE];

function initApp(): void {
  const mainCanvas = document.getElementById('pixel-canvas') as HTMLCanvasElement;
  const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;

  pixelCanvas = new PixelCanvas(mainCanvas, previewCanvas, {
    size: canvasSize,
    onColorPick: (hex: string) => {
      if (ui) updateActivePaletteColor(hex);
    },
    onChange: () => {
      if (ui) {
        ui.syncFrameFromCanvas();
        ui.refreshPreview();
      }
    }
  });

  animation = new AnimationManager({
    canvasSize: canvasSize,
    onFrameChange: (index: number) => {
      if (ui) ui.refreshFrameListActive();
    },
    onPlaybackFrame: (index: number) => {
      if (ui) ui.onPlaybackFrame(index);
    },
    onPlaybackStop: () => {
      if (ui) ui.onPlaybackStop();
    }
  });

  ui = new UIManager(pixelCanvas, animation, {
    onToolChange: (_tool: Tool) => {},
    onColorChange: (_color: string) => {},
    onPaletteChange: (colors: string[]) => {
      palette = colors;
    },
    onCanvasSizeChange: (size: number) => {
      canvasSize = size;
    },
    onSaveProject: (): ProjectData => {
      return {
        version: '1.0.0',
        canvasSize: pixelCanvas.getSize(),
        palette: ui.getPalette(),
        frames: animation.serialize(),
        currentFrameIndex: animation.getCurrentFrameIndex(),
        loopMode: animation.getLoopMode()
      };
    },
    onLoadProject: (data: ProjectData) => {
      loadProjectData(data);
    }
  });

  ui.init();

  animation.addFrame(undefined, 100);
  ui.refreshFrameList();
  ui.loadFrameToCanvas(0);
  ui.refreshPreview();
}

function updateActivePaletteColor(hex: string): void {
  const paletteColors = document.querySelectorAll('.palette-color');
  paletteColors.forEach((el) => {
    const color = (el as HTMLElement).style.backgroundColor;
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[0]);
      const g = parseInt(rgbMatch[1]);
      const b = parseInt(rgbMatch[2]);
      const elHex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      if (elHex === hex.toUpperCase()) {
        paletteColors.forEach(p => p.classList.remove('active'));
        el.classList.add('active');
      }
    }
  });
}

function loadProjectData(data: ProjectData): void {
  animation.stop();
  canvasSize = data.canvasSize;
  palette = [...data.palette];

  animation.clear();
  animation.resizeAll(canvasSize);
  pixelCanvas.resize(canvasSize);

  ui.setPalette(palette);
  ui.setCanvasSizeSelect(canvasSize);
  ui.setLoopModeSelect(data.loopMode);

  animation.setLoopMode(data.loopMode);
  animation.deserialize(data.frames);
  animation.setCurrentFrame(data.currentFrameIndex >= 0 ? data.currentFrameIndex : 0);

  ui.refreshFrameList();
  ui.loadFrameToCanvas(animation.getCurrentFrameIndex());
  ui.refreshPreview();
}

document.addEventListener('DOMContentLoaded', initApp);
