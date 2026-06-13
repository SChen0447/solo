export interface GameState {
  level: number;
  successCount: number;
  failCount: number;
  innerTrackColor: string;
}

export class UI {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private state: GameState = {
    level: 1,
    successCount: 0,
    failCount: 0,
    innerTrackColor: '#ff6b6b',
  };
  private time = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  setState(state: Partial<GameState>) {
    this.state = { ...this.state, ...state };
  }

  update(dt: number) {
    this.time += dt;
  }

  render() {
    this.renderStatusPanel();
    this.renderControlsHint();
  }

  private renderStatusPanel() {
    const ctx = this.ctx;
    const panelX = this.width - 16 - 160;
    const panelY = 16;
    const panelW = 160;
    const panelH = 100;

    const pulse = Math.sin(this.time * Math.PI * 1.5) * 0.5 + 0.5;
    const glowAlpha = 0.15 + pulse * 0.2;
    ctx.save();
    ctx.shadowColor = this.state.innerTrackColor;
    ctx.shadowBlur = 15 + pulse * 10;
    ctx.fillStyle = `rgba(10, 14, 39, 0.7)`;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(10, 14, 39, 0.7)`;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const rightEdgeGlow = ctx.createLinearGradient(panelX + panelW - 8, panelY, panelX + panelW, panelY);
    rightEdgeGlow.addColorStop(0, `${this.state.innerTrackColor}00`);
    rightEdgeGlow.addColorStop(1, `${this.state.innerTrackColor}${Math.floor(glowAlpha * 255).toString(16).padStart(2, '0')}`);
    ctx.fillStyle = rightEdgeGlow;
    this.roundRect(ctx, panelX + panelW - 10, panelY + 2, 10, panelH - 4, 6);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`第 ${this.state.level} 关`, panelX + 16, panelY + 14);

    ctx.fillStyle = '#ffd700';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.fillText(`成功: ${this.state.successCount}`, panelX + 16, panelY + 42);

    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 6;
    ctx.fillText(`失败: ${this.state.failCount}`, panelX + 16, panelY + 66);
    ctx.restore();
  }

  private renderControlsHint() {
    const ctx = this.ctx;
    const hint = '← → 旋转轨道    ↑ ↓ 切换层';
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(hint, this.width / 2, this.height - 20);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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
}
