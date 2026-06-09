export class DashboardUI {
  private headingCanvas: HTMLCanvasElement;
  private headingCtx: CanvasRenderingContext2D;
  private particleCountEl: HTMLElement;
  private fpsCounterEl: HTMLElement;
  private warningToast: HTMLElement;

  private currentHeading: number = 0;
  private targetHeading: number = 0;
  private headingTransitionDuration: number = 0.3;
  private headingTransitionElapsed: number = 0.3;
  private startHeading: number = 0;

  private warningTimeout: number | null = null;

  constructor(_container: HTMLElement) {
    this.headingCanvas = document.getElementById('heading-canvas') as HTMLCanvasElement;
    this.headingCtx = this.headingCanvas.getContext('2d')!;
    this.particleCountEl = document.getElementById('particle-count')!;
    this.fpsCounterEl = document.getElementById('fps-counter')!;
    this.warningToast = document.getElementById('warning-toast')!;

    this.setupCanvasDPR();
    window.addEventListener('resize', this.handleResize);
    this.drawGauge(this.currentHeading);
  }

  private setupCanvasDPR(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.headingCanvas.getBoundingClientRect();
    this.headingCanvas.width = rect.width * dpr;
    this.headingCanvas.height = rect.height * dpr;
    this.headingCtx.scale(dpr, dpr);
  }

  private handleResize = (): void => {
    this.setupCanvasDPR();
    this.drawGauge(this.currentHeading);
  };

  updateHeading(heading: number): void {
    while (heading > 180) heading -= 360;
    while (heading < -180) heading += 360;

    let diff = heading - this.currentHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.startHeading = this.currentHeading;
    this.targetHeading = this.startHeading + diff;
    this.headingTransitionElapsed = 0;
  }

  updateParticleCount(count: number): void {
    const formatted = (count / 1000).toFixed(1);
    this.particleCountEl.textContent = `${formatted}k`;
  }

  updateFPS(fps: number): void {
    this.fpsCounterEl.textContent = Math.round(fps).toString();
    if (fps < 30) {
      this.fpsCounterEl.classList.add('low');
    } else {
      this.fpsCounterEl.classList.remove('low');
    }
  }

  showWarning(message: string, duration: number = 3000): void {
    this.warningToast.textContent = message;
    this.warningToast.classList.add('visible');

    if (this.warningTimeout !== null) {
      window.clearTimeout(this.warningTimeout);
    }

    this.warningTimeout = window.setTimeout(() => {
      this.warningToast.classList.remove('visible');
      this.warningTimeout = null;
    }, duration);
  }

  update(delta: number): void {
    if (this.headingTransitionElapsed < this.headingTransitionDuration) {
      this.headingTransitionElapsed += delta;
      const t = Math.min(this.headingTransitionElapsed / this.headingTransitionDuration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);
      this.currentHeading = this.startHeading + (this.targetHeading - this.startHeading) * easeT;
      this.drawGauge(this.currentHeading);
    } else if (this.currentHeading !== this.targetHeading) {
      this.currentHeading = this.targetHeading;
      this.drawGauge(this.currentHeading);
    }
  }

  private drawGauge(heading: number): void {
    const ctx = this.headingCtx;
    const rect = this.headingCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.8;
    const radius = Math.min(w * 0.42, h * 0.85);
    const innerRadius = radius * 0.72;
    const startAngle = Math.PI * 1.15;
    const endAngle = Math.PI * 1.85;
    const totalAngle = endAngle - startAngle;

    const segments = 120;
    for (let i = 0; i < segments; i++) {
      const a1 = startAngle + (i / segments) * totalAngle;
      const a2 = startAngle + ((i + 1) / segments) * totalAngle;
      const t = i / segments;

      const r = (1 - t) * 255;
      const g = 80 + t * 175;
      const b = 80 + (1 - t) * 100;

      ctx.beginPath();
      ctx.arc(cx, cy, radius, a1, a2, false);
      ctx.arc(cx, cy, innerRadius, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      ctx.fill();
    }

    const normalizedHeading = (heading + 180) / 360;
    const pointerAngle = startAngle + normalizedHeading * totalAngle;

    const pointerLength = radius * 0.9;
    const pointerBase = innerRadius * 0.9;
    const px1 = cx + Math.cos(pointerAngle) * pointerLength;
    const py1 = cy + Math.sin(pointerAngle) * pointerLength;
    const baseAngle1 = pointerAngle - 0.08;
    const baseAngle2 = pointerAngle + 0.08;
    const px2 = cx + Math.cos(baseAngle1) * pointerBase;
    const py2 = cy + Math.sin(baseAngle1) * pointerBase;
    const px3 = cx + Math.cos(baseAngle2) * pointerBase;
    const py3 = cy + Math.sin(baseAngle2) * pointerBase;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.lineTo(px3, py3);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();

    const fontSize = Math.max(10, Math.min(14, w * 0.07));
    ctx.font = `bold ${fontSize}px Consolas, Monaco, monospace`;
    ctx.fillStyle = '#E0F7FA';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayHeading = Math.round(heading);
    const headingText = `${displayHeading > 0 ? '+' : ''}${displayHeading}°`;
    ctx.fillText(headingText, cx, cy - radius * 0.15);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    if (this.warningTimeout !== null) {
      window.clearTimeout(this.warningTimeout);
    }
  }
}
