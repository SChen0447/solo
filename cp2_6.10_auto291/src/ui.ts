import { PixelCanvas } from './pixelCanvas.js';
import { AnimationManager } from './animation.js';
import { Tool, LoopMode, PICO8_PALETTE, ProjectData } from './types.js';

export interface UICallbacks {
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onPaletteChange: (colors: string[]) => void;
  onCanvasSizeChange: (size: number) => void;
  onSaveProject: () => ProjectData;
  onLoadProject: (data: ProjectData) => void;
}

export class UIManager {
  private pixelCanvas: PixelCanvas;
  private animation: AnimationManager;
  private callbacks: UICallbacks;
  private palette: string[];
  private currentTool: Tool = 'pencil1';
  private currentColor: string = PICO8_PALETTE[0];
  private previewScale: number = 2;
  private playingFrameIndex: number = -1;
  private draggedFrameIndex: number = -1;

  constructor(pixelCanvas: PixelCanvas, animation: AnimationManager, callbacks: UICallbacks) {
    this.pixelCanvas = pixelCanvas;
    this.animation = animation;
    this.callbacks = callbacks;
    this.palette = [...PICO8_PALETTE];
    this.currentColor = this.palette[0];
  }

  public init(): void {
    this.setupPalette();
    this.setupTools();
    this.setupActions();
    this.setupTimeline();
    this.setupCanvas();
    this.updateCurrentColorUI();
  }

  private setupPalette(): void {
    const paletteEl = document.getElementById('palette')!;
    paletteEl.innerHTML = '';

    this.palette.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-color';
      if (index === 0) swatch.classList.add('active');
      swatch.style.backgroundColor = color;
      swatch.dataset.index = String(index);
      swatch.title = color;

      const editInput = document.createElement('input');
      editInput.className = 'edit-hex';
      editInput.type = 'text';
      editInput.value = color;
      editInput.maxLength = 7;
      editInput.addEventListener('click', (e) => e.stopPropagation());
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = (e.target as HTMLInputElement).value.trim();
          if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            this.palette[index] = val.toUpperCase();
            swatch.style.backgroundColor = val.toUpperCase();
            if (this.pixelCanvas.getColor() === color) {
              this.setCurrentColor(val.toUpperCase());
            }
            this.callbacks.onPaletteChange(this.palette);
          }
          swatch.classList.remove('editing');
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          swatch.classList.remove('editing');
          (e.target as HTMLInputElement).blur();
        }
      });
      editInput.addEventListener('blur', () => {
        swatch.classList.remove('editing');
      });

      swatch.appendChild(editInput);

      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        this.setCurrentColor(this.palette[index]);
        document.querySelectorAll('.palette-color').forEach(p => p.classList.remove('active'));
        swatch.classList.add('active');
      });

      swatch.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.palette-color').forEach(p => p.classList.remove('editing'));
        swatch.classList.add('editing');
        editInput.value = this.palette[index];
        editInput.focus();
        editInput.select();
      });

      paletteEl.appendChild(swatch);
    });
  }

  private setCurrentColor(color: string): void {
    this.currentColor = color;
    this.pixelCanvas.setColor(color);
    this.callbacks.onColorChange(color);
    this.updateCurrentColorUI();
  }

  private updateCurrentColorUI(): void {
    const preview = document.getElementById('color-preview')!;
    const hex = document.getElementById('color-hex')!;
    preview.style.backgroundColor = this.currentColor;
    hex.textContent = this.currentColor;
  }

  private setupTools(): void {
    const toolBtns = document.querySelectorAll('.tool-btn');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = (btn as HTMLElement).dataset.tool as Tool;
        this.currentTool = tool;
        this.pixelCanvas.setTool(tool);
        this.callbacks.onToolChange(tool);
      });
    });
  }

  private setupActions(): void {
    const undoBtn = document.getElementById('undo-btn')!;
    const redoBtn = document.getElementById('redo-btn')!;
    const clearBtn = document.getElementById('clear-btn')!;
    const saveBtn = document.getElementById('save-btn')!;
    const loadBtn = document.getElementById('load-btn')!;
    const loadFile = document.getElementById('load-file') as HTMLInputElement;
    const canvasSizeSelect = document.getElementById('canvas-size') as HTMLSelectElement;

    undoBtn.addEventListener('click', () => {
      if (this.pixelCanvas.undo()) {
        this.syncFrameFromCanvas();
      }
    });

    redoBtn.addEventListener('click', () => {
      if (this.pixelCanvas.redo()) {
        this.syncFrameFromCanvas();
      }
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('确定要清空当前画布吗？')) {
        this.pixelCanvas.clear();
        this.syncFrameFromCanvas();
        this.refreshCurrentFrameThumbnail();
      }
    });

    saveBtn.addEventListener('click', () => {
      this.saveProject();
    });

    loadBtn.addEventListener('click', () => {
      loadFile.click();
    });

    loadFile.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadProject(file);
      }
      loadFile.value = '';
    });

    canvasSizeSelect.addEventListener('change', () => {
      const newSize = parseInt(canvasSizeSelect.value);
      if (confirm(`更改画布尺寸为 ${newSize}x${newSize}？\n（所有帧将被重置）`)) {
        this.animation.clear();
        this.pixelCanvas.resize(newSize);
        this.animation.resizeAll(newSize);
        this.animation.addFrame();
        this.callbacks.onCanvasSizeChange(newSize);
        this.refreshFrameList();
        this.loadFrameToCanvas(0);
      } else {
        canvasSizeSelect.value = String(this.pixelCanvas.getSize());
      }
    });
  }

  private setupTimeline(): void {
    const playBtn = document.getElementById('play-btn')!;
    const stopBtn = document.getElementById('stop-btn')!;
    const loopModeSelect = document.getElementById('loop-mode') as HTMLSelectElement;
    const addFrameBtn = document.getElementById('add-frame-btn')!;
    const dupFrameBtn = document.getElementById('dup-frame-btn')!;
    const delFrameBtn = document.getElementById('del-frame-btn')!;
    const exportSpritesheetBtn = document.getElementById('export-spritesheet')!;
    const exportGifBtn = document.getElementById('export-gif')!;
    const previewScale = document.getElementById('preview-scale') as HTMLInputElement;
    const scaleValue = document.getElementById('scale-value')!;

    playBtn.addEventListener('click', () => {
      if (this.animation.getIsPlaying()) {
        this.animation.stop();
        playBtn.textContent = '▶ 播放';
      } else {
        this.animation.play();
        playBtn.textContent = '⏸ 暂停';
      }
    });

    stopBtn.addEventListener('click', () => {
      this.animation.stop();
      playBtn.textContent = '▶ 播放';
    });

    loopModeSelect.addEventListener('change', () => {
      this.animation.setLoopMode(loopModeSelect.value as LoopMode);
    });

    addFrameBtn.addEventListener('click', () => {
      this.syncFrameFromCanvas();
      this.animation.addFrame();
      this.refreshFrameList();
      this.loadFrameToCanvas(this.animation.getCurrentFrameIndex());
    });

    dupFrameBtn.addEventListener('click', () => {
      this.syncFrameFromCanvas();
      this.animation.duplicateFrame(this.animation.getCurrentFrameIndex());
      this.refreshFrameList();
      this.loadFrameToCanvas(this.animation.getCurrentFrameIndex());
    });

    delFrameBtn.addEventListener('click', () => {
      if (this.animation.getFrameCount() <= 1) {
        this.showToast('至少需要保留一帧');
        return;
      }
      if (confirm('确定要删除当前帧吗？')) {
        this.animation.deleteFrame(this.animation.getCurrentFrameIndex());
        this.refreshFrameList();
        this.loadFrameToCanvas(this.animation.getCurrentFrameIndex());
      }
    });

    exportSpritesheetBtn.addEventListener('click', () => {
      this.exportSpritesheet();
    });

    exportGifBtn.addEventListener('click', () => {
      this.exportGif();
    });

    previewScale.addEventListener('input', () => {
      this.previewScale = parseInt(previewScale.value);
      scaleValue.textContent = `${this.previewScale}x`;
      this.updatePreviewCanvasSize();
    });

    this.updatePreviewCanvasSize();
  }

  private updatePreviewCanvasSize(): void {
    const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    const size = this.pixelCanvas.getSize() * this.previewScale;
    previewCanvas.style.height = `${size}px`;
    previewCanvas.width = this.pixelCanvas.getSize();
    previewCanvas.height = this.pixelCanvas.getSize();
  }

  private setupCanvas(): void {
    window.addEventListener('resize', () => {
      this.pixelCanvas.render();
    });
  }

  public refreshFrameList(): void {
    const frameList = document.getElementById('frame-list')!;
    frameList.innerHTML = '';
    const frames = this.animation.getAllFrames();
    const size = this.pixelCanvas.getSize();

    frames.forEach((frame, index) => {
      const item = document.createElement('div');
      item.className = 'frame-item';
      if (index === this.animation.getCurrentFrameIndex()) item.classList.add('active');
      item.dataset.index = String(index);
      item.draggable = true;

      const thumb = document.createElement('canvas');
      thumb.width = size;
      thumb.height = size;
      const thumbCtx = thumb.getContext('2d')!;
      thumbCtx.imageSmoothingEnabled = false;
      this.animation.renderFrameToCanvas(frame, thumbCtx, size);

      const info = document.createElement('div');
      info.className = 'frame-info';

      const frameNum = document.createElement('span');
      frameNum.className = 'frame-number';
      frameNum.textContent = `#${index + 1}`;

      const duration = document.createElement('input');
      duration.className = 'frame-duration';
      duration.type = 'number';
      duration.min = '100';
      duration.max = '2000';
      duration.step = '50';
      duration.value = String(frame.duration);
      duration.title = '帧时长 (ms)';

      duration.addEventListener('change', (e) => {
        e.stopPropagation();
        let val = parseInt((e.target as HTMLInputElement).value);
        val = Math.max(100, Math.min(2000, val || 100));
        (e.target as HTMLInputElement).value = String(val);
        this.animation.setFrameDuration(index, val);
      });

      duration.addEventListener('click', (e) => e.stopPropagation());
      duration.addEventListener('mousedown', (e) => e.stopPropagation());

      info.appendChild(frameNum);
      info.appendChild(duration);

      item.appendChild(thumb);
      item.appendChild(info);

      item.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).classList.contains('frame-duration')) return;
        this.syncFrameFromCanvas();
        this.animation.setCurrentFrame(index);
        this.refreshFrameListActive();
        this.loadFrameToCanvas(index);
      });

      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (this.animation.getFrameCount() <= 1) {
          this.showToast('至少需要保留一帧');
          return;
        }
        if (confirm('确定要删除此帧吗？')) {
          this.animation.deleteFrame(index);
          this.refreshFrameList();
          this.loadFrameToCanvas(this.animation.getCurrentFrameIndex());
        }
      });

      item.addEventListener('dragstart', (e) => {
        this.draggedFrameIndex = index;
        item.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.frame-item').forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const toIndex = parseInt(item.dataset.index!);
        if (this.draggedFrameIndex !== -1 && this.draggedFrameIndex !== toIndex) {
          this.animation.moveFrame(this.draggedFrameIndex, toIndex);
          this.refreshFrameList();
          this.loadFrameToCanvas(this.animation.getCurrentFrameIndex());
        }
        this.draggedFrameIndex = -1;
      });

      frameList.appendChild(item);
    });
  }

  public refreshFrameListActive(): void {
    document.querySelectorAll('.frame-item').forEach((el, idx) => {
      el.classList.toggle('active', idx === this.animation.getCurrentFrameIndex());
    });
  }

  public refreshCurrentFrameThumbnail(): void {
    const index = this.animation.getCurrentFrameIndex();
    const items = document.querySelectorAll('.frame-item');
    if (index >= 0 && index < items.length) {
      const thumb = items[index].querySelector('canvas') as HTMLCanvasElement;
      if (thumb) {
        const size = this.pixelCanvas.getSize();
        const frame = this.animation.getCurrentFrame();
        if (frame) {
          const ctx = thumb.getContext('2d')!;
          ctx.imageSmoothingEnabled = false;
          this.animation.renderFrameToCanvas(frame, ctx, size);
        }
      }
    }
  }

  public loadFrameToCanvas(index: number): void {
    const frame = this.animation.getFrame(index);
    if (frame) {
      this.pixelCanvas.setData(frame.data);
    }
  }

  public syncFrameFromCanvas(): void {
    this.animation.updateCurrentFrameData(this.pixelCanvas.getData());
    this.refreshCurrentFrameThumbnail();
  }

  public onPlaybackFrame(index: number): void {
    const oldPlaying = this.playingFrameIndex;
    this.playingFrameIndex = index;
    document.querySelectorAll('.frame-item').forEach((el, idx) => {
      if (idx === oldPlaying) el.classList.remove('playing');
      if (idx === index) el.classList.add('playing');
    });

    const frame = this.animation.getFrame(index);
    if (frame) {
      const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
      const ctx = previewCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      const size = this.pixelCanvas.getSize();
      previewCanvas.width = size;
      previewCanvas.height = size;
      ctx.imageSmoothingEnabled = false;
      this.animation.renderFrameToCanvas(frame, ctx, size);
    }
  }

  public onPlaybackStop(): void {
    const idx = this.playingFrameIndex;
    this.playingFrameIndex = -1;
    document.querySelectorAll('.frame-item').forEach((el, i) => {
      if (i === idx) el.classList.remove('playing');
    });
    const playBtn = document.getElementById('play-btn')!;
    playBtn.textContent = '▶ 播放';
  }

  public refreshPreview(): void {
    const frame = this.animation.getCurrentFrame();
    if (frame) {
      const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
      const ctx = previewCanvas.getContext('2d')!;
      const size = this.pixelCanvas.getSize();
      previewCanvas.width = size;
      previewCanvas.height = size;
      ctx.imageSmoothingEnabled = false;
      this.animation.renderFrameToCanvas(frame, ctx, size);
    }
  }

  private exportSpritesheet(): void {
    this.syncFrameFromCanvas();
    const optTransparent = (document.getElementById('opt-transparent') as HTMLInputElement).checked;
    const optCrop = (document.getElementById('opt-crop') as HTMLInputElement).checked;

    const canvas = this.animation.exportSpritesheet({
      transparent: optTransparent,
      crop: optCrop,
      gap: 2
    });

    canvas.toBlob((blob) => {
      if (blob) {
        this.downloadBlob(blob, 'spritesheet.png');
        this.showToast('Spritesheet 已导出');
      }
    }, 'image/png');
  }

  private async exportGif(): Promise<void> {
    this.syncFrameFromCanvas();
    this.showToast('正在生成 GIF...');
    const optTransparent = (document.getElementById('opt-transparent') as HTMLInputElement).checked;
    const optCrop = (document.getElementById('opt-crop') as HTMLInputElement).checked;

    try {
      const blob = await this.animation.exportGif({
        scale: this.previewScale,
        transparent: optTransparent,
        crop: optCrop
      });
      this.downloadBlob(blob, 'animation.gif');
      this.showToast('GIF 已导出');
    } catch (e) {
      console.error(e);
      this.showToast('GIF 导出失败');
    }
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public saveProject(): void {
    this.syncFrameFromCanvas();
    const data = this.callbacks.onSaveProject();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this.downloadBlob(blob, 'project.pixel');
    this.showToast('项目已保存');
  }

  public async loadProject(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ProjectData;
      if (!data.version || !data.frames || !data.palette) {
        throw new Error('无效的项目文件');
      }
      this.callbacks.onLoadProject(data);
      this.showToast('项目已加载');
    } catch (e) {
      console.error(e);
      this.showToast('项目加载失败');
    }
  }

  public showToast(message: string): void {
    const toast = document.getElementById('toast')!;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  public setPalette(colors: string[]): void {
    this.palette = [...colors];
    this.setupPalette();
  }

  public getPalette(): string[] {
    return [...this.palette];
  }

  public setCanvasSizeSelect(size: number): void {
    const select = document.getElementById('canvas-size') as HTMLSelectElement;
    select.value = String(size);
  }

  public setLoopModeSelect(mode: LoopMode): void {
    const select = document.getElementById('loop-mode') as HTMLSelectElement;
    select.value = mode;
  }
}
