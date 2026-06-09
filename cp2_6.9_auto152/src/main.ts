import { PixelBoard } from './pixelBoard';
import type { ToolType } from './pixelBoard';
import { AnimationEngine } from './animationEngine';

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

async function init(): Promise<void> {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js');
  } catch (e) {
    console.warn('Failed to load gif.js from CDN, trying alternate URL');
    try {
      await loadScript('https://unpkg.com/gif.js@0.2.0/dist/gif.js');
    } catch (e2) {
      console.error('Failed to load gif.js');
    }
  }

  const isMobile = window.innerWidth < 768;
  const DESKTOP_PIXEL_SIZE = 20;
  const MOBILE_PIXEL_SIZE = 15;
  const GRID_SIZE = 32;

  const canvas = document.getElementById('pixelCanvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;

  const pixelBoard = new PixelBoard(canvas, overlayCanvas, {
    gridSize: GRID_SIZE,
    pixelSize: isMobile ? MOBILE_PIXEL_SIZE : DESKTOP_PIXEL_SIZE,
    onPixelChange: () => {
      animationEngine.saveCurrentFrame();
    },
    onColorPick: (color: string) => {
      updateCurrentColorDisplay(color);
      updatePaletteSelection(color);
      updateToolButtons('brush');
    }
  });

  const animationEngine = new AnimationEngine({
    pixelBoard,
    fps: 5,
    transitionDuration: 0.15,
    onFrameChange: (index: number, total: number) => {
      updateFrameIndicator(index, total);
      updateNavButtons(index, total);
    },
    onPlayStateChange: (isPlaying: boolean) => {
      updatePlayButton(isPlaying);
    }
  });

  const currentColorEl = document.getElementById('currentColor') as HTMLDivElement;
  const colorPaletteEl = document.getElementById('colorPalette') as HTMLDivElement;
  const frameIndicatorEl = document.getElementById('frameIndicator') as HTMLSpanElement;
  const prevFrameBtn = document.getElementById('prevFrame') as HTMLButtonElement;
  const nextFrameBtn = document.getElementById('nextFrame') as HTMLButtonElement;
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const addFrameBtn = document.getElementById('addFrame') as HTMLButtonElement;
  const deleteFrameBtn = document.getElementById('deleteFrame') as HTMLButtonElement;
  const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
  const modalBackdrop = document.getElementById('modalBackdrop') as HTMLDivElement;
  const modalClose = document.getElementById('modalClose') as HTMLButtonElement;
  const gifPreview = document.getElementById('gifPreview') as HTMLDivElement;
  const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
  const toolButtons = document.querySelectorAll<HTMLButtonElement>('.tool-btn');

  let currentGifDataUrl: string | null = null;

  function initColorPalette(): void {
    colorPaletteEl.innerHTML = '';
    PixelBoard.DEFAULT_COLORS.forEach((color: string) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        pixelBoard.setColor(color);
        updateCurrentColorDisplay(color);
        updatePaletteSelection(color);
      });
      colorPaletteEl.appendChild(swatch);
    });
    const defaultColor = PixelBoard.DEFAULT_COLORS[0];
    updateCurrentColorDisplay(defaultColor);
    updatePaletteSelection(defaultColor);
  }

  function updateCurrentColorDisplay(color: string): void {
    currentColorEl.style.backgroundColor = color;
  }

  function updatePaletteSelection(color: string): void {
    const swatches = colorPaletteEl.querySelectorAll<HTMLDivElement>('.color-swatch');
    swatches.forEach((swatch: HTMLDivElement) => {
      if (swatch.dataset.color === color) {
        swatch.classList.add('selected');
      } else {
        swatch.classList.remove('selected');
      }
    });
  }

  function initToolButtons(): void {
    toolButtons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool as ToolType;
        pixelBoard.setTool(tool);
        updateToolButtons(tool);
      });
    });
  }

  function updateToolButtons(activeTool: ToolType): void {
    toolButtons.forEach((btn: HTMLButtonElement) => {
      if (btn.dataset.tool === activeTool) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateFrameIndicator(index: number, total: number): void {
    frameIndicatorEl.textContent = `${index + 1}/${total}`;
  }

  function updateNavButtons(index: number, total: number): void {
    prevFrameBtn.disabled = index <= 0;
    nextFrameBtn.disabled = index >= total - 1;
    deleteFrameBtn.disabled = total <= 1;
  }

  function updatePlayButton(isPlaying: boolean): void {
    playBtn.textContent = isPlaying ? '⏸ 暂停' : '▶ 播放';
  }

  function initAnimationControls(): void {
    prevFrameBtn.addEventListener('click', () => {
      animationEngine.prevFrame();
    });

    nextFrameBtn.addEventListener('click', () => {
      animationEngine.nextFrame();
    });

    playBtn.addEventListener('click', () => {
      animationEngine.togglePlay();
    });

    addFrameBtn.addEventListener('click', () => {
      animationEngine.addFrame(true);
    });

    deleteFrameBtn.addEventListener('click', () => {
      animationEngine.deleteFrame();
    });
  }

  function initExportButton(): void {
    exportBtn.addEventListener('click', async () => {
      showModal();
      showLoading();
      downloadBtn.disabled = true;
      currentGifDataUrl = null;

      try {
        const dataUrl = await animationEngine.exportToGif();
        currentGifDataUrl = dataUrl;
        showGifPreview(dataUrl);
        downloadBtn.disabled = false;
      } catch (error) {
          showError(error instanceof Error ? error.message : '导出失败');
        }
    });
  }

  function showModal(): void {
    modalBackdrop.classList.add('active');
  }

  function hideModal(): void {
    modalBackdrop.classList.remove('active');
  }

  function showLoading(): void {
    gifPreview.innerHTML = '<span class="gif-loading">正在生成 GIF...</span>';
  }

  function showError(message: string): void {
    gifPreview.innerHTML = `<span class="gif-loading" style="color: #ff6b6b;">${message}</span>`;
  }

  function showGifPreview(dataUrl: string): void {
    gifPreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Generated GIF';
    gifPreview.appendChild(img);
  }

  function initModal(): void {
    modalClose.addEventListener('click', hideModal);
    modalBackdrop.addEventListener('click', (e: MouseEvent) => {
      if (e.target === modalBackdrop) {
        hideModal();
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (!currentGifDataUrl) return;
      const a = document.createElement('a');
      a.href = currentGifDataUrl;
      a.download = 'animation.gif';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  function handleResize(): void {
    const nowMobile = window.innerWidth < 768;
    const currentSize = pixelBoard.getPixelSize();
    const expectedSize = nowMobile ? MOBILE_PIXEL_SIZE : DESKTOP_PIXEL_SIZE;
    if (currentSize !== expectedSize) {
      pixelBoard.setPixelSize(expectedSize);
    }
  }

  window.addEventListener('resize', handleResize);

  initColorPalette();
  initToolButtons();
  initAnimationControls();
  initExportButton();
  initModal();
  updateFrameIndicator(0, 1);
  updateNavButtons(0, 1);
  updatePlayButton(false);
}

document.addEventListener('DOMContentLoaded', init);
