interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class UIManager {
  private particles: Particle[] = [];
  private rewindGlowTimer: number = 0;
  private rewindAuraTimer: number = 0;
  private rewindTextTimer: number = 0;
  private levelTransitionTimer: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private isMobile: boolean;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.isMobile = this.checkMobile();
  }

  private checkMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
  }

  getIsMobile(): boolean {
    return this.isMobile;
  }

  spawnJumpParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        size: 2 + Math.random() * 2,
        color: 'rgba(255, 255, 255, 0.9)'
      });
    }
  }

  triggerRewindEffects(): void {
    this.rewindGlowTimer = 0.5;
    this.rewindTextTimer = 1.0;
  }

  triggerRewindEndAura(): void {
    this.rewindAuraTimer = 0.8;
  }

  triggerLevelTransition(): void {
    this.levelTransitionTimer = 0.3;
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.rewindGlowTimer > 0) this.rewindGlowTimer -= deltaTime;
    if (this.rewindAuraTimer > 0) this.rewindAuraTimer -= deltaTime;
    if (this.rewindTextTimer > 0) this.rewindTextTimer -= deltaTime;
    if (this.levelTransitionTimer > 0) this.levelTransitionTimer -= deltaTime;
  }

  renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(1, '#1a237e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();
    for (let i = 0; i < 50; i++) {
      const x = (i * 137.5) % this.canvasWidth;
      const y = (i * 73.3) % this.canvasHeight;
      const size = (i % 3) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + (i % 5) * 0.05})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderStatusPanel(
    ctx: CanvasRenderingContext2D,
    stats: {
      goldBallsCollected: number;
      totalGoldBalls: number;
      lives: number;
      rewindCount: number;
      rewindCooldown: number;
      rewindCooldownMax: number;
      score: number;
    }
  ): void {
    const panelX = this.canvasWidth - 216;
    const panelY = 16;
    const panelW = 200;
    const panelH = 160;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 8);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`金球: ${stats.goldBallsCollected}/${stats.totalGoldBalls}`, panelX + 16, panelY + 16);

    ctx.fillStyle = '#33ff66';
    this.drawHeart(ctx, panelX + 16, panelY + 48, 10);
    ctx.fillText(`x ${stats.lives}`, panelX + 36, panelY + 44);

    ctx.fillStyle = '#74c0fc';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`得分: ${stats.score}`, panelX + 16, panelY + 74);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(`回溯次数: ${stats.rewindCount}`, panelX + 16, panelY + 102);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(panelX + 16, panelY + 126, panelW - 32, 8);

    const cooldownProgress =
      stats.rewindCooldown > 0
        ? 1 - stats.rewindCooldown / stats.rewindCooldownMax
        : 1;
    const barColor = this.getCooldownColor(cooldownProgress);
    ctx.fillStyle = barColor;
    ctx.fillRect(panelX + 16, panelY + 126, (panelW - 32) * cooldownProgress, 8);
    ctx.restore();
  }

  renderRewindStatus(
    ctx: CanvasRenderingContext2D,
    rewindCount: number,
    rewindCooldown: number,
    rewindCooldownMax: number
  ): void {
    ctx.save();
    ctx.shadowColor = 'rgba(116, 192, 252, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#74c0fc';
    ctx.font = 'bold 18px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`⏱ 回溯: ${rewindCount}`, 16, 16);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(16, 44, 150, 8);

    const cooldownProgress =
      rewindCooldown > 0 ? 1 - rewindCooldown / rewindCooldownMax : 1;
    ctx.fillStyle = this.getCooldownColor(cooldownProgress);
    ctx.fillRect(16, 44, 150 * cooldownProgress, 8);
    ctx.restore();
  }

  private getCooldownColor(progress: number): string {
    const r = Math.floor(255 * (1 - progress));
    const g = Math.floor(100 + 155 * progress);
    const b = Math.floor(200 + 55 * progress);
    return `rgb(${r}, ${g}, ${b})`;
  }

  renderRewindEffects(
    ctx: CanvasRenderingContext2D,
    isRewinding: boolean,
    playerX: number,
    playerY: number,
    playerW: number,
    playerH: number
  ): void {
    if (this.rewindGlowTimer > 0 || isRewinding) {
      const alpha = isRewinding
        ? 0.4
        : (this.rewindGlowTimer / 0.5) * 0.4;
      ctx.save();
      const glowGradient = ctx.createRadialGradient(
        this.canvasWidth / 2,
        this.canvasHeight / 2,
        Math.min(this.canvasWidth, this.canvasHeight) * 0.2,
        this.canvasWidth / 2,
        this.canvasHeight / 2,
        Math.max(this.canvasWidth, this.canvasHeight) * 0.7
      );
      glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
      glowGradient.addColorStop(0.7, `rgba(100, 200, 255, ${alpha * 0.5})`);
      glowGradient.addColorStop(1, `rgba(100, 200, 255, ${alpha})`);
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
    }

    if (this.rewindTextTimer > 0 || isRewinding) {
      const alpha = isRewinding
        ? 0.8 + Math.sin(Date.now() * 0.01) * 0.2
        : (this.rewindTextTimer / 1.0) * 0.8;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.shadowColor = 'rgba(116, 192, 252, 0.9)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#74c0fc';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('时间逆转中...', this.canvasWidth / 2, this.canvasHeight - 40);
      ctx.restore();
    }

    if (this.rewindAuraTimer > 0) {
      const progress = 1 - this.rewindAuraTimer / 0.8;
      const auraSize = 40 + progress * 80;
      const alpha = (1 - progress) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#74c0fc';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(116, 192, 252, 0.9)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(
        playerX + playerW / 2,
        playerY + playerH / 2,
        auraSize * (1 - progress),
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  renderLevelTransition(ctx: CanvasRenderingContext2D): void {
    if (this.levelTransitionTimer > 0) {
      const progress = 1 - this.levelTransitionTimer / 0.3;
      const radius = progress * Math.max(this.canvasWidth, this.canvasHeight) * 0.8;
      ctx.save();
      ctx.fillStyle = `rgba(10, 14, 39, ${1 - progress})`;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

      ctx.globalCompositeOperation = 'destination-out';
      const gradient = ctx.createRadialGradient(
        this.canvasWidth / 2,
        this.canvasHeight / 2,
        0,
        this.canvasWidth / 2,
        this.canvasHeight / 2,
        radius
      );
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
    }
  }

  renderGameOver(
    ctx: CanvasRenderingContext2D,
    score: number,
    bestScore: number,
    bestTime: number | null
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const panelW = 400;
    const panelH = 280;
    const panelX = (this.canvasWidth - panelW) / 2;
    const panelY = (this.canvasHeight - panelH) / 2;

    ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(116, 192, 252, 0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.shadowColor = 'rgba(255, 100, 100, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('游戏结束', this.canvasWidth / 2, panelY + 24);

    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(`本次得分: ${score}`, this.canvasWidth / 2, panelY + 90);

    ctx.fillStyle = '#ffd700';
    ctx.font = '18px sans-serif';
    ctx.fillText(`历史最高: ${bestScore}`, this.canvasWidth / 2, panelY + 130);

    if (bestTime !== null) {
      const minutes = Math.floor(bestTime / 60000);
      const seconds = Math.floor((bestTime % 60000) / 1000);
      ctx.fillStyle = '#74c0fc';
      ctx.fillText(
        `最佳通关: ${minutes}:${seconds.toString().padStart(2, '0')}`,
        this.canvasWidth / 2,
        panelY + 165
      );
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px sans-serif';
    ctx.fillText('按 R 键重新开始', this.canvasWidth / 2, panelY + 220);

    ctx.restore();
  }

  renderMobileControls(
    ctx: CanvasRenderingContext2D,
    joystickActive: { x: number; y: number } | null,
    jumpPressed: boolean,
    rewindPressed: boolean
  ): void {
    if (!this.isMobile) return;

    const scale = this.canvasWidth / 1200;
    const joystickX = 80 * scale;
    const joystickY = this.canvasHeight - 100 * scale;
    const joystickRadius = 40 * scale;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joystickX, joystickY, joystickRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (joystickActive) {
      const knobX = joystickX + joystickActive.x * joystickRadius * 0.7;
      const knobY = joystickY + joystickActive.y * joystickRadius * 0.7;
      ctx.fillStyle = 'rgba(116, 192, 252, 0.7)';
      ctx.beginPath();
      ctx.arc(knobX, knobY, joystickRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(joystickX, joystickY, joystickRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const jumpBtnX = this.canvasWidth - 80 * scale;
    const jumpBtnY = this.canvasHeight - 90 * scale;
    const jumpBtnSize = 40 * scale;
    ctx.fillStyle = jumpPressed ? 'rgba(100, 255, 100, 0.7)' : 'rgba(100, 255, 100, 0.3)';
    ctx.strokeStyle = 'rgba(100, 255, 100, 0.6)';
    ctx.lineWidth = 2;
    this.roundRect(
      ctx,
      jumpBtnX - jumpBtnSize / 2,
      jumpBtnY - jumpBtnSize / 2,
      jumpBtnSize,
      jumpBtnSize,
      8
    );
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${14 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('跳', jumpBtnX, jumpBtnY);

    const rewindBtnX = this.canvasWidth - 150 * scale;
    const rewindBtnY = this.canvasHeight - 100 * scale;
    const rewindBtnSize = 50 * scale;
    ctx.fillStyle = rewindPressed
      ? 'rgba(116, 192, 252, 0.7)'
      : 'rgba(116, 192, 252, 0.3)';
    ctx.strokeStyle = 'rgba(116, 192, 252, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rewindBtnX, rewindBtnY, rewindBtnSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${16 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', rewindBtnX, rewindBtnY);

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size);
    ctx.bezierCurveTo(x, y + size * 0.6, x, y, x + size / 2, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y, x + size, y + size * 0.6, x + size / 2, y + size);
    ctx.closePath();
    ctx.fill();
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
}
