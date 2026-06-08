import { HandwritingInput, type CharSample } from './input';
import { StyleEngine, type GeneratedChar } from './styleEngine';
import { PreviewRenderer, type BackgroundMode } from './preview';

class App {
  private handwritingInput!: HandwritingInput;
  private styleEngine!: StyleEngine;
  private previewRenderer!: PreviewRenderer;

  private drawingCanvas!: HTMLCanvasElement;
  private glyphGrid!: HTMLElement;
  private sampleCountEl!: HTMLElement;
  private charInput!: HTMLInputElement;
  private previewInput!: HTMLInputElement;
  private zoomSlider!: HTMLInputElement;
  private zoomValue!: HTMLElement;
  private progressFill!: HTMLElement;
  private progressText!: HTMLElement;
  private generateBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private confirmBtn!: HTMLButtonElement;
  private canvasPlaceholder!: HTMLElement;
  private previewWrapper!: HTMLElement;
  private previewCanvas!: HTMLCanvasElement;

  private currentColor: string = '#3B4D8F';
  private currentBg: BackgroundMode = 'white';
  private hasDrawing: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.cacheElements();
    this.setupModules();
    this.bindEvents();
    this.updateSampleCount();
    this.updateGenerateButton();
  }

  private cacheElements(): void {
    this.drawingCanvas = document.getElementById('drawingCanvas') as HTMLCanvasElement;
    this.glyphGrid = document.getElementById('glyphGrid') as HTMLElement;
    this.sampleCountEl = document.getElementById('sampleCount') as HTMLElement;
    this.charInput = document.getElementById('charInput') as HTMLInputElement;
    this.previewInput = document.getElementById('previewInput') as HTMLInputElement;
    this.zoomSlider = document.getElementById('zoomSlider') as HTMLInputElement;
    this.zoomValue = document.getElementById('zoomValue') as HTMLElement;
    this.progressFill = document.getElementById('progressFill') as HTMLElement;
    this.progressText = document.getElementById('progressText') as HTMLElement;
    this.generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearCanvas') as HTMLButtonElement;
    this.confirmBtn = document.getElementById('confirmChar') as HTMLButtonElement;
    this.canvasPlaceholder = document.getElementById('canvasPlaceholder') as HTMLElement;
    this.previewWrapper = document.getElementById('previewWrapper') as HTMLElement;
    this.previewCanvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
  }

  private setupModules(): void {
    this.handwritingInput = new HandwritingInput(this.drawingCanvas);
    this.styleEngine = new StyleEngine();
    this.previewRenderer = new PreviewRenderer(this.previewCanvas, this.previewWrapper);

    setTimeout(() => {
      this.handwritingInput.resize();
      this.previewRenderer.resize();
    }, 50);

    this.previewRenderer.setText(this.previewInput.value);
  }

  private bindEvents(): void {
    this.drawingCanvas.addEventListener('mousedown', () => this.onDrawingStart());
    this.drawingCanvas.addEventListener('touchstart', () => this.onDrawingStart(), { passive: true });

    this.clearBtn.addEventListener('click', () => this.clearCanvas());
    this.confirmBtn.addEventListener('click', () => this.confirmCharacter());

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const color = target.dataset.color;
        if (color) {
          this.setColor(color);
        }
      });
    });

    document.querySelectorAll('.bg-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const bg = target.dataset.bg as BackgroundMode;
        if (bg) {
          this.setBackground(bg);
        }
      });
    });

    this.charInput.addEventListener('input', () => {
      const val = this.charInput.value;
      if (val.length > 0) {
        this.charInput.value = val.charAt(val.length - 1);
      }
      this.updateConfirmButton();
    });

    this.zoomSlider.addEventListener('input', () => {
      const scale = parseFloat(this.zoomSlider.value);
      this.zoomValue.textContent = `${scale.toFixed(1)}x`;
      this.previewRenderer.setScale(scale);
    });

    this.previewInput.addEventListener('input', () => {
      this.previewRenderer.setText(this.previewInput.value);
    });

    this.generateBtn.addEventListener('click', () => this.generateFont());

    window.addEventListener('resize', () => {
      this.handwritingInput.resize();
      this.previewRenderer.resize();
    });

    this.charInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.confirmCharacter();
      }
    });
  }

  private onDrawingStart(): void {
    this.hasDrawing = true;
    this.canvasPlaceholder.classList.add('hidden');
    this.updateConfirmButton();
  }

  private clearCanvas(): void {
    this.handwritingInput.clear();
    this.hasDrawing = false;
    this.canvasPlaceholder.classList.remove('hidden');
    this.updateConfirmButton();
  }

  private confirmCharacter(): void {
    const char = this.charInput.value.trim();
    if (!char || !this.hasDrawing) return;

    const sample = this.handwritingInput.captureCharacter(char);
    if (sample) {
      this.styleEngine.addSample(sample);
      this.addGlyphToGrid(sample);
      this.updateSampleCount();
      this.updateGenerateButton();
      this.previewRenderer.forceRender();
    }

    this.clearCanvas();
    this.charInput.value = '';
    this.updateConfirmButton();

    const samples = this.styleEngine.getSamples();
    const nextChar = this.getNextSuggestedChar(samples);
    if (nextChar) {
      this.charInput.placeholder = `建议: ${nextChar}`;
    }
  }

  private getNextSuggestedChar(samples: CharSample[]): string {
    const sampleChars = new Set(samples.map(s => s.char));
    const suggestedOrder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (const c of suggestedOrder) {
      if (!sampleChars.has(c)) {
        return c;
      }
    }
    return '';
  }

  private addGlyphToGrid(sample: CharSample): void {
    const existing = this.glyphGrid.querySelector(`[data-char="${sample.char}"]`);
    if (existing) {
      existing.remove();
    }

    const emptyHint = this.glyphGrid.querySelector('.glyph-empty-hint');
    if (emptyHint) {
      emptyHint.remove();
    }

    const item = document.createElement('div');
    item.className = 'glyph-item new';
    item.dataset.char = sample.char;
    item.title = `点击删除 ${sample.char}`;

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 48;
    thumbCanvas.height = 48;
    const ctx = thumbCanvas.getContext('2d');
    if (ctx) {
      const padding = 4;
      const scale = Math.min(
        (48 - padding * 2) / sample.canvas.width,
        (48 - padding * 2) / sample.canvas.height
      );
      const drawW = sample.canvas.width * scale;
      const drawH = sample.canvas.height * scale;
      ctx.drawImage(
        sample.canvas,
        (48 - drawW) / 2,
        (48 - drawH) / 2,
        drawW,
        drawH
      );
    }
    item.appendChild(thumbCanvas);

    const label = document.createElement('span');
    label.className = 'glyph-label';
    label.textContent = sample.char;
    item.appendChild(label);

    item.addEventListener('click', () => {
      if (confirm(`删除字符样本 "${sample.char}"？`)) {
        this.styleEngine.removeSample(sample.char);
        item.remove();
        this.updateSampleCount();
        this.updateGenerateButton();

        if (this.glyphGrid.children.length === 0) {
          this.glyphGrid.innerHTML = '<div class="glyph-empty-hint">书写字符后将显示在这里</div>';
        }
      }
    });

    this.glyphGrid.appendChild(item);

    setTimeout(() => {
      item.classList.remove('new');
    }, 400);
  }

  private updateSampleCount(): void {
    const count = this.styleEngine.getSampleCount();
    this.sampleCountEl.textContent = count.toString();
    if (count >= 10) {
      this.sampleCountEl.style.color = '#3B8F3B';
    } else {
      this.sampleCountEl.style.color = '#3B4D8F';
    }
  }

  private updateConfirmButton(): void {
    const hasChar = this.charInput.value.trim().length > 0;
    this.confirmBtn.disabled = !hasChar || !this.hasDrawing;
  }

  private updateGenerateButton(): void {
    const count = this.styleEngine.getSampleCount();
    const canGenerate = count >= 10;
    this.generateBtn.disabled = !canGenerate || this.styleEngine.isBusy();

    if (this.styleEngine.isBusy()) {
      this.generateBtn.textContent = '生成中...';
    } else if (canGenerate) {
      this.generateBtn.textContent = '生成全套字体';
    } else {
      this.generateBtn.textContent = `还需 ${10 - count} 个样本`;
    }
  }

  private setColor(color: string): void {
    this.currentColor = color;
    this.handwritingInput.setColor(color);
    this.styleEngine.setColor(color);

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.color === color);
    });
  }

  private setBackground(mode: BackgroundMode): void {
    this.currentBg = mode;
    this.previewRenderer.setBackground(mode);

    document.querySelectorAll('.bg-btn').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.bg === mode);
    });
  }

  private async generateFont(): Promise<void> {
    if (this.styleEngine.isBusy()) return;
    if (this.styleEngine.getSampleCount() < 10) return;

    this.generateBtn.disabled = true;
    this.progressFill.style.width = '0%';
    this.progressText.textContent = '准备生成...';

    const startTime = performance.now();

    try {
      await this.styleEngine.generateAll(
        (progress, currentChar, total) => {
          const percent = Math.round(progress * 100);
          this.progressFill.style.width = `${percent}%`;
          this.progressText.textContent = `生成中 ${currentChar} (${Math.round(progress * total)}/${total})`;

          const generated = this.styleEngine.getGeneratedChar(currentChar);
          if (generated) {
            this.previewRenderer.updateGlyph(currentChar, generated);
          }
        },
        (chars) => {
          this.previewRenderer.setGlyphs(chars);
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
          this.progressText.textContent = `完成！共 ${chars.size} 个字符 (${elapsed}s)`;
          this.updateGenerateButton();
        }
      );
    } catch (error) {
      console.error('生成失败:', error);
      this.progressText.textContent = '生成失败';
      this.updateGenerateButton();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
