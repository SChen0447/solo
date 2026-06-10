export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

export interface BigStar {
  x: number;
  y: number;
  size: number;
  phase: number;
  period: number;
}

export interface FloatingText {
  text: string;
  x: number;
  y: number;
  startY: number;
  targetY: number;
  alpha: number;
  duration: number;
  elapsed: number;
  color: string;
  fontSize: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stars: Star[] = [];
  private bigStars: BigStar[] = [];
  private cornerHaloPhase: number = 0;
  private cornerHaloActive: boolean = false;
  private warningBorderTimer: number = 0;
  private floatingTexts: FloatingText[] = [];
  private beatProgress: number = 0;
  private bpm: number = 120;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.generateStars();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    this.bigStars = [];

    for (let i = 0; i < 500; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random(),
        alpha: 0.3 + Math.random() * 0.5
      });
    }

    for (let i = 0; i < 30; i++) {
      this.bigStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 2 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        period: 3 + Math.random() * 2
      });
    }
  }

  public setBeatInfo(progress: number, bpm: number): void {
    this.beatProgress = progress;
    this.bpm = bpm;
  }

  public activateCornerHalos(): void {
    this.cornerHaloActive = true;
  }

  public deactivateCornerHalos(): void {
    this.cornerHaloActive = false;
  }

  public triggerWarningBorder(): void {
    this.warningBorderTimer = 0.3;
  }

  public addFloatingText(text: string, x: number, y: number, color: string = '#ff3366', fontSize: number = 32): void {
    this.floatingTexts.push({
      text,
      x,
      y,
      startY: y,
      targetY: y - 50,
      alpha: 1,
      duration: 0.8,
      elapsed: 0,
      color,
      fontSize
    });
  }

  public update(dt: number): void {
    this.cornerHaloPhase += dt * (this.bpm / 60) * Math.PI * 2;

    if (this.warningBorderTimer > 0) {
      this.warningBorderTimer -= dt;
    }

    for (const star of this.bigStars) {
      star.phase += (dt / star.period) * Math.PI * 2;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.elapsed += dt;
      const t = Math.min(1, ft.elapsed / ft.duration);
      ft.y = ft.startY + (ft.targetY - ft.startY) * t;
      ft.alpha = 1 - t;
      if (ft.elapsed >= ft.duration) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  public clear(): void {
    this.ctx.fillStyle = '#0a0b1e';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public drawBackground(): void {
    for (const star of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fillRect(Math.floor(star.x), Math.floor(star.y), Math.ceil(star.size), Math.ceil(star.size));
    }

    for (const star of this.bigStars) {
      const twinkle = 0.4 + Math.sin(star.phase) * 0.4;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  public drawCornerHalos(): void {
    if (!this.cornerHaloActive) return;

    const pulse = 0.4 + Math.sin(this.cornerHaloPhase) * 0.4;
    const baseRadius = 30 + pulse * 30;
    const alpha = 0.4 + pulse * 0.4;

    const corners = [
      { x: 0, y: 0 },
      { x: this.width, y: 0 },
      { x: this.width, y: this.height },
      { x: 0, y: this.height }
    ];

    for (const corner of corners) {
      const gradient = this.ctx.createRadialGradient(
        corner.x, corner.y, 0,
        corner.x, corner.y, baseRadius
      );
      gradient.addColorStop(0, `rgba(255, 0, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 0, 255, ${alpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

      this.ctx.beginPath();
      this.ctx.arc(corner.x, corner.y, baseRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  public drawWarningBorder(): void {
    if (this.warningBorderTimer <= 0) return;

    const alpha = 0.3 * (this.warningBorderTimer / 0.3);
    const inset = 20;

    this.ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(inset, inset, this.width - inset * 2, this.height - inset * 2);

    this.ctx.strokeStyle = `rgba(255, 100, 100, ${alpha * 0.5})`;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(inset + 4, inset + 4, this.width - (inset + 4) * 2, this.height - (inset + 4) * 2);
  }

  private drawPixelText(text: string, x: number, y: number, fontSize: number, color: string): void {
    this.ctx.font = `${fontSize}px monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = '#000000';
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  public drawUI(score: number, combo: number, cooldownPercent: number): void {
    this.drawPixelText(`SCORE: ${score}`, 20, 70, 18, '#ffffff');
    this.drawPixelText(`COMBO: ${combo}`, 20, 95, 18, combo > 5 ? '#ffff00' : '#ffffff');

    const cdX = 20;
    const cdY = 125;
    this.drawPixelText('BLAST:', cdX, cdY, 18, '#00ffcc');
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(cdX + 75, cdY + 4, 100, 14);
    const fill = Math.max(0, 1 - cooldownPercent);
    this.ctx.fillStyle = cooldownPercent > 0 ? '#666666' : '#00ffcc';
    this.ctx.fillRect(cdX + 75, cdY + 4, 100 * fill, 14);
    this.ctx.strokeStyle = '#00ffcc';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(cdX + 75, cdY + 4, 100, 14);

    this.drawBPMIndicator();
  }

  private drawBPMIndicator(): void {
    const cx = this.width - 80;
    const cy = 110;
    const radius = 25;
    const pointerLen = 40;

    this.ctx.strokeStyle = '#00ffcc';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const x1 = cx + Math.cos(angle) * (radius - 4);
      const y1 = cy + Math.sin(angle) * (radius - 4);
      const x2 = cx + Math.cos(angle) * (radius + 2);
      const y2 = cy + Math.sin(angle) * (radius + 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }

    const angle = this.beatProgress * Math.PI * 2 - Math.PI / 2;

    for (let i = 1; i <= 4; i++) {
      const trailT = i / 4;
      const trailAngle = angle - trailT * 0.5;
      const tx = cx + Math.cos(trailAngle) * (pointerLen * (1 - trailT * 0.5));
      const ty = cy + Math.sin(trailAngle) * (pointerLen * (1 - trailT * 0.5));
      this.ctx.strokeStyle = `rgba(0, 255, 204, ${0.3 * (1 - trailT)})`;
      this.ctx.lineWidth = 5 - i;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.lineTo(tx, ty);
      this.ctx.stroke();
    }

    const px = cx + Math.cos(angle) * pointerLen;
    const py = cy + Math.sin(angle) * pointerLen;
    this.ctx.strokeStyle = '#00ffcc';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(px, py);
    this.ctx.stroke();

    this.ctx.fillStyle = '#00ffcc';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    this.ctx.fill();

    this.drawPixelText(`${this.bpm} BPM`, cx - 45, cy + radius + 10, 14, '#ffffff');
  }

  public drawFloatingTexts(): void {
    for (const ft of this.floatingTexts) {
      this.ctx.globalAlpha = ft.alpha;
      this.drawPixelText(ft.text, ft.x - ft.text.length * ft.fontSize * 0.3, ft.y, ft.fontSize, ft.color);
    }
    this.ctx.globalAlpha = 1;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
