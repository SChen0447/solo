import { StarField, Star, Constellation } from './starField';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1800;
const CONSTELLATION_LINE_COLOR = '#6688ff';
const HIGHLIGHT_COLOR = '#ffdd44';
const DRAG_LINE_COLOR = 'rgba(102, 136, 255, 0.55)';
const BG_TOP = '#0a0e27';
const BG_BOTTOM = '#050818';

class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  starField: StarField;
  interaction: InteractionManager;
  ui: UIManager;
  lastTime = 0;
  dpr = 1;
  currentSelectedStar: Star | null = null;
  rafId = 0;
  resizeObserver?: ResizeObserver;

  constructor() {
    const canvas = document.getElementById('skyCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.starField = new StarField(WORLD_WIDTH, WORLD_HEIGHT);
    this.interaction = new InteractionManager(canvas, this.starField);
    this.ui = new UIManager('app');

    this.setupDPR();
    this.bindUIBindings();
    this.bindCanvasEvents();
    this.setupResize();
    this.start();
  }

  private setupDPR(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });
    this.resizeObserver.observe(this.canvas);
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  private bindUIBindings(): void {
    this.ui.onToggleConstellation = (show) => {
      this.starField.showConstellations = show;
    };
    this.ui.onSearch = (query) => {
      return this.interaction.searchConstellation(query);
    };
    this.ui.onReset = () => {
      this.interaction.resetCamera(false);
    };
    this.ui.onClear = () => {
      this.starField.removeAllCustomConnections();
    };
    this.interaction.onStarClick = (star, sx, sy) => {
      this.currentSelectedStar = star;
      this.ui.showInfoCard(star, sx, sy);
    };
    this.ui.onCloseCard = () => {
      this.currentSelectedStar = null;
    };
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.interaction.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.interaction.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.interaction.handleMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => this.interaction.handleContextMenu(e));
    this.canvas.addEventListener('wheel', (e) => this.interaction.handleWheel(e), { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.interaction.handleTouchStart(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.interaction.handleTouchMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      this.interaction.handleTouchEnd(e);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const card = this.ui.infoCard;
      if (card.style.display !== 'none') {
        const cardRect = card.getBoundingClientRect();
        const inCard = x >= cardRect.left - rect.left && x <= cardRect.right - rect.left &&
                       y >= cardRect.top - rect.top && y <= cardRect.bottom - rect.top;
        if (!inCard) {
          this.ui.hideInfoCard();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.ui.hideInfoCard();
      }
    });
  }

  private start(): void {
    this.lastTime = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(64, t - this.lastTime);
      this.lastTime = t;
      this.update(dt, t);
      this.render(t);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number, currentTime: number): void {
    this.starField.update(dt, currentTime);
    this.interaction.update(currentTime);
  }

  private render(currentTime: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.drawBackground(ctx, w, h);
    this.applyCamera(ctx, w, h);
    this.drawConstellationLines(ctx, currentTime);
    this.drawCustomConnections(ctx, currentTime);
    this.drawDragPreviewLine(ctx);
    this.drawStars(ctx, currentTime);
    this.drawConstellationLabels(ctx);
    this.restoreCamera(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, BG_TOP);
    grad.addColorStop(1, BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.035;
    const nebulaGrad = ctx.createRadialGradient(
      w * 0.3, h * 0.35, 0,
      w * 0.3, h * 0.35, Math.max(w, h) * 0.6
    );
    nebulaGrad.addColorStop(0, '#334488');
    nebulaGrad.addColorStop(0.4, '#221144');
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, w, h);

    const nebulaGrad2 = ctx.createRadialGradient(
      w * 0.75, h * 0.7, 0,
      w * 0.75, h * 0.7, Math.max(w, h) * 0.5
    );
    nebulaGrad2.addColorStop(0, '#443377');
    nebulaGrad2.addColorStop(0.5, 'transparent');
    ctx.fillStyle = nebulaGrad2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  private applyCamera(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.interaction.camera.zoom, this.interaction.camera.zoom);
    ctx.translate(-this.interaction.camera.x, -this.interaction.camera.y);
  }

  private restoreCamera(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  private drawStars(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const highlight = this.starField.highlightState;
    const highlightSet = new Set<number>(highlight?.starIds || []);

    for (const star of this.starField.stars) {
      const t = currentTime / 1000;
      const twinkle = 0.85 + 0.15 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
      const brightness = star.brightness * twinkle;
      const radius = star.baseRadius * (0.9 + 0.1 * twinkle);

      const gray = Math.floor(200 + 55 * brightness);
      const color = `rgb(${gray}, ${gray}, ${Math.min(255, gray + 5)})`;

      if (brightness > 0.7) {
        const glowR = radius * 4;
        const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.35 * brightness})`);
        glow.addColorStop(0.4, `rgba(180, 200, 255, ${0.12 * brightness})`);
        glow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (star === this.currentSelectedStar) {
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 1.5 / this.interaction.camera.zoom;
        ctx.beginPath();
        ctx.arc(star.x, star.y, radius + 5 / this.interaction.camera.zoom, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (highlightSet.has(star.id) && highlight) {
        const elapsed = currentTime - highlight.startTime;
        const progress = elapsed / highlight.duration;
        const blinkPhase = (elapsed / 250) % 2;
        const blinkOpacity = blinkPhase < 1 ? 0.9 : 0.35;
        const fadeOpacity = 1 - progress;
        const op = blinkOpacity * Math.max(0, Math.min(1, fadeOpacity * 1.5));

        ctx.save();
        ctx.globalAlpha = op;
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 2 / this.interaction.camera.zoom;
        ctx.beginPath();
        const pulseR = radius + 8 / this.interaction.camera.zoom + Math.sin(elapsed / 120) * 2 / this.interaction.camera.zoom;
        ctx.arc(star.x, star.y, pulseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawConstellationLines(ctx: CanvasRenderingContext2D, _currentTime: number): void {
    if (!this.starField.showConstellations) return;

    ctx.save();
    ctx.strokeStyle = CONSTELLATION_LINE_COLOR;
    ctx.lineWidth = 1.4 / this.interaction.camera.zoom;
    ctx.setLineDash([6 / this.interaction.camera.zoom, 5 / this.interaction.camera.zoom]);
    ctx.globalAlpha = 0.85;

    for (const c of this.starField.constellations) {
      for (const [id1, id2] of c.connections) {
        const s1 = this.starField.stars[id1];
        const s2 = this.starField.stars[id2];
        if (!s1 || !s2) continue;
        ctx.beginPath();
        ctx.moveTo(s1.x, s1.y);
        ctx.lineTo(s2.x, s2.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawConstellationLabels(ctx: CanvasRenderingContext2D): void {
    if (!this.starField.showConstellations) return;

    ctx.save();
    const fontSize = 14 / this.interaction.camera.zoom;
    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const c of this.starField.constellations) {
      const text = c.name;
      const padX = 10 / this.interaction.camera.zoom;
      const padY = 6 / this.interaction.camera.zoom;
      const w = ctx.measureText(text).width + padX * 2;
      const h = fontSize + padY * 1.6;

      ctx.fillStyle = 'rgba(18, 26, 58, 0.75)';
      ctx.beginPath();
      const x = c.labelX - w / 2;
      const y = c.labelY - h;
      this.roundRect(ctx, x, y, w, h, 6 / this.interaction.camera.zoom);
      ctx.fill();

      ctx.strokeStyle = 'rgba(102, 136, 255, 0.4)';
      ctx.lineWidth = 0.8 / this.interaction.camera.zoom;
      ctx.beginPath();
      this.roundRect(ctx, x, y, w, h, 6 / this.interaction.camera.zoom);
      ctx.stroke();

      ctx.fillStyle = '#e8ecff';
      ctx.fillText(text, c.labelX, c.labelY - padY * 0.5);
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  private drawCustomConnections(ctx: CanvasRenderingContext2D, _currentTime: number): void {
    if (this.starField.customConnections.length === 0) return;

    ctx.save();
    for (const conn of this.starField.customConnections) {
      const s1 = this.starField.stars[conn.starId1];
      const s2 = this.starField.stars[conn.starId2];
      if (!s1 || !s2) continue;

      ctx.globalAlpha = conn.opacity;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6 / this.interaction.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDragPreviewLine(ctx: CanvasRenderingContext2D): void {
    if (!this.interaction.dragLine.isDragging || !this.interaction.dragLine.fromStar) return;

    const from = this.interaction.dragLine.fromStar;
    const toX = this.interaction.dragLine.currentWorldX;
    const toY = this.interaction.dragLine.currentWorldY;

    ctx.save();
    ctx.strokeStyle = DRAG_LINE_COLOR;
    ctx.lineWidth = 2 / this.interaction.camera.zoom;
    ctx.setLineDash([4 / this.interaction.camera.zoom, 4 / this.interaction.camera.zoom]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(102, 136, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(toX, toY, 3 / this.interaction.camera.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (err) {
    console.error('App initialization failed:', err);
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `<div style="color:#ff6b6b;padding:40px;font-family:system-ui;">初始化失败：${(err as Error).message}</div>`;
    }
  }
});
