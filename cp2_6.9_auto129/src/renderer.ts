import { Player, SmokeParticle } from './player';
import { Track, Obstacle, Coin, CollectParticle, SideObject } from './track';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  public clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public render(
    player: Player,
    track: Track,
    gameOver: boolean,
    _score: number,
    finalScore: number,
    restartAlpha: number,
    fadeInAlpha: number
  ): void {
    this.clear();
    this.drawBackground();
    this.drawMountains();
    this.drawTrack(track);
    this.drawSideObjects(track.getSideObjects());
    this.drawObstacles(track.getActiveObstacles());
    this.drawCoins(track.getActiveCoins());
    this.drawCollectParticles(track.getCollectParticles());
    this.drawSmoke(player.getSmokeParticles());
    this.drawPlayer(player);

    if (fadeInAlpha < 1) {
      this.drawFadeIn(fadeInAlpha);
    }

    if (gameOver) {
      this.drawGameOver(finalScore, restartAlpha);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawMountains(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    this.ctx.fillStyle = '#6C3483';

    const baseY = this.height * 0.45;
    const mountainWidth = 200;
    const startX = -100;

    this.ctx.beginPath();
    this.ctx.moveTo(startX, baseY);

    for (let x = startX; x < this.width + 100; x += mountainWidth) {
      const peakHeight = 80 + Math.sin(x * 0.01) * 40;
      this.ctx.lineTo(x + mountainWidth / 2, baseY - peakHeight);
      this.ctx.lineTo(x + mountainWidth, baseY);
    }

    this.ctx.lineTo(this.width + 100, this.height);
    this.ctx.lineTo(startX, this.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawTrack(track: Track): void {
    const centerX = this.width / 2;
    const trackWidth = track.laneWidth * 3;
    const trackTop = this.height * 0.4;
    const trackBottom = this.height;

    this.ctx.fillStyle = '#7F8C8D';
    this.ctx.fillRect(centerX - trackWidth / 2, trackTop, trackWidth, trackBottom - trackTop);

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - trackWidth / 2, trackTop);
    this.ctx.lineTo(centerX - trackWidth / 2, trackBottom);
    this.ctx.moveTo(centerX + trackWidth / 2, trackTop);
    this.ctx.lineTo(centerX + trackWidth / 2, trackBottom);
    this.ctx.stroke();

    this.drawDashedLine(centerX - track.laneWidth, trackTop, trackBottom, track.getDashOffset());
    this.drawDashedLine(centerX + track.laneWidth, trackTop, trackBottom, track.getDashOffset());
  }

  private drawDashedLine(x: number, top: number, bottom: number, offset: number): void {
    const dashLength = 20;
    const gapLength = 30;
    const totalLength = dashLength + gapLength;

    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 3;

    for (let y = top - (offset % totalLength); y < bottom; y += totalLength) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, Math.min(y + dashLength, bottom));
      this.ctx.stroke();
    }
  }

  private drawSideObjects(objects: SideObject[]): void {
    for (const obj of objects) {
      if (obj.type === 'tree') {
        this.drawTree(obj.x, obj.y);
      } else {
        this.drawLamp(obj.x, obj.y);
      }
    }
  }

  private drawTree(x: number, y: number): void {
    this.ctx.fillStyle = '#5D4037';
    this.ctx.fillRect(x - 3, y, 6, 20);

    this.ctx.fillStyle = '#2E7D32';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 30);
    this.ctx.lineTo(x - 18, y + 5);
    this.ctx.lineTo(x + 18, y + 5);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 18);
    this.ctx.lineTo(x - 14, y + 12);
    this.ctx.lineTo(x + 14, y + 12);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawLamp(x: number, y: number): void {
    this.ctx.fillStyle = '#607D8B';
    this.ctx.fillRect(x - 2, y - 40, 4, 50);

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = '#F1C40F';
    this.ctx.beginPath();
    this.ctx.arc(x, y - 42, 8, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = '#F1C40F';
    this.ctx.fillRect(x - 5, y - 45, 10, 5);
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    for (const obs of obstacles) {
      this.drawObstacle(obs);
    }
  }

  private drawObstacle(obs: Obstacle): void {
    this.ctx.fillStyle = obs.color;
    if (obs.type === 'barrel') {
      this.ctx.fillRect(obs.x - obs.size / 2, obs.y - obs.size / 2, obs.size, obs.size);
      this.ctx.fillStyle = '#5D3A1A';
      this.ctx.fillRect(obs.x - obs.size / 2, obs.y - obs.size / 2 + 8, obs.size, 3);
      this.ctx.fillRect(obs.x - obs.size / 2, obs.y + obs.size / 2 - 11, obs.size, 3);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x, obs.y - obs.size / 2);
      this.ctx.lineTo(obs.x + obs.size / 2, obs.y - obs.size / 6);
      this.ctx.lineTo(obs.x + obs.size / 3, obs.y + obs.size / 2);
      this.ctx.lineTo(obs.x - obs.size / 3, obs.y + obs.size / 2);
      this.ctx.lineTo(obs.x - obs.size / 2, obs.y - obs.size / 6);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.fillStyle = '#A0A0A0';
      this.ctx.fillRect(obs.x - 5, obs.y - 5, 4, 4);
      this.ctx.fillRect(obs.x + 2, obs.y + 2, 3, 3);
    }
  }

  private drawCoins(coins: Coin[]): void {
    for (const coin of coins) {
      this.drawCoin(coin);
    }
  }

  private drawCoin(coin: Coin): void {
    const flashIntensity = Math.sin(coin.flashPhase * (Math.PI * 2) / 30) * 0.3 + 0.7;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3 * flashIntensity;
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(coin.x, coin.y, coin.diameter / 2 + 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(coin.x, coin.y, coin.diameter / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFF59D';
    this.ctx.save();
    this.ctx.translate(coin.x, coin.y);
    this.ctx.rotate(Math.PI / 4);
    this.ctx.fillRect(-2, -coin.diameter / 2 + 2, 4, coin.diameter - 4);
    this.ctx.restore();
  }

  private drawCollectParticles(particles: CollectParticle[]): void {
    for (const p of particles) {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawSmoke(particles: SmokeParticle[]): void {
    for (const p of particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = '#888888';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawPlayer(player: Player): void {
    const x = player.x;
    const y = player.y;

    this.ctx.fillStyle = '#E74C3C';
    this.ctx.fillRect(x - 8, y - 14, 16, 28);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(x - 6, y - 14, 4, 2);
    this.ctx.fillRect(x + 2, y - 14, 4, 2);

    this.ctx.fillStyle = '#1A237E';
    this.ctx.fillRect(x - 3, y - 10, 6, 3);
    this.ctx.fillRect(x - 3, y - 4, 6, 3);

    this.ctx.fillStyle = '#F1C40F';
    this.ctx.fillRect(x - 8, y - 6, 2, 8);
    this.ctx.fillRect(x + 6, y - 6, 2, 8);

    this.ctx.fillStyle = '#C62828';
    this.ctx.fillRect(x - 5, y + 10, 3, 2);
    this.ctx.fillRect(x + 2, y + 10, 3, 2);

    this.ctx.fillStyle = '#212121';
    this.ctx.fillRect(x - 10, y - 12, 2, 8);
    this.ctx.fillRect(x + 8, y - 12, 2, 8);
    this.ctx.fillRect(x - 10, y + 4, 2, 8);
    this.ctx.fillRect(x + 8, y + 4, 2, 8);
  }

  private drawGameOver(finalScore: number, restartAlpha: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = "32px 'Courier New', monospace";
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 40);

    this.ctx.font = "32px 'Courier New', monospace";
    this.ctx.fillText(`最终得分: ${finalScore}`, this.width / 2, this.height / 2 + 10);

    this.ctx.globalAlpha = restartAlpha;
    this.ctx.fillStyle = '#3498DB';
    this.ctx.font = "16px 'Courier New', monospace";
    this.ctx.fillText('按空格键重新开始', this.width / 2, this.height / 2 + 60);
    this.ctx.restore();
  }

  private drawFadeIn(alpha: number): void {
    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
