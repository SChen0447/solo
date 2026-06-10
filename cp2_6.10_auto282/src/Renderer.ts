import {
  Decoration,
  GAME_CONFIG,
  GameState,
  Obstacle,
  ObstacleType,
  Platform,
  PlatformType,
  Player,
  Spore,
  WorldMap,
} from './types';
import { fastSin } from './utils';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  public render(
    worldMap: WorldMap,
    player: Player,
    gameState: GameState,
  ): void {
    const ctx = this.ctx;
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    let shakeX = 0;
    let shakeY = 0;
    if (gameState.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * gameState.shakeIntensity * 2;
      shakeY = (Math.random() - 0.5) * gameState.shakeIntensity * 2;
    }

    ctx.save();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.translate(shakeX, shakeY);

    this.drawBackground();
    this.drawDecorations(worldMap.decorations.filter((d) => d.layer === 0), gameState.cameraX, 0.3);

    ctx.save();
    ctx.translate(-gameState.cameraX, 0);

    this.drawDecorations(worldMap.decorations.filter((d) => d.layer === 1), gameState.cameraX, 0.6);
    this.drawPlatforms(worldMap.platforms);
    this.drawGoalFlag(worldMap.goalX);
    this.drawSpores(worldMap.spores);
    this.drawObstacles(worldMap.obstacles);
    this.drawPlayer(player);
    this.drawFloatTexts(gameState);

    ctx.restore();
    this.drawUI(gameState);

    if (gameState.status === 'gameover') {
      this.drawGameOver();
    }

    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#FFDAB9');
    gradient.addColorStop(1, '#FFB347');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 5; i++) {
      const cloudX = (i * 200 + 50) % CANVAS_WIDTH;
      const cloudY = 60 + i * 30;
      this.drawCloud(cloudX, cloudY, 0.8 + (i % 2) * 0.4);
    }
  }

  private drawCloud(x: number, y: number, scale: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.arc(25, 0, 25, 0, Math.PI * 2);
    ctx.arc(55, 0, 18, 0, Math.PI * 2);
    ctx.arc(35, -12, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDecorations(decorations: Decoration[], cameraX: number, parallax: number): void {
    const ctx = this.ctx;

    for (const deco of decorations) {
      const screenX = deco.x - cameraX * parallax;
      if (screenX < -100 || screenX > GAME_CONFIG.CANVAS_WIDTH + 100) continue;

      ctx.save();
      ctx.translate(deco.x, deco.y);
      ctx.scale(deco.scale, deco.scale);

      switch (deco.type) {
        case 'tree':
          this.drawTree();
          break;
        case 'bush':
          this.drawBush();
          break;
        case 'mushroom_deco':
          this.drawMushroomDeco();
          break;
      }

      ctx.restore();
    }
  }

  private drawTree(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-8, -60, 16, 60);

    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(0, -80, 35, 0, Math.PI * 2);
    ctx.arc(-25, -65, 25, 0, Math.PI * 2);
    ctx.arc(25, -65, 25, 0, Math.PI * 2);
    ctx.arc(0, -55, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBush(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#3CB371';
    ctx.beginPath();
    ctx.arc(0, -15, 18, 0, Math.PI * 2);
    ctx.arc(-15, -10, 14, 0, Math.PI * 2);
    ctx.arc(15, -10, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMushroomDeco(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#F5DEB3';
    ctx.fillRect(-5, -25, 10, 25);

    ctx.fillStyle = '#DDA0DD';
    ctx.beginPath();
    ctx.ellipse(0, -30, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-6, -32, 3, 0, Math.PI * 2);
    ctx.arc(5, -28, 2.5, 0, Math.PI * 2);
    ctx.arc(2, -36, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlatforms(platforms: Platform[]): void {
    const ctx = this.ctx;

    for (const platform of platforms) {
      if (platform.broken) continue;

      ctx.save();
      switch (platform.type) {
        case PlatformType.GROUND:
          this.drawGroundPlatform(platform);
          break;
        case PlatformType.FLOATING:
          this.drawFloatingPlatform(platform);
          break;
        case PlatformType.ICE:
          this.drawIcePlatform(platform);
          break;
      }
      ctx.restore();
    }
  }

  private drawGroundPlatform(platform: Platform): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

    ctx.fillStyle = '#66BB6A';
    ctx.fillRect(platform.x, platform.y, platform.width, 10);

    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 3;
    ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);

    ctx.fillStyle = '#81C784';
    for (let i = 0; i < platform.width; i += 15) {
      ctx.beginPath();
      ctx.arc(platform.x + i + 7, platform.y + 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFloatingPlatform(platform: Platform): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#4CAF50';
    this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 6);
    ctx.fill();

    ctx.fillStyle = '#66BB6A';
    this.roundRect(ctx, platform.x, platform.y, platform.width, 8, 6);
    ctx.fill();

    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 6);
    ctx.stroke();
  }

  private drawIcePlatform(platform: Platform): void {
    const ctx = this.ctx;
    let alpha = 1;

    if (platform.breaking) {
      alpha = 0.4 + (platform.breakTimer / 2.0) * 0.6;
      const shake = (Math.random() - 0.5) * 2;
      ctx.translate(shake, shake);
    }

    ctx.globalAlpha = alpha;

    const gradient = ctx.createLinearGradient(platform.x, platform.y, platform.x, platform.y + platform.height);
    gradient.addColorStop(0, '#E0F7FA');
    gradient.addColorStop(1, '#80DEEA');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 6);
    ctx.fill();

    ctx.strokeStyle = '#4DD0E1';
    ctx.lineWidth = 2;
    this.roundRect(ctx, platform.x, platform.y, platform.width, platform.height, 6);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillRect(platform.x + 6, platform.y + 3, 20, 3);

    if (platform.breaking) {
      ctx.strokeStyle = '#00ACC1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(platform.x + 10, platform.y);
      ctx.lineTo(platform.x + 25, platform.y + platform.height);
      ctx.moveTo(platform.x + 50, platform.y);
      ctx.lineTo(platform.x + 40, platform.y + platform.height);
      ctx.moveTo(platform.x + 65, platform.y + 5);
      ctx.lineTo(platform.x + 70, platform.y + platform.height - 3);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
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

  private drawGoalFlag(goalX: number): void {
    const ctx = this.ctx;
    const flagY = GAME_CONFIG.GROUND_Y;

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(goalX - 3, flagY - 120, 6, 120);

    const wave = fastSin(Date.now() * 0.005) * 3;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.moveTo(goalX + 3, flagY - 120);
    ctx.quadraticCurveTo(goalX + 35 + wave, flagY - 105, goalX + 50 + wave, flagY - 95);
    ctx.quadraticCurveTo(goalX + 35 + wave, flagY - 85, goalX + 3, flagY - 70);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FF8C00';
    ctx.font = 'bold 16px "Baloo 2", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('终', goalX + 25, flagY - 92);
  }

  private drawSpores(spores: Spore[]): void {
    const ctx = this.ctx;

    for (const spore of spores) {
      if (spore.collected) continue;

      ctx.save();

      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 12;

      const gradient = ctx.createRadialGradient(spore.x, spore.y, 0, spore.x, spore.y, spore.radius);
      gradient.addColorStop(0, '#FFD700');
      gradient.addColorStop(0.7, '#FFA500');
      gradient.addColorStop(1, '#FF8C00');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.arc(spore.x, spore.y, spore.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(spore.x - 2, spore.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const ctx = this.ctx;

    for (const obstacle of obstacles) {
      ctx.save();

      if (obstacle.hitFlash > 0) {
        ctx.globalAlpha = 0.5 + Math.sin(obstacle.hitFlash * 50) * 0.5;
      }

      switch (obstacle.type) {
        case ObstacleType.POISON_MUSHROOM:
          this.drawPoisonMushroom(obstacle);
          break;
        case ObstacleType.SWELL_MUSHROOM:
          this.drawSwellMushroom(obstacle);
          break;
        case ObstacleType.THORN_WHEEL:
          this.drawThornWheel(obstacle);
          break;
      }

      ctx.restore();
    }
  }

  private drawPoisonMushroom(obstacle: Obstacle): void {
    const ctx = this.ctx;
    const { x, y, radius } = obstacle;

    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(x - radius * 0.3, y - radius * 0.2, radius * 0.6, radius * 0.8);

    ctx.fillStyle = '#E53935';
    ctx.beginPath();
    ctx.ellipse(x, y - radius * 0.3, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - radius * 0.4, y - radius * 0.4, 3.5, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.3, y - radius * 0.5, 3, 0, Math.PI * 2);
    ctx.arc(x, y - radius * 0.1, 2.5, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.5, y - radius * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();

    if (obstacle.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${obstacle.hitFlash * 2})`;
      ctx.beginPath();
      ctx.ellipse(x, y - radius * 0.3, radius, radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSwellMushroom(obstacle: Obstacle): void {
    const ctx = this.ctx;
    const { x, y, radius, scale } = obstacle;
    const r = radius * scale;

    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(x - r * 0.25, y - r * 0.15, r * 0.5, r * 0.7);

    const gradient = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y - r * 0.3, r);
    gradient.addColorStop(0, '#81C784');
    gradient.addColorStop(1, '#388E3C');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.3, r, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, 3 * scale, 0, Math.PI * 2);
    ctx.arc(x + r * 0.25, y - r * 0.45, 2.5 * scale, 0, Math.PI * 2);
    ctx.arc(x + r * 0.1, y - r * 0.1, 2 * scale, 0, Math.PI * 2);
    ctx.fill();

    if (scale > 1.2) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.3, r + 3, r * 0.65 + 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawThornWheel(obstacle: Obstacle): void {
    const ctx = this.ctx;
    const { x, y, radius, angle } = obstacle;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = '#8B6914';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#A0522D';
    const thornCount = 8;
    for (let i = 0; i < thornCount; i++) {
      const a = (i / thornCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(radius - 3, -5);
      ctx.lineTo(radius + 12, 0);
      ctx.lineTo(radius - 3, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * radius * 0.7, Math.sin(a) * radius * 0.7);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawPlayer(player: Player): void {
    if (!player.visible) return;

    const ctx = this.ctx;
    const { x, y, width, height, wingFrame, breathPhase, facing } = player;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.scale(facing, 1);

    const breathScale = 0.95 + fastSin(breathPhase) * 0.05;
    ctx.scale(breathScale, breathScale);

    const wingOffset = wingFrame === 0 ? -5 : 5;
    const wingAlpha = 0.5;

    ctx.fillStyle = `rgba(135, 206, 250, ${wingAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-8, -5 + wingOffset, 14, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8, 5 + wingOffset, 14, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(173, 216, 230, ${wingAlpha})`;
    ctx.beginPath();
    ctx.ellipse(-8, -5 + wingOffset, 10, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8, 5 + wingOffset, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(2, -3, 0, 0, 0, 18);
    bodyGradient.addColorStop(0, 'rgba(135, 206, 250, 0.95)');
    bodyGradient.addColorStop(0.7, 'rgba(100, 149, 237, 0.9)');
    bodyGradient.addColorStop(1, 'rgba(65, 105, 225, 0.85)');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(30, 144, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1E3A5F';
    ctx.beginPath();
    ctx.arc(6, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(6.8, -5.8, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
    ctx.beginPath();
    ctx.arc(9, 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFloatTexts(gameState: GameState): void {
    const ctx = this.ctx;

    for (const ft of gameState.floatTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = 3;
      ctx.font = 'bold 22px "Baloo 2", cursive';
      ctx.textAlign = 'center';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawUI(gameState: GameState): void {
    const ctx = this.ctx;
    const { CANVAS_WIDTH } = GAME_CONFIG;

    for (let i = 0; i < 3; i++) {
      const hx = 25 + i * 35;
      const hy = 30;
      if (i < gameState.lives) {
        this.drawHeart(hx, hy, '#FF3333');
      } else {
        this.drawHeart(hx, hy, '#555555');
      }
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.font = 'bold 22px "Baloo 2", cursive';
    ctx.textAlign = 'right';
    ctx.strokeText(`孢子：${gameState.sporesCollected}/${gameState.totalSpores}`, CANVAS_WIDTH - 20, 35);
    ctx.fillText(`孢子：${gameState.sporesCollected}/${gameState.totalSpores}`, CANVAS_WIDTH - 20, 35);

    ctx.font = 'bold 20px "Baloo 2", cursive';
    ctx.strokeText(`分数：${gameState.score}`, CANVAS_WIDTH - 20, 62);
    ctx.fillText(`分数：${gameState.score}`, CANVAS_WIDTH - 20, 62);
  }

  private drawHeart(x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.2, 1.2);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-10, -5, -10, -15, 0, -8);
    ctx.bezierCurveTo(10, -15, 10, -5, 0, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-4, -8, 2.5, 3.5, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawGameOver(): void {
    const ctx = this.ctx;
    const { CANVAS_WIDTH, CANVAS_HEIGHT } = GAME_CONFIG;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.67)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px "Baloo 2", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px "Baloo 2", cursive';
    ctx.fillText('点击画布或按 空格键 重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  }
}
