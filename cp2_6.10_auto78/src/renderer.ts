export type BlendMode =
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface RenderOptions {
  blendMode: BlendMode;
  texture?: HTMLImageElement;
}

export class BlendRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private currentOptions: RenderOptions;
  private needsRender: boolean = true;

  constructor(canvas: HTMLCanvasElement, initialOptions: RenderOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.currentOptions = initialOptions;
    this.resize();
    this.startLoop();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.needsRender = true;
  }

  public setOptions(options: Partial<RenderOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
    this.needsRender = true;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    this.renderGradientBackground(ctx, width, height);

    ctx.save();
    ctx.globalCompositeOperation = this.currentOptions.blendMode;
    this.renderForeground(ctx, width, height);
    ctx.restore();
  }

  private renderGradientBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.3, '#4ecdc4');
    gradient.addColorStop(0.6, '#45b7d1');
    gradient.addColorStop(1, '#96ceb4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const radial = ctx.createRadialGradient(
      width * 0.3,
      height * 0.3,
      0,
      width * 0.3,
      height * 0.3,
      Math.min(width, height) * 0.6
    );
    radial.addColorStop(0, 'rgba(255, 239, 186, 0.8)');
    radial.addColorStop(1, 'rgba(255, 239, 186, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, width, height);
  }

  private renderForeground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const texture = this.currentOptions.texture;
    const padding = Math.min(width, height) * 0.15;
    const boxW = width - padding * 2;
    const boxH = height - padding * 2;

    if (texture && texture.complete && texture.naturalWidth > 0) {
      const pattern = ctx.createPattern(texture, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        this.drawRoundedRect(ctx, padding, padding, boxW, boxH, 16);
        ctx.fill();
      }
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 200;
      tempCanvas.height = 200;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        this.drawNoisePattern(tempCtx);
        const pattern = ctx.createPattern(tempCanvas, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          this.drawRoundedRect(ctx, padding, padding, boxW, boxH, 16);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, padding, padding, boxW, boxH, 16);
    ctx.stroke();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawNoisePattern(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.createImageData(200, 200);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 180;
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

export class BackgroundBlendRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private currentOptions: RenderOptions;
  private needsRender: boolean = true;

  constructor(canvas: HTMLCanvasElement, initialOptions: RenderOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.currentOptions = initialOptions;
    this.resize();
    this.startLoop();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.needsRender = true;
  }

  public setOptions(options: Partial<RenderOptions>): void {
    this.currentOptions = { ...this.currentOptions, ...options };
    this.needsRender = true;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const { width, height } = this.canvas.getBoundingClientRect();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    const gradient1 = ctx.createLinearGradient(0, 0, width, 0);
    gradient1.addColorStop(0, '#ff0080');
    gradient1.addColorStop(0.5, '#7928ca');
    gradient1.addColorStop(1, '#0070f3');
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalCompositeOperation = this.currentOptions.blendMode;

    const gradient2 = ctx.createRadialGradient(
      width * 0.25,
      height * 0.75,
      0,
      width * 0.25,
      height * 0.75,
      Math.max(width, height) * 0.8
    );
    gradient2.addColorStop(0, '#ffd60a');
    gradient2.addColorStop(1, 'rgba(255, 214, 10, 0)');
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, 0, width, height);

    const gradient3 = ctx.createRadialGradient(
      width * 0.75,
      height * 0.25,
      0,
      width * 0.75,
      height * 0.25,
      Math.max(width, height) * 0.7
    );
    gradient3.addColorStop(0, '#00ff88');
    gradient3.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = gradient3;
    ctx.fillRect(0, 0, width, height);

    const texture = this.currentOptions.texture;
    if (texture && texture.complete && texture.naturalWidth > 0) {
      const pattern = ctx.createPattern(texture, 'repeat');
      if (pattern) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }
}
