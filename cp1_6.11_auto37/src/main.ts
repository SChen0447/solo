import { NeonSign, SignShape, AnimationMode } from './neonSign';
import { RainParticleSystem } from './rainParticle';
import { ToolsPanel } from './tools';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private signs: NeonSign[] = [];
  private selectedSign: NeonSign | null = null;
  private rain: RainParticleSystem;
  private tools: ToolsPanel;
  private lastTime: number = 0;
  private interactionState: 'idle' | 'dragging' | 'resizing' | 'rotating' = 'idle';
  private activeHandle: any = null;
  private isPlacing: boolean = false;
  private clearAnimation: { active: boolean; phase: number; flickerCount: number; flickerTimer: number; fadeAlpha: number } = {
    active: false, phase: 0, flickerCount: 0, flickerTimer: 0, fadeAlpha: 1,
  };
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.rain = new RainParticleSystem();
    this.tools = new ToolsPanel();

    this.resize();
    this.rain.init(this.canvasWidth, this.canvasHeight);

    this.setupCallbacks();
    this.setupEvents();

    this.hideLoading();

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private hideLoading(): void {
    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 800);
      }
    }, 800);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = this.canvasWidth + 'px';
    this.canvas.style.height = this.canvasHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.rain.resize(this.canvasWidth, this.canvasHeight);
  }

  private setupCallbacks(): void {
    this.tools.on({
      onShapeSelect: (shape: SignShape) => {
        this.isPlacing = true;
        this.canvas.style.cursor = 'crosshair';
      },
      onColorChange: (color: string) => {
        if (this.selectedSign) {
          this.selectedSign.borderColor = color;
        }
      },
      onBorderWidthChange: (width: number) => {
        if (this.selectedSign) {
          this.selectedSign.borderWidth = width;
        }
      },
      onAnimationModeChange: (mode: AnimationMode) => {
        if (this.selectedSign) {
          this.selectedSign.setAnimationMode(mode);
        }
      },
      onBreathePeriodChange: (period: number) => {
        if (this.selectedSign) {
          this.selectedSign.breathePeriod = period;
        }
      },
      onChaseSpeedChange: (speed: number) => {
        if (this.selectedSign) {
          this.selectedSign.chaseSpeed = speed;
        }
      },
      onExport: () => {
        this.exportPNG();
      },
      onClear: () => {
        this.clearCanvas();
      },
      onTextChange: (text: string) => {
        if (this.selectedSign && this.selectedSign.shape === 'text') {
          this.selectedSign.text = text;
        }
      },
      onFontChange: (font: string) => {
        if (this.selectedSign && this.selectedSign.shape === 'text') {
          this.selectedSign.fontFamily = font;
        }
      },
      onFontSizeChange: (size: number) => {
        if (this.selectedSign && this.selectedSign.shape === 'text') {
          this.selectedSign.fontSize = size;
        }
      },
      onDeleteSign: () => {
        if (this.selectedSign) {
          this.signs = this.signs.filter(s => s !== this.selectedSign);
          this.selectedSign = null;
          this.tools.showPropertyPanel(false);
        }
      },
    });
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseDown({ clientX: t.clientX, clientY: t.clientY, button: 0 } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedSign && !this.selectedSign.editing) {
          this.signs = this.signs.filter(s => s !== this.selectedSign);
          this.selectedSign = null;
          this.tools.showPropertyPanel(false);
        }
      }
      if (e.key === 'Escape') {
        if (this.selectedSign) {
          this.selectedSign.editing = false;
          this.selectedSign.selected = false;
          this.selectedSign = null;
          this.tools.showPropertyPanel(false);
        }
        this.isPlacing = false;
      }
    });
  }

  private getCanvasPos(e: { clientX: number; clientY: number }): { x: number; y: number } {
    return { x: e.clientX, y: e.clientY };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.isPlacing) {
      const shape = this.tools.getCurrentShape();
      const sign = new NeonSign(shape, pos.x - 60, pos.y - 40);
      sign.borderColor = this.tools.getCurrentColor();
      sign.borderWidth = this.tools.getCurrentBorderWidth();
      this.signs.push(sign);
      this.selectSign(sign);
      this.isPlacing = false;
      this.canvas.style.cursor = 'default';
      return;
    }

    if (this.selectedSign) {
      const handle = this.selectedSign.hitTestHandle(pos.x, pos.y);
      if (handle) {
        if (handle.type === 'corner') {
          this.interactionState = 'resizing';
          this.activeHandle = handle;
          this.selectedSign.startResize(handle, pos.x, pos.y);
        } else {
          this.interactionState = 'rotating';
          this.activeHandle = handle;
          this.selectedSign.startRotate(handle, pos.x, pos.y);
        }
        return;
      }
    }

    let hitSign: NeonSign | null = null;
    for (let i = this.signs.length - 1; i >= 0; i--) {
      if (this.signs[i].hitTest(pos.x, pos.y)) {
        hitSign = this.signs[i];
        break;
      }
    }

    if (hitSign) {
      this.selectSign(hitSign);
      this.interactionState = 'dragging';
      hitSign.startDrag(pos.x, pos.y);
      this.signs = this.signs.filter(s => s !== hitSign);
      this.signs.push(hitSign);
    } else {
      if (this.selectedSign) {
        this.selectedSign.selected = false;
        this.selectedSign.editing = false;
        this.selectedSign = null;
        this.tools.showPropertyPanel(false);
      }
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.interactionState === 'dragging' && this.selectedSign) {
      this.selectedSign.drag(pos.x, pos.y);
      return;
    }

    if (this.interactionState === 'resizing' && this.selectedSign) {
      this.selectedSign.doResize(pos.x, pos.y);
      return;
    }

    if (this.interactionState === 'rotating' && this.selectedSign) {
      this.selectedSign.doRotate(pos.x, pos.y);
      return;
    }

    if (this.selectedSign) {
      const handle = this.selectedSign.hitTestHandle(pos.x, pos.y);
      if (handle) {
        this.canvas.style.cursor = handle.type === 'corner' ? 'nwse-resize' : 'grab';
        return;
      }
    }

    let hovering = false;
    for (let i = this.signs.length - 1; i >= 0; i--) {
      if (this.signs[i].hitTest(pos.x, pos.y)) {
        hovering = true;
        break;
      }
    }
    this.canvas.style.cursor = this.isPlacing ? 'crosshair' : (hovering ? 'pointer' : 'default');
  }

  private onMouseUp(): void {
    if (this.interactionState === 'dragging' && this.selectedSign) {
      this.selectedSign.endDrag();
    }
    if (this.interactionState === 'resizing' && this.selectedSign) {
      this.selectedSign.endResize();
    }
    if (this.interactionState === 'rotating' && this.selectedSign) {
      this.selectedSign.endRotate();
    }
    this.interactionState = 'idle';
    this.activeHandle = null;
  }

  private onDoubleClick(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    for (let i = this.signs.length - 1; i >= 0; i--) {
      if (this.signs[i].hitTest(pos.x, pos.y) && this.signs[i].shape === 'text') {
        this.selectSign(this.signs[i]);
        this.signs[i].editing = true;
        return;
      }
    }
  }

  private selectSign(sign: NeonSign): void {
    if (this.selectedSign && this.selectedSign !== sign) {
      this.selectedSign.selected = false;
      this.selectedSign.editing = false;
    }
    this.selectedSign = sign;
    sign.selected = true;
    this.tools.showPropertyPanel(true);
    this.tools.updateProperties(sign);
  }

  private exportPNG(): void {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.canvasWidth;
    exportCanvas.height = this.canvasHeight;
    const ectx = exportCanvas.getContext('2d')!;

    const gradient = ectx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.4, '#0d0d2b');
    gradient.addColorStop(1, '#0a0a1a');
    ectx.fillStyle = gradient;
    ectx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.rain.render(ectx);

    for (const sign of this.signs) {
      sign.render(ectx);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const modal = document.getElementById('preview-modal')!;
    const img = document.getElementById('preview-image') as HTMLImageElement;
    img.src = dataUrl;
    modal.classList.add('show');

    const downloadBtn = document.getElementById('preview-download')!;
    const cancelBtn = document.getElementById('preview-cancel')!;

    const onDownload = () => {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `neon-canvas-${Date.now()}.png`;
      a.click();
      cleanup();
    };

    const onCancel = () => {
      cleanup();
    };

    const cleanup = () => {
      modal.classList.remove('show');
      downloadBtn.removeEventListener('click', onDownload);
      cancelBtn.removeEventListener('click', onCancel);
    };

    downloadBtn.addEventListener('click', onDownload);
    cancelBtn.addEventListener('click', onCancel);
  }

  private clearCanvas(): void {
    if (this.clearAnimation.active || this.signs.length === 0) return;
    this.clearAnimation = {
      active: true,
      phase: 0,
      flickerCount: 0,
      flickerTimer: 0,
      fadeAlpha: 1,
    };
  }

  private updateClearAnimation(dt: number): void {
    const ca = this.clearAnimation;
    if (!ca.active) return;

    if (ca.phase === 0) {
      ca.flickerTimer += dt;
      const flickerInterval = 0.15;
      if (ca.flickerTimer >= flickerInterval) {
        ca.flickerTimer -= flickerInterval;
        ca.flickerCount++;
        if (ca.flickerCount >= 6) {
          ca.phase = 1;
        }
      }
    } else if (ca.phase === 1) {
      ca.fadeAlpha -= dt * 1.5;
      if (ca.fadeAlpha <= 0) {
        ca.fadeAlpha = 0;
        this.signs = [];
        this.selectedSign = null;
        this.tools.showPropertyPanel(false);
        ca.active = false;
        ca.phase = 2;
      }
    }
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;
    const time = timestamp / 1000;

    this.rain.update(dt, time);

    for (const sign of this.signs) {
      sign.update(dt, time);
    }

    if (this.selectedSign) {
      this.tools.updateProperties(this.selectedSign);
    }

    this.updateClearAnimation(dt / 1000);

    this.render(time);

    requestAnimationFrame(this.loop);
  };

  private render(time: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.4, '#0d0d2b');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    this.rain.render(ctx);

    const ca = this.clearAnimation;
    if (ca.active) {
      if (ca.phase === 0) {
        const flicker = ca.flickerCount % 2 === 0;
        if (flicker) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(0, 0, w, h);
        }
      } else if (ca.phase === 1) {
        ctx.globalAlpha = ca.fadeAlpha;
      }
    }

    for (const sign of this.signs) {
      sign.render(ctx);
    }

    if (ca.active && ca.phase === 1) {
      ctx.globalAlpha = 1;
    }

    if (this.isPlacing) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText('点击画布放置灯牌...', w / 2 - 80, h / 2);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

new App();
