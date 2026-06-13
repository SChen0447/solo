interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
  colorProgress: number;
}

export class TrailEffect {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trailPoints: TrailPoint[] = [];
  private animationId: number | null = null;
  private readonly trailLifetime: number = 3000;
  private readonly maxPoints: number = 150;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }

  private interpolateColor(progress: number): string {
    const colors = [
      { r: 255, g: 0, b: 255 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 215, b: 0 },
    ];

    const segment = progress * (colors.length - 1);
    const segmentIndex = Math.min(Math.floor(segment), colors.length - 2);
    const segmentProgress = segment - segmentIndex;

    const start = colors[segmentIndex];
    const end = colors[segmentIndex + 1];

    const r = Math.round(start.r + (end.r - start.r) * segmentProgress);
    const g = Math.round(start.g + (end.g - start.g) * segmentProgress);
    const b = Math.round(start.b + (end.b - start.b) * segmentProgress);

    return `rgb(${r}, ${g}, ${b})`;
  }

  public addPoint(x: number, y: number): void {
    const now = performance.now();
    const colorProgress = this.trailPoints.length > 0
      ? (this.trailPoints[this.trailPoints.length - 1].colorProgress + 0.01) % 1
      : 0;

    this.trailPoints.push({ x, y, timestamp: now, colorProgress });

    if (this.trailPoints.length > this.maxPoints) {
      this.trailPoints.shift();
    }
  }

  private clearExpiredPoints(now: number): void {
    this.trailPoints = this.trailPoints.filter(
      point => now - point.timestamp < this.trailLifetime
    );
  }

  private draw(): void {
    const now = performance.now();
    this.clearExpiredPoints(now);

    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (this.trailPoints.length < 2) {
      return;
    }

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < this.trailPoints.length; i++) {
      const prev = this.trailPoints[i - 1];
      const curr = this.trailPoints[i];

      const agePrev = (now - prev.timestamp) / this.trailLifetime;
      const ageCurr = (now - curr.timestamp) / this.trailLifetime;

      const alphaPrev = (1 - agePrev) * 0.8;
      const alphaCurr = (1 - ageCurr) * 0.8;

      const widthPrev = 8 * (1 - agePrev * 0.5);
      const widthCurr = 8 * (1 - ageCurr * 0.5);

      const steps = 10;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = prev.x + (curr.x - prev.x) * t;
        const y = prev.y + (curr.y - prev.y) * t;
        const alpha = alphaPrev + (alphaCurr - alphaPrev) * t;
        const width = widthPrev + (widthCurr - widthPrev) * t;
        const colorProgress = prev.colorProgress + (curr.colorProgress - prev.colorProgress) * t;

        this.ctx.beginPath();
        this.ctx.arc(x, y, width / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.interpolateColor(colorProgress);
        this.ctx.globalAlpha = Math.max(0, alpha);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1;
  }

  public start(): void {
    const animate = () => {
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public clear(): void {
    this.trailPoints = [];
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

export const trailEffect = new TrailEffect('trail-canvas');
