import { EffectManager, ElementType } from './EffectManager';

export interface Rune {
  id: number;
  element: ElementType;
  name: string;
  symbol: string;
  angle: number;
  radius: number;
  lit: boolean;
  highlighted: boolean;
  pulsePhase: number;
  floatPhase: number;
  glowIntensity: number;
}

export interface Connection {
  fromId: number;
  toId: number;
  active: boolean;
  flashTimer: number;
  color: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private effectManager: EffectManager;
  private centerX: number;
  private centerY: number;
  private circleRadius: number;
  private energyBallSize: number;
  private targetEnergyBallSize: number;
  private energyBallPulse: number;

  private readonly elementSymbols: Record<ElementType, string> = {
    fire: '🔥',
    water: '💧',
    thunder: '⚡',
    earth: '🪨',
    wind: '🍃',
    ice: '❄️',
    shadow: '🌑',
    light: '✨'
  };

  constructor(canvas: HTMLCanvasElement, effectManager: EffectManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.effectManager = effectManager;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.circleRadius = 200;
    this.energyBallSize = 10;
    this.targetEnergyBallSize = 10;
    this.energyBallPulse = 0;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    const minDim = Math.min(width, height);
    this.circleRadius = Math.min(200, minDim * 0.38);
  }

  public setTargetEnergySize(size: number): void {
    this.targetEnergyBallSize = size;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  public getCircleRadius(): number {
    return this.circleRadius;
  }

  public getRunePosition(rune: Rune): { x: number; y: number } {
    const floatOffset = Math.sin(rune.floatPhase) * 5;
    const x = this.centerX + Math.cos(rune.angle) * (this.circleRadius + floatOffset);
    const y = this.centerY + Math.sin(rune.angle) * (this.circleRadius + floatOffset);
    return { x, y };
  }

  public render(
    runes: Rune[],
    connections: Connection[],
    currentSequence: number[],
    time: number,
    deltaTime: number
  ): void {
    this.energyBallPulse += deltaTime * 0.003;
    this.energyBallSize += (this.targetEnergyBallSize - this.energyBallSize) * 0.05;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawMagicCircle(time);
    this.drawConnections(runes, connections, time);
    this.drawEnergyBall(time);
    this.drawRunes(runes, time);
    this.effectManager.render(this.ctx);
  }

  private drawMagicCircle(time: number): void {
    const ctx = this.ctx;
    const t = time * 0.0005;

    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;

    const outerGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, this.circleRadius - 30,
      this.centerX, this.centerY, this.circleRadius + 20
    );
    outerGradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
    outerGradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.08)');
    outerGradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.15)');
    outerGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius + 20, 0, Math.PI * 2);
    ctx.fillStyle = outerGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.circleRadius - 15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = -t * 100;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.shadowBlur = 10;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + t;
      const innerR = this.circleRadius - 30;
      const outerR = this.circleRadius - 20;
      const ix = this.centerX + Math.cos(angle) * innerR;
      const iy = this.centerY + Math.sin(angle) * innerR;
      const ox = this.centerX + Math.cos(angle) * outerR;
      const oy = this.centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(ix, iy);
      ctx.lineTo(ox, oy);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEnergyBall(time: number): void {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.energyBallPulse) * 0.1;
    const size = this.energyBallSize * pulse;

    if (size < 2) return;

    ctx.save();

    const glowGradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, size * 3
    );
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(0.5, 'rgba(186, 85, 211, 0.2)');
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    const ballGradient = ctx.createRadialGradient(
      this.centerX - size * 0.3, this.centerY - size * 0.3, 0,
      this.centerX, this.centerY, size
    );
    ballGradient.addColorStop(0, '#FFFFFF');
    ballGradient.addColorStop(0.3, '#FFD700');
    ballGradient.addColorStop(0.7, '#BA55D3');
    ballGradient.addColorStop(1, '#4B0082');

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20 + Math.sin(time * 0.005) * 10;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, size, 0, Math.PI * 2);
    ctx.fillStyle = ballGradient;
    ctx.fill();

    ctx.restore();
  }

  private drawConnections(runes: Rune[], connections: Connection[], time: number): void {
    const ctx = this.ctx;

    for (const conn of connections) {
      const fromRune = runes.find(r => r.id === conn.fromId);
      const toRune = runes.find(r => r.id === conn.toId);
      if (!fromRune || !toRune) continue;

      const from = this.getRunePosition(fromRune);
      const to = this.getRunePosition(toRune);

      ctx.save();

      if (conn.active) {
        const flash = conn.flashTimer > 0 ? 0.5 + Math.sin(time * 0.03) * 0.5 : 0;
        ctx.strokeStyle = conn.color;
        ctx.lineWidth = 3 + flash * 2;
        ctx.shadowColor = conn.color;
        ctx.shadowBlur = 10 + flash * 15;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawRunes(runes: Rune[], time: number): void {
    const ctx = this.ctx;

    for (const rune of runes) {
      const pos = this.getRunePosition(rune);
      const colors = this.effectManager.getElementColors(rune.element);
      const pulseScale = 1 + Math.sin(rune.pulsePhase) * 0.1;
      const highlightScale = rune.highlighted ? 1.3 * pulseScale : pulseScale;
      const baseSize = 24;
      const size = baseSize * highlightScale;

      ctx.save();
      ctx.translate(pos.x, pos.y);

      if (rune.highlighted) {
        const glowPulse = 1 + Math.sin(time * 0.01) * 0.2;
        const glowSize = size * 2.5 * glowPulse;

        const highlightGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        highlightGradient.addColorStop(0, colors.glow + 'CC');
        highlightGradient.addColorStop(0.5, colors.glow + '44');
        highlightGradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        const ringSize = size * 1.5 * glowPulse;
        ctx.beginPath();
        ctx.arc(0, 0, ringSize, 0, Math.PI * 2);
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (rune.lit) {
        rune.glowIntensity = Math.min(1, rune.glowIntensity + 0.02);
      }
      const litGlow = rune.glowIntensity;

      if (litGlow > 0) {
        const litGlowSize = size * 1.8;
        const litGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, litGlowSize);
        litGradient.addColorStop(0, colors.glow + Math.floor(litGlow * 140).toString(16).padStart(2, '0'));
        litGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, litGlowSize, 0, Math.PI * 2);
        ctx.fillStyle = litGradient;
        ctx.fill();
      }

      const bgGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      bgGradient.addColorStop(0, rune.lit ? colors.secondary : '#2A1A4A');
      bgGradient.addColorStop(0.7, rune.lit ? colors.primary : '#1A0A3E');
      bgGradient.addColorStop(1, '#0D0221');

      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fillStyle = bgGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.strokeStyle = rune.lit ? colors.primary : '#4A3A6A';
      ctx.lineWidth = 2;
      if (rune.lit || rune.highlighted) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = rune.highlighted ? 15 : 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = `${size * 1.1}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = rune.lit ? colors.glow : 'transparent';
      ctx.shadowBlur = rune.lit ? 8 : 0;
      ctx.fillText(this.elementSymbols[rune.element], 0, 2);
      ctx.shadowBlur = 0;

      ctx.restore();
    }
  }

  public isPointInRune(px: number, py: number, rune: Rune): boolean {
    const pos = this.getRunePosition(rune);
    const dx = px - pos.x;
    const dy = py - pos.y;
    const hitRadius = 30;
    return dx * dx + dy * dy <= hitRadius * hitRadius;
  }
}
