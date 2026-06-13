import gsap from 'gsap';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private score: number = 0;
  private combo: number = 0;
  private lives: number = 5;
  private maxLives: number = 5;
  private gameOver: boolean = false;
  private finalScore: number = 0;

  private comboScale: number = 1;

  private redFlashAlpha: number = 0;

  private nebulaParticles: NebulaParticle[] = [];
  private nebulaRotation: number = 0;
  private showNebula: boolean = false;

  private infoBarHeight: number = 50;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.initNebulaParticles();
  }

  private initNebulaParticles(): void {
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 300;
      this.nebulaParticles.push({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 1 + Math.random() * 3,
        alpha: 0.1 + Math.random() * 0.3,
        speed: 0.2 + Math.random() * 0.3,
        angle: angle
      });
    }
  }

  setScore(score: number): void {
    this.score = score;
  }

  setCombo(combo: number): void {
    if (combo > this.combo && combo > 0) {
      this.triggerComboAnimation();
    }
    this.combo = combo;
    this.showNebula = combo >= 15;
  }

  private triggerComboAnimation(): void {
    gsap.to(this, {
      comboScale: 1.2,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this, {
          comboScale: 1,
          duration: 0.15,
          ease: 'power2.in'
        });
      }
    });
  }

  setLives(lives: number): void {
    this.lives = lives;
  }

  triggerRedFlash(): void {
    gsap.to(this, {
      redFlashAlpha: 0.5,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this, {
          redFlashAlpha: 0,
          duration: 0.1,
          ease: 'power2.in'
        });
      }
    });
  }

  showGameOver(score: number): void {
    this.gameOver = true;
    this.finalScore = score;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.lives = this.maxLives;
    this.gameOver = false;
    this.finalScore = 0;
    this.comboScale = 1;
    this.redFlashAlpha = 0;
  }

  update(deltaTime: number): void {
    if (this.showNebula) {
      this.nebulaRotation += deltaTime * 0.1;
      for (const p of this.nebulaParticles) {
        p.angle += p.speed * deltaTime;
      }
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.showNebula) {
      this.drawNebula(ctx, w, h);
    }

    this.drawInfoBar(ctx, w, h);
    this.drawScore(ctx, w);
    this.drawCombo(ctx, w, h);
    this.drawLives(ctx, w);

    if (this.redFlashAlpha > 0) {
      this.drawRedFlash(ctx, w, h);
    }

    if (this.gameOver) {
      this.drawGameOverPanel(ctx, w, h);
    }
  }

  private drawNebula(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(this.nebulaRotation);

    for (const p of this.nebulaParticles) {
      const x = Math.cos(p.angle) * (100 + Math.sin(p.angle * 2) * 50) * 2;
      const y = Math.sin(p.angle) * (80 + Math.cos(p.angle * 1.5) * 40) * 2;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.size * 5);
      gradient.addColorStop(0, `rgba(255, 107, 107, ${p.alpha * 0.6})`);
      gradient.addColorStop(0.5, `rgba(254, 202, 87, ${p.alpha * 0.3})`);
      gradient.addColorStop(1, 'rgba(162, 155, 254, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, p.size * 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawInfoBar(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    const barHeight = this.infoBarHeight;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, w, barHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, barHeight - 1, w, 1);
  }

  private drawScore(ctx: CanvasRenderingContext2D, _w: number): void {
    ctx.save();
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#e0e6ff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(100, 126, 234, 0.6)';
    ctx.shadowBlur = 8;

    const scoreText = `得分: ${Math.floor(this.score)}`;
    ctx.fillText(scoreText, 20, this.infoBarHeight / 2);

    ctx.restore();
  }

  private drawCombo(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    if (this.combo <= 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(100, 126, 234, 0.6)';
    ctx.shadowBlur = 8;

    const centerX = w / 2;
    const centerY = this.infoBarHeight / 2;

    ctx.translate(centerX, centerY);
    ctx.scale(this.comboScale, this.comboScale);
    ctx.translate(-centerX, -centerY);

    let comboColor = '#e0e6ff';
    if (this.combo >= 30) comboColor = '#ffd700';
    else if (this.combo >= 20) comboColor = '#ff6b6b';
    else if (this.combo >= 10) comboColor = '#feca57';
    else if (this.combo >= 5) comboColor = '#48dbfb';

    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = comboColor;
    ctx.fillText(`${this.combo} COMBO`, centerX, centerY);

    let statusText = '';
    if (this.combo >= 15) statusText = '狂舞!';
    else if (this.combo >= 10) statusText = '炽热!';
    else if (this.combo >= 5) statusText = '流畅!';

    if (statusText) {
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = comboColor;
      ctx.fillText(statusText, centerX, centerY + 18);
    }

    ctx.restore();
  }

  private drawLives(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const heartSize = 22;
    const heartSpacing = 8;
    const startX = w - 20;
    const y = this.infoBarHeight / 2;

    for (let i = 0; i < this.maxLives; i++) {
      const x = startX - i * (heartSize + heartSpacing);
      const filled = i < this.lives;
      this.drawHeart(ctx, x - heartSize / 2, y, heartSize, filled);
    }

    ctx.restore();
  }

  private drawHeart(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    filled: boolean
  ): void {
    ctx.save();

    const color = filled ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)';

    ctx.translate(x + size / 2, y);
    ctx.scale(size / 20, size / 20);

    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-10, -5, -15, 8, 0, 15);
    ctx.bezierCurveTo(15, 8, 10, -5, 0, 5);
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
      ctx.shadowBlur = 8;
      ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawRedFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();

    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.3,
      w / 2, h / 2, Math.max(w, h) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(255, 50, 50, ${this.redFlashAlpha})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  private drawGameOverPanel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();

    ctx.fillStyle = 'rgba(11, 14, 20, 0.7)';
    ctx.fillRect(0, 0, w, h);

    const panelWidth = 400;
    const panelHeight = 280;
    const panelX = (w - panelWidth) / 2;
    const panelY = (h - panelHeight) / 2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.4)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0e6ff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(100, 126, 234, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillText('游戏结束', w / 2, panelY + 40);

    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
    ctx.fillText(`${Math.floor(this.finalScore)}`, w / 2, panelY + 100);

    ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#e0e6ff';
    ctx.shadowBlur = 0;
    ctx.fillText('最终得分', w / 2, panelY + 150);

    const btnWidth = 160;
    const btnHeight = 48;
    const btnX = (w - btnWidth) / 2;
    const btnY = panelY + 200;

    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0e6ff';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', w / 2, btnY + btnHeight / 2);

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

  isGameOver(): boolean {
    return this.gameOver;
  }

  isRestartButtonClicked(x: number, y: number): boolean {
    if (!this.gameOver) return false;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const panelHeight = 280;
    const panelY = (h - panelHeight) / 2;

    const btnWidth = 160;
    const btnHeight = 48;
    const btnX = (w - btnWidth) / 2;
    const btnY = panelY + 200;

    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  getInfoBarHeight(): number {
    return this.infoBarHeight;
  }
}

interface NebulaParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  angle: number;
}
