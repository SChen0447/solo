export type AnimationMode = 'static' | 'breathing' | 'chase' | 'blink' | 'strobe';
export type BackgroundType = 'brick' | 'acrylic' | 'glass';

export interface NeonRenderParams {
  text: string;
  color: string;
  glowIntensity: number;
  tubeWidth: number;
  animationMode: AnimationMode;
  background: BackgroundType;
  position: { x: number; y: number };
  scale: number;
}

interface TweenState {
  target: Partial<NeonRenderParams>;
  startTime: number;
  duration: number;
  startParams: Partial<NeonRenderParams>;
}

export class NeonRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private rafId: number = 0;
  private startTime: number = 0;
  private running: boolean = false;
  private params: NeonRenderParams;
  private tween: TweenState | null = null;
  private blinkStates: Map<string, { nextToggle: number; on: boolean }> = new Map();
  private lastFrameTime: number = 0;
  private _canvasWidth: number = 800;
  private _canvasHeight: number = 600;

  private readonly DEFAULT_PARAMS: NeonRenderParams = {
    text: 'NEON',
    color: '#FF1493',
    glowIntensity: 1.5,
    tubeWidth: 10,
    animationMode: 'static',
    background: 'brick',
    position: { x: 400, y: 300 },
    scale: 1.0
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Offscreen canvas context not available');
    this.offscreenCtx = offCtx;

    this.bgCanvas = document.createElement('canvas');
    const bgCtx = this.bgCanvas.getContext('2d');
    if (!bgCtx) throw new Error('Background canvas context not available');
    this.bgCtx = bgCtx;

    this.params = { ...this.DEFAULT_PARAMS };
    this.resize(800, 600);
  }

  get currentParams(): NeonRenderParams {
    return { ...this.params };
  }

  resize(width: number, height: number, responsive: boolean = false): void {
    let w = width;
    let h = height;
    if (responsive && width < 900) {
      const scale = width / 900;
      w = Math.floor(width);
      h = Math.floor(600 * scale);
    }
    this._canvasWidth = w;
    this._canvasHeight = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offscreenCanvas.width = w * dpr;
    this.offscreenCanvas.height = h * dpr;
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.bgCanvas.width = w;
    this.bgCanvas.height = h;

    if (this.params.position.x === 400 && this.params.position.y === 300) {
      this.params.position = { x: w / 2, y: h / 2 };
    } else {
      this.params.position.x = Math.min(Math.max(this.params.position.x, 0), w);
      this.params.position.y = Math.min(Math.max(this.params.position.y, 0), h);
    }

    this.renderBackground();
    this.renderFrame(performance.now());
  }

  setParams(params: Partial<NeonRenderParams>, animate: boolean = true): void {
    if (animate && Object.keys(params).length > 0) {
      this.tween = {
        target: { ...params },
        startTime: performance.now(),
        duration: 200,
        startParams: this.extractTweenable(params)
      };
    } else {
      Object.assign(this.params, params);
      this.tween = null;
      if (params.background) {
        this.renderBackground();
      }
    }
  }

  private extractTweenable(target: Partial<NeonRenderParams>): Partial<NeonRenderParams> {
    const result: Partial<NeonRenderParams> = {};
    for (const key of Object.keys(target)) {
      const k = key as keyof NeonRenderParams;
      if (k === 'position') {
        result.position = { ...this.params.position };
      } else if (k !== 'animationMode' && k !== 'background' && k !== 'text' && k !== 'color') {
        (result as any)[k] = (this.params as any)[k];
      }
    }
    return result;
  }

  private updateTween(now: number): void {
    if (!this.tween) return;
    const elapsed = now - this.tween.startTime;
    const progress = Math.min(elapsed / this.tween.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    for (const key of Object.keys(this.tween.target)) {
      const k = key as keyof NeonRenderParams;
      const start = (this.tween.startParams as any)[k];
      const target = (this.tween.target as any)[k];

      if (k === 'position' && start && target) {
        (this.params as any).position = {
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased
        };
      } else if (typeof start === 'number' && typeof target === 'number') {
        (this.params as any)[k] = start + (target - start) * eased;
      } else {
        (this.params as any)[k] = target;
      }
    }

    if (this.tween.target.background) {
      this.params.background = this.tween.target.background;
      this.renderBackground();
    }
    if (this.tween.target.color) {
      this.params.color = this.tween.target.color;
    }
    if (this.tween.target.text) {
      this.params.text = this.tween.target.text;
    }
    if (this.tween.target.animationMode) {
      this.params.animationMode = this.tween.target.animationMode;
    }

    if (progress >= 1) {
      this.tween = null;
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.loop(this.startTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    this.updateTween(now);
    this.renderFrame(now);
    this.lastFrameTime = now;
    this.rafId = requestAnimationFrame(this.loop);
  };

  private renderBackground(): void {
    const ctx = this.bgCtx;
    const w = this._canvasWidth;
    const h = this._canvasHeight;
    ctx.clearRect(0, 0, w, h);

    switch (this.params.background) {
      case 'brick':
        this.drawBrickBackground(ctx, w, h);
        break;
      case 'acrylic':
        this.drawAcrylicBackground(ctx, w, h);
        break;
      case 'glass':
        this.drawGlassBackground(ctx, w, h);
        break;
    }
  }

  private drawBrickBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const brickW = 60;
    const brickH = 25;
    const mortar = 4;

    ctx.fillStyle = '#2a1810';
    ctx.fillRect(0, 0, w, h);

    for (let row = 0; row * (brickH + mortar) < h; row++) {
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col * (brickW + mortar) - offset < w; col++) {
        const x = col * (brickW + mortar) - offset;
        const y = row * (brickH + mortar);
        const hue = 10 + Math.random() * 15;
        const light = 18 + Math.random() * 10;
        ctx.fillStyle = `hsl(${hue}, 55%, ${light}%)`;
        ctx.fillRect(x, y, brickW, brickH);

        ctx.fillStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.15})`;
        ctx.fillRect(x, y, brickW, 2);
        ctx.fillRect(x, y + brickH - 2, brickW, 2);
      }
    }

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawAcrylicBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(0.5, '#15152a');
    grad.addColorStop(1, '#0a0a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 30; i++) {
      const x1 = Math.random() * w;
      const y1 = Math.random() * h;
      const x2 = x1 + (Math.random() - 0.5) * 200;
      const y2 = y1 + (Math.random() - 0.5) * 200;
      const lg = ctx.createLinearGradient(x1, y1, x2, y2);
      lg.addColorStop(0, 'rgba(255,255,255,0.03)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = Math.random() * 30 + 10;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const vg = ctx.createLinearGradient(0, 0, 0, h);
    vg.addColorStop(0, 'rgba(100,100,160,0.06)');
    vg.addColorStop(0.5, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(30,30,60,0.1)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGlassBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'rgba(180, 200, 220, 0.12)');
    grad.addColorStop(0.3, 'rgba(150, 170, 200, 0.08)');
    grad.addColorStop(0.7, 'rgba(120, 140, 180, 0.1)');
    grad.addColorStop(1, 'rgba(100, 130, 170, 0.14)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 25;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 255, g: 20, b: 147 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }

  private rgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private getCharacterAlpha(charIndex: number, totalChars: number, elapsed: number, mode: AnimationMode): number {
    switch (mode) {
      case 'static':
        return 1.0;
      case 'breathing':
        return 0.5 + 0.5 * Math.sin((elapsed / 2000) * Math.PI * 2);
      case 'chase': {
        const cycleMs = totalChars * 300 + 800;
        const t = elapsed % cycleMs;
        const charStart = charIndex * 300;
        if (t < charStart) return 0.2;
        if (t < charStart + 500) {
          return 0.2 + 0.8 * Math.min(1, (t - charStart) / 500);
        }
        if (t < charStart + 800) return 1.0;
        if (t < charStart + 1300) {
          return 1.0 - 0.8 * Math.min(1, (t - charStart - 800) / 500);
        }
        return 0.2;
      }
      case 'blink': {
        const key = `${this.params.text}_${charIndex}`;
        let state = this.blinkStates.get(key);
        if (!state) {
          state = { nextToggle: elapsed + 500 + Math.random() * 1500, on: true };
          this.blinkStates.set(key, state);
        }
        if (elapsed >= state.nextToggle) {
          state.on = !state.on;
          state.nextToggle = elapsed + 500 + Math.random() * 1500;
        }
        return state.on ? 1.0 : 0.15;
      }
      case 'strobe':
        return (elapsed % 200) < 100 ? 1.0 : 0.05;
      default:
        return 1.0;
    }
  }

  private renderFrame(now: number): void {
    const ctx = this.ctx;
    const w = this._canvasWidth;
    const h = this._canvasHeight;
    const elapsed = now - this.startTime;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.bgCanvas, 0, 0, w, h);

    const { text, color, glowIntensity, tubeWidth, position, scale, animationMode } = this.params;
    if (!text) return;

    const chars = Array.from(text);
    const fontSize = 120 * scale;
    const font = `900 ${fontSize}px Orbitron, sans-serif`;

    ctx.save();
    ctx.translate(position.x, position.y);

    const totalWidth = chars.reduce((sum, ch) => {
      ctx.font = font;
      return sum + ctx.measureText(ch).width;
    }, 0);
    const charSpacing = 8 * scale;
    const totalW = totalWidth + charSpacing * (chars.length - 1);
    let cursorX = -totalW / 2;

    const rgb = this.hexToRgb(color);
    const shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const alpha = this.getCharacterAlpha(i, chars.length, elapsed, animationMode);
      if (alpha <= 0.01) {
        ctx.font = font;
        cursorX += ctx.measureText(ch).width + charSpacing;
        continue;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = font;
      const charW = ctx.measureText(ch).width;
      const charX = cursorX + charW / 2;

      ctx.save();
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(0,0,0,0.01)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, charX, 0);
      ctx.restore();

      const blurLevels = [
        { blur: 40 * glowIntensity, alpha: 0.3 * alpha, lineWidth: tubeWidth * 1.8 },
        { blur: 20 * glowIntensity, alpha: 0.5 * alpha, lineWidth: tubeWidth * 1.3 },
        { blur: 8 * glowIntensity, alpha: 0.8 * alpha, lineWidth: tubeWidth }
      ];

      for (const level of blurLevels) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = level.blur;
        ctx.strokeStyle = this.rgba(color, level.alpha);
        ctx.lineWidth = level.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = font;
        ctx.strokeText(ch, charX, 0);
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 4 * glowIntensity;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.fillText(ch, charX, 0);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = this.rgba(color, 0.6 * alpha);
      ctx.lineWidth = tubeWidth * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.strokeText(ch, charX, 0);
      ctx.restore();

      cursorX += charW + charSpacing;
      ctx.restore();
    }

    ctx.restore();
  }

  exportPNG(): string {
    const w = this._canvasWidth;
    const h = this._canvasHeight;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w * 2;
    exportCanvas.height = h * 2;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) throw new Error('Export canvas context unavailable');
    ctx.scale(2, 2);

    const { text, color, glowIntensity, tubeWidth, position, scale } = this.params;
    if (!text) return exportCanvas.toDataURL('image/png');

    const chars = Array.from(text);
    const fontSize = 120 * scale;
    const font = `900 ${fontSize}px Orbitron, sans-serif`;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.font = font;

    const totalWidth = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0);
    const charSpacing = 8 * scale;
    const totalW = totalWidth + charSpacing * (chars.length - 1);
    let cursorX = -totalW / 2;

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const charW = ctx.measureText(ch).width;
      const charX = cursorX + charW / 2;

      const blurLevels = [
        { blur: 40 * glowIntensity, alpha: 0.3, lineWidth: tubeWidth * 1.8 },
        { blur: 20 * glowIntensity, alpha: 0.5, lineWidth: tubeWidth * 1.3 },
        { blur: 8 * glowIntensity, alpha: 0.8, lineWidth: tubeWidth }
      ];

      for (const level of blurLevels) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = level.blur;
        ctx.strokeStyle = this.rgba(color, level.alpha);
        ctx.lineWidth = level.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = font;
        ctx.strokeText(ch, charX, 0);
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 4 * glowIntensity;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.fillText(ch, charX, 0);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = this.rgba(color, 0.6);
      ctx.lineWidth = tubeWidth * 0.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font;
      ctx.strokeText(ch, charX, 0);
      ctx.restore();

      cursorX += charW + charSpacing;
    }

    ctx.restore();
    return exportCanvas.toDataURL('image/png');
  }

  screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  clampPosition(x: number, y: number): { x: number; y: number } {
    const margin = 50;
    return {
      x: Math.min(Math.max(x, margin), this._canvasWidth - margin),
      y: Math.min(Math.max(y, margin), this._canvasHeight - margin)
    };
  }
}
