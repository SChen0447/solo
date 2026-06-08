import type { GeneratedChar } from './styleEngine';

export type BackgroundMode = 'white' | 'grid' | 'transparent';

export class PreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private text: string = '';
  private scale: number = 1;
  private bgMode: BackgroundMode = 'white';
  private glyphs: Map<string, GeneratedChar> = new Map();
  private animationId: number | null = null;
  private needsRender: boolean = true;
  private lastRenderTime: number = 0;
  private targetFps: number = 30;
  private frameInterval: number = 1000 / 30;

  constructor(canvas: HTMLCanvasElement, wrapper: HTMLElement) {
    this.canvas = canvas;
    this.wrapper = wrapper;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.setupCanvas();
    this.startRenderLoop();
  }

  private setupCanvas(): void {
    this.resize();
  }

  public resize(): void {
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const charSize = 80;
    const lines = Math.max(1, this.text.split('\n').length);
    const minHeight = Math.max(rect.height, charSize * lines * this.scale + 40);
    const minWidth = Math.max(rect.width, this.calculateTextWidth() * this.scale + 40);

    this.canvas.width = Math.max(minWidth, rect.width) * dpr;
    this.canvas.height = Math.max(minHeight, rect.height) * dpr;
    this.canvas.style.width = `${Math.max(minWidth, rect.width)}px`;
    this.canvas.style.height = `${Math.max(minHeight, rect.height)}px`;
    this.ctx.scale(dpr, dpr);
    this.needsRender = true;
  }

  private calculateTextWidth(): number {
    if (this.text.length === 0) return 100;
    const charSize = 80;
    const spacing = charSize * 0.2;
    let maxWidth = 0;
    let currentWidth = 0;

    for (const char of this.text) {
      if (char === '\n') {
        maxWidth = Math.max(maxWidth, currentWidth);
        currentWidth = 0;
      } else {
        const glyph = this.glyphs.get(char);
        const width = glyph ? glyph.width : charSize * 0.6;
        currentWidth += width * 0.8 + spacing;
      }
    }
    maxWidth = Math.max(maxWidth, currentWidth);
    return Math.max(100, maxWidth);
  }

  public setText(text: string): void {
    if (this.text === text) return;
    this.text = text;
    this.resize();
    this.needsRender = true;
  }

  public setScale(scale: number): void {
    if (this.scale === scale) return;
    this.scale = Math.max(0.5, Math.min(3, scale));
    this.resize();
    this.needsRender = true;
  }

  public getScale(): number {
    return this.scale;
  }

  public setBackground(mode: BackgroundMode): void {
    if (this.bgMode === mode) return;
    this.bgMode = mode;

    this.wrapper.classList.remove('bg-white', 'bg-grid', 'bg-transparent');
    this.wrapper.classList.add(`bg-${mode}`);

    this.needsRender = true;
  }

  public getBackground(): BackgroundMode {
    return this.bgMode;
  }

  public setGlyphs(glyphs: Map<string, GeneratedChar>): void {
    this.glyphs = new Map(glyphs);
    this.resize();
    this.needsRender = true;
  }

  public updateGlyph(char: string, glyph: GeneratedChar): void {
    this.glyphs.set(char, glyph);
    if (this.text.includes(char)) {
      this.needsRender = true;
    }
  }

  private startRenderLoop(): void {
    const render = (timestamp: number): void => {
      const elapsed = timestamp - this.lastRenderTime;

      if (this.needsRender && elapsed >= this.frameInterval) {
        this.render();
        this.lastRenderTime = timestamp;
        this.needsRender = false;
      }

      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  private render(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.clearRect(0, 0, width, height);

    if (this.bgMode === 'transparent') {
      this.drawCheckerboard(width, height);
    }

    if (this.text.length === 0) return;

    const charSize = 80 * this.scale;
    const lineHeight = charSize * 1.2;
    const padding = 20;
    let x = padding;
    let y = padding + charSize * 0.85;

    for (const char of this.text) {
      if (char === '\n') {
        x = padding;
        y += lineHeight;
        continue;
      }

      if (char === ' ') {
        x += charSize * 0.4;
        continue;
      }

      const glyph = this.glyphs.get(char);

      if (glyph) {
        const glyphWidth = glyph.width * this.scale * 0.8;
        const glyphHeight = glyph.height * this.scale * 0.8;

        this.ctx.drawImage(
          glyph.canvas,
          x,
          y - glyphHeight * 0.85,
          glyphWidth,
          glyphHeight
        );

        x += glyphWidth * 0.7 + charSize * 0.05;
      } else {
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = `${charSize * 0.7}px sans-serif`;
        this.ctx.textBaseline = 'alphabetic';
        this.ctx.fillText(char, x, y);
        x += charSize * 0.5;
      }
    }
  }

  private drawCheckerboard(width: number, height: number): void {
    const size = 16;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.fillStyle = '#e0e0e0';
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        if ((x / size + y / size) % 2 === 1) {
          this.ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  public forceRender(): void {
    this.needsRender = true;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
