import { Feather, FloatMode, Sparkle, TrailPoint, PALETTE } from './feather';

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export interface HistoryEntry {
  text: string;
  time: number;
}

export interface RendererState {
  feathers: Feather[];
  trails: TrailPoint[];
  sparkles: Sparkle[];
  mode: FloatMode;
  mouseX: number;
  mouseY: number;
  mouseOnCanvas: boolean;
  history: HistoryEntry[];
  panelOpen: boolean;
  fps: number;
  featherCount: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private state: RendererState;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;
  private panelToggleAnim: number = 0;
  private countAnimAlpha: number = 1;
  private prevCount: number = 0;
  private borderPhase: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.state = {
      feathers: [],
      trails: [],
      sparkles: [],
      mode: FloatMode.Drift,
      mouseX: 0,
      mouseY: 0,
      mouseOnCanvas: false,
      history: [],
      panelOpen: false,
      fps: 60,
      featherCount: 0,
    };
  }

  getState(): RendererState {
    return this.state;
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const w = Math.max(700, window.innerWidth * 0.9);
    const h = Math.max(500, window.innerHeight * 0.8);
    this.width = w;
    this.height = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  addHistory(text: string): void {
    this.state.history.push({ text, time: Date.now() });
    if (this.state.history.length > 10) {
      this.state.history.shift();
    }
  }

  addSparkles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.state.sparkles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        born: performance.now(),
        life: 500,
      });
    }
  }

  addTrail(x: number, y: number, color: string): void {
    this.state.trails.push({
      x,
      y,
      color,
      alpha: 1,
      born: performance.now(),
    });
  }

  togglePanel(): void {
    this.state.panelOpen = !this.state.panelOpen;
  }

  render(time: number, dt: number): void {
    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.state.fps = this.currentFps;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.state.featherCount !== this.prevCount) {
      this.countAnimAlpha = 0;
      this.prevCount = this.state.featherCount;
    }
    this.countAnimAlpha = Math.min(1, this.countAnimAlpha + dt / 300);

    this.borderPhase = (time / 5000) * Math.PI * 2;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(ctx, time);
    this.drawBorder(ctx, time);
    this.drawFusionGlows(ctx, time);
    this.drawTrails(ctx, time);
    this.drawSparkles(ctx, time);
    for (const f of this.state.feathers) {
      f.render(ctx, time);
    }
    this.drawPanel(ctx, time);
    this.drawCursor(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, _time: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d0d2b');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBorder(ctx: CanvasRenderingContext2D, time: number): void {
    const phase = (time / 5000) * Math.PI * 2;
    const offset = ((phase % (Math.PI * 2)) / (Math.PI * 2)) * this.width * 2;

    const gradient = ctx.createLinearGradient(
      offset - this.width, 0, offset + this.width, 0
    );
    gradient.addColorStop(0, '#48dbfb');
    gradient.addColorStop(0.5, '#a29bfe');
    gradient.addColorStop(1, '#48dbfb');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, this.width - 2, this.height - 2);
  }

  private drawFusionGlows(ctx: CanvasRenderingContext2D, time: number): void {
    const feathers = this.state.feathers;
    for (let i = 0; i < feathers.length; i++) {
      for (let j = i + 1; j < feathers.length; j++) {
        const result = Feather.checkFusion(feathers[i], feathers[j]);
        if (result === 'glow') {
          Feather.renderFusionGlow(ctx, feathers[i], feathers[j], time);
        }
      }
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D, time: number): void {
    const now = performance.now();
    this.state.trails = this.state.trails.filter(t => now - t.born < 500);

    for (const trail of this.state.trails) {
      const age = (now - trail.born) / 500;
      const alpha = (1 - age) * 0.8;
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trail.color;
      ctx.shadowColor = trail.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSparkles(ctx: CanvasRenderingContext2D, time: number): void {
    const now = performance.now();
    this.state.sparkles = this.state.sparkles.filter(s => now - s.born < s.life);

    for (const s of this.state.sparkles) {
      const age = (now - s.born) / s.life;
      const alpha = 1 - age;
      if (alpha <= 0) continue;

      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawPanel(ctx: CanvasRenderingContext2D, time: number): void {
    const targetAnim = this.state.panelOpen ? 1 : 0;
    this.panelToggleAnim += (targetAnim - this.panelToggleAnim) * 0.12;

    const iconX = this.width - 30;
    const iconY = this.height - 30;

    ctx.save();

    if (this.panelToggleAnim < 0.95) {
      this.drawPanelIcon(ctx, iconX, iconY);
    }

    if (this.panelToggleAnim > 0.05) {
      ctx.globalAlpha = this.panelToggleAnim;
      const panelW = 280;
      const panelH = 240;
      const px = this.width - panelW - 12;
      const py = this.height - panelH - 12;

      ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
      drawRoundRect(ctx, px, py, panelW, panelH, 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(72, 219, 251, 0.3)';
      ctx.lineWidth = 1;
      drawRoundRect(ctx, px, py, panelW, panelH, 8);
      ctx.stroke();

      let textY = py + 20;
      const textX = px + 14;

      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#8892b0';
      ctx.textBaseline = 'top';

      ctx.fillText('羽毛数量', textX, textY);
      const countStr = String(this.state.featherCount);
      ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#48dbfb';
      ctx.globalAlpha = this.panelToggleAnim * this.countAnimAlpha;
      ctx.fillText(countStr, textX + 70, textY - 4);
      ctx.globalAlpha = this.panelToggleAnim;

      textY += 32;

      ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#8892b0';
      ctx.fillText('飘动模式', textX, textY);
      const modeNames: Record<FloatMode, string> = {
        [FloatMode.Drift]: '飘动模式一',
        [FloatMode.Gather]: '飘动模式二',
        [FloatMode.Scatter]: '飘动模式三',
      };
      const modeIcons: Record<FloatMode, string> = {
        [FloatMode.Drift]: '☁',
        [FloatMode.Gather]: '◎',
        [FloatMode.Scatter]: '✦',
      };
      ctx.fillStyle = '#feca57';
      ctx.fillText(`${modeIcons[this.state.mode]} ${modeNames[this.state.mode]}`, textX + 70, textY);

      textY += 24;

      ctx.fillStyle = '#8892b0';
      ctx.fillText('FPS', textX, textY);
      const fpsStr = String(this.currentFps);
      const isLowFps = this.currentFps < 30;
      if (isLowFps) {
        const blink = Math.sin(time / 200) > 0;
        ctx.fillStyle = blink ? '#ff6b6b' : '#0d0d2b';
      } else {
        ctx.fillStyle = '#54a0ff';
      }
      ctx.fillText(fpsStr, textX + 70, textY);

      textY += 28;

      ctx.fillStyle = '#8892b0';
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('操作历史', textX, textY);
      textY += 18;

      const visibleHistory = this.state.history.slice(-6);
      for (const entry of visibleHistory) {
        const date = new Date(entry.time);
        const ts = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        ctx.fillStyle = 'rgba(162, 155, 254, 0.6)';
        ctx.fillText(`[${ts}]`, textX, textY);
        ctx.fillStyle = 'rgba(200, 200, 220, 0.7)';
        ctx.fillText(entry.text, textX + 68, textY);
        textY += 16;
      }

      if (this.panelToggleAnim >= 0.95) {
        this.drawPanelIcon(ctx, iconX, iconY);
      }
    }

    ctx.restore();
  }

  private drawPanelIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();

    ctx.fillStyle = '#48dbfb';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.quadraticCurveTo(x - 5, y - 3, x - 7, y - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.quadraticCurveTo(x + 5, y - 3, x + 7, y - 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 4, y + 2, x - 6, y + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y + 2, x + 6, y + 4);
    ctx.stroke();

    ctx.restore();
  }

  private drawCursor(ctx: CanvasRenderingContext2D): void {
    if (!this.state.mouseOnCanvas) return;

    ctx.save();
    ctx.fillStyle = 'rgba(72, 219, 251, 0.8)';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.state.mouseX, this.state.mouseY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(this.state.mouseX, this.state.mouseY, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
