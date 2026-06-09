import type { Stone, StoneColor } from './stone';

export class IceRenderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  centerX: number;
  centerY: number;

  static readonly ICE_START = '#B0E0E6';
  static readonly ICE_END = '#F0F8FF';
  static readonly TARGET_INNER_RADIUS = 20;
  static readonly TARGET_MIDDLE_RADIUS = 40;
  static readonly TARGET_OUTER_RADIUS = 60;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(this.width, this.height) / 2
    );
    gradient.addColorStop(0, IceRenderer.ICE_END);
    gradient.addColorStop(1, IceRenderer.ICE_START);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawTarget(): void {
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, IceRenderer.TARGET_OUTER_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = '#0000FF';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, IceRenderer.TARGET_MIDDLE_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, IceRenderer.TARGET_INNER_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fill();
  }

  drawStone(stone: Stone): void {
    const offset = stone.getShakeOffset();
    const drawX = stone.x + offset.x;
    const drawY = stone.y + offset.y;

    this.ctx.beginPath();
    this.ctx.arc(drawX, drawY, stone.radius + 2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(drawX, drawY, stone.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = stone.color === 'red' ? '#E63946' : '#1D4ED8';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(drawX, drawY, stone.radius * 0.6, 0, Math.PI * 2);
    this.ctx.fillStyle = stone.color === 'red' ? '#FCA5A5' : '#93C5FD';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(drawX, drawY, stone.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = stone.color === 'red' ? '#991B1B' : '#1E3A8A';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawPreviewStone(color: StoneColor): void {
    const pos = this.getPreviewPosition(color);
    const previewStone = {
      x: pos.x,
      y: pos.y,
      radius: 15,
      color,
      getShakeOffset: () => ({ x: 0, y: 0 })
    } as unknown as Stone;
    this.ctx.globalAlpha = 0.6;
    this.drawStone(previewStone);
    this.ctx.globalAlpha = 1;
  }

  getPreviewPosition(color: StoneColor): { x: number; y: number } {
    const margin = 60;
    return {
      x: color === 'red' ? this.width - margin : margin,
      y: this.height - margin
    };
  }

  drawAimLine(fromX: number, fromY: number, toX: number, toY: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  drawScoreInfo(round: number, redScore: number, blueScore: number): void {
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textBaseline = 'top';
    this.ctx.lineJoin = 'round';

    const lines = [
      `回合: ${round}`,
      `红方: ${redScore}`,
      `蓝方: ${blueScore}`
    ];

    const startX = 20;
    const startY = 20;
    const lineHeight = 30;

    lines.forEach((text, i) => {
      const y = startY + i * lineHeight;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 4;
      this.ctx.strokeText(text, startX, y);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText(text, startX, y);
    });
  }

  drawCountdown(progress: number): void {
    const cx = this.width - 60;
    const cy = 60;
    const radius = 30;

    const r = Math.round(255 * progress);
    const g = Math.round(255 * (1 - progress));
    const color = `rgb(${r}, ${g}, 0)`;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();

    const seconds = Math.ceil(3 * (1 - progress));
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#000000';
    this.ctx.fillText(String(seconds), cx, cy);
    this.ctx.textAlign = 'start';
  }

  drawPowerBar(power: number): void {
    const barWidth = 200;
    const barHeight = 20;
    const x = (this.width - barWidth) / 2;
    const y = this.height - 40;

    this.ctx.beginPath();
    this.ctx.roundRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 4);
    this.ctx.fillStyle = '#333333';
    this.ctx.fill();

    const gradient = this.ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, '#00FF00');
    gradient.addColorStop(1, '#FF0000');

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, barWidth * (power / 100), barHeight, 3);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, barWidth, barHeight, 3);
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
}
