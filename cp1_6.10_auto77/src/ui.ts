import type { TrackingStatus, CalibrationPoint, GazeData } from './eyeTracker';
import type { ControlMode, RippleEffect, ScrollData } from './pageController';

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startTime: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.startTime = performance.now();
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public drawBackground(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);
  }

  public drawScrollGlow(scrollData: ScrollData | null): void {
    if (!scrollData || scrollData.direction === 'none') return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = (performance.now() - this.startTime) / 1000;
    const alpha = 0.1 + (Math.sin(t * Math.PI) + 1) / 2 * 0.3;

    const leftGradient = ctx.createLinearGradient(0, 0, 10, 0);
    leftGradient.addColorStop(0, `rgba(0, 191, 255, ${alpha})`);
    leftGradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
    ctx.fillStyle = leftGradient;
    ctx.fillRect(0, 0, 10, h);

    const rightGradient = ctx.createLinearGradient(w - 10, 0, w, 0);
    rightGradient.addColorStop(0, 'rgba(0, 191, 255, 0)');
    rightGradient.addColorStop(1, `rgba(0, 191, 255, ${alpha})`);
    ctx.fillStyle = rightGradient;
    ctx.fillRect(w - 10, 0, 10, h);
  }

  public drawGazePoint(gazeData: GazeData): void {
    if (gazeData.isEyesClosed) return;

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
    ctx.beginPath();
    ctx.arc(gazeData.x, gazeData.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gazeData.x, gazeData.y, 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  public drawCalibrationPoint(point: CalibrationPoint, isActive: boolean): void {
    const ctx = this.ctx;
    const t = (performance.now() - this.startTime) / 1000;

    const radius = isActive ? 20 + (Math.sin(t * 2 * Math.PI) + 1) / 2 * 10 : 20;

    if (isActive) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
    gradient.addColorStop(0, '#00bfff');
    gradient.addColorStop(1, '#1e90ff');

    ctx.fillStyle = point.completed ? 'rgba(0, 255, 136, 0.8)' : gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (isActive && point.progress > 0) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + 4, -Math.PI / 2, -Math.PI / 2 + point.progress * Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = "16px 'Rajdhani', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(point.label, point.x, point.y + radius + 8);
  }

  public drawCalibrationOverlay(points: CalibrationPoint[], currentIndex: number): void {
    this.drawCard(
      this.canvas.width / 2 - 200,
      30,
      400,
      60,
      currentIndex >= 0 && currentIndex < points.length
        ? `请注视 ${points[currentIndex].label} 的校准点`
        : '校准完成'
    );

    for (let i = 0; i < points.length; i++) {
      this.drawCalibrationPoint(points[i], i === currentIndex);
    }
  }

  public drawStatusIndicator(status: TrackingStatus, mode: ControlMode): void {
    const ctx = this.ctx;
    const padding = 20;
    const cardX = padding;
    const cardY = padding;
    const cardW = 240;
    const cardH = 150;

    this.drawCard(cardX, cardY, cardW, cardH, '');

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "20px 'Rajdhani', sans-serif";
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('跟踪状态', cardX + 16, cardY + 12);

    let barColor = '#00ff88';
    let statusText = '稳定';
    if (status.stability === 'medium') {
      barColor = '#ffaa00';
      statusText = '中等';
    } else if (status.stability === 'lost') {
      barColor = '#ff3355';
      statusText = '丢失';
    }

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "14px 'Rajdhani', sans-serif";
    ctx.fillText('跟踪质量:', cardX + 16, cardY + 44);

    const barX = cardX + 100;
    const barY = cardY + 46;
    const barW = 120;
    const barH = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = barColor;
    const fillW = Math.min(1, 1 - status.pupilOffset / 0.1) * barW;
    ctx.fillRect(barX, barY, fillW, barH);

    ctx.fillStyle = barColor;
    ctx.font = "bold 14px 'Rajdhani', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(statusText, cardX + cardW - 16, cardY + 44);

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "14px 'Rajdhani', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText('FPS:', cardX + 16, cardY + 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${status.fps}`, cardX + 60, cardY + 70);

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "14px 'Rajdhani', sans-serif";
    ctx.fillText('模式:', cardX + 16, cardY + 96);

    ctx.fillStyle = mode === 'scroll' ? '#00bfff' : '#ffaa00';
    ctx.font = "bold 14px 'Rajdhani', sans-serif";
    ctx.fillText(mode === 'scroll' ? '滚动模式' : '点击模式', cardX + 60, cardY + 96);

    ctx.fillStyle = 'rgba(224, 224, 255, 0.6)';
    ctx.font = "12px 'Rajdhani', sans-serif";
    ctx.fillText('闭眼1.5秒切换模式', cardX + 16, cardY + 124);
  }

  public drawDwellProgress(x: number, y: number, progress: number): void {
    const ctx = this.ctx;

    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 25, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  public drawRippleEffects(effects: RippleEffect[]): void {
    const ctx = this.ctx;
    const now = performance.now();

    for (const effect of effects) {
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;

      if (progress >= 1) continue;

      const radius = 5 + progress * 25;
      const alpha = 1 - progress;

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  public drawWelcomeScreen(onStartCalibration: () => void): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const cardW = 480;
    const cardH = 360;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    this.drawCard(cardX, cardY, cardW, cardH, '');

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "bold 32px 'Rajdhani', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('视线追踪浏览器', w / 2, cardY + 24);

    ctx.fillStyle = 'rgba(224, 224, 255, 0.8)';
    ctx.font = "16px 'Rajdhani', sans-serif";
    ctx.fillText('通过眼神和头部微动作控制网页浏览', w / 2, cardY + 70);

    const instructions = [
      '· 视线上下移动控制页面滚动',
      '· 视线在中心区域停止滚动',
      '· 闭眼1.5秒切换滚动/点击模式',
      '· 点击模式下视线停留2秒触发点击',
      '· 请先完成5点校准以确保精度'
    ];

    ctx.textAlign = 'left';
    ctx.font = "14px 'Rajdhani', sans-serif";
    for (let i = 0; i < instructions.length; i++) {
      ctx.fillText(instructions[i], cardX + 40, cardY + 110 + i * 26);
    }

    const btnW = 200;
    const btnH = 48;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 80;

    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGradient.addColorStop(0, '#00bfff');
    btnGradient.addColorStop(1, '#1e90ff');

    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 18px 'Rajdhani', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始校准', w / 2, btnY + btnH / 2);

    (this.canvas as any)._calibrationBtn = { x: btnX, y: btnY, w: btnW, h: btnH, onClick: onStartCalibration };
  }

  public drawCalibrationComplete(onContinue: () => void): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const cardW = 400;
    const cardH = 240;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2;

    this.drawCard(cardX, cardY, cardW, cardH, '');

    ctx.fillStyle = '#00ff88';
    ctx.font = "bold 28px 'Rajdhani', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('✓ 校准完成', w / 2, cardY + 30);

    ctx.fillStyle = '#e0e0ff';
    ctx.font = "16px 'Rajdhani', sans-serif";
    ctx.fillText('现在您可以使用视线控制浏览了', w / 2, cardY + 80);

    const btnW = 180;
    const btnH = 44;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + cardH - 80;

    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGradient.addColorStop(0, '#00bfff');
    btnGradient.addColorStop(1, '#1e90ff');

    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 16px 'Rajdhani', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('开始使用', w / 2, btnY + btnH / 2);

    (this.canvas as any)._continueBtn = { x: btnX, y: btnY, w: btnW, h: btnH, onClick: onContinue };
  }

  private drawCard(x: number, y: number, w: number, h: number, title: string): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    if (title) {
      ctx.fillStyle = '#e0e0ff';
      ctx.font = "20px 'Rajdhani', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(title, x + w / 2, y + 14);
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public handleClick(clientX: number, clientY: number): boolean {
    const canvasAny = this.canvas as any;

    if (canvasAny._calibrationBtn) {
      const btn = canvasAny._calibrationBtn;
      if (clientX >= btn.x && clientX <= btn.x + btn.w && clientY >= btn.y && clientY <= btn.y + btn.h) {
        btn.onClick();
        canvasAny._calibrationBtn = null;
        return true;
      }
    }

    if (canvasAny._continueBtn) {
      const btn = canvasAny._continueBtn;
      if (clientX >= btn.x && clientX <= btn.x + btn.w && clientY >= btn.y && clientY <= btn.y + btn.h) {
        btn.onClick();
        canvasAny._continueBtn = null;
        return true;
      }
    }

    return false;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
