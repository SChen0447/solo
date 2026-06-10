import { Player, Enemy, Bullet, PowerUp, Star } from './entities';

export type GameState = 'title' | 'playing' | 'gameover';

export interface RenderData {
  state: GameState;
  score: number;
  highScore: number;
  level: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  stars: Star[];
  effects: {
    flashAlpha: number;
    ringRadius: number;
    ringAlpha: number;
  };
  titleSwingAngle: number;
  titleBlinkVisible: boolean;
  gameOverBlinkVisible: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render(data: RenderData): void {
    this.clear();
    this.drawBackground();
    this.drawStars(data.stars);

    if (data.state === 'title') {
      this.drawTitleScreen(data.titleSwingAngle, data.titleBlinkVisible);
    } else {
      this.drawBullets(data.bullets);
      this.drawEnemies(data.enemies);
      this.drawPowerUps(data.powerUps);
      this.drawPlayer(data.player);
      this.drawHUD(data.score, data.highScore, data.level, data.player.lives);
      this.drawEffects(data.effects);

      if (data.state === 'gameover') {
        this.drawGameOver(data.score, data.highScore, data.effects.ringRadius, data.effects.ringAlpha, data.gameOverBlinkVisible);
      }
    }
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#000011');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(stars: Star[]): void {
    for (const star of stars) {
      const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
      const alpha = star.brightness * (0.4 + twinkle * 0.6);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPlayer(player: Player): void {
    const { x, y } = player.position;
    const w = player.width;
    const h = player.height;

    this.ctx.save();
    this.ctx.translate(x, y);

    if (player.hasShield) {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, w * 0.85, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.moveTo(0, -h / 2);
    this.ctx.lineTo(-w / 2, h / 2);
    this.ctx.lineTo(0, h / 3);
    this.ctx.lineTo(w / 2, h / 2);
    this.ctx.closePath();

    this.ctx.fillStyle = '#00ff66';
    this.ctx.fill();
    this.ctx.strokeStyle = '#00cc55';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, -h / 4);
    this.ctx.lineTo(-w / 6, h / 6);
    this.ctx.lineTo(w / 6, h / 6);
    this.ctx.closePath();
    this.ctx.fillStyle = '#009944';
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const { x, y } = enemy.position;
      const w = enemy.width;
      const h = enemy.height;

      this.ctx.save();
      this.ctx.translate(x, y);

      if (enemy.type === 'small') {
        this.ctx.beginPath();
        this.ctx.moveTo(0, h / 2);
        this.ctx.lineTo(-w / 2, -h / 3);
        this.ctx.lineTo(-w / 4, -h / 2);
        this.ctx.lineTo(w / 4, -h / 2);
        this.ctx.lineTo(w / 2, -h / 3);
        this.ctx.closePath();
        this.ctx.fillStyle = '#ff3333';
        this.ctx.fill();
        this.ctx.strokeStyle = '#cc0000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(0, h / 2);
        this.ctx.lineTo(-w / 2, 0);
        this.ctx.lineTo(-w / 3, -h / 2);
        this.ctx.lineTo(w / 3, -h / 2);
        this.ctx.lineTo(w / 2, 0);
        this.ctx.closePath();
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fill();
        this.ctx.strokeStyle = '#cc0000';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(0, -h / 6, w / 6, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffaa00';
        this.ctx.fill();
      }

      if (enemy.health < enemy.maxHealth) {
        const barWidth = w * 0.8;
        const barHeight = 4;
        const barX = -barWidth / 2;
        const barY = -h / 2 - 10;
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        this.ctx.fillStyle = '#ff3333';
        this.ctx.fillRect(barX, barY, barWidth * (enemy.health / enemy.maxHealth), barHeight);
      }

      this.ctx.restore();
    }
  }

  private drawBullets(bullets: Bullet[]): void {
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      const { x, y } = bullet.position;

      this.ctx.save();
      this.ctx.strokeStyle = bullet.isPlayerBullet ? '#ffff00' : '#ff6600';
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.shadowColor = bullet.isPlayerBullet ? '#ffff00' : '#ff6600';
      this.ctx.shadowBlur = 8;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y - bullet.height / 2);
      this.ctx.lineTo(x, y + bullet.height / 2);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  private drawPowerUps(powerUps: PowerUp[]): void {
    for (const powerUp of powerUps) {
      if (!powerUp.active) continue;
      const { x, y } = powerUp.position;
      const pulse = Math.sin(powerUp.pulsePhase) * 0.3 + 1;
      const radius = (powerUp.width / 2) * pulse;

      this.ctx.save();
      this.ctx.translate(x, y);

      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#00ffff');
      gradient.addColorStop(1, '#0088aa');
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      this.ctx.strokeStyle = '#00ffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('E', 0, 0);

      this.ctx.restore();
    }
  }

  private drawHUD(score: number, highScore: number, level: number, lives: number): void {
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px "Press Start 2P", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.fillText(`SCORE: ${score}`, 16, 16);
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.fillText(`HI: ${highScore}`, 16, 40);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`LEVEL: ${level}`, 16, 60);

    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#ff6666';
    let livesText = '';
    for (let i = 0; i < lives; i++) {
      livesText += '♥ ';
    }
    this.ctx.fillText(livesText.trim(), this.width - 16, 16);

    this.ctx.restore();
  }

  private drawEffects(effects: { flashAlpha: number; ringRadius: number; ringAlpha: number }): void {
    if (effects.flashAlpha > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${effects.flashAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }

  private drawTitleScreen(swingAngle: number, blinkVisible: boolean): void {
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2 - 60);
    this.ctx.rotate(swingAngle);

    this.ctx.fillStyle = '#00ff66';
    this.ctx.font = 'bold 28px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#00ff66';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('SPACE', 0, -20);
    this.ctx.fillText('SHOOTER', 0, 20);

    this.ctx.restore();

    if (blinkVisible) {
      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('PRESS ANY KEY TO START', this.width / 2, this.height / 2 + 80);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '10px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('WASD MOVE   SPACE SHOOT', this.width / 2, this.height / 2 + 140);
    this.ctx.restore();
  }

  private drawGameOver(score: number, highScore: number, ringRadius: number, ringAlpha: number, blinkVisible: boolean): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();

    if (ringAlpha > 0) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.width / 2, this.height / 2, ringRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 100, 100, ${ringAlpha})`;
      this.ctx.lineWidth = 4;
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.fillStyle = '#ff3333';
    this.ctx.font = 'bold 32px "Press Start 2P", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#ff3333';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 100);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px "Press Start 2P", monospace';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText(`FINAL SCORE`, this.width / 2, this.height / 2 - 30);
    this.ctx.fillStyle = '#ffff00';
    this.ctx.font = 'bold 24px "Press Start 2P", monospace';
    this.ctx.fillText(`${score}`, this.width / 2, this.height / 2 + 5);

    this.ctx.fillStyle = '#888888';
    this.ctx.font = '12px "Press Start 2P", monospace';
    this.ctx.fillText(`HIGH SCORE: ${highScore}`, this.width / 2, this.height / 2 + 50);

    if (blinkVisible) {
      this.ctx.fillStyle = '#00ff66';
      this.ctx.font = '12px "Press Start 2P", monospace';
      this.ctx.fillText('PRESS R TO RESTART', this.width / 2, this.height / 2 + 110);
    }

    this.ctx.restore();
  }
}
