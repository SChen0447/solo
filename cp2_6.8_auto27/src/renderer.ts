import type { PlayerState, Obstacle, ComboPopup, JudgementResult } from './game';
import { GAME_CONFIG } from './game';

const COLORS = {
  background: '#1a1a2e',
  backgroundDark: '#0f0f1a',
  track: '#e0e0e0',
  trackDark: '#c0c0c0',
  trackBorder: '#888888',
  player: '#00ff88',
  playerDark: '#00cc66',
  playerLight: '#66ffaa',
  obstacle: '#cc3333',
  obstacleDark: '#992222',
  obstacleLight: '#ff5555',
  beatGlow: '#ffe066',
  text: '#ffffff',
  textDim: '#888888',
  perfect: '#00ff88',
  good: '#44aaff',
  miss: '#ff4444',
};

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private pixelScale: number = 4;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = GAME_CONFIG.CANVAS_WIDTH;
    this.height = GAME_CONFIG.CANVAS_HEIGHT;
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.backgroundDark);
    gradient.addColorStop(1, COLORS.background);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawParallaxStars();
  }

  private drawParallaxStars(): void {
    const starLayers = [
      { count: 20, speed: 0.2, size: 1, color: 'rgba(255,255,255,0.3)' },
      { count: 15, speed: 0.4, size: 2, color: 'rgba(255,255,255,0.5)' },
      { count: 10, speed: 0.6, size: 2, color: 'rgba(255,255,255,0.7)' },
    ];

    const time = performance.now() / 1000;

    for (let layer = 0; layer < starLayers.length; layer++) {
      const { count, size, color } = starLayers[layer];
      this.ctx.fillStyle = color;

      for (let i = 0; i < count; i++) {
        const seed = i * 137 + layer * 53;
        const x = ((seed * 7919) % this.width);
        const baseY = ((seed * 104729) % this.height);
        const y = ((baseY + time * 30 * (layer + 1) * 20) % this.height);

        this.ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
      }
    }
  }

  drawTrack(trackOffset: number): void {
    const trackLeft = this.width / 2 - GAME_CONFIG.TRACK_WIDTH / 2;
    const trackWidth = GAME_CONFIG.TRACK_WIDTH;

    this.ctx.fillStyle = COLORS.trackDark;
    this.ctx.fillRect(trackLeft, 0, trackWidth, this.height);

    const stripeHeight = 40;
    const stripeGap = 40;
    const totalStripeHeight = stripeHeight + stripeGap;

    this.ctx.fillStyle = COLORS.track;

    const startY = -(trackOffset % totalStripeHeight);

    for (let y = startY; y < this.height; y += totalStripeHeight) {
      this.ctx.fillRect(trackLeft, y, trackWidth, stripeHeight);
    }

    this.ctx.fillStyle = COLORS.trackBorder;
    this.ctx.fillRect(trackLeft - 2, 0, 2, this.height);
    this.ctx.fillRect(trackLeft + trackWidth, 0, 2, this.height);

    this.drawVignette();
  }

  private drawVignette(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.3,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPlayer(player: PlayerState): void {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const pw = player.width;
    const ph = player.height;

    if (player.isSliding) {
      this.drawSlidingPlayer(px, py, pw, ph);
    } else {
      this.drawRunningPlayer(px, py, pw, ph, player.isJumping);
    }
  }

  private drawRunningPlayer(x: number, y: number, w: number, h: number, jumping: boolean): void {
    const ps = 4;
    const cx = x + w / 2;

    this.ctx.fillStyle = COLORS.player;

    const headY = y + ps * 0;
    const headSize = ps * 3;
    this.ctx.fillRect(cx - headSize / 2, headY, headSize, headSize);

    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(cx - ps, headY + ps, ps, ps);
    this.ctx.fillRect(cx + ps / 4, headY + ps, ps, ps);

    this.ctx.fillStyle = COLORS.player;
    const bodyY = headY + headSize;
    const bodyH = ps * 4;
    const bodyW = ps * 3;
    this.ctx.fillRect(cx - bodyW / 2, bodyY, bodyW, bodyH);

    this.ctx.fillStyle = COLORS.playerDark;
    this.ctx.fillRect(cx - bodyW / 2, bodyY, ps / 2, bodyH);

    const legY = bodyY + bodyH;
    const legH = ps * 3;

    if (jumping) {
      this.ctx.fillRect(cx - bodyW / 2, legY, ps, legH - ps);
      this.ctx.fillRect(cx + ps / 2, legY, ps, legH - ps);
    } else {
      const time = performance.now() / 100;
      const legOffset = Math.sin(time) * ps;

      this.ctx.fillRect(cx - bodyW / 2, legY + Math.abs(legOffset), ps, legH - Math.abs(legOffset));
      this.ctx.fillRect(cx + ps / 2, legY + Math.abs(-legOffset), ps, legH - Math.abs(-legOffset));
    }

    this.ctx.fillStyle = COLORS.playerLight;
    this.ctx.fillRect(cx + bodyW / 2 - ps / 2, bodyY, ps / 2, ps);
  }

  private drawSlidingPlayer(x: number, y: number, w: number, h: number): void {
    const ps = 4;
    const cx = x + w / 2;

    this.ctx.fillStyle = COLORS.player;

    this.ctx.fillRect(cx - ps * 3, y + ps, ps * 6, ps * 2);

    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(cx + ps, y + ps + ps / 2, ps, ps / 2);

    this.ctx.fillStyle = COLORS.playerDark;
    this.ctx.fillRect(cx - ps * 3, y + ps * 3 - ps / 2, ps * 5, ps / 2);

    this.ctx.fillStyle = COLORS.player;
    this.ctx.fillRect(cx + ps * 2, y + ps / 2, ps * 2, ps);
  }

  drawObstacles(obstacles: Obstacle[]): void {
    const trackCenter = this.width / 2;

    for (const obstacle of obstacles) {
      if (obstacle.type === 'spike') {
        this.drawSpike(trackCenter, obstacle.y);
      } else {
        this.drawLowBlock(trackCenter, obstacle.y);
      }
    }
  }

  private drawSpike(centerX: number, y: number): void {
    const w = 32;
    const h = 40;
    const ps = 4;

    this.ctx.fillStyle = COLORS.obstacle;

    const spikes = 3;
    const spikeWidth = w / spikes;

    for (let i = 0; i < spikes; i++) {
      const sx = centerX - w / 2 + i * spikeWidth;

      for (let row = 0; row < h / ps; row++) {
        const rowY = y + row * ps;
        const rowWidth = (row + 1) * ps * (spikeWidth / h);
        const rowLeft = sx + spikeWidth / 2 - rowWidth / 2;
        this.ctx.fillRect(Math.floor(rowLeft), rowY, Math.ceil(rowWidth), ps);
      }
    }

    this.ctx.fillStyle = COLORS.obstacleLight;
    for (let i = 0; i < spikes; i++) {
      const sx = centerX - w / 2 + i * spikeWidth;
      this.ctx.fillRect(sx + spikeWidth / 2 - ps / 2, y + ps, ps / 2, ps);
    }

    this.ctx.fillStyle = COLORS.obstacleDark;
    this.ctx.fillRect(centerX - w / 2, y + h - ps, w, ps);
  }

  private drawLowBlock(centerX: number, y: number): void {
    const w = 50;
    const h = 20;
    const ps = 4;

    this.ctx.fillStyle = COLORS.obstacle;
    this.ctx.fillRect(centerX - w / 2, y, w, h);

    this.ctx.fillStyle = COLORS.obstacleLight;
    this.ctx.fillRect(centerX - w / 2, y, w, ps);
    this.ctx.fillRect(centerX - w / 2, y, ps, h);

    this.ctx.fillStyle = COLORS.obstacleDark;
    this.ctx.fillRect(centerX - w / 2, y + h - ps, w, ps);
    this.ctx.fillRect(centerX + w / 2 - ps, y, ps, h);

    this.ctx.fillStyle = COLORS.obstacleDark;
    const stripeWidth = ps;
    const stripeGap = ps * 2;
    for (let sx = centerX - w / 2 + ps; sx < centerX + w / 2 - ps; sx += stripeGap) {
      this.ctx.fillRect(sx, y + ps, stripeWidth, h - ps * 2);
    }
  }

  drawHUD(score: number, combo: number, beatFlashIntensity: number): void {
    this.drawScore(score);
    this.drawCombo(combo);
    this.drawBeatIndicator(beatFlashIntensity);
  }

  private drawScore(score: number): void {
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillText(`${score}`, 22, 22);

    this.ctx.fillStyle = COLORS.text;
    this.ctx.fillText(`${score}`, 20, 20);
  }

  private drawCombo(combo: number): void {
    if (combo === 0) return;

    this.ctx.font = 'bold 18px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';

    const text = `${combo} COMBO`;
    const x = this.width - 70;
    const y = 22;

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillText(text, x + 2, y + 2);

    this.ctx.fillStyle = COLORS.player;
    this.ctx.fillText(text, x, y);
  }

  private drawBeatIndicator(intensity: number): void {
    const x = this.width - 30;
    const y = 32;
    const baseRadius = 12;
    const maxRadius = 24;

    if (intensity > 0) {
      const pulseRadius = baseRadius + (maxRadius - baseRadius) * intensity;

      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, pulseRadius);
      gradient.addColorStop(0, `rgba(255, 224, 102, ${0.8 * intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 224, 102, ${0.4 * intensity})`);
      gradient.addColorStop(1, 'rgba(255, 224, 102, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = COLORS.beatGlow;
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseRadius / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = COLORS.beatGlow;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawJudgement(judgement: JudgementResult): void {
    if (!judgement.type) return;

    const y = this.height * 0.4;
    const centerX = this.width / 2;

    let color = COLORS.perfect;
    let text = 'PERFECT!';

    switch (judgement.type) {
      case 'perfect':
        color = COLORS.perfect;
        text = 'PERFECT!';
        break;
      case 'good':
        color = COLORS.good;
        text = 'GOOD';
        break;
      case 'miss':
        color = COLORS.miss;
        text = 'MISS';
        break;
    }

    const elapsed = performance.now() - this.getJudgementStartTime();
    const progress = Math.min(1, elapsed / 500);
    const scale = 1 + progress * 0.5;
    const alpha = 1 - progress;

    this.ctx.save();
    this.ctx.translate(centerX, y);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = alpha;
    this.ctx.font = 'bold 32px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillText(text, 2, 2);

    this.ctx.fillStyle = color;
    this.ctx.fillText(text, 0, 0);

    this.ctx.restore();
  }

  private judgementStartTime: number = 0;

  setJudgementStartTime(time: number): void {
    this.judgementStartTime = time;
  }

  private getJudgementStartTime(): number {
    return this.judgementStartTime;
  }

  drawComboPopups(popups: ComboPopup[]): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (const popup of popups) {
      const elapsed = performance.now() - popup.startTime;
      const progress = Math.min(1, elapsed / popup.duration);

      const scale = 0.5 + progress * 1.5;
      const alpha = 1 - progress;
      const offsetY = -progress * 50;

      this.ctx.save();
      this.ctx.translate(centerX, centerY + offsetY);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = alpha;

      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const text = `${popup.combo} COMBO!`;

      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillText(text, 3, 3);

      this.ctx.fillStyle = COLORS.player;
      this.ctx.fillText(text, 0, 0);

      this.ctx.restore();
    }
  }

  drawGameOver(score: number, maxCombo: number): void {
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2 - 40;

    this.ctx.font = 'bold 36px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = COLORS.miss;
    this.ctx.fillText('GAME OVER', centerX, centerY - 60);

    this.ctx.font = '20px "Courier New", monospace';
    this.ctx.fillStyle = COLORS.text;
    this.ctx.fillText(`得分: ${score}`, centerX, centerY);
    this.ctx.fillText(`最大连击: ${maxCombo}`, centerX, centerY + 35);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = COLORS.textDim;
    this.ctx.fillText('点击重新开始', centerX, centerY + 90);
  }

  drawStartScreen(): void {
    this.clear();
    this.drawBackground();

    const centerX = this.width / 2;
    const centerY = this.height / 2 - 60;

    this.ctx.font = 'bold 42px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillText('节奏跑酷', centerX + 3, centerY + 3);

    this.ctx.fillStyle = COLORS.player;
    this.ctx.fillText('节奏跑酷', centerX, centerY);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = COLORS.textDim;
    this.ctx.fillText('RHYTHM RUNNER', centerX, centerY + 35);

    this.ctx.font = '14px "Courier New", monospace';
    this.ctx.fillStyle = COLORS.text;
    this.ctx.fillText('空格 = 跳跃 (可二段跳)', centerX, centerY + 80);
    this.ctx.fillText('↓键 = 滑铲', centerX, centerY + 105);
  }
}
