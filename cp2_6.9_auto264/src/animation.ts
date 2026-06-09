import type { PixelMatrix } from './canvas';

const GRID_SIZE = 32;
const THUMBNAIL_SIZE = 64;
const BG_COLOR = '#000000';
const FRAME_SPACING = 2;

export interface Frame {
  id: number;
  pixels: PixelMatrix;
}

export interface AnimationCallbacks {
  onFrameChange: (pixels: PixelMatrix) => void;
  getCurrentPixels: () => PixelMatrix;
}

function createEmptyMatrix(): PixelMatrix {
  const matrix: PixelMatrix = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    matrix.push(new Array(GRID_SIZE).fill(null));
  }
  return matrix;
}

function cloneMatrix(matrix: PixelMatrix): PixelMatrix {
  return matrix.map(row => [...row]);
}

export class AnimationManager {
  private frames: Frame[] = [];
  private currentFrameIndex = 0;
  private nextFrameId = 1;
  private isPlaying = false;
  private playbackSpeed = 1;
  private showOnionSkin = false;
  private currentPlayFrame = 0;
  private lastFrameTime = 0;
  private callbacks: AnimationCallbacks;
  private framesContainer: HTMLDivElement;
  private addFrameBtn: HTMLButtonElement;
  private deleteFrameBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLSpanElement;
  private onionSkinCheckbox: HTMLInputElement;
  private exportBtn: HTMLButtonElement;
  private draggedIndex: number | null = null;
  private rafId: number | null = null;

  constructor(callbacks: AnimationCallbacks) {
    this.callbacks = callbacks;

    this.framesContainer = document.getElementById('framesContainer') as HTMLDivElement;
    this.addFrameBtn = document.getElementById('addFrame') as HTMLButtonElement;
    this.deleteFrameBtn = document.getElementById('deleteFrame') as HTMLButtonElement;
    this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    this.speedValue = document.getElementById('speedValue') as HTMLSpanElement;
    this.onionSkinCheckbox = document.getElementById('onionSkin') as HTMLInputElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

    this.addFrame(createEmptyMatrix());
    this.bindEvents();
    this.renderFrames();
  }

  private bindEvents(): void {
    this.addFrameBtn.addEventListener('click', () => {
      this.saveCurrentFrame();
      this.addFrame(createEmptyMatrix());
      this.selectFrame(this.frames.length - 1);
    });

    this.deleteFrameBtn.addEventListener('click', () => {
      if (this.frames.length > 1) {
        this.frames.splice(this.currentFrameIndex, 1);
        if (this.currentFrameIndex >= this.frames.length) {
          this.currentFrameIndex = this.frames.length - 1;
        }
        this.callbacks.onFrameChange(this.frames[this.currentFrameIndex].pixels);
        this.renderFrames();
      }
    });

    this.playBtn.addEventListener('click', () => this.togglePlay());

    this.speedSlider.addEventListener('input', (e) => {
      this.playbackSpeed = parseFloat((e.target as HTMLInputElement).value);
      this.speedValue.textContent = this.playbackSpeed + 'x';
    });

    this.onionSkinCheckbox.addEventListener('change', (e) => {
      this.showOnionSkin = (e.target as HTMLInputElement).checked;
    });

    this.exportBtn.addEventListener('click', () => this.exportSpriteSheet());
  }

  addFrame(pixels: PixelMatrix): void {
    this.frames.push({
      id: this.nextFrameId++,
      pixels: cloneMatrix(pixels)
    });
    this.renderFrames();
  }

  selectFrame(index: number): void {
    if (index < 0 || index >= this.frames.length) return;
    this.saveCurrentFrame();
    this.currentFrameIndex = index;
    this.callbacks.onFrameChange(this.frames[index].pixels);
    this.renderFrames();
  }

  saveCurrentFrame(): void {
    if (this.frames[this.currentFrameIndex]) {
      this.frames[this.currentFrameIndex].pixels = this.callbacks.getCurrentPixels();
    }
  }

  private renderFrames(): void {
    this.framesContainer.innerHTML = '';
    this.frames.forEach((frame, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'frame-thumbnail-wrapper';
      if (index === this.currentFrameIndex) {
        wrapper.classList.add('active');
      }
      wrapper.draggable = true;
      wrapper.dataset.index = String(index);

      const numberLabel = document.createElement('span');
      numberLabel.className = 'frame-number';
      numberLabel.textContent = String(index + 1);

      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;
      canvas.className = 'frame-thumbnail';
      this.drawThumbnail(canvas, frame.pixels);

      wrapper.appendChild(numberLabel);
      wrapper.appendChild(canvas);

      wrapper.addEventListener('click', () => this.selectFrame(index));

      wrapper.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        wrapper.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
      });

      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging');
        this.draggedIndex = null;
        this.renderFrames();
      });

      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      });

      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        if (this.draggedIndex !== null && this.draggedIndex !== index) {
          this.saveCurrentFrame();
          const [removed] = this.frames.splice(this.draggedIndex, 1);
          this.frames.splice(index, 0, removed);
          this.currentFrameIndex = index;
          this.callbacks.onFrameChange(this.frames[index].pixels);
          this.renderFrames();
        }
      });

      this.framesContainer.appendChild(wrapper);
    });
  }

  updateCurrentThumbnail(): void {
    this.saveCurrentFrame();
    const wrapper = this.framesContainer.children[this.currentFrameIndex] as HTMLElement;
    if (wrapper) {
      const canvas = wrapper.querySelector('.frame-thumbnail') as HTMLCanvasElement;
      if (canvas) {
        this.drawThumbnail(canvas, this.frames[this.currentFrameIndex].pixels);
      }
    }
  }

  private drawThumbnail(canvas: HTMLCanvasElement, pixels: PixelMatrix): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pxSize = THUMBNAIL_SIZE / GRID_SIZE;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = pixels[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * pxSize, y * pxSize, pxSize, pxSize);
        }
      }
    }
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    this.playBtn.textContent = this.isPlaying ? '⏸ 暂停' : '▶ 播放';

    if (this.isPlaying) {
      this.currentPlayFrame = this.currentFrameIndex;
      this.lastFrameTime = performance.now();
      this.animate();
    } else if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.callbacks.onFrameChange(this.frames[this.currentFrameIndex].pixels);
      this.renderFrames();
    }
  }

  private animate(): void {
    if (!this.isPlaying) return;

    const now = performance.now();
    const frameDuration = 200 / this.playbackSpeed;

    if (now - this.lastFrameTime >= frameDuration) {
      this.lastFrameTime = now;
      this.currentPlayFrame = (this.currentPlayFrame + 1) % this.frames.length;

      const currentPixels = this.frames[this.currentPlayFrame].pixels;

      if (this.showOnionSkin) {
        const prevIndex = (this.currentPlayFrame - 1 + this.frames.length) % this.frames.length;
        const prevPixels = this.frames[prevIndex].pixels;
        this.callbacks.onFrameChange(this.blendFrames(prevPixels, currentPixels, 0.4));
      } else {
        this.callbacks.onFrameChange(currentPixels);
      }

      const wrappers = this.framesContainer.querySelectorAll('.frame-thumbnail-wrapper');
      wrappers.forEach((w, i) => {
        if (i === this.currentPlayFrame) {
          w.classList.add('playing');
        } else {
          w.classList.remove('playing');
        }
      });
    }

    this.rafId = requestAnimationFrame(() => this.animate());
  }

  private blendFrames(bottom: PixelMatrix, top: PixelMatrix, topAlpha: number): PixelMatrix {
    const result: PixelMatrix = createEmptyMatrix();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const bColor = bottom[y][x];
        const tColor = top[y][x];
        if (tColor) {
          result[y][x] = tColor;
        } else if (bColor) {
          result[y][x] = this.fadeColor(bColor, topAlpha);
        }
      }
    }
    return result;
  }

  private fadeColor(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  exportSpriteSheet(): void {
    this.saveCurrentFrame();
    const numFrames = this.frames.length;
    const totalWidth = numFrames * GRID_SIZE + (numFrames - 1) * FRAME_SPACING;
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, totalWidth, GRID_SIZE);

    this.frames.forEach((frame, i) => {
      const offsetX = i * (GRID_SIZE + FRAME_SPACING);
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const color = frame.pixels[y][x];
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x, y, 1, 1);
          }
        }
      }
    });

    const dataUrl = canvas.toDataURL('image/png');
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head><title>导出精灵图</title></head>
          <body style="margin:0;display:flex;flex-direction:column;align-items:center;background:#121218;padding:20px;">
            <h2 style="color:white;margin-bottom:16px;">精灵图导出</h2>
            <img src="${dataUrl}" style="image-rendering:pixelated;image-rendering:crisp-edges;max-width:100%;border:2px solid #444;" />
            <p style="color:#aaa;margin-top:16px;">右键图片 → 另存为...</p>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  }

  getFrames(): Frame[] {
    return this.frames;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }
}
