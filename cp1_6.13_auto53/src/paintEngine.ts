import {
  BrushMode,
  DiffusionParticle,
  PaintStroke,
  SplashParticle,
  ResetParticle,
  EngineConfig,
  EngineState
} from './sharedTypes.js';

export class PaintEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paperCanvas: HTMLCanvasElement;
  private paperCtx: CanvasRenderingContext2D;
  private paintCanvas: HTMLCanvasElement;
  private paintCtx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private textureNoise: Uint8ClampedArray;
  private fiberMap: Float32Array;

  private config: EngineConfig;
  private state: EngineState;

  private strokes: PaintStroke[] = [];
  private diffusionParticles: DiffusionParticle[] = [];
  private splashParticles: SplashParticle[] = [];
  private resetParticles: ResetParticle[] = [];

  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private lastTime = 0;
  private strokeIdCounter = 0;

  private mouseX = 0;
  private mouseY = 0;
  private isMouseInCanvas = false;

  private physicsAccumulator = 0;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;

  private loadStartTime = 0;

  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.config = config;
    this.state = {
      humidity: 50,
      brushMode: BrushMode.WATERCOLOR,
      currentColor: null,
      currentAlpha: 0.3,
      isResetting: false,
      resetProgress: 0
    };

    this.paperCanvas = document.createElement('canvas');
    this.paperCanvas.width = config.canvasWidth;
    this.paperCanvas.height = config.canvasHeight;
    this.paperCtx = this.paperCanvas.getContext('2d')!;

    this.paintCanvas = document.createElement('canvas');
    this.paintCanvas.width = config.canvasWidth;
    this.paintCanvas.height = config.canvasHeight;
    this.paintCtx = this.paintCanvas.getContext('2d')!;

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.width = config.canvasWidth;
    this.overlayCanvas.height = config.canvasHeight;
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;

    this.textureNoise = new Uint8ClampedArray(config.canvasWidth * config.canvasHeight);
    this.fiberMap = new Float32Array(config.canvasWidth * config.canvasHeight);

    this.loadStartTime = performance.now();
    this.generatePaperTexture();
    this.generateFiberMap();
    this.bindEvents();
    this.startLoop();
  }

  private generatePaperTexture(): void {
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;
    const size = w * h;

    for (let i = 0; i < size; i++) {
      const x = i % w;
      const y = Math.floor(i / w);
      let noise = 0;
      noise += this.perlinNoise(x * 0.015, y * 0.015) * 35;
      noise += this.perlinNoise(x * 0.08, y * 0.08) * 15;
      noise += this.perlinNoise(x * 0.3, y * 0.3) * 8;
      noise += (Math.random() - 0.5) * 12;
      noise = Math.max(0, Math.min(255, noise + 128));
      this.textureNoise[i] = Math.round(noise);
    }
  }

  private perlinNoise(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (a: number, b: number, t: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number) => {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    const aa = this.pseudoHash(xi, yi);
    const ab = this.pseudoHash(xi, yi + 1);
    const ba = this.pseudoHash(xi + 1, yi);
    const bb = this.pseudoHash(xi + 1, yi + 1);

    const u = fade(xf);
    const v = fade(yf);

    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  private pseudoHash(x: number, y: number): number {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return h ^ (h >> 16);
  }

  private generateFiberMap(): void {
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const n1 = this.perlinNoise(x * 0.02, y * 0.025 + 100);
        const n2 = this.perlinNoise(x * 0.06 + 50, y * 0.07);
        this.fiberMap[idx] = (n1 * 0.7 + n2 * 0.3) * 0.5 + 0.5;
      }
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
    this.canvas.addEventListener('mouseenter', (e) => this.onMouseEnter(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.state.isResetting || !this.state.currentColor) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.lastTime = performance.now();

    const color = this.state.currentColor;
    const alpha = this.state.brushMode === BrushMode.WATERCOLOR
      ? 0.2 + Math.random() * 0.2
      : 0.8 + Math.random() * 0.15;

    const stroke: PaintStroke = {
      id: ++this.strokeIdCounter,
      color: { ...color },
      alpha,
      points: [{ x, y, speed: 0, pressure: 1, time: this.lastTime }],
      mode: this.state.brushMode,
      timestamp: this.lastTime,
      settled: false
    };
    this.strokes.push(stroke);
    this.renderStrokeDot(stroke, x, y, 0);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    this.mouseX = x;
    this.mouseY = y;

    if (!this.isDrawing || this.state.isResetting || !this.state.currentColor) return;

    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / dt;

    const currentStroke = this.strokes[this.strokes.length - 1];
    if (currentStroke && !currentStroke.settled) {
      currentStroke.points.push({ x, y, speed, pressure: 1, time: now });
      this.renderStrokeSegment(currentStroke, this.lastX, this.lastY, x, y, speed);
    }

    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const currentStroke = this.strokes[this.strokes.length - 1];
    if (currentStroke) {
      this.initiateDiffusion(currentStroke);
    }
  }

  private onMouseLeave(_e: MouseEvent): void {
    this.isMouseInCanvas = false;
    if (this.isDrawing) {
      this.isDrawing = false;
      const currentStroke = this.strokes[this.strokes.length - 1];
      if (currentStroke) {
        this.initiateDiffusion(currentStroke);
      }
    }
  }

  private onMouseEnter(_e: MouseEvent): void {
    this.isMouseInCanvas = true;
  }

  private renderStrokeDot(stroke: PaintStroke, x: number, y: number, speed: number): void {
    const ctx = this.paintCtx;
    const { r, g, b } = stroke.color;
    const baseSize = stroke.mode === BrushMode.WATERCOLOR ? 14 : 18;

    if (stroke.mode === BrushMode.WATERCOLOR) {
      const featherSize = baseSize * 1.8;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, featherSize);
      grd.addColorStop(0, `rgba(${r},${g},${b},${stroke.alpha})`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},${stroke.alpha * 0.4})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, featherSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      for (let layer = 3; layer >= 0; layer--) {
        const ls = baseSize - layer * 3;
        const la = stroke.alpha - layer * 0.15;
        const grd = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, ls);
        grd.addColorStop(0, `rgba(${Math.min(255, r + 20)},${Math.min(255, g + 20)},${Math.min(255, b + 20)},${Math.max(0, la)})`);
        grd.addColorStop(0.7, `rgba(${r},${g},${b},${Math.max(0, la)})`);
        grd.addColorStop(1, `rgba(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)},${Math.max(0, la - 0.2)})`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(x, y, ls, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderStrokeSegment(
    stroke: PaintStroke,
    x0: number, y0: number,
    x1: number, y1: number,
    speed: number
  ): void {
    const ctx = this.paintCtx;
    const { r, g, b } = stroke.color;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / 2));

    const baseSize = stroke.mode === BrushMode.WATERCOLOR ? 12 : 16;
    const speedFactor = Math.min(speed * 2.5, 1);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;

      const jitterX = (Math.random() - 0.5) * baseSize * 0.15 * (0.5 + speedFactor);
      const jitterY = (Math.random() - 0.5) * baseSize * 0.15 * (0.5 + speedFactor);

      if (stroke.mode === BrushMode.WATERCOLOR) {
        const feather = baseSize * (1.6 + speedFactor * 0.8);
        const alphaVar = stroke.alpha * (1 - speedFactor * 0.3);
        const grd = ctx.createRadialGradient(px + jitterX, py + jitterY, 0, px, py, feather);
        grd.addColorStop(0, `rgba(${r},${g},${b},${alphaVar})`);
        grd.addColorStop(0.4, `rgba(${r},${g},${b},${alphaVar * 0.5})`);
        grd.addColorStop(0.75, `rgba(${r},${g},${b},${alphaVar * 0.15})`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, feather, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const size = baseSize * (1 - speedFactor * 0.25);
        ctx.save();
        for (let layer = 2; layer >= 0; layer--) {
          const ls = size - layer * 2;
          const la = stroke.alpha - layer * 0.2;
          const offX = jitterX * (layer + 1);
          const offY = jitterY * (layer + 1);
          const grd = ctx.createRadialGradient(px + offX - 1, py + offY - 1, 0, px + offX, py + offY, ls);
          grd.addColorStop(0, `rgba(${Math.min(255, r + 25)},${Math.min(255, g + 25)},${Math.min(255, b + 25)},${Math.max(0, la)})`);
          grd.addColorStop(0.65, `rgba(${r},${g},${b},${Math.max(0, la)})`);
          grd.addColorStop(1, `rgba(${Math.max(0, r - 50)},${Math.max(0, g - 50)},${Math.max(0, b - 50)},${Math.max(0, la - 0.25)})`);
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.ellipse(px + offX, py + offY, ls, ls * 0.92, Math.atan2(dy, dx), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (speed > 0.25) {
      this.generateSplashes(x1, y1, stroke.color, speed, stroke.mode);
    }
  }

  private generateSplashes(
    x: number, y: number,
    color: { r: number; g: number; b: number },
    speed: number,
    mode: BrushMode
  ): void {
    const count = Math.min(Math.floor(speed * 30), 10);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const v = 0.5 + speed * (1 + Math.random() * 2);
      const splash: SplashParticle = {
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        color: { ...color },
        alpha: mode === BrushMode.WATERCOLOR ? 0.15 + Math.random() * 0.25 : 0.5 + Math.random() * 0.3,
        size: mode === BrushMode.WATERCOLOR
          ? 0.8 + Math.random() * 2
          : 1.5 + Math.random() * 3,
        life: 1
      };
      this.splashParticles.push(splash);
    }
  }

  private initiateDiffusion(stroke: PaintStroke): void {
    const humidity = this.state.humidity;
    if (humidity < 10) {
      stroke.settled = true;
      return;
    }

    const diffSpeed = humidity / 100;
    const particleCount = Math.floor(
      stroke.points.length * (stroke.mode === BrushMode.WATERCOLOR ? 0.8 : 0.5) * (0.3 + diffSpeed)
    );

    for (let i = 0; i < particleCount; i++) {
      const pt = stroke.points[Math.floor(Math.random() * stroke.points.length)];
      const spread = stroke.mode === BrushMode.WATERCOLOR ? 8 + diffSpeed * 25 : 4 + diffSpeed * 10;
      const initAngle = Math.random() * Math.PI * 2;
      const p: DiffusionParticle = {
        x: pt.x + (Math.random() - 0.5) * spread,
        y: pt.y + (Math.random() - 0.5) * spread,
        vx: Math.cos(initAngle) * (0.2 + diffSpeed * 1.5),
        vy: Math.sin(initAngle) * (0.2 + diffSpeed * 1.5),
        color: {
          r: Math.max(0, Math.min(255, stroke.color.r + (Math.random() - 0.5) * 15)),
          g: Math.max(0, Math.min(255, stroke.color.g + (Math.random() - 0.5) * 15)),
          b: Math.max(0, Math.min(255, stroke.color.b + (Math.random() - 0.5) * 15))
        },
        alpha: stroke.mode === BrushMode.WATERCOLOR
          ? 0.05 + Math.random() * 0.15
          : 0.1 + Math.random() * 0.2,
        size: stroke.mode === BrushMode.WATERCOLOR
          ? 2 + Math.random() * 5
          : 3 + Math.random() * 6,
        life: 1,
        maxLife: 2000 + Math.random() * 1500,
        branchingChance: stroke.mode === BrushMode.WATERCOLOR ? 0.015 : 0.005,
        mode: stroke.mode
      };
      this.diffusionParticles.push(p);
    }

    stroke.settled = true;
  }

  setHumidity(value: number): void {
    this.state.humidity = Math.max(0, Math.min(100, value));
  }

  getHumidity(): number {
    return this.state.humidity;
  }

  setBrushMode(mode: BrushMode): void {
    this.state.brushMode = mode;
    if (this.state.currentColor) {
      this.state.currentAlpha = mode === BrushMode.WATERCOLOR
        ? 0.2 + Math.random() * 0.2
        : 0.8 + Math.random() * 0.15;
    }
  }

  getBrushMode(): BrushMode {
    return this.state.brushMode;
  }

  setCurrentColor(rgb: { r: number; g: number; b: number } | null): void {
    this.state.currentColor = rgb;
    if (rgb) {
      this.state.currentAlpha = this.state.brushMode === BrushMode.WATERCOLOR
        ? 0.2 + Math.random() * 0.2
        : 0.8 + Math.random() * 0.15;
    }
  }

  getCurrentColor(): { r: number; g: number; b: number } | null {
    return this.state.currentColor;
  }

  resetCanvas(): void {
    if (this.state.isResetting) return;
    this.state.isResetting = true;
    this.state.resetProgress = 0;
    const cx = this.config.canvasWidth / 2;
    const cy = this.config.canvasHeight / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let i = 0; i < 180; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * maxDist * 0.6;
      const p: ResetParticle = {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: Math.cos(angle) * (1 + Math.random() * 3),
        vy: Math.sin(angle) * (1 + Math.random() * 3),
        size: 2 + Math.random() * 5,
        life: 1,
        maxLife: 1500 + Math.random() * 800
      };
      this.resetParticles.push(p);
    }
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const frameTime = Math.min(100, now - this.lastFrameTime);
      this.lastFrameTime = now;
      this.physicsAccumulator += frameTime;
      const physicsStep = 1000 / this.config.physicsHz;
      while (this.physicsAccumulator >= physicsStep) {
        this.updatePhysics(physicsStep);
        this.physicsAccumulator -= physicsStep;
      }
      this.render(now);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private updatePhysics(dt: number): void {
    const humidity = this.state.humidity;
    const humFactor = humidity / 100;

    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const p = this.splashParticles[i];
      p.x += p.vx * dt * 0.1;
      p.y += p.vy * dt * 0.1;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt * 0.004;
      if (p.life <= 0) {
        this.splashParticles.splice(i, 1);
      } else {
        const ctx = this.paintCtx;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha * p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.diffusionParticles.length > 0) {
      const w = this.config.canvasWidth;
      const h = this.config.canvasHeight;
      const newParticles: DiffusionParticle[] = [];
      const maxDiffusion = 20 + humFactor * 60;

      for (let i = this.diffusionParticles.length - 1; i >= 0; i--) {
        const p = this.diffusionParticles[i];
        p.life -= dt / p.maxLife;

        if (p.life <= 0) {
          this.diffusionParticles.splice(i, 1);
          continue;
        }

        const ix = Math.floor(p.x);
        const iy = Math.floor(p.y);
        let fiberInfluence = 0;
        if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
          fiberInfluence = (this.fiberMap[iy * w + ix] - 0.5) * 2;
        }

        if (p.mode === BrushMode.WATERCOLOR) {
          const fiberAngle = fiberInfluence * Math.PI * 0.4;
          const cosA = Math.cos(fiberAngle);
          const sinA = Math.sin(fiberAngle);
          const nvx = p.vx * cosA - p.vy * sinA;
          const nvy = p.vx * sinA + p.vy * cosA;
          p.vx = nvx + (Math.random() - 0.5) * 0.1 * humFactor;
          p.vy = nvy + (Math.random() - 0.5) * 0.1 * humFactor;
        } else {
          p.vx += (Math.random() - 0.5) * 0.25;
          p.vy += (Math.random() - 0.5) * 0.25;
        }

        p.vx *= 0.97;
        p.vy *= 0.97;

        const moveSpeed = 0.06 * (0.3 + humFactor * 0.7) * dt;
        p.x += p.vx * moveSpeed;
        p.y += p.vy * moveSpeed;

        if (p.mode === BrushMode.WATERCOLOR && Math.random() < p.branchingChance * humFactor) {
          newParticles.push({
            x: p.x,
            y: p.y,
            vx: p.vx + (Math.random() - 0.5) * 1.2,
            vy: p.vy + (Math.random() - 0.5) * 1.2,
            color: { ...p.color },
            alpha: p.alpha * 0.7,
            size: p.size * 0.6,
            life: p.life * 0.7,
            maxLife: p.maxLife * 0.6,
            branchingChance: p.branchingChance * 0.4,
            mode: p.mode
          });
        }

        this.renderDiffusionParticle(p, maxDiffusion);
      }

      if (newParticles.length > 0 && this.diffusionParticles.length < 300) {
        this.diffusionParticles.push(...newParticles);
      }
    }

    if (this.state.isResetting) {
      this.state.resetProgress += dt / 1500;
      if (this.state.resetProgress >= 1) {
        this.state.isResetting = false;
        this.state.resetProgress = 1;
        this.paintCtx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
        this.strokes = [];
        this.diffusionParticles = [];
        this.splashParticles = [];
        this.state.resetProgress = 0;
      }
    }

    for (let i = this.resetParticles.length - 1; i >= 0; i--) {
      const p = this.resetParticles[i];
      p.x += p.vx * dt * 0.08;
      p.y += p.vy * dt * 0.08;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.resetParticles.splice(i, 1);
      }
    }
  }

  private renderDiffusionParticle(p: DiffusionParticle, _maxDiffusion: number): void {
    const ctx = this.paintCtx;
    const lifeFactor = Math.max(0, p.life);
    const alpha = p.alpha * lifeFactor;

    ctx.globalCompositeOperation = p.mode === BrushMode.WATERCOLOR ? 'source-over' : 'source-over';

    const size = p.size * (0.5 + lifeFactor * 0.5);
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    grd.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`);
    grd.addColorStop(0.6, `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha * 0.4})`);
    grd.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  }

  private render(now: number): void {
    const ctx = this.ctx;
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;

    ctx.clearRect(0, 0, w, h);
    this.renderPaper(now);
    ctx.drawImage(this.paperCanvas, 0, 0);

    if (this.state.isResetting) {
      const cx = w / 2;
      const cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const currentRadius = maxDist * this.state.resetProgress;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tctx = tempCanvas.getContext('2d')!;
      tctx.drawImage(this.paintCanvas, 0, 0);

      tctx.save();
      tctx.globalCompositeOperation = 'destination-out';
      const grd = tctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
      grd.addColorStop(Math.max(0, 1 - 0.15 / Math.max(0.01, this.state.resetProgress)), 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      tctx.fillStyle = grd;
      tctx.fillRect(0, 0, w, h);
      tctx.restore();

      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      ctx.drawImage(this.paintCanvas, 0, 0);
    }

    this.renderHumidityEffects();
    this.renderResetParticles();
    this.renderCursor();
  }

  private renderPaper(now: number): void {
    const ctx = this.paperCtx;
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;
    const { r, g, b } = this.config.paperColor;
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    const noise = this.textureNoise;

    const loadElapsed = now - this.loadStartTime;
    const focusFactor = Math.min(1, loadElapsed / 1200);
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const nIdx = y * w + x;

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distFactor = 1 - (dist / maxDist);
        const sharpness = 0.3 + focusFactor * (0.35 + distFactor * 0.35);

        const n = noise[nIdx];
        const noiseVal = (n - 128) * (0.08 + sharpness * 0.18);

        data[idx] = Math.max(0, Math.min(255, r + noiseVal));
        data[idx + 1] = Math.max(0, Math.min(255, g + noiseVal * 0.98));
        data[idx + 2] = Math.max(0, Math.min(255, b + noiseVal * 0.92));
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  private renderHumidityEffects(): void {
    const ctx = this.ctx;
    const w = this.config.canvasWidth;
    const h = this.config.canvasHeight;
    const humidity = this.state.humidity;

    if (humidity > 60) {
      const intensity = (humidity - 60) / 40;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const shimmer = Math.sin(performance.now() * 0.001) * 0.5 + 0.5;
      const grd1 = ctx.createLinearGradient(0, 0, w * 0.4, h * 0.3);
      grd1.addColorStop(0, `rgba(255,255,255,${0.04 + shimmer * 0.03 * intensity})`);
      grd1.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd1;
      ctx.fillRect(0, 0, w, h);

      const grd2 = ctx.createLinearGradient(w * 0.6, h * 0.7, w, h);
      grd2.addColorStop(0, 'rgba(255,255,255,0)');
      grd2.addColorStop(1, `rgba(255,255,255,${0.03 + (1 - shimmer) * 0.02 * intensity})`);
      ctx.fillStyle = grd2;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (humidity < 20) {
      const intensity = (20 - humidity) / 20;
      ctx.save();
      ctx.strokeStyle = `rgba(100, 70, 40, ${0.08 + intensity * 0.12})`;
      ctx.lineWidth = 0.6;

      const time = performance.now() * 0.0001;
      for (let i = 0; i < 30 * intensity; i++) {
        const seed = i * 17.3;
        let px = (this.perlinNoise(seed, time) * 0.5 + 0.5) * w;
        let py = (this.perlinNoise(time, seed) * 0.5 + 0.5) * h;

        ctx.beginPath();
        ctx.moveTo(px, py);
        for (let j = 0; j < 5; j++) {
          const ang = this.perlinNoise(seed + j * 2.1, time + j * 1.7) * Math.PI * 4;
          const len = 8 + Math.random() * 18;
          px += Math.cos(ang) * len;
          py += Math.sin(ang) * len;
          ctx.lineTo(px, py);
          if (Math.random() < 0.35) {
            ctx.moveTo(px, py);
          }
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderResetParticles(): void {
    const ctx = this.ctx;
    ctx.save();
    for (const p of this.resetParticles) {
      const a = Math.max(0, p.life);
      ctx.globalAlpha = a * 0.8;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grd.addColorStop(0, 'rgba(220,230,255,0.9)');
      grd.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderCursor(): void {
    if (!this.isMouseInCanvas || !this.state.currentColor) {
      this.canvas.classList.add('default-cursor');
      return;
    }
    this.canvas.classList.remove('default-cursor');
    const ctx = this.ctx;
    const x = this.mouseX;
    const y = this.mouseY;
    const { r, g, b } = this.state.currentColor;
    const pulse = Math.sin(performance.now() * 0.005) * 0.08 + 1;

    ctx.save();

    if (this.state.brushMode === BrushMode.WATERCOLOR) {
      const baseR = 8 * pulse;
      const grd = ctx.createRadialGradient(x, y - baseR * 0.3, 0, x, y, baseR * 1.6);
      grd.addColorStop(0, `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},0.95)`);
      grd.addColorStop(0.5, `rgba(${r},${g},${b},0.8)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0.15)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(x, y - baseR * 1.2);
      ctx.bezierCurveTo(x + baseR * 1.1, y - baseR * 0.4, x + baseR * 0.9, y + baseR * 0.8, x, y + baseR);
      ctx.bezierCurveTo(x - baseR * 0.9, y + baseR * 0.8, x - baseR * 1.1, y - baseR * 0.4, x, y - baseR * 1.2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(x - baseR * 0.3, y - baseR * 0.4, baseR * 0.25, baseR * 0.15, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const baseR = 9 * pulse;
      const grd = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, baseR * 1.1);
      grd.addColorStop(0, `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},1)`);
      grd.addColorStop(0.7, `rgba(${r},${g},${b},0.95)`);
      grd.addColorStop(1, `rgba(${Math.max(0, r - 50)},${Math.max(0, g - 50)},${Math.max(0, b - 50)},0.7)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, baseR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x - baseR * 0.25, y - baseR * 0.3, baseR * 0.35, -0.8, 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
