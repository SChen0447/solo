const COLOR_STOPS = [
  { pos: 0.0, r: 20, g: 60, b: 140 },
  { pos: 0.35, r: 20, g: 160, b: 180 },
  { pos: 0.65, r: 255, g: 230, b: 60 },
  { pos: 1.0, r: 255, g: 90, b: 40 },
];

function lerpColor(t: number): { r: number; g: number; b: number } {
  t = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const range = b.pos - a.pos;
      const p = (t - a.pos) / range;
      return {
        r: Math.round(a.r + (b.r - a.r) * p),
        g: Math.round(a.g + (b.g - a.g) * p),
        b: Math.round(a.b + (b.b - a.b) * p),
      };
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1];
}

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private barCount: number = 32;
  private barData: number[] = [];
  private barTargets: number[] = [];
  private barVelocities: number[] = [];
  private breathPhase: number = 0;
  private flashIntensity: number = 0;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.initBars();
  }

  private initBars(): void {
    this.barData = new Array(this.barCount).fill(0);
    this.barTargets = new Array(this.barCount).fill(0);
    this.barVelocities = new Array(this.barCount).fill(0);
  }

  setBarCount(count: number): void {
    this.barCount = count;
    this.initBars();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  update(frequencyData: Uint8Array, dt: number): void {
    const len = Math.min(this.barCount, frequencyData.length);
    for (let i = 0; i < len; i++) {
      const idx = Math.floor((i / this.barCount) * frequencyData.length * 0.6);
      this.barTargets[i] = frequencyData[idx] / 255;
    }

    for (let i = 0; i < this.barCount; i++) {
      const target = this.barTargets[i];
      const current = this.barData[i];
      const spring = 0.25;
      const damping = 0.82;
      const force = (target - current) * spring;
      this.barVelocities[i] = (this.barVelocities[i] + force) * damping;
      this.barData[i] += this.barVelocities[i];
      if (this.barData[i] < 0.001) this.barData[i] = 0;
    }

    this.breathPhase += dt * 1.5;
    if (this.flashIntensity > 0) {
      this.flashIntensity -= dt * 3;
      if (this.flashIntensity < 0) this.flashIntensity = 0;
    }
  }

  triggerFlash(): void {
    this.flashIntensity = 1;
  }

  render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const centerX = w / 2;
    const centerY = h * 0.72;
    const baseRadius = Math.min(w, h) * 0.22;

    const breath = 1 + Math.sin(this.breathPhase) * 0.025;
    const radius = baseRadius * breath;

    const totalAngle = Math.PI;
    const startAngle = Math.PI;
    const angleStep = totalAngle / (this.barCount - 1);

    const maxBarHeight = Math.min(w, h) * 0.38;
    const barWidth = (totalAngle * radius) / this.barCount * 0.6;

    if (this.flashIntensity > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashIntensity * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);

    for (let i = 0; i < this.barCount; i++) {
      const angle = startAngle - i * angleStep;
      const value = this.barData[i];
      const barHeight = value * maxBarHeight;

      const color = lerpColor(value);
      const glowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;

      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + barHeight);
      const y2 = Math.sin(angle) * (radius + barHeight);

      const perpAngle = angle + Math.PI / 2;
      const halfW = barWidth / 2;

      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15 * value + 5;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `rgba(${color.r * 0.4}, ${color.g * 0.4}, ${color.b * 0.4}, 0.9)`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 1)`);
      gradient.addColorStop(1, `rgba(${Math.min(255, color.r + 50)}, ${Math.min(255, color.g + 30)}, ${color.b}, 1)`);

      ctx.beginPath();
      ctx.moveTo(x1 + Math.cos(perpAngle) * halfW, y1 + Math.sin(perpAngle) * halfW);
      ctx.lineTo(x1 - Math.cos(perpAngle) * halfW, y1 - Math.sin(perpAngle) * halfW);
      ctx.lineTo(x2 - Math.cos(perpAngle) * halfW * 0.7, y2 - Math.sin(perpAngle) * halfW * 0.7);
      ctx.quadraticCurveTo(x2, y2 - 2, x2 + Math.cos(perpAngle) * halfW * 0.7, y2 + Math.sin(perpAngle) * halfW * 0.7);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      if (value > 0.05) {
        const dotSize = halfW * 1.3;
        ctx.beginPath();
        ctx.arc(x2, y2, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + value * 0.4})`;
        ctx.shadowBlur = 20 * value + 10;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  getAverageEnergy(): number {
    if (this.barData.length === 0) return 0;
    const sum = this.barData.reduce((a, b) => a + b, 0);
    return sum / this.barData.length;
  }

  getLowFrequencyEnergy(): number {
    if (this.barData.length === 0) return 0;
    const len = Math.floor(this.barCount * 0.3);
    let sum = 0;
    for (let i = 0; i < len; i++) sum += this.barData[i];
    return sum / len;
  }

  getHighFrequencyEnergy(): number {
    if (this.barData.length === 0) return 0;
    const start = Math.floor(this.barCount * 0.7);
    let sum = 0;
    for (let i = start; i < this.barCount; i++) sum += this.barData[i];
    return sum / (this.barCount - start);
  }
}
