export interface UIState {
  trailLength: number;
  elapsedTime: number;
  speedRatio: number;
  maxTrailLength: number;
  absorbCount: number;
  isGameOver: boolean;
  isVictory: boolean;
}

export interface GameStats {
  elapsedTime: number;
  maxTrailLength: number;
  absorbCount: number;
}

export class UIManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private modalContainer: HTMLDivElement | null = null;
  private smallIcon: HTMLButtonElement | null = null;
  private panelExpanded: boolean = true;
  private animationTime: number = 0;
  private onRestartCallback: (() => void) | null = null;
  private onShareCallback: (() => void) | null = null;
  private readonly GAME_DURATION = 300000;
  private readonly WARNING_TIME = 180000;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setCallbacks(onRestart: () => void, onShare: () => void): void {
    this.onRestartCallback = onRestart;
    this.onShareCallback = onShare;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.updateResponsiveUI();
  }

  private updateResponsiveUI(): void {
    if (this.smallIcon) {
      if (this.canvasWidth < 500) {
        this.smallIcon.style.display = 'block';
      } else {
        this.smallIcon.style.display = 'none';
        this.panelExpanded = true;
      }
    }
  }

  setupDOM(): void {
    this.smallIcon = document.createElement('button');
    this.smallIcon.id = 'uiSmallIcon';
    this.smallIcon.textContent = '★';
    this.smallIcon.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(26, 26, 48, 0.8);
      border: 1px solid #4a4a6a;
      color: #4fc3f7;
      font-size: 18px;
      cursor: pointer;
      display: none;
      z-index: 100;
      transition: transform 0.2s, background 0.2s;
      animation: slideInFromBottom 0.3s ease-out;
    `;
    this.smallIcon.addEventListener('mouseenter', () => {
      if (this.smallIcon) {
        this.smallIcon.style.transform = 'scale(1.05)';
        this.smallIcon.style.background = 'rgba(26, 26, 48, 0.9)';
      }
    });
    this.smallIcon.addEventListener('mouseleave', () => {
      if (this.smallIcon) {
        this.smallIcon.style.transform = 'scale(1)';
        this.smallIcon.style.background = 'rgba(26, 26, 48, 0.8)';
      }
    });
    this.smallIcon.addEventListener('click', () => {
      this.panelExpanded = !this.panelExpanded;
    });
    document.body.appendChild(this.smallIcon);

    this.updateResponsiveUI();

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInFromBottom {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes scaleInCenter {
        from { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
      }
      @keyframes blinkTimer {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      @keyframes fadeInBg {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  showGameOverModal(stats: GameStats, isVictory: boolean): void {
    this.removeModal();

    const overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 200;
      animation: fadeInBg 0.4s ease-out;
    `;

    const modal = document.createElement('div');
    modal.id = 'resultModal';
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      width: 400px;
      max-width: 90vw;
      height: auto;
      min-height: 250px;
      background: linear-gradient(180deg, #1a1a30 0%, #2a2a40 100%);
      border: 1px solid #4a4a6a;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
      padding: 32px 24px;
      z-index: 201;
      transform: translate(-50%, -50%);
      animation: scaleInCenter 0.4s ease-out;
      text-align: center;
      font-family: 'Segoe UI', 'Arial', sans-serif;
    `;

    const titleText = isVictory ? '星际艺术家' : '光带湮灭';
    const titleColor = isVictory ? '#ffd700' : '#888888';

    const minutes = Math.floor(stats.elapsedTime / 60000);
    const seconds = Math.floor((stats.elapsedTime % 60000) / 1000);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    modal.innerHTML = `
      <h2 style="color: ${titleColor}; font-size: 28px; margin: 0 0 24px 0; text-shadow: 0 0 20px ${titleColor};">
        ${titleText}
      </h2>
      <div style="color: #cccccc; font-size: 14px; line-height: 2; margin-bottom: 24px;">
        <div>航行时间: <span style="color: #4fc3f7;">${timeStr}</span></div>
        <div>光带最长长度: <span style="color: #7c4dff;">${stats.maxTrailLength}</span></div>
        <div>被吞噬次数: <span style="color: #ff6b6b;">${stats.absorbCount}</span></div>
      </div>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <button id="restartBtn" style="
          background: #4fc3f7;
          color: #ffffff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          animation: slideInFromBottom 0.3s ease-out;
        ">再来一次</button>
        <button id="shareBtn" style="
          background: #7c4dff;
          color: #ffffff;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 18px;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
          animation: slideInFromBottom 0.3s ease-out 0.05s both;
        ">分享轨迹</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    this.modalContainer = modal;

    const restartBtn = document.getElementById('restartBtn');
    const shareBtn = document.getElementById('shareBtn');

    if (restartBtn) {
      restartBtn.addEventListener('mouseenter', () => {
        restartBtn.style.transform = 'scale(1.05)';
        restartBtn.style.background = '#3db3e0';
      });
      restartBtn.addEventListener('mouseleave', () => {
        restartBtn.style.transform = 'scale(1)';
        restartBtn.style.background = '#4fc3f7';
      });
      restartBtn.addEventListener('click', () => {
        this.removeModal();
        if (this.onRestartCallback) this.onRestartCallback();
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('mouseenter', () => {
        shareBtn.style.transform = 'scale(1.05)';
        shareBtn.style.background = '#6a3de8';
      });
      shareBtn.addEventListener('mouseleave', () => {
        shareBtn.style.transform = 'scale(1)';
        shareBtn.style.background = '#7c4dff';
      });
      shareBtn.addEventListener('click', () => {
        if (this.onShareCallback) this.onShareCallback();
      });
    }
  }

  private removeModal(): void {
    const existingModal = document.getElementById('resultModal');
    const existingOverlay = document.getElementById('modalOverlay');
    if (existingModal) existingModal.remove();
    if (existingOverlay) existingOverlay.remove();
    this.modalContainer = null;
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  renderInfoPanel(ctx: CanvasRenderingContext2D, state: UIState): void {
    if (this.canvasWidth < 500 && !this.panelExpanded) return;

    ctx.save();

    const panelX = this.canvasWidth - 220;
    const panelY = this.canvasHeight - 150;
    const panelW = 200;
    const panelH = 130;

    ctx.globalAlpha = 0.5;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fillStyle = '#1a1a30';
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.font = "14px 'Segoe UI', 'Arial', sans-serif";
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';

    const padding = 16;
    let y = panelY + padding;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('光带剩余长度:', panelX + padding, y);
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(state.trailLength.toString(), panelX + padding + 110, y);

    y += 28;

    const minutes = Math.floor(state.elapsedTime / 60000);
    const seconds = Math.floor((state.elapsedTime % 60000) / 1000);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('航行时间:', panelX + padding, y);

    if (state.elapsedTime >= this.WARNING_TIME) {
      const blinkAlpha = 0.5 + 0.5 * Math.sin(this.animationTime * 0.01);
      ctx.globalAlpha = blinkAlpha;
    }
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(timeStr, panelX + padding + 110, y);
    ctx.globalAlpha = 1;

    y += 28;

    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('速度:', panelX + padding, y);

    const barX = panelX + padding + 50;
    const barY = y + 3;
    const barW = panelW - padding - 50 - padding;
    const barH = 12;

    ctx.fillStyle = '#333333';
    this.roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const fillW = Math.max(2, barW * state.speedRatio);
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, '#4fc3f7');
    grad.addColorStop(1, '#7c4dff');
    ctx.fillStyle = grad;
    this.roundRect(ctx, barX, barY, fillW, barH, 4);
    ctx.fill();

    if (fillW > 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const waveX = barX + ((this.animationTime * 0.05 + i * 20) % fillW);
        ctx.beginPath();
        ctx.moveTo(waveX, barY + 2);
        ctx.lineTo(waveX + 4, barY + barH - 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
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

  cleanup(): void {
    this.removeModal();
    if (this.smallIcon) {
      this.smallIcon.remove();
      this.smallIcon = null;
    }
  }
}
