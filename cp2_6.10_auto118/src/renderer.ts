import type { Obstacle, Platform } from './generator';
import { GROUND_Y, PLAYER_SIZE } from './generator';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

export class LevelRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  render(
    scrollX: number,
    obstacles: Obstacle[],
    platforms: Platform[],
    playerX: number,
    playerY: number
  ): void {
    this.clear();
    this.drawBackground();
    this.drawPlatforms(scrollX, platforms);
    this.drawObstacles(scrollX, obstacles);
    this.drawCollisionBoxes(scrollX, obstacles, platforms);
    this.drawPlayer(playerX, playerY);
    this.drawPredictionLine(playerX, playerY, scrollX, platforms);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8C8');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(650, 80, 35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(680, 70, 28, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(620, 90, 22, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(150, 60, 25, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(175, 55, 20, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawObstacles(scrollX: number, obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      const screenX = obs.x - scrollX;
      if (screenX + obs.width < 0 || screenX > CANVAS_WIDTH) continue;

      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetX = 3;
      this.ctx.shadowOffsetY = 3;
      this.ctx.fillStyle = '#E74C3C';
      this.ctx.fillRect(screenX, obs.y, obs.width, obs.height);
      this.ctx.restore();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      this.ctx.fillRect(screenX, obs.y, obs.width, 4);
    }
  }

  private drawPlatforms(scrollX: number, platforms: Platform[]): void {
    for (const plat of platforms) {
      const screenX = plat.x - scrollX;
      if (screenX + plat.width < 0 || screenX > CANVAS_WIDTH) continue;

      const gradient = this.ctx.createLinearGradient(0, plat.y, 0, plat.y + plat.thickness);
      gradient.addColorStop(0, '#58D68D');
      gradient.addColorStop(1, '#2ECC71');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(screenX, plat.y, plat.width, plat.thickness);

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fillRect(screenX, plat.y, plat.width, 3);

      this.ctx.fillStyle = '#1E8449';
      this.ctx.fillRect(screenX, plat.y + plat.thickness - 3, plat.width, 3);
    }
  }

  private drawPlayer(x: number, y: number): void {
    this.ctx.save();
    this.ctx.shadowColor = 'rgba(155, 89, 182, 0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#9B59B6';
    this.ctx.fillRect(x, y, PLAYER_SIZE, PLAYER_SIZE);
    this.ctx.restore();

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x + 7, y + 8, 5, 5);
    this.ctx.fillRect(x + 18, y + 8, 5, 5);
    this.ctx.fillStyle = '#2C3E50';
    this.ctx.fillRect(x + 9, y + 10, 2, 2);
    this.ctx.fillRect(x + 20, y + 10, 2, 2);
  }

  private drawCollisionBoxes(scrollX: number, obstacles: Obstacle[], platforms: Platform[]): void {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 3]);

    for (const obs of obstacles) {
      const screenX = obs.x - scrollX;
      if (screenX + obs.width < 0 || screenX > CANVAS_WIDTH) continue;
      this.ctx.strokeRect(screenX, obs.y, obs.width, obs.height);
    }

    for (const plat of platforms) {
      const screenX = plat.x - scrollX;
      if (screenX + plat.width < 0 || screenX > CANVAS_WIDTH) continue;
      this.ctx.strokeRect(screenX, plat.y, plat.width, plat.thickness);
    }

    this.ctx.restore();
  }

  private drawPredictionLine(
    playerX: number,
    playerY: number,
    scrollX: number,
    platforms: Platform[]
  ): void {
    const playerBottom = playerY + PLAYER_SIZE;
    const playerCenterX = playerX + PLAYER_SIZE / 2;
    let nearestPlatformTop = GROUND_Y;
    let foundPlatform = false;

    for (const plat of platforms) {
      const screenX = plat.x - scrollX;
      if (screenX + plat.width < 0 || screenX > CANVAS_WIDTH) continue;
      if (playerCenterX >= screenX && playerCenterX <= screenX + plat.width) {
        if (plat.y >= playerBottom && plat.y < nearestPlatformTop) {
          nearestPlatformTop = plat.y;
          foundPlatform = true;
        }
      }
    }

    if (!foundPlatform) {
      nearestPlatformTop = GROUND_Y;
    }

    this.ctx.save();
    this.ctx.strokeStyle = '#F1C40F';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.beginPath();
    this.ctx.moveTo(playerCenterX, playerBottom);
    this.ctx.lineTo(playerCenterX, nearestPlatformTop);
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.fillStyle = '#F1C40F';
    this.ctx.beginPath();
    this.ctx.arc(playerCenterX, nearestPlatformTop, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
