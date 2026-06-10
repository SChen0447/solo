import { state, type Frame, type RGBA } from './state';

const CELL_SIZE = 30;
const PREVIEW_CELL_SIZE = 30;
const THUMBNAIL_CELL_SIZE = 5;

const CANVAS_BG = '#f5f0e8';
const GRID_COLOR = '#444';

export interface DOMRefs {
  mainCanvas: HTMLCanvasElement;
  paletteGrid: HTMLDivElement;
  mobilePaletteGrid: HTMLDivElement;
  timelinePanel: HTMLDivElement;
  previewOverlay: HTMLDivElement;
  previewCanvas: HTMLCanvasElement;
  previewBgCanvas: HTMLCanvasElement;
  previewFrameNumber: HTMLDivElement;
  speedButtons: NodeListOf<HTMLButtonElement>;
  exportModal: HTMLDivElement;
  exportModalCard: HTMLDivElement;
  exportTextarea: HTMLTextAreaElement;
  importModal: HTMLDivElement;
  importModalCard: HTMLDivElement;
  importTextarea: HTMLTextAreaElement;
  importErrorText: HTMLDivElement;
  copyBtn: HTMLButtonElement;
}

export class Renderer {
  private refs: DOMRefs;
  private mainCtx: CanvasRenderingContext2D;
  private previewCtx: CanvasRenderingContext2D;
  private previewBgCtx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private playIndex = 0;

  constructor(refs: DOMRefs) {
    this.refs = refs;
    this.mainCtx = refs.mainCanvas.getContext('2d')!;
    this.previewCtx = refs.previewCanvas.getContext('2d')!;
    this.previewBgCtx = refs.previewBgCanvas.getContext('2d')!;

    this.setupCanvasSizes();
    this.bindStateEvents();
  }

  private setupCanvasSizes(): void {
    const size = state.gridSize * CELL_SIZE;
    this.refs.mainCanvas.width = size;
    this.refs.mainCanvas.height = size;

    const previewSize = state.gridSize * PREVIEW_CELL_SIZE;
    this.refs.previewCanvas.width = previewSize;
    this.refs.previewCanvas.height = previewSize;
    this.refs.previewBgCanvas.width = previewSize;
    this.refs.previewBgCanvas.height = previewSize;
  }

  private bindStateEvents(): void {
    const redrawAll = () => this.redrawAll();
    state.on('pixelChanged', redrawAll);
    state.on('frameAdded', redrawAll);
    state.on('frameRemoved', redrawAll);
    state.on('frameChanged', redrawAll);
    state.on('dataLoaded', redrawAll);

    state.on('colorChanged', () => this.renderPalette());
    state.on('speedChanged', () => this.renderSpeedButtons());
    state.on('playingChanged', () => this.handlePlayingChanged());
    state.on('previewChanged', () => this.handlePreviewChanged());
  }

  redrawAll(): void {
    this.renderMainCanvas();
    this.renderTimeline();
    this.renderPalette();
    this.renderSpeedButtons();
  }

  renderMainCanvas(): void {
    const ctx = this.mainCtx;
    const gridSize = state.gridSize;
    const size = gridSize * CELL_SIZE;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, size, size);

    const frame = state.getFrame(state.currentFrame);
    if (!frame) return;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const pixel = frame[y][x];
        if (pixel[3] > 0) {
          ctx.fillStyle = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      const pos = i * CELL_SIZE + 0.5;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
  }

  private drawFrameToCtx(
    ctx: CanvasRenderingContext2D,
    frame: Frame,
    cellSize: number,
    drawGrid: boolean = false
  ): void {
    const gridSize = state.gridSize;
    const size = gridSize * cellSize;

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const pixel = frame[y][x];
        if (pixel[3] > 0) {
          ctx.fillStyle = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }

    if (drawGrid) {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        const pos = i * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }
    }
  }

  renderTimeline(): void {
    const panel = this.refs.timelinePanel;
    const frames = state.frames;
    const currentIdx = state.currentFrame;

    panel.innerHTML = '';

    for (let i = 0; i < frames.length; i++) {
      if (i > 0) {
        const addBtn = document.createElement('button');
        addBtn.className = 'add-frame-btn';
        addBtn.textContent = '+';
        addBtn.title = '在此位置添加帧';
        addBtn.dataset.action = 'add-frame';
        addBtn.dataset.insertAfter = String(i - 1);
        panel.appendChild(addBtn);
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'frame-thumbnail-wrapper';

      const canvas = document.createElement('canvas');
      canvas.className = 'frame-thumbnail' + (i === currentIdx ? ' active' : '');
      canvas.width = state.gridSize * THUMBNAIL_CELL_SIZE;
      canvas.height = state.gridSize * THUMBNAIL_CELL_SIZE;
      canvas.dataset.action = 'select-frame';
      canvas.dataset.frameIndex = String(i);

      const thumbCtx = canvas.getContext('2d')!;
      this.drawFrameToCtx(thumbCtx, frames[i], THUMBNAIL_CELL_SIZE, false);

      const label = document.createElement('span');
      label.className = 'frame-number';
      label.textContent = `帧 ${i + 1}`;

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);

      if (frames.length > state.minFrames) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-frame-btn';
        removeBtn.textContent = '×';
        removeBtn.title = '删除此帧';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '-6px';
        removeBtn.style.right = '-6px';
        removeBtn.style.width = '20px';
        removeBtn.style.height = '20px';
        removeBtn.style.fontSize = '14px';
        removeBtn.dataset.action = 'remove-frame';
        removeBtn.dataset.frameIndex = String(i);
        wrapper.appendChild(removeBtn);
      }

      panel.appendChild(wrapper);
    }

    if (frames.length < state.maxFrames) {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-frame-btn';
      addBtn.textContent = '+';
      addBtn.title = '添加新帧';
      addBtn.dataset.action = 'add-frame';
      addBtn.dataset.insertAfter = String(frames.length - 1);
      panel.appendChild(addBtn);
    }
  }

  renderPalette(): void {
    this.renderPaletteGrid(this.refs.paletteGrid, 'palette-color');
    this.renderPaletteGrid(this.refs.mobilePaletteGrid, 'mobile-palette-color');
  }

  private renderPaletteGrid(container: HTMLDivElement, className: string): void {
    const palette = state.palette;
    const current = state.currentColor;
    container.innerHTML = '';

    for (const color of palette) {
      const el = document.createElement('div');
      el.className = className + (color === current ? ' active' : '');
      el.style.background = color;
      el.dataset.action = 'select-color';
      el.dataset.color = color;
      container.appendChild(el);
    }
  }

  renderSpeedButtons(): void {
    const currentSpeed = state.speed;
    this.refs.speedButtons.forEach(btn => {
      const speed = parseFloat(btn.dataset.speed || '0.3');
      if (Math.abs(speed - currentSpeed) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private handlePlayingChanged(): void {
    if (state.isPlaying) {
      state.setPreview(true);
    } else {
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    }
  }

  private handlePreviewChanged(): void {
    if (state.isPreview) {
      this.refs.previewOverlay.classList.add('active');
      this.playIndex = state.currentFrame;
      this.lastFrameTime = performance.now();
      this.startPreviewLoop();
    } else {
      this.refs.previewOverlay.classList.remove('active');
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      state.setPlaying(false);
    }
  }

  private startPreviewLoop(): void {
    const loop = (time: number) => {
      if (!state.isPlaying || !state.isPreview) {
        this.animFrameId = null;
        return;
      }

      const elapsed = time - this.lastFrameTime;
      const interval = state.speed * 1000;

      if (elapsed >= interval) {
        this.playIndex = (this.playIndex + 1) % state.frames.length;
        this.lastFrameTime = time;
        this.renderPreviewFrame(this.playIndex);
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.renderPreviewFrame(this.playIndex);
    this.animFrameId = requestAnimationFrame(loop);
  }

  private renderPreviewFrame(index: number): void {
    const frame = state.getFrame(index);
    if (!frame) return;

    this.drawFrameToCtx(this.previewCtx, frame, PREVIEW_CELL_SIZE, false);
    this.drawFrameToCtx(this.previewBgCtx, frame, PREVIEW_CELL_SIZE, false);

    this.refs.previewFrameNumber.textContent = String(index + 1);
  }

  showExportModal(json: string): void {
    this.refs.exportTextarea.value = json;
    this.refs.exportModalCard.classList.remove('closing');
    this.refs.exportModal.classList.add('active');
  }

  hideExportModal(): void {
    const card = this.refs.exportModalCard;
    card.classList.add('closing');
    setTimeout(() => {
      this.refs.exportModal.classList.remove('active');
      card.classList.remove('closing');
    }, 300);
  }

  showImportModal(): void {
    this.refs.importTextarea.value = '';
    this.refs.importTextarea.classList.remove('error');
    this.refs.importErrorText.textContent = '';
    this.refs.importModalCard.classList.remove('closing');
    this.refs.importModal.classList.add('active');
  }

  hideImportModal(): void {
    const card = this.refs.importModalCard;
    card.classList.add('closing');
    setTimeout(() => {
      this.refs.importModal.classList.remove('active');
      card.classList.remove('closing');
    }, 300);
  }

  showImportError(): void {
    this.refs.importTextarea.classList.add('error');
    this.refs.importErrorText.textContent = '数据格式错误';
    setTimeout(() => {
      this.refs.importTextarea.classList.remove('error');
      this.refs.importErrorText.textContent = '';
    }, 2000);
  }

  updateCopyButton(text: string): void {
    this.refs.copyBtn.textContent = text;
  }

  canvasPixelToGrid(canvasX: number, canvasY: number): { x: number; y: number } | null {
    const rect = this.refs.mainCanvas.getBoundingClientRect();
    const scaleX = this.refs.mainCanvas.width / rect.width;
    const scaleY = this.refs.mainCanvas.height / rect.height;
    const x = Math.floor(canvasX * scaleX / CELL_SIZE);
    const y = Math.floor(canvasY * scaleY / CELL_SIZE);
    if (x < 0 || x >= state.gridSize || y < 0 || y >= state.gridSize) return null;
    return { x, y };
  }

  clientToCanvasPixel(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.refs.mainCanvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return this.canvasPixelToGrid(cx, cy);
  }
}
