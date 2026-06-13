import { DragMode } from './particles';

const MODE_NAMES: Record<DragMode, string> = {
  1: '光流追踪',
  2: '星轨喷涌',
  3: '漩涡捕获',
};

const MODE_DESCRIPTIONS: Record<DragMode, string> = {
  1: '粒子沿拖拽路径流动',
  2: '粒子向四周喷射',
  3: '粒子围绕拖拽点旋转',
};

export class UIManager {
  canvas!: HTMLCanvasElement;
  fps: number = 60;
  frameCount: number = 0;
  lastFpsUpdate: number = 0;
  currentMode: DragMode = 1;
  breathPhase: number = 0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;

  private hintBoxEl: HTMLDivElement | null = null;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.createHintBox();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.updateHintBoxPosition();
  }

  private createHintBox(): void {
    const hintBox = document.createElement('div');
    hintBox.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #a78bfa;
      font-size: 13px;
      line-height: 1.8;
      z-index: 100;
      pointer-events: none;
      min-width: 220px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
    `;

    hintBox.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 600; color: #c084fc; font-size: 14px;">操作提示</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #67e8f9;"></span>
        <span>拖拽绘制：引导光流</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #f472b6;"></span>
        <span>点击：触发涟漪</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: #fbbf24;"></span>
        <span>按键 1/2/3：切换模式</span>
      </div>
    `;

    document.body.appendChild(hintBox);
    this.hintBoxEl = hintBox;
  }

  private updateHintBoxPosition(): void {
    if (this.hintBoxEl) {
      const isMobile = this.canvasWidth < 768;
      this.hintBoxEl.style.bottom = isMobile ? '16px' : '24px';
      this.hintBoxEl.style.right = isMobile ? '16px' : '24px';
      this.hintBoxEl.style.fontSize = isMobile ? '12px' : '13px';
      this.hintBoxEl.style.minWidth = isMobile ? '180px' : '220px';
    }
  }

  destroy(): void {
    if (this.hintBoxEl) {
      this.hintBoxEl.remove();
      this.hintBoxEl = null;
    }
  }

  setMode(mode: DragMode): void {
    this.currentMode = mode;
  }

  update(deltaTime: number): void {
    this.breathPhase += deltaTime * 0.002;
    this.frameCount++;

    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    const glowIntensity = this.getBreathGlow();
    if (this.hintBoxEl) {
      this.hintBoxEl.style.opacity = (0.85 + glowIntensity * 0.15).toString();
    }
  }

  private getBreathGlow(): number {
    return (Math.sin(this.breathPhase) + 1) / 2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const glowIntensity = this.getBreathGlow();
    const isMobile = this.canvasWidth < 768;

    const paddingX = isMobile ? 16 : 24;
    const paddingY = isMobile ? 16 : 24;

    this.drawModeLabel(ctx, paddingX, paddingY, glowIntensity, isMobile);
    this.drawFPS(ctx, paddingX, paddingY + (isMobile ? 35 : 45), isMobile);
  }

  private drawModeLabel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    glowIntensity: number,
    isMobile: boolean
  ): void {
    const modeName = MODE_NAMES[this.currentMode];
    const modeDesc = MODE_DESCRIPTIONS[this.currentMode];
    const fontSize = isMobile ? 16 : 20;
    const descFontSize = isMobile ? 11 : 12;

    const glowRadius = 15 + glowIntensity * 10;
    ctx.save();
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = glowRadius;

    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#c084fc';
    ctx.fillText(`模式 ${this.currentMode}: ${modeName}`, x, y);

    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 5 + glowIntensity * 5;
    ctx.font = `${descFontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(167, 139, 250, 0.7)';
    ctx.fillText(modeDesc, x, y + (isMobile ? 18 : 22));
    ctx.restore();
  }

  private drawFPS(ctx: CanvasRenderingContext2D, x: number, y: number, isMobile: boolean): void {
    const fontSize = isMobile ? 12 : 14;
    const fpsColor = this.fps >= 55 ? '#22c55e' : this.fps >= 30 ? '#eab308' : '#ef4444';

    ctx.save();
    ctx.font = `${fontSize}px 'JetBrains Mono', 'Fira Code', Consolas, monospace`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`FPS: ${this.fps}`, x, y);

    const barWidth = isMobile ? 40 : 50;
    const barHeight = 3;
    const barX = x;
    const barY = y + 6;
    const fpsProgress = Math.min(this.fps / 60, 1);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = fpsColor;
    ctx.fillRect(barX, barY, barWidth * fpsProgress, barHeight);

    ctx.restore();
  }

  drawTouchHint(ctx: CanvasRenderingContext2D): void {
    if (this.canvasWidth >= 768) return;

    const now = performance.now();
    const showHint = now < 5000;
    if (!showHint) return;

    const opacity = Math.max(0, 1 - now / 5000);
    ctx.save();
    ctx.globalAlpha = opacity * 0.6;
    ctx.fillStyle = '#a78bfa';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('触摸屏幕开始交互', this.canvasWidth / 2, this.canvasHeight / 2 + 250);
    ctx.restore();
  }
}
