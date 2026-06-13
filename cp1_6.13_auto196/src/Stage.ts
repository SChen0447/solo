export interface StageMetrics {
  centerX: number;
  centerY: number;
  radius: number;
  minRadius: number;
}

export class Stage {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private glowTime = 0;
  private noteRotation = 0;
  private filamentPhase = 0;
  private pulseRadius = 0;
  private pulseAlpha = 0;
  private pulseActive = false;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  getMetrics(): StageMetrics {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const diameter = Math.max(400, h * 0.6);
    const radius = diameter / 2;
    return {
      centerX: w / 2,
      centerY: h / 2,
      radius,
      minRadius: 200
    };
  }

  update(deltaTime: number, beatTime: number, beatInterval: number): void {
    this.glowTime += deltaTime;
    this.noteRotation += deltaTime * (Math.PI * 2 / 4);
    this.filamentPhase += deltaTime * (Math.PI * 2 / 6);

    const beatProgress = beatTime / beatInterval;
    if (beatProgress < 0.5) {
      this.pulseActive = true;
      const t = beatProgress / 0.5;
      this.pulseRadius = 10 + t * 190;
      this.pulseAlpha = 1 - t;
    } else {
      this.pulseActive = false;
      this.pulseRadius = 0;
      this.pulseAlpha = 0;
    }
  }

  render(): void {
    const ctx = this.ctx;
    const m = this.getMetrics();

    this.renderBackground(m);
    this.renderFilaments(m);
    this.renderHexagon(m);
    this.renderBeatPulse(m);
    this.renderNoteIcon(m);
  }

  private renderBackground(m: StageMetrics): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      m.centerX, m.centerY, 0,
      m.centerX, m.centerY, m.radius * 1.5
    );
    gradient.addColorStop(0, '#ff3366');
    gradient.addColorStop(0.5, '#6633ff');
    gradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.globalCompositeOperation = 'destination-in';
    this.drawHexagonPath(m.centerX, m.centerY, m.radius, true);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const innerGradient = ctx.createRadialGradient(
      m.centerX, m.centerY, 0,
      m.centerX, m.centerY, m.radius
    );
    innerGradient.addColorStop(0, 'rgba(255, 51, 102, 0.4)');
    innerGradient.addColorStop(0.5, 'rgba(102, 51, 255, 0.3)');
    innerGradient.addColorStop(1, 'rgba(10, 10, 46, 0.9)');
    ctx.save();
    this.drawHexagonPath(m.centerX, m.centerY, m.radius, true);
    ctx.clip();
    ctx.fillStyle = innerGradient;
    ctx.fillRect(m.centerX - m.radius, m.centerY - m.radius, m.radius * 2, m.radius * 2);
    ctx.restore();
  }

  private renderFilaments(m: StageMetrics): void {
    const ctx = this.ctx;
    const filamentCount = 38;

    for (let i = 0; i < filamentCount; i++) {
      const baseAngle = (i / filamentCount) * Math.PI * 2;
      const wobble = Math.sin(this.filamentPhase + i * 0.5) * 0.15;
      const angle = baseAngle + wobble;

      const innerR = m.radius * 0.1;
      const outerR = m.radius * 1.3;

      const startX = m.centerX + Math.cos(angle) * outerR;
      const startY = m.centerY + Math.sin(angle) * outerR;
      const endX = m.centerX + Math.cos(angle) * innerR;
      const endY = m.centerY + Math.sin(angle) * innerR;

      const cp1x = m.centerX + Math.cos(angle + wobble * 2) * outerR * 0.7;
      const cp1y = m.centerY + Math.sin(angle + wobble * 2) * outerR * 0.7;

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
      ctx.stroke();
    }
  }

  private renderHexagon(m: StageMetrics): void {
    const ctx = this.ctx;
    const t = (this.glowTime % 3) / 3;
    const glowColor = this.interpolateColor('#ff66ff', '#00ffff', t);

    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    this.drawHexagonPath(m.centerX, m.centerY, m.radius);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = this.interpolateColor('#00ffff', '#ff66ff', t);
    ctx.lineWidth = 1;
    this.drawHexagonPath(m.centerX, m.centerY, m.radius - 2);
    ctx.stroke();
    ctx.restore();
  }

  private renderBeatPulse(m: StageMetrics): void {
    if (!this.pulseActive || this.pulseAlpha <= 0) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = `rgba(0, 255, 255, ${this.pulseAlpha})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `rgba(0, 255, 255, ${this.pulseAlpha})`;
    ctx.beginPath();
    ctx.arc(m.centerX, m.centerY, this.pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (this.pulseRadius > 30) {
      ctx.strokeStyle = `rgba(255, 102, 255, ${this.pulseAlpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(255, 102, 255, ${this.pulseAlpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(m.centerX, m.centerY, this.pulseRadius - 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderNoteIcon(m: StageMetrics): void {
    const ctx = this.ctx;
    const size = 30;

    ctx.save();
    ctx.translate(m.centerX, m.centerY);
    ctx.rotate(this.noteRotation);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';

    ctx.beginPath();
    ctx.ellipse(-size * 0.3, size * 0.2, size * 0.35, size * 0.25, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, size * 0.15);
    ctx.lineTo(0, -size * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.6);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.5, size * 0.3, -size * 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(size * 0.3, -size * 0.3, size * 0.25, size * 0.18, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawHexagonPath(cx: number, cy: number, r: number, fill: boolean = false): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    if (fill) ctx.fill();
  }

  isInsideStage(x: number, y: number): boolean {
    const m = this.getMetrics();
    const dx = x - m.centerX;
    const dy = y - m.centerY;
    const r = m.radius * 0.92;
    for (let i = 0; i < 6; i++) {
      const angle1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const angle2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
      const x1 = m.centerX + Math.cos(angle1) * r;
      const y1 = m.centerY + Math.sin(angle1) * r;
      const x2 = m.centerX + Math.cos(angle2) * r;
      const y2 = m.centerY + Math.sin(angle2) * r;
      const cross = (x2 - x1) * (dy - y1) - (y2 - y1) * (dx - x1);
      if (cross < 0) return false;
    }
    return true;
  }

  clampToStage(x: number, y: number): { x: number; y: number } {
    if (this.isInsideStage(x, y)) return { x, y };
    const m = this.getMetrics();
    const dx = x - m.centerX;
    const dy = y - m.centerY;
    const angle = Math.atan2(dy, dx);
    const r = m.radius * 0.9;
    return {
      x: m.centerX + Math.cos(angle) * r,
      y: m.centerY + Math.sin(angle) * r
    };
  }

  getRandomEdgePosition(): { x: number; y: number } {
    const m = this.getMetrics();
    const angle = Math.random() * Math.PI * 2;
    const r = m.radius * 0.85;
    return {
      x: m.centerX + Math.cos(angle) * r,
      y: m.centerY + Math.sin(angle) * r
    };
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  getPulseInfo(): { active: boolean; radius: number; alpha: number } {
    return {
      active: this.pulseActive,
      radius: this.pulseRadius,
      alpha: this.pulseAlpha
    };
  }
}
