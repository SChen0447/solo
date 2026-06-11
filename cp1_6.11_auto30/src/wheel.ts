export const SECTORS = [
  { label: '500元',  color: '#ff00ff' },
  { label: '电玩券', color: '#00ffff' },
  { label: '200元',  color: '#aa00ff' },
  { label: '再来一次', color: '#80ff00' },
  { label: '100元',  color: '#ffff00' },
  { label: '谢谢参与', color: '#ff3366' },
  { label: '300元',  color: '#00ffaa' },
  { label: '优惠券', color: '#ff6600' },
  { label: '50元',   color: '#6666ff' },
  { label: '惊喜礼', color: '#ff00aa' },
];

const SECTOR_COUNT = SECTORS.length;
const ARC = (2 * Math.PI) / SECTOR_COUNT;
const SPIN_DURATION = 3000;

export class Wheel {
  x: number;
  y: number;
  radius: number;
  rotation = 0;
  isSpinning = false;
  private startRotation = 0;
  private targetRotation = 0;
  private spinStart = 0;
  private glowPhase = 0;
  private onSpinEnd: ((sectorIndex: number) => void) | null = null;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  spin(callback: (sectorIndex: number) => void) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.onSpinEnd = callback;
    this.startRotation = this.rotation;
    const extraDeg = 1200 + Math.random() * 600;
    this.targetRotation = this.startRotation + (extraDeg * Math.PI) / 180;
    this.spinStart = performance.now();
  }

  update(now: number) {
    this.glowPhase = (now / 800) % (2 * Math.PI);
    if (!this.isSpinning) return;
    const elapsed = now - this.spinStart;
    const t = Math.min(elapsed / SPIN_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    this.rotation = this.startRotation + (this.targetRotation - this.startRotation) * eased;
    if (t >= 1) {
      this.isSpinning = false;
      this.rotation = this.targetRotation % (2 * Math.PI);
      const normalized = ((2 * Math.PI) - (this.rotation % (2 * Math.PI))) % (2 * Math.PI);
      const sectorIndex = Math.floor(normalized / ARC) % SECTOR_COUNT;
      if (this.onSpinEnd) {
        this.onSpinEnd(sectorIndex);
        this.onSpinEnd = null;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    this.drawOuterGlow(ctx);
    ctx.rotate(this.rotation);
    this.drawSectors(ctx);
    this.drawSectorBorders(ctx);
    this.drawCenterButton(ctx);

    ctx.restore();
    this.drawPointer(ctx);
  }

  private drawOuterGlow(ctx: CanvasRenderingContext2D) {
    const glowIntensity = 0.3 + 0.15 * Math.sin(this.glowPhase);
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 30 + 10 * Math.sin(this.glowPhase);
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(255, 0, 255, ${glowIntensity})`;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawSectors(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < SECTOR_COUNT; i++) {
      const startAngle = i * ARC - Math.PI / 2;
      const endAngle = startAngle + ARC;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, this.radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = SECTORS[i].color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.shadowColor = SECTORS[i].color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      const midAngle = startAngle + ARC / 2;
      const textR = this.radius * 0.65;
      const tx = Math.cos(midAngle) * textR;
      const ty = Math.sin(midAngle) * textR;

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, this.radius * 0.08)}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.fillText(SECTORS[i].label, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawSectorBorders(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < SECTOR_COUNT; i++) {
      const angle = i * ARC - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * this.radius,
        Math.sin(angle) * this.radius
      );
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + 0.2 * Math.sin(this.glowPhase + i)})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + 0.3 * Math.sin(this.glowPhase)})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawCenterButton(ctx: CanvasRenderingContext2D) {
    const btnR = 40;
    const pulseScale = 1 + 0.04 * Math.sin(this.glowPhase * 2);

    ctx.save();
    ctx.scale(pulseScale, pulseScale);

    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, btnR + 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 0, 255, 0.25)';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, btnR + 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(0, 0, btnR, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, btnR);
    grad.addColorStop(0, '#ff44aa');
    grad.addColorStop(1, '#ff0088');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${btnR * 0.6}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fillText('GO', 0, 1);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawPointer(ctx: CanvasRenderingContext2D) {
    const pX = this.x;
    const pY = this.y - this.radius - 10;
    const size = 16;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pX, pY + size + 10);
    ctx.lineTo(pX - size / 2, pY);
    ctx.lineTo(pX + size / 2, pY);
    ctx.closePath();

    const flickerAlpha = this.isSpinning ? 0.6 + 0.4 * Math.sin(this.glowPhase * 6) : 1;
    ctx.fillStyle = `rgba(255, 50, 50, ${flickerAlpha})`;
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = this.isSpinning ? 18 : 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  isInsideGoButton(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= 40 * 40;
  }

  getPointerTip(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.radius + 5 };
  }
}
