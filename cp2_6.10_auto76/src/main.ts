import { generateNoiseMap, type NoiseMap } from './noiseGenerator';
import { getPalette, type BiomePalette, BIOME_PALETTES } from './biomePalette';
import {
  paintTexture,
  renderImageData,
  TEXTURE_SIZE,
  createDissolveAnimation,
  startDissolve,
  tickDissolve,
  exportAsPNG,
  createThumbnail,
  type DissolveAnimation
} from './texturePainter';

interface HistoryEntry {
  seed: number;
  scale: number;
  biome: string;
  imageData: ImageData;
  thumbnail: HTMLCanvasElement;
}

class TerrainTextureApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displaySize: number = 600;

  private currentSeed: number = Date.now() & 0xffffffff;
  private currentScale: number = 4;
  private currentBiome: string = 'forest';
  private currentNoiseMap: NoiseMap | null = null;
  private currentImageData: ImageData | null = null;

  private dissolveAnim: DissolveAnimation;
  private history: HistoryEntry[] = [];
  private readonly MAX_HISTORY = 5;

  private scaleThrottleTimer: number | null = null;
  private readonly SCALE_THROTTLE_MS = 50;

  private seedDisplay: HTMLElement;
  private scaleSlider: HTMLInputElement;
  private scaleValue: HTMLElement;
  private generateBtn: HTMLElement;
  private exportBtn: HTMLElement;
  private biomeBtns: NodeListOf<HTMLElement>;
  private historyList: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('textureCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dissolveAnim = createDissolveAnimation();

    this.seedDisplay = document.getElementById('seedDisplay')!;
    this.scaleSlider = document.getElementById('scaleSlider') as HTMLInputElement;
    this.scaleValue = document.getElementById('scaleValue')!;
    this.generateBtn = document.getElementById('generateBtn')!;
    this.exportBtn = document.getElementById('exportBtn')!;
    this.biomeBtns = document.querySelectorAll('.biome-btn');
    this.historyList = document.getElementById('historyList')!;

    this.bindEvents();
    this.updateCanvasSize();
    this.generateAndRender(true);
    this.animationLoop();
  }

  private bindEvents(): void {
    this.biomeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const biome = btn.dataset.biome!;
        if (biome !== this.currentBiome) {
          this.setBiome(biome);
        }
      });
    });

    this.generateBtn.addEventListener('click', () => {
      this.randomSeed();
      this.generateAndRender(false, true);
    });

    this.exportBtn.addEventListener('click', () => {
      this.exportTexture();
    });

    this.scaleSlider.addEventListener('input', () => {
      const newScale = parseFloat(this.scaleSlider.value);
      this.scaleValue.textContent = newScale.toFixed(1);
      this.throttledScaleUpdate(newScale);
    });

    window.addEventListener('resize', () => {
      this.updateCanvasSize();
      if (this.currentImageData) {
        renderImageData(this.ctx, this.currentImageData, this.displaySize, this.displaySize);
      }
    });
  }

  private updateCanvasSize(): void {
    const isMobileLandscape = window.innerWidth <= 768 && window.innerHeight < window.innerWidth;
    const isSmallMobile = window.innerWidth <= 480;

    if (isMobileLandscape || isSmallMobile) {
      this.displaySize = Math.min(window.innerWidth * 0.9, 500);
    } else {
      this.displaySize = 600;
    }

    this.canvas.style.width = this.displaySize + 'px';
    this.canvas.style.height = this.displaySize + 'px';
  }

  private setBiome(biome: string): void {
    this.currentBiome = biome;

    this.biomeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.biome === biome);
    });

    this.updateSliderTrackColor();
    this.renderWithDissolve();
  }

  private updateSliderTrackColor(): void {
    const palette = getPalette(this.currentBiome);
    const val = parseFloat(this.scaleSlider.value);
    const min = parseFloat(this.scaleSlider.min);
    const max = parseFloat(this.scaleSlider.max);
    const percent = ((val - min) / (max - min)) * 100;

    this.scaleSlider.style.background =
      `linear-gradient(to right, ${palette.themeColor} 0%, ${palette.themeColor} ${percent}%, #0f0f1e ${percent}%, #0f0f1e 100%)`;
  }

  private randomSeed(): void {
    this.currentSeed = (Math.random() * 0xffffffff) >>> 0;
    this.seedDisplay.textContent = `Seed: ${this.currentSeed}`;
  }

  private throttledScaleUpdate(newScale: number): void {
    this.currentScale = newScale;
    this.updateSliderTrackColor();

    if (this.scaleThrottleTimer !== null) {
      return;
    }

    this.scaleThrottleTimer = window.setTimeout(() => {
      this.scaleThrottleTimer = null;
      this.generateAndRender(false, false);
    }, this.SCALE_THROTTLE_MS);
  }

  private generateAndRender(isInitial: boolean, addToHistory: boolean = false): void {
    this.currentNoiseMap = generateNoiseMap({
      seed: this.currentSeed,
      scale: this.currentScale,
      width: TEXTURE_SIZE,
      height: TEXTURE_SIZE
    });

    const palette = getPalette(this.currentBiome);
    const newImageData = paintTexture({
      noiseMap: this.currentNoiseMap,
      palette
    });

    if (isInitial || !this.currentImageData) {
      this.currentImageData = newImageData;
      renderImageData(this.ctx, this.currentImageData, this.displaySize, this.displaySize);
    } else {
      const oldImageData = this.currentImageData;
      this.currentImageData = newImageData;
      startDissolve(this.dissolveAnim, oldImageData, newImageData);
    }

    this.seedDisplay.textContent = `Seed: ${this.currentSeed}`;
    this.updateSliderTrackColor();

    if (addToHistory) {
      this.addToHistory();
    }
  }

  private renderWithDissolve(): void {
    if (!this.currentNoiseMap) return;

    const palette = getPalette(this.currentBiome);
    const newImageData = paintTexture({
      noiseMap: this.currentNoiseMap,
      palette
    });

    const oldImageData = this.currentImageData || newImageData;
    this.currentImageData = newImageData;

    startDissolve(this.dissolveAnim, oldImageData, newImageData);
  }

  private exportTexture(): void {
    if (!this.currentImageData) return;
    const filename = `terrain_${this.currentBiome}_${this.currentSeed}.png`;
    exportAsPNG(this.canvas, filename);
  }

  private addToHistory(): void {
    if (!this.currentImageData) return;

    const palette = getPalette(this.currentBiome);
    const entry: HistoryEntry = {
      seed: this.currentSeed,
      scale: this.currentScale,
      biome: this.currentBiome,
      imageData: new ImageData(
        new Uint8ClampedArray(this.currentImageData.data),
        this.currentImageData.width,
        this.currentImageData.height
      ),
      thumbnail: createThumbnail(this.currentImageData)
    };

    this.history.unshift(entry);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.pop();
    }

    this.renderHistory();
  }

  private renderHistory(): void {
    if (this.history.length === 0) {
      this.historyList.innerHTML = '<div class="empty-history">暂无历史记录，点击「生成新纹理」开始创作</div>';
      return;
    }

    this.historyList.innerHTML = '';

    this.history.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      if (entry.seed === this.currentSeed && entry.biome === this.currentBiome) {
        item.classList.add('active');
      }

      const seedLabel = document.createElement('div');
      seedLabel.className = 'history-seed';
      seedLabel.textContent = `#${entry.seed.toString(36).slice(0, 6)}`;

      item.appendChild(entry.thumbnail);
      item.appendChild(seedLabel);

      item.addEventListener('click', () => {
        this.restoreFromHistory(index);
      });

      this.historyList.appendChild(item);
    });

    this.historyList.scrollLeft = 0;
  }

  private restoreFromHistory(index: number): void {
    const entry = this.history[index];
    if (!entry) return;

    this.currentSeed = entry.seed;
    this.currentScale = entry.scale;
    this.currentBiome = entry.biome;

    this.scaleSlider.value = entry.scale.toString();
    this.scaleValue.textContent = entry.scale.toFixed(1);

    this.biomeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.biome === entry.biome);
    });

    this.seedDisplay.textContent = `Seed: ${this.currentSeed}`;
    this.updateSliderTrackColor();

    this.currentNoiseMap = generateNoiseMap({
      seed: entry.seed,
      scale: entry.scale,
      width: TEXTURE_SIZE,
      height: TEXTURE_SIZE
    });

    const oldImageData = this.currentImageData || entry.imageData;
    this.currentImageData = entry.imageData;
    startDissolve(this.dissolveAnim, oldImageData, entry.imageData);

    this.renderHistory();
  }

  private animationLoop(): void {
    if (this.dissolveAnim.running) {
      tickDissolve(this.dissolveAnim, this.ctx, this.displaySize, this.displaySize);
    }
    requestAnimationFrame(() => this.animationLoop());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TerrainTextureApp();
});
