export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  private fpsFrames = 0;
  private fpsTime = 0;
  private fpsValue = 60;
  private showFps = false;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#050520');
    grad.addColorStop(1, '#0a0025');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  setAdditiveBlend() {
    this.ctx.globalCompositeOperation = 'lighter';
  }

  setNormalBlend() {
    this.ctx.globalCompositeOperation = 'source-over';
  }

  setAlpha(a: number) {
    this.ctx.globalAlpha = a;
  }

  resetAlpha() {
    this.ctx.globalAlpha = 1;
  }

  updateFps(dt: number) {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fpsValue = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime -= 1;
    }
  }

  getFps() {
    return this.fpsValue;
  }

  drawFps() {
    if (!this.showFps) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 0.6;
    this.ctx.fillStyle = '#88aaff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`FPS: ${this.fpsValue}`, 10, 20);
    this.ctx.restore();
  }

  toggleFps() {
    this.showFps = !this.showFps;
  }

  drawScore(score: number, scale: number) {
    const cx = this.width / 2;
    const cy = this.height - 40;
    const text = String(score);

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);

    const segH = 28;
    const segW = 16;
    const gap = 4;
    const totalW = text.length * (segW + gap) - gap;
    const startX = -totalW / 2;

    for (let i = 0; i < text.length; i++) {
      this.drawDigit(text[i], startX + i * (segW + gap), -segH / 2, segW, segH);
    }

    this.ctx.restore();
  }

  private drawDigit(ch: string, x: number, y: number, w: number, h: number) {
    const segs = this.getDigitSegments(ch);
    const halfH = h / 2;
    const halfW = w / 2;
    const t = 3;
    const color = 'rgba(130,180,255,0.9)';
    const offColor = 'rgba(60,80,120,0.15)';

    type Seg = [number, number, number, number];
    const defs: Seg[] = [
      [x, y, x + w, y],
      [x, y + halfH, x + w, y + halfH],
      [x, y + h, x + w, y + h],
      [x, y, x, y + halfH],
      [x + w, y, x + w, y + halfH],
      [x, y + halfH, x, y + h],
      [x + w, y + halfH, x + w, y + h],
    ];

    for (let i = 0; i < 7; i++) {
      this.ctx.strokeStyle = segs[i] ? color : offColor;
      this.ctx.lineWidth = segs[i] ? t : t - 1;
      this.ctx.shadowColor = segs[i] ? 'rgba(130,180,255,0.5)' : 'transparent';
      this.ctx.shadowBlur = segs[i] ? 6 : 0;
      this.ctx.beginPath();
      this.ctx.moveTo(defs[i][0], defs[i][1]);
      this.ctx.lineTo(defs[i][2], defs[i][3]);
      this.ctx.stroke();
    }
    this.ctx.shadowBlur = 0;
  }

  private getDigitSegments(ch: string): boolean[] {
    const map: Record<string, boolean[]> = {
      '0': [true, false, true, true, true, true, true],
      '1': [false, false, false, false, true, false, true],
      '2': [true, true, true, false, true, true, false],
      '3': [true, true, true, false, true, false, true],
      '4': [false, true, false, true, true, false, true],
      '5': [true, true, true, true, false, false, true],
      '6': [true, true, true, true, false, true, true],
      '7': [true, false, false, false, true, false, true],
      '8': [true, true, true, true, true, true, true],
      '9': [true, true, true, true, true, false, true],
    };
    return map[ch] || map['0'];
  }

  drawBallsRemaining(count: number) {
    const cx = this.width / 2;
    const cy = this.height - 12;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 0.5;
    this.ctx.fillStyle = '#88aaff';
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`弹珠 x${count}`, cx, cy);
    this.ctx.restore();
  }

  drawGameOver(alpha: number, pulse: number) {
    this.ctx.save();
    this.setNormalBlend();
    this.ctx.fillStyle = `rgba(80,0,0,${pulse * 0.3})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#ff4466';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(255,60,80,0.8)';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('星轨崩塌', this.width / 2, this.height / 2 - 20);
    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  drawStarBlast(alpha: number) {
    this.ctx.save();
    this.setAdditiveBlend();
    const grad = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.6
    );
    grad.addColorStop(0, `rgba(200,220,255,${alpha})`);
    grad.addColorStop(0.3, `rgba(100,140,255,${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(50,60,120,0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }
}
