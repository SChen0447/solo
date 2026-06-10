const FLASH_DURATION = 300;
const FLASH_BORDER_WIDTH = 20;
const BUTTON_BLINK_INTERVAL = 500;

export class UIManager {
  private flashActive: boolean = false;
  private flashStartTime: number = 0;
  private buttonBlinkTime: number = 0;
  private buttonHovered: boolean = false;
  private buttonRect: { x: number; y: number; w: number; h: number } | null = null;
  private onRestartCallback: (() => void) | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {}

  bindCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    canvas.addEventListener('click', this.clickHandler);

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.buttonRect) {
        this.buttonHovered = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.buttonHovered =
        x >= this.buttonRect.x &&
        x <= this.buttonRect.x + this.buttonRect.w &&
        y >= this.buttonRect.y &&
        y <= this.buttonRect.y + this.buttonRect.h;
      canvas.style.cursor = this.buttonHovered ? 'pointer' : 'default';
    });
  }

  unbindCanvas(): void {
    if (this.canvas && this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
      this.canvas.style.cursor = 'default';
    }
    this.canvas = null;
    this.clickHandler = null;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.buttonRect || !this.canvas || !this.onRestartCallback) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (
      x >= this.buttonRect.x &&
      x <= this.buttonRect.x + this.buttonRect.w &&
      y >= this.buttonRect.y &&
      y <= this.buttonRect.y + this.buttonRect.h
    ) {
      this.onRestartCallback();
    }
  }

  triggerFlash(): void {
    this.flashActive = true;
    this.flashStartTime = performance.now();
  }

  update(deltaTime: number): void {
    if (this.flashActive) {
      const elapsed = performance.now() - this.flashStartTime;
      if (elapsed >= FLASH_DURATION) {
        this.flashActive = false;
      }
    }
    this.buttonBlinkTime += deltaTime;
  }

  drawScore(ctx: CanvasRenderingContext2D, score: number): void {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = '16px monospace';
    ctx.textBaseline = 'top';

    const text = `得分: ${score}`;
    const x = 16;
    const y = 16;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.lineWidth = 2;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  drawFlash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.flashActive) return;

    const elapsed = performance.now() - this.flashStartTime;
    const progress = elapsed / FLASH_DURATION;
    const alpha = (1 - progress) * 0.6;

    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;

    ctx.fillRect(0, 0, width, FLASH_BORDER_WIDTH);
    ctx.fillRect(0, height - FLASH_BORDER_WIDTH, width, FLASH_BORDER_WIDTH);
    ctx.fillRect(0, 0, FLASH_BORDER_WIDTH, height);
    ctx.fillRect(width - FLASH_BORDER_WIDTH, 0, FLASH_BORDER_WIDTH, height);

    ctx.restore();
  }

  drawGameOver(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    score: number,
    maxCombo: number,
    onRestart: () => void
  ): void {
    this.onRestartCallback = onRestart;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const panelW = width * 0.6;
    const panelH = height * 0.6;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('游戏结束', panelX + panelW / 2, panelY + 30);

    const stars = this.getStars(score);
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), panelX + panelW / 2, panelY + 80);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`总分: ${score}`, panelX + panelW / 2, panelY + 150);
    ctx.fillText(`最高连跳: ${maxCombo}`, panelX + panelW / 2, panelY + 185);

    const btnW = 180;
    const btnH = 50;
    const btnX = panelX + (panelW - btnW) / 2;
    const btnY = panelY + panelH - 90;
    this.buttonRect = { x: btnX, y: btnY, w: btnW, h: btnH };

    const blinkPhase = Math.floor(this.buttonBlinkTime / BUTTON_BLINK_INTERVAL) % 2;
    const baseColor = this.buttonHovered ? '#ff4500' : '#ff6347';
    const displayColor = blinkPhase === 0 || this.buttonHovered ? baseColor : '#ff7f50';

    ctx.fillStyle = displayColor;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('再玩一次', btnX + btnW / 2, btnY + 15);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('或按 R 键', btnX + btnW / 2, btnY + btnH + 10);

    ctx.restore();
  }

  private getStars(score: number): number {
    if (score >= 71) return 3;
    if (score >= 31) return 2;
    return 1;
  }

  reset(): void {
    this.flashActive = false;
    this.buttonRect = null;
    this.buttonHovered = false;
    this.onRestartCallback = null;
  }

  hideGameOver(): void {
    this.buttonRect = null;
    this.buttonHovered = false;
    this.onRestartCallback = null;
    if (this.canvas) {
      this.canvas.style.cursor = 'default';
    }
  }
}
