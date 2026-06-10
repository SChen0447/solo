import { state, type Speed, type AnimationData } from './state';
import { Renderer, type DOMRefs } from './renderer';

export class Interactions {
  private renderer: Renderer;
  private refs: DOMRefs;
  private isDrawing = false;
  private currentButton: number = 0;

  constructor(renderer: Renderer, refs: DOMRefs) {
    this.renderer = renderer;
    this.refs = refs;
    this.bindCanvasEvents();
    this.bindPaletteEvents();
    this.bindTimelineEvents();
    this.bindToolbarEvents();
    this.bindModalEvents();
    this.bindPreviewEvents();
  }

  private bindCanvasEvents(): void {
    const canvas = this.refs.mainCanvas;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    canvas.addEventListener('mousedown', (e) => {
      if (state.isPreview) return;
      e.preventDefault();
      this.isDrawing = true;
      this.currentButton = e.button;
      this.handleCanvasPaint(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing || state.isPreview) return;
      this.handleCanvasPaint(e.clientX, e.clientY);
    });

    const stopDrawing = () => {
      this.isDrawing = false;
    };

    window.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
  }

  private handleCanvasPaint(clientX: number, clientY: number): void {
    const pos = this.renderer.clientToCanvasPixel(clientX, clientY);
    if (!pos) return;

    if (this.currentButton === 2) {
      state.setPixel(pos.x, pos.y, null);
    } else {
      state.setPixel(pos.x, pos.y, state.getCurrentColorRGBA());
    }
  }

  private bindPaletteEvents(): void {
    const handlePaletteClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action !== 'select-color') return;
      const color = target.dataset.color;
      if (!color) return;
      state.setColor(color);
    };

    this.refs.paletteGrid.addEventListener('click', handlePaletteClick);
    this.refs.mobilePaletteGrid.addEventListener('click', handlePaletteClick);
  }

  private bindTimelineEvents(): void {
    this.refs.timelinePanel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (!action) return;

      if (action === 'select-frame') {
        const idx = parseInt(target.dataset.frameIndex || '-1', 10);
        if (idx >= 0) state.goToFrame(idx);
      } else if (action === 'add-frame') {
        const insertAfter = parseInt(target.dataset.insertAfter || '-1', 10);
        if (insertAfter >= 0) {
          const cur = state.currentFrame;
          state.goToFrame(insertAfter);
          state.addFrame();
          if (state.frames.length > 1) {
          }
        }
      } else if (action === 'remove-frame') {
        const idx = parseInt(target.dataset.frameIndex || '-1', 10);
        if (idx >= 0) state.removeFrame(idx);
      }
    });
  }

  private bindToolbarEvents(): void {
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const importBtn = document.getElementById('importBtn') as HTMLButtonElement;
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

    playBtn.addEventListener('click', () => {
      if (!state.isPlaying) {
        state.setPlaying(true);
      }
    });

    stopBtn.addEventListener('click', () => {
      state.setPlaying(false);
      state.setPreview(false);
    });

    this.refs.speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed || '0.3') as Speed;
        state.setSpeed(speed);
      });
    });

    importBtn.addEventListener('click', () => {
      this.renderer.showImportModal();
    });

    exportBtn.addEventListener('click', () => {
      const data = state.exportData();
      const json = JSON.stringify(data, null, 2);
      this.renderer.showExportModal(json);
    });
  }

  private bindModalEvents(): void {
    const exportCloseBtn = document.getElementById('exportCloseBtn') as HTMLButtonElement;
    const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
    const importCloseBtn = document.getElementById('importCloseBtn') as HTMLButtonElement;
    const loadBtn = document.getElementById('loadBtn') as HTMLButtonElement;

    this.refs.exportModal.addEventListener('click', (e) => {
      if (e.target === this.refs.exportModal) {
        this.renderer.hideExportModal();
      }
    });

    exportCloseBtn.addEventListener('click', () => {
      this.renderer.hideExportModal();
    });

    copyBtn.addEventListener('click', async () => {
      const text = this.refs.exportTextarea.value;
      try {
        await navigator.clipboard.writeText(text);
        const originalText = '复制到剪贴板';
        this.renderer.updateCopyButton('已复制！');
        setTimeout(() => {
          this.renderer.updateCopyButton(originalText);
        }, 2000);
      } catch {
        this.refs.exportTextarea.select();
        document.execCommand('copy');
        const originalText = '复制到剪贴板';
        this.renderer.updateCopyButton('已复制！');
        setTimeout(() => {
          this.renderer.updateCopyButton(originalText);
        }, 2000);
      }
    });

    this.refs.importModal.addEventListener('click', (e) => {
      if (e.target === this.refs.importModal) {
        this.renderer.hideImportModal();
      }
    });

    importCloseBtn.addEventListener('click', () => {
      this.renderer.hideImportModal();
    });

    loadBtn.addEventListener('click', () => {
      const text = this.refs.importTextarea.value.trim();
      if (!text) {
        this.renderer.showImportError();
        return;
      }
      try {
        const data = JSON.parse(text) as AnimationData;
        const ok = state.loadData(data);
        if (ok) {
          this.renderer.hideImportModal();
        } else {
          this.renderer.showImportError();
        }
      } catch {
        this.renderer.showImportError();
      }
    });
  }

  private bindPreviewEvents(): void {
    const previewClose = document.getElementById('previewClose') as HTMLButtonElement;
    previewClose.addEventListener('click', () => {
      state.setPlaying(false);
      state.setPreview(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isPreview) {
        state.setPlaying(false);
        state.setPreview(false);
      }
    });
  }
}
