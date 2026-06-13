export interface FeatherData {
  id: number;
  x: number;
  y: number;
  length: number;
  width: number;
  angle: number;
  baseAngle: number;
  color1: string;
  color2: string;
  baseColor1: string;
  baseColor2: string;
  hovered: boolean;
  clicked: boolean;
  scale: number;
  bendAngle: number;
  alpha: number;
  unfoldProgress: number;
  highlightGold: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export class FeatherRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private pixelRatio: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  getViewportSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  clear(): void {
    const { width, height } = this.getViewportSize();
    this.ctx.clearRect(0, 0, width, height);
  }

  drawFeather(feather: FeatherData): void {
    const ctx = this.ctx;
    const { x, y, length, width, angle, scale, bendAngle, color1, color2, alpha, highlightGold, hovered } = feather;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate((angle + bendAngle) * Math.PI / 180);
    ctx.scale(scale, scale);

    const featherGradient = ctx.createLinearGradient(0, 0, 0, -length);
    if (highlightGold) {
      featherGradient.addColorStop(0, '#ffd700');
      featherGradient.addColorStop(1, '#ffed4e');
    } else {
      featherGradient.addColorStop(0, color2);
      featherGradient.addColorStop(1, color1);
    }

    if (hovered) {
      ctx.shadowColor = color1;
      ctx.shadowBlur = 18;
    }

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(
      width * 0.6, -length * 0.3,
      width * 0.8, -length * 0.7,
      0, -length
    );
    ctx.bezierCurveTo(
      -width * 0.8, -length * 0.7,
      -width * 0.6, -length * 0.3,
      0, 0
    );
    ctx.fillStyle = featherGradient;
    ctx.fill();

    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = highlightGold ? '#b8860b' : '#555';
    ctx.lineWidth = 0.5;
    const barbCount = 6 + Math.floor(Math.random() * 3);
    for (let i = 1; i <= barbCount; i++) {
      const t = i / (barbCount + 1);
      const barbY = -length * t;
      const barbWidth = width * (1 - t * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, barbY);
      ctx.quadraticCurveTo(barbWidth * 0.7, barbY - 3, barbWidth * 0.9, barbY - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, barbY);
      ctx.quadraticCurveTo(-barbWidth * 0.7, barbY - 3, -barbWidth * 0.9, barbY - 8);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(0, -length + 2);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawRipple(ripple: Ripple): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = ripple.alpha;
    ctx.strokeStyle = ripple.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = ripple.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawSparkle(sparkle: Sparkle): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = sparkle.alpha;
    ctx.fillStyle = sparkle.color;
    ctx.shadowColor = sparkle.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  render(feathers: FeatherData[], ripples: Ripple[], sparkles: Sparkle[]): void {
    this.clear();
    for (const feather of feathers) {
      this.drawFeather(feather);
    }
    for (const ripple of ripples) {
      this.drawRipple(ripple);
    }
    for (const sparkle of sparkles) {
      this.drawSparkle(sparkle);
    }
  }

  toDataURL(): string {
    return this.canvas.toDataURL('image/png');
  }
}
