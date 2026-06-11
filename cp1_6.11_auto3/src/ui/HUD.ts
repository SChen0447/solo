import { TileMap } from '../TileMap';
import { Player } from '../Player';

export class HUD {
  private tileMap: TileMap;
  private player: Player;
  private canvasWidth: number;
  private canvasHeight: number;
  private miniMapSize: number;
  private miniMapTileSize: number;
  private gemIconSize: number;
  private heartIconSize: number;

  constructor(tileMap: TileMap, player: Player, canvasWidth: number, canvasHeight: number) {
    this.tileMap = tileMap;
    this.player = player;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.miniMapSize = 150;
    this.miniMapTileSize = this.miniMapSize / this.tileMap.getWidth();
    this.gemIconSize = 20;
    this.heartIconSize = 20;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderGemCounter(ctx);
    this.renderLives(ctx);
    this.renderMiniMap(ctx);
    this.renderControlsHint(ctx);
  }

  private renderGemCounter(ctx: CanvasRenderingContext2D): void {
    const x = this.canvasWidth - 20;
    const y = 20;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText(`GEMS: ${this.player.getGemsCollected()}/${this.tileMap.getTotalGems()}`, x, y + 16);
    ctx.restore();

    this.drawGemIcon(ctx, x - 180, y + 6, this.gemIconSize);
  }

  private drawGemIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.save();
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x + size / 2, y + size);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + size * 0.35, y + size * 0.35, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderLives(ctx: CanvasRenderingContext2D): void {
    const x = 20;
    const y = 20;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.fillText('LIVES:', x, y + 16);
    ctx.restore();

    const lives = this.player.getLives();
    const startX = x + 110;
    for (let i = 0; i < 3; i++) {
      const heartX = startX + i * (this.heartIconSize + 8);
      if (i < lives) {
        this.drawHeart(ctx, heartX, y + 4, this.heartIconSize, '#ff6b6b');
      } else {
        this.drawHeart(ctx, heartX, y + 4, this.heartIconSize, '#4a4a4a');
      }
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = color !== '#4a4a4a' ? 6 : 0;

    const s = size;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s * 0.3);
    ctx.bezierCurveTo(x + s / 2, y + s * 0.1, x, y + s * 0.1, x, y + s * 0.3);
    ctx.bezierCurveTo(x, y + s * 0.55, x + s / 2, y + s * 0.8, x + s / 2, y + s);
    ctx.bezierCurveTo(x + s / 2, y + s * 0.8, x + s, y + s * 0.55, x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y + s * 0.1, x + s / 2, y + s * 0.1, x + s / 2, y + s * 0.3);
    ctx.fill();
    ctx.restore();
  }

  private renderMiniMap(ctx: CanvasRenderingContext2D): void {
    const mapX = this.canvasWidth - this.miniMapSize - 20;
    const mapY = this.canvasHeight - this.miniMapSize - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mapX - 4, mapY - 4, this.miniMapSize + 8, this.miniMapSize + 8);

    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX - 4, mapY - 4, this.miniMapSize + 8, this.miniMapSize + 8);

    const mapWidth = this.tileMap.getWidth();
    const mapHeight = this.tileMap.getHeight();
    const tileW = this.miniMapSize / mapWidth;
    const tileH = this.miniMapSize / mapHeight;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        if (this.tileMap.isExplored(x, y)) {
          const tile = this.tileMap.getTile(x, y);
          let color = 'rgba(80, 80, 100, 0.5)';

          if (tile === 0) {
            color = 'rgba(90, 60, 40, 0.8)';
          } else if (tile === 2) {
            color = 'rgba(0, 255, 255, 0.8)';
          } else if (tile === 4) {
            color = 'rgba(0, 255, 100, 0.8)';
          } else if (tile === 5) {
            color = 'rgba(255, 200, 0, 0.8)';
          }

          ctx.fillStyle = color;
          ctx.fillRect(mapX + x * tileW, mapY + y * tileH, tileW, tileH);
        }
      }
    }

    const playerPos = this.player.getTilePosition();
    ctx.fillStyle = '#4dabf7';
    ctx.shadowColor = '#4dabf7';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(
      mapX + playerPos.x * tileW + tileW / 2,
      mapY + playerPos.y * tileH + tileH / 2,
      Math.max(tileW, tileH) * 0.7,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  private renderControlsHint(ctx: CanvasRenderingContext2D): void {
    const x = 20;
    const y = this.canvasHeight - 30;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('WASD/ARROWS: Move   ESC: Pause', x, y);
    ctx.restore();
  }
}
