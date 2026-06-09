import { Player } from './player';
import { Collectible, Particle } from './collectible';
import { Obstacle } from './obstacle';

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Island {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private clouds: Cloud[] = [];
  private islands: Island[] = [];
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;
  private shakeTime: number = 0;
  private shakeDuration: number = 0.3;
  private shakeIntensity: number = 2;
  private lowShieldFlashTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.generateClouds();
    this.generateIslands();
  }

  private generateClouds(): void {
    this.clouds = [];
    const cloudCount = 15;
    const bottomStart = this.canvas.height * 0.8;
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * this.canvas.width,
        y: bottomStart + Math.random() * (this.canvas.height * 0.2),
        width: 40 + Math.random() * 80,
        height: 20 + Math.random() * 20
      });
    }
  }

  private generateIslands(): void {
    this.islands = [];
    const islandCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < islandCount; i++) {
      this.islands.push({
        x: Math.random() * this.canvas.width,
        y: 80 + Math.random() * (this.canvas.height * 0.4),
        width: 80 + Math.random() * 120,
        height: 40 + Math.random() * 60
      });
    }
  }

  public triggerShake(): void {
    this.shakeTime = this.shakeDuration;
  }

  public update(deltaTime: number): void {
    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      if (this.shakeTime > 0) {
        this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
        this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      } else {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }
    this.lowShieldFlashTime += deltaTime;
  }

  public resize(): void {
    this.generateClouds();
    this.generateIslands();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#DDA0DD');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (const cloud of this.clouds) {
      this.ctx.beginPath();
      this.ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawIsland(island: Island): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(island.x, island.y);
    this.ctx.lineTo(island.x + island.width, island.y);
    this.ctx.lineTo(island.x + island.width * 0.85, island.y + island.height);
    this.ctx.lineTo(island.x + island.width * 0.15, island.y + island.height);
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(island.x, island.y, island.x, island.y + island.height);
    gradient.addColorStop(0, '#5D8A3A');
    gradient.addColorStop(0.15, '#4A7030');
    gradient.addColorStop(0.3, '#8B5A2B');
    gradient.addColorStop(1, '#5C3D1E');
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.fillStyle = '#7CB342';
    this.ctx.fillRect(island.x, island.y - 3, island.width, 6);

    this.ctx.fillStyle = '#6D8B3A';
    for (let i = 0; i < 3; i++) {
      const treeX = island.x + 20 + i * (island.width - 40) / 2;
      const treeY = island.y - 5;
      this.ctx.beginPath();
      this.ctx.moveTo(treeX, treeY - 18);
      this.ctx.lineTo(treeX - 8, treeY);
      this.ctx.lineTo(treeX + 8, treeY);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawPlayer(player: Player): void {
    this.ctx.save();
    this.ctx.translate(player.x, player.y);

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
    const bodyGradient = this.ctx.createLinearGradient(0, -12, 0, 12);
    bodyGradient.addColorStop(0, '#E0E0E0');
    bodyGradient.addColorStop(0.5, '#A0A0A0');
    bodyGradient.addColorStop(1, '#606060');
    this.ctx.fillStyle = bodyGradient;
    this.ctx.fill();
    this.ctx.strokeStyle = '#404040';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.ellipse(0, -4, 10, 7, 0, 0, Math.PI * 2);
    const glassGradient = this.ctx.createRadialGradient(-3, -6, 0, 0, -4, 10);
    glassGradient.addColorStop(0, 'rgba(150, 220, 255, 0.9)');
    glassGradient.addColorStop(1, 'rgba(80, 150, 220, 0.7)');
    this.ctx.fillStyle = glassGradient;
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.moveTo(-22, 0);
    this.ctx.lineTo(-32, -6);
    this.ctx.lineTo(-32, 6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(22, 0);
    this.ctx.lineTo(32, -6);
    this.ctx.lineTo(32, 6);
    this.ctx.closePath();
    this.ctx.fill();

    if (player.shield > 0) {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 28, 0, Math.PI * 2);
      const shieldAlpha = 0.15 + (player.shield / player.maxShield) * 0.2;
      this.ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawCollectible(collectible: Collectible): void {
    this.ctx.save();
    this.ctx.translate(collectible.x, collectible.y);

    const pulse = 1 + Math.sin(collectible.pulsePhase) * 0.15;
    this.ctx.scale(pulse, pulse);

    this.ctx.shadowColor = collectible.config.hex;
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.moveTo(0, -collectible.radius);
    this.ctx.lineTo(collectible.radius * 0.7, -collectible.radius * 0.3);
    this.ctx.lineTo(collectible.radius * 0.7, collectible.radius * 0.3);
    this.ctx.lineTo(0, collectible.radius);
    this.ctx.lineTo(-collectible.radius * 0.7, collectible.radius * 0.3);
    this.ctx.lineTo(-collectible.radius * 0.7, -collectible.radius * 0.3);
    this.ctx.closePath();

    const gradient = this.ctx.createLinearGradient(-collectible.radius, -collectible.radius, collectible.radius, collectible.radius);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, collectible.config.hex);
    gradient.addColorStop(1, collectible.config.hex);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = collectible.config.hex;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawParticle(particle: Particle): void {
    this.ctx.save();
    this.ctx.globalAlpha = particle.alpha;
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawObstacle(obstacle: Obstacle): void {
    this.ctx.save();
    this.ctx.translate(obstacle.x, obstacle.y);
    this.ctx.rotate(obstacle.rotation);

    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      const r = obstacle.radius * (1 - i * 0.25);
      this.ctx.arc(0, 0, r, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      gradient.addColorStop(0, `rgba(20, 0, 40, ${0.9 - i * 0.2})`);
      gradient.addColorStop(0.5, `rgba(60, 0, 100, ${0.7 - i * 0.2})`);
      gradient.addColorStop(1, `rgba(100, 0, 150, ${0.1})`);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    this.ctx.strokeStyle = 'rgba(150, 50, 200, 0.6)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      this.ctx.beginPath();
      const startAngle = (i / 4) * Math.PI * 2;
      this.ctx.arc(0, 0, obstacle.radius * 0.7, startAngle, startAngle + Math.PI * 0.6);
      this.ctx.stroke();
    }

    if (obstacle.hitPlayer) {
      const fadeAlpha = 1 - obstacle.timeAfterHit / obstacle.disappearAfterHit;
      this.ctx.globalAlpha = fadeAlpha;
    }

    this.ctx.restore();
  }

  private drawHUD(player: Player, score: number): void {
    const barX = 20;
    const barY = 20;
    const barWidth = 200;
    const barHeight = 15;
    const barRadius = 8;

    const shieldPercent = player.shield / player.maxShield;
    const isLowShield = shieldPercent < 0.3;
    let alpha = 1;
    if (isLowShield) {
      const flashPeriod = 0.3;
      const phase = (this.lowShieldFlashTime % flashPeriod) / flashPeriod;
      alpha = 0.6 + 0.4 * Math.abs(Math.sin(phase * Math.PI * 2));
    }

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, barRadius + 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(40, 40, 40, 0.8)';
    this.roundRect(barX, barY, barWidth, barHeight, barRadius);
    this.ctx.fill();

    const fillWidth = Math.max(0, shieldPercent * barWidth);
    const shieldGradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    shieldGradient.addColorStop(0, '#FF4B4B');
    shieldGradient.addColorStop(0.5, '#FFAA4B');
    shieldGradient.addColorStop(1, '#4BFF4B');
    this.ctx.fillStyle = shieldGradient;
    this.roundRect(barX, barY, fillWidth, barHeight, barRadius);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.roundRect(barX, barY, barWidth, barHeight, barRadius);
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    const shieldText = `${Math.round(player.shield)}/${player.maxShield}`;
    this.ctx.strokeText(shieldText, barX + barWidth / 2, barY + barHeight / 2);
    this.ctx.fillText(shieldText, barX + barWidth / 2, barY + barHeight / 2);

    this.ctx.restore();

    this.ctx.save();
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    const scoreText = `分数: ${score}`;
    this.ctx.strokeText(scoreText, this.canvas.width / 2, 15);
    this.ctx.fillText(scoreText, this.canvas.width / 2, 15);
    this.ctx.restore();
  }

  public drawGameOver(score: number, highScore: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;

    const gameOverText = '游戏结束';
    this.ctx.strokeText(gameOverText, this.canvas.width / 2, this.canvas.height / 2 - 80);
    this.ctx.fillText(gameOverText, this.canvas.width / 2, this.canvas.height / 2 - 80);

    this.ctx.font = 'bold 32px sans-serif';
    const finalScoreText = `最终得分: ${score}`;
    this.ctx.strokeText(finalScoreText, this.canvas.width / 2, this.canvas.height / 2 - 20);
    this.ctx.fillText(finalScoreText, this.canvas.width / 2, this.canvas.height / 2 - 20);

    const highScoreText = `最高分: ${highScore}`;
    this.ctx.strokeText(highScoreText, this.canvas.width / 2, this.canvas.height / 2 + 30);
    this.ctx.fillText(highScoreText, this.canvas.width / 2, this.canvas.height / 2 + 30);

    this.ctx.font = 'bold 24px sans-serif';
    const restartText = '按 空格键 重新开始';
    this.ctx.strokeText(restartText, this.canvas.width / 2, this.canvas.height / 2 + 90);
    this.ctx.fillText(restartText, this.canvas.width / 2, this.canvas.height / 2 + 90);

    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  public render(
    player: Player,
    collectibles: Collectible[],
    obstacles: Obstacle[],
    particles: Particle[],
    score: number,
    gameOver: boolean,
    highScore: number
  ): void {
    this.ctx.save();
    this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

    this.drawBackground();

    for (const island of this.islands) {
      this.drawIsland(island);
    }

    for (const collectible of collectibles) {
      if (!collectible.collected) {
        this.drawCollectible(collectible);
      }
    }

    for (const obstacle of obstacles) {
      this.drawObstacle(obstacle);
    }

    if (!gameOver) {
      this.drawPlayer(player);
    }

    for (const particle of particles) {
      this.drawParticle(particle);
    }

    this.ctx.restore();

    this.drawHUD(player, score);

    if (gameOver) {
      this.drawGameOver(score, highScore);
    }
  }
}
