import { Confetti, LightWave, CONFETTI_LIFETIME } from './confetti';

export interface RendererState {
  timeOffset: number;
  visibleDuration: number;
  engineTime: number;
  hoverX: number | null;
  hoverY: number | null;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private bgCanvas: HTMLCanvasElement | null = null;
  private lastWidth = 0;
  private lastHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (width !== this.lastWidth || height !== this.lastHeight) {
      this.bgCanvas = null;
      this.lastWidth = width;
      this.lastHeight = height;
    }
  }

  public getWidth(): number {
    return window.innerWidth;
  }

  public getHeight(): number {
    return window.innerHeight;
  }

  public getTimelineY(): number {
    return this.getHeight() / 2;
  }

  public getTimelineStartX(): number {
    return 80;
  }

  public getTimelineEndX(): number {
    return this.getWidth() - 80;
  }

  public getTimelineWidth(): number {
    return this.getTimelineEndX() - this.getTimelineStartX();
  }

  public getPixelsPerSecond(visibleDuration: number): number {
    return this.getTimelineWidth() / visibleDuration;
  }

  public timeToScreenX(time: number, state: RendererState): number {
    const relTime = time - state.timeOffset;
    return this.getTimelineStartX() + relTime * this.getPixelsPerSecond(state.visibleDuration);
  }

  public screenXToTime(screenX: number, state: RendererState): number {
    const relX = screenX - this.getTimelineStartX();
    return state.timeOffset + relX / this.getPixelsPerSecond(state.visibleDuration);
  }

  private ensureBgCanvas(): void {
    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement('canvas');
      this.bgCanvas.width = this.canvas.width;
      this.bgCanvas.height = this.canvas.height;
      const bgCtx = this.bgCanvas.getContext('2d');
      if (!bgCtx) return;
      bgCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const w = this.getWidth();
      const h = this.getHeight();
      const gradient = bgCtx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#0d0d1a');
      gradient.addColorStop(1, '#1a1a2e');
      bgCtx.fillStyle = gradient;
      bgCtx.fillRect(0, 0, w, h);
    }
  }

  private drawBackground(): void {
    this.ensureBgCanvas();
    if (this.bgCanvas) {
      this.ctx.drawImage(this.bgCanvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, this.getWidth(), this.getHeight());
    }
  }

  private drawTimeline(): void {
    const y = this.getTimelineY();
    const startX = this.getTimelineStartX();
    const endX = this.getTimelineEndX();
    const ctx = this.ctx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#555588';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawTicks(state: RendererState): void {
    const ctx = this.ctx;
    const y = this.getTimelineY();
    const pps = this.getPixelsPerSecond(state.visibleDuration);
    const startX = this.getTimelineStartX();
    const endX = this.getTimelineEndX();

    const startTime = state.timeOffset;
    const endTime = state.timeOffset + state.visibleDuration;

    const tickInterval = 0.5;
    const majorInterval = 2;

    let t = Math.ceil(startTime / tickInterval) * tickInterval;

    ctx.save();
    ctx.fillStyle = '#777799';
    ctx.strokeStyle = '#777799';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    while (t <= endTime) {
      const x = startX + (t - startTime) * pps;
      if (x >= startX - 20 && x <= endX + 20) {
        const isMajor = Math.abs(t % majorInterval) < 0.001;
        const tickHeight = isMajor ? 16 : 8;

        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x, y - tickHeight / 2);
        ctx.lineTo(x, y + tickHeight / 2);
        ctx.stroke();

        if (isMajor) {
          ctx.fillText(t.toFixed(0) + 's', x, y + 16);
        }
      }
      t += tickInterval;
    }
    ctx.restore();
  }

  private drawConfetti(confetti: Confetti, state: RendererState): void {
    const ctx = this.ctx;
    const age = confetti.getAge(state.engineTime);
    if (age < 0) return;

    const screenX = this.timeToScreenX(confetti.timestamp + age / 1000 * confetti.velocity * confetti.getSpeedMultiplier(age), state);
    const y = confetti.y;
    const size = confetti.getSize(state.engineTime);
    const alpha = confetti.getAlpha(state.engineTime);

    const startX = this.getTimelineStartX();
    const endX = this.getTimelineEndX();
    if (screenX < startX - size * 2 || screenX > endX + size * 2) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowColor = confetti.color;
    ctx.shadowBlur = 8;

    ctx.fillStyle = confetti.color;
    ctx.beginPath();
    ctx.arc(screenX, y, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(screenX - size / 6, y - size / 6, size / 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawAllConfetti(confettiList: Confetti[], state: RendererState): void {
    for (const c of confettiList) {
      this.drawConfetti(c, state);
    }
  }

  private drawLightWave(wave: LightWave, state: RendererState): void {
    const ctx = this.ctx;
    const alpha = wave.getAlpha(state.engineTime);
    const radius = wave.getRadius(state.engineTime);
    if (alpha <= 0 || radius <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = wave.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawAllLightWaves(waves: LightWave[], state: RendererState): void {
    for (const w of waves) {
      this.drawLightWave(w, state);
    }
  }

  private drawHighlight(state: RendererState): void {
    if (state.hoverX === null || state.hoverY === null) return;

    const ctx = this.ctx;
    const y = this.getTimelineY();
    const x = state.hoverX;
    const startX = this.getTimelineStartX();
    const endX = this.getTimelineEndX();
    if (x < startX || x > endX) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, y - 40);
    ctx.lineTo(x, y + 40);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const time = this.screenXToTime(x, state);
    ctx.fillText(time.toFixed(1) + 's', x, y - 44);
    ctx.restore();
  }

  public render(confettiList: Confetti[], lightWaves: LightWave[], state: RendererState): void {
    this.drawBackground();
    this.drawTimeline();
    this.drawTicks(state);
    this.drawAllLightWaves(lightWaves, state);
    this.drawAllConfetti(confettiList, state);
    this.drawHighlight(state);
  }
}
