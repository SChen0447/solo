export type IllusionType = 'rotatingSnake' | 'hermannGrid' | 'flickeringTop';

export interface RenderParams {
  scale: number;
  rotationSpeed: number;
  saturation: number;
  contrast: number;
  complexity: number;
  flickerFrequency: number;
}

const DEFAULT_PARAMS: RenderParams = {
  scale: 1.0,
  rotationSpeed: 2.0,
  saturation: 80,
  contrast: 80,
  complexity: 8,
  flickerFrequency: 3.0,
};

const FADE_DURATION = 500;

export class IllusionEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private params: RenderParams = { ...DEFAULT_PARAMS };
  private illusionType: IllusionType = 'rotatingSnake';
  private nextIllusionType: IllusionType | null = null;

  private rafId: number | null = null;
  private running: boolean = false;
  private startTime: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private fpsCallback: ((fps: number) => void) | null = null;

  private fadeStartTime: number = 0;
  private fading: boolean = false;
  private flashStartTime: number = 0;
  private flashing: boolean = false;

  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Cannot get offscreen 2D context');
    this.offscreenCtx = offCtx;

    this.resize();
  }

  setParams(params: Partial<RenderParams>): void {
    this.params = { ...this.params, ...params };
  }

  getParams(): RenderParams {
    return { ...this.params };
  }

  setIllusionType(type: IllusionType): void {
    if (type === this.illusionType) return;
    this.nextIllusionType = type;
    this.fading = true;
    this.fadeStartTime = performance.now();
  }

  getIllusionType(): IllusionType {
    return this.illusionType;
  }

  setFpsCallback(cb: (fps: number) => void): void {
    this.fpsCallback = cb;
  }

  resize(): void {
    if (!this.canvas || !this.offscreenCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { clientWidth, clientHeight } = this.canvas;

    this.canvas.width = clientWidth * dpr;
    this.canvas.height = clientHeight * dpr;
    this.offscreenCanvas.width = clientWidth * dpr;
    this.offscreenCanvas.height = clientHeight * dpr;

    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.offscreenCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.loop(this.startTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  triggerFlash(): void {
    this.flashing = true;
    this.flashStartTime = performance.now();
  }

  exportPNG(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas not initialized'));
        return;
      }
      this.canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to export PNG'));
        },
        'image/png'
      );
    });
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const elapsed = time - this.lastTime;
    this.frameCount++;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = time;
      this.fpsCallback?.(this.fps);
    }

    this.renderFrame(time);
    this.rafId = requestAnimationFrame(this.loop);
  };

  renderFrame(time: number): void {
    if (!this.ctx || !this.canvas || !this.offscreenCanvas || !this.offscreenCtx) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, w, h);

    if (this.fading && this.nextIllusionType) {
      const fadeElapsed = time - this.fadeStartTime;
      const progress = Math.min(fadeElapsed / FADE_DURATION, 1);

      if (progress < 0.5) {
        const alpha = 1 - progress * 2;
        this.drawIllusion(this.illusionType, time, w, h);
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.globalAlpha = 1;
      } else {
        if (this.nextIllusionType !== this.illusionType) {
          this.illusionType = this.nextIllusionType;
        }
        const alpha = (progress - 0.5) * 2;
        this.drawIllusion(this.illusionType, time, w, h);
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.globalAlpha = 1;
      }

      if (progress >= 1) {
        this.fading = false;
        this.nextIllusionType = null;
      }
    } else {
      this.drawIllusion(this.illusionType, time, w, h);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }

    if (this.flashing) {
      const flashElapsed = time - this.flashStartTime;
      if (flashElapsed < 200) {
        const alpha = 0.3 * (1 - flashElapsed / 200);
        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        this.ctx.fillRect(0, 0, w, h);
      } else {
        this.flashing = false;
      }
    }
  }

  private drawIllusion(type: IllusionType, time: number, w: number, h: number): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    this.offscreenCtx.fillStyle = '#1a1a1a';
    this.offscreenCtx.fillRect(0, 0, w, h);

    switch (type) {
      case 'rotatingSnake':
        this.drawRotatingSnake(time, w, h);
        break;
      case 'hermannGrid':
        this.drawHermannGrid(time, w, h);
        break;
      case 'flickeringTop':
        this.drawFlickeringTop(time, w, h);
        break;
    }
  }

  private hslWithSaturationAndContrast(
    hue: number,
    baseSat: number,
    baseLight: number
  ): string {
    const s = baseSat * (this.params.saturation / 100);
    const contrastFactor = (this.params.contrast / 50);
    const l = 50 + (baseLight - 50) * contrastFactor;
    return `hsl(${hue}, ${s}%, ${l}%)`;
  }

  private drawRotatingSnake(time: number, w: number, h: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.4 * this.params.scale;
    const rings = Math.max(3, Math.floor(this.params.complexity));
    const sectorsPerRing = 12;
    const rotation = (time * this.params.rotationSpeed * 0.06) % 360;

    const colors = [
      this.hslWithSaturationAndContrast(0, 80, 55),
      this.hslWithSaturationAndContrast(45, 80, 55),
      this.hslWithSaturationAndContrast(200, 80, 45),
      this.hslWithSaturationAndContrast(120, 70, 45),
    ];

    for (let ring = 0; ring < rings; ring++) {
      const innerR = (baseRadius / rings) * ring;
      const outerR = (baseRadius / rings) * (ring + 1);
      const ringOffset = (ring * (360 / sectorsPerRing) / 2) + rotation * (ring % 2 === 0 ? 1 : -1);

      for (let sector = 0; sector < sectorsPerRing; sector++) {
        const startAngle = ((sector * (360 / sectorsPerRing) + ringOffset) * Math.PI) / 180;
        const endAngle = (((sector + 1) * (360 / sectorsPerRing) + ringOffset) * Math.PI) / 180;
        const colorIdx = (sector + ring) % colors.length;

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, startAngle, endAngle);
        ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[colorIdx];
        ctx.fill();

        const midAngle = (startAngle + endAngle) / 2;
        const innerEdgeR = innerR + (outerR - innerR) * 0.15;
        const outerEdgeR = innerR + (outerR - innerR) * 0.85;
        const edgeColor = colorIdx % 2 === 0
          ? this.hslWithSaturationAndContrast(0, 0, 20)
          : this.hslWithSaturationAndContrast(0, 0, 85);

        ctx.beginPath();
        ctx.moveTo(
          cx + Math.cos(midAngle) * innerEdgeR,
          cy + Math.sin(midAngle) * innerEdgeR
        );
        ctx.lineTo(
          cx + Math.cos(midAngle) * outerEdgeR,
          cy + Math.sin(midAngle) * outerEdgeR
        );
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  private drawHermannGrid(time: number, w: number, h: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;
    const cells = Math.max(3, Math.floor(this.params.complexity));
    const cellSize = Math.min(w, h) / (cells + 1) * this.params.scale;
    const gap = cellSize * 0.25;
    const totalSize = cells * cellSize + (cells - 1) * gap;
    const startX = (w - totalSize) / 2;
    const startY = (h - totalSize) / 2;

    const flickerPhase = (time * this.params.flickerFrequency * 0.002 * Math.PI * 2) % (Math.PI * 2);
    const flickerAmount = (Math.sin(flickerPhase) + 1) / 2;

    const whiteColor = this.hslWithSaturationAndContrast(0, 0, 95);
    const bgColor = this.hslWithSaturationAndContrast(0, 0, 10);
    ctx.fillStyle = bgColor;
    ctx.fillRect(startX - gap, startY - gap, totalSize + gap * 2, totalSize + gap * 2);

    ctx.fillStyle = whiteColor;
    for (let row = 0; row < cells; row++) {
      for (let col = 0; col < cells; col++) {
        const x = startX + col * (cellSize + gap);
        const y = startY + row * (cellSize + gap);
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    for (let row = 0; row <= cells; row++) {
      for (let col = 0; col <= cells; col++) {
        const cx = startX + col * (cellSize + gap) - gap / 2;
        const cy = startY + row * (cellSize + gap) - gap / 2;
        const spotSize = gap * 0.8;
        const distFromCenter = Math.sqrt(
          Math.pow(col - cells / 2, 2) + Math.pow(row - cells / 2, 2)
        );
        const maxDist = Math.sqrt(2) * cells / 2;
        const intensity = (distFromCenter / maxDist) * 0.7 + flickerAmount * 0.3;
        const spotAlpha = Math.min(intensity * this.params.contrast / 100, 0.7);

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, spotSize);
        gradient.addColorStop(0, `rgba(80, 80, 80, ${spotAlpha})`);
        gradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, spotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawFlickeringTop(time: number, w: number, h: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.45 * this.params.scale;
    const layers = Math.max(2, Math.floor(this.params.complexity / 3) + 1);
    const stripes = Math.max(8, Math.floor(this.params.complexity) * 2);

    const flickerPhase = (time * this.params.flickerFrequency * 0.002 * Math.PI * 2) % (Math.PI * 2);
    const flickerOn = Math.sin(flickerPhase) > 0;

    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = (baseRadius / layers) * (layer + 1);
      const innerR = (baseRadius / layers) * layer;
      const direction = layer % 2 === 0 ? 1 : -1;
      const rotation = (time * this.params.rotationSpeed * 0.06 * direction * (1 + layer * 0.3)) % 360;

      for (let s = 0; s < stripes; s++) {
        const startAngle = ((s * (360 / stripes) + rotation) * Math.PI) / 180;
        const endAngle = (((s + 1) * (360 / stripes) + rotation) * Math.PI) / 180;
        const isWhite = s % 2 === 0;

        let color: string;
        if (flickerOn) {
          color = isWhite
            ? this.hslWithSaturationAndContrast(0, 0, 98)
            : this.hslWithSaturationAndContrast(0, 0, 5);
        } else {
          color = isWhite
            ? this.hslWithSaturationAndContrast(0, 0, 5)
            : this.hslWithSaturationAndContrast(0, 0, 98);
        }

        const hueShift = (layer * 60 + s * (360 / stripes)) % 360;
        const satBoost = this.params.saturation / 200;
        if (satBoost > 0.05) {
          if (isWhite) {
            color = this.hslWithSaturationAndContrast(hueShift, this.params.saturation * 0.5, 75);
          } else {
            color = this.hslWithSaturationAndContrast((hueShift + 180) % 360, this.params.saturation * 0.5, 25);
          }
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, layerRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        if (innerR > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
          ctx.arc(cx, cy, layerRadius, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        }
      }
    }

    const centerR = baseRadius * 0.06;
    ctx.beginPath();
    ctx.arc(cx, cy, centerR, 0, Math.PI * 2);
    ctx.fillStyle = this.hslWithSaturationAndContrast(0, 0, 50);
    ctx.fill();
  }
}
