export interface GameStats {
  puzzleIndex: number;
  totalPuzzles: number;
  operations: number;
  elapsedMs: number;
}

export interface UIState {
  hintText: string;
  showVictory: boolean;
  totalElapsedMs: number;
  totalOperations: number;
}

export class UIRenderer {
  canvasWidth: number;
  canvasHeight: number;
  statusBarHeight: number;
  scale: number;

  constructor(canvasWidth: number, canvasHeight: number, statusBarHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.statusBarHeight = statusBarHeight;
    this.scale = Math.min(canvasWidth / 1200, 1.5);
  }

  updateSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.scale = Math.min(width / 1200, 1.5);
  }

  formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateStatusDOM(stats: GameStats): void {
    const puzzleEl = document.getElementById('puzzle-text');
    const opsEl = document.getElementById('ops-text');
    const timeEl = document.getElementById('time-text');

    if (puzzleEl) {
      puzzleEl.textContent = `谜题 ${Math.min(stats.puzzleIndex, stats.totalPuzzles)}/${stats.totalPuzzles}`;
    }
    if (opsEl) {
      opsEl.textContent = `操作: ${stats.operations}`;
    }
    if (timeEl) {
      timeEl.textContent = `时间: ${this.formatTime(stats.elapsedMs)}`;
    }
  }

  renderHint(ctx: CanvasRenderingContext2D, text: string, time: number): void {
    const fontSize = Math.max(14, 16 * this.scale);
    const alpha = Math.sin(time * 0.003) * 0.2 + 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, this.canvasWidth / 2, 20);
    ctx.restore();
  }

  renderPuzzleComplete(ctx: CanvasRenderingContext2D, puzzleIndex: number, totalPuzzles: number, time: number): void {
    const fontSize = Math.max(24, 32 * this.scale);
    const alpha = Math.min(1, (time % 1000) / 500);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#00FF88';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 15;
    ctx.fillText(
      puzzleIndex >= totalPuzzles ? '全部完成！' : `谜题 ${puzzleIndex}/${totalPuzzles} 完成！`,
      this.canvasWidth / 2,
      this.canvasHeight / 2 - 80 * this.scale
    );
    ctx.restore();
  }

  renderVictory(ctx: CanvasRenderingContext2D, totalElapsedMs: number, totalOperations: number, time: number): void {
    const gradientProgress = Math.min(1, (time % 2000) / 2000);
    const gradient = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.3 + gradientProgress * 0.2})`);
    gradient.addColorStop(1, `rgba(255, 140, 0, ${0.3 + gradientProgress * 0.2})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();

    const titleFontSize = Math.max(36, 48 * this.scale);
    const pulse = Math.sin(time * 0.003) * 0.1 + 1;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${titleFontSize * pulse}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillText('量子大师', this.canvasWidth / 2, this.canvasHeight / 2 - 40 * this.scale);
    ctx.restore();

    const infoFontSize = Math.max(16, 20 * this.scale);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${infoFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `总用时: ${this.formatTime(totalElapsedMs)}`,
      this.canvasWidth / 2,
      this.canvasHeight / 2 + 30 * this.scale
    );
    ctx.fillText(
      `总操作: ${totalOperations} 次`,
      this.canvasWidth / 2,
      this.canvasHeight / 2 + 60 * this.scale
    );
    ctx.restore();

    const hintFontSize = Math.max(12, 14 * this.scale);
    const hintAlpha = Math.sin(time * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${hintFontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '点击"重新开始游戏"再来一次',
      this.canvasWidth / 2,
      this.canvasHeight / 2 + 100 * this.scale
    );
    ctx.restore();
  }

  renderColorLegend(ctx: CanvasRenderingContext2D): void {
    const legendX = 20;
    const legendY = 20;
    const itemHeight = 24 * this.scale;
    const fontSize = Math.max(11, 12 * this.scale);
    const dotRadius = 5 * this.scale;

    const items = [
      { color: '#4A90D9', label: '蓝色粒子目标' },
      { color: '#FF6B6B', label: '红色粒子目标' },
      { color: '#00FF88', label: '干扰目标点' }
    ];

    ctx.save();
    ctx.globalAlpha = 0.8;

    items.forEach((item, i) => {
      const y = legendY + i * itemHeight;

      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(legendX + dotRadius, y + dotRadius, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.label, legendX + dotRadius * 2 + 8, y + dotRadius);
    });

    ctx.restore();
  }
}
