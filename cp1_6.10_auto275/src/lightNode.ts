export const LIGHT_COLORS = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#ff6bcb',
  '#c084fc'
];

export class LightNode {
  x: number;
  y: number;
  color: string;
  baseRadius: number;
  currentRadius: number;
  targetRadius: number;
  pulsePhase: number;
  connections: LightNode[];
  highlightTime: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.color = LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
    this.baseRadius = 8 + Math.random() * 8;
    this.currentRadius = this.baseRadius;
    this.targetRadius = this.baseRadius * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.connections = [];
    this.highlightTime = 0;
  }

  update(dt: number, pulseFrequency: number): void {
    this.pulsePhase += dt * pulseFrequency * Math.PI * 2;
    const pulseAmount = Math.sin(this.pulsePhase) * 0.2 + 1;

    if (this.currentRadius < this.targetRadius) {
      this.currentRadius = Math.min(this.targetRadius, this.currentRadius + (this.targetRadius - this.baseRadius) * dt * 0.8);
    }

    this.currentRadius = this.baseRadius * pulseAmount + (this.currentRadius - this.baseRadius);

    if (this.highlightTime > 0) {
      this.highlightTime -= dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const highlightMultiplier = this.highlightTime > 0 ? 2 : 1;
    const drawRadius = this.currentRadius * highlightMultiplier;

    ctx.save();

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, drawRadius * 3);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.4, this.color + '88');
    gradient.addColorStop(1, this.color + '00');

    ctx.shadowBlur = 30 * highlightMultiplier;
    ctx.shadowColor = this.color;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 15 * highlightMultiplier;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, drawRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const hitRadius = Math.max(this.currentRadius, 20);
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }
}
