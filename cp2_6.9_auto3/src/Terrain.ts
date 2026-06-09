export interface TerrainSegment {
  x: number;
  width: number;
  color: HSLColor;
  targetColor: HSLColor;
  height: number;
}

export interface Coin {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  collectAnimation: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export class Terrain {
  public segments: TerrainSegment[] = [];
  public coins: Coin[] = [];
  public scrollSpeed: number = 3;
  public baseScrollSpeed: number = 3;
  public speedMultiplier: number = 1.0;
  public segmentWidth: number = 200;
  public groundY: number = 0;
  public baseHue: number = 0;
  public saturationBoost: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private lastCoinSpawn: number = 0;
  private coinSpawnInterval: number = 5000;
  private hueOffset: number = 0;

  private readonly neonHues: number[] = [120, 30, 330, 200, 280, 160];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
    this.segmentWidth = Math.max(160, canvasWidth / 6);
    this.baseScrollSpeed = Math.max(3, canvasWidth / 320);
    this.scrollSpeed = this.baseScrollSpeed;
    this.initSegments();
    this.spawnCoins(Date.now());
  }

  private initSegments(): void {
    this.segments = [];
    const totalSegments = Math.ceil(this.canvasWidth / this.segmentWidth) + 4;
    let hueIndex = 0;

    for (let i = 0; i < totalSegments; i++) {
      const hue = this.neonHues[hueIndex % this.neonHues.length];
      const color: HSLColor = { h: hue, s: 80, l: 55 };
      this.segments.push({
        x: i * this.segmentWidth,
        width: this.segmentWidth,
        color: { ...color },
        targetColor: { ...color },
        height: this.groundY
      });
      hueIndex++;
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const oldGroundY = this.groundY;
    const oldSegmentWidth = this.segmentWidth;
    const oldCanvasWidth = this.canvasWidth;

    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
    this.segmentWidth = Math.max(160, canvasWidth / 6);
    this.baseScrollSpeed = Math.max(3, canvasWidth / 320);
    this.scrollSpeed = this.baseScrollSpeed * this.speedMultiplier;

    const scaleY = this.groundY / oldGroundY;
    const scaleX = this.segmentWidth / oldSegmentWidth;

    this.segments.forEach(seg => {
      seg.x = seg.x * scaleX * (canvasWidth / oldCanvasWidth);
      seg.width = this.segmentWidth;
      seg.height = this.groundY;
    });

    this.coins.forEach(coin => {
      coin.y = coin.y * scaleY;
      coin.x = coin.x * scaleX * (canvasWidth / oldCanvasWidth);
      coin.radius = Math.max(10, canvasWidth / 100);
    });
  }

  update(deltaTime: number, currentTime: number): void {
    const effectiveSpeed = this.scrollSpeed * this.speedMultiplier * (deltaTime / 16.67);

    for (const seg of this.segments) {
      seg.x -= effectiveSpeed;

      const colorSpeed = 0.08;
      seg.color.h += (seg.targetColor.h - seg.color.h) * colorSpeed;
      seg.color.s += (seg.targetColor.s - seg.color.s) * colorSpeed;
      seg.color.l += (seg.targetColor.l - seg.color.l) * colorSpeed;
    }

    while (this.segments.length > 0 && this.segments[0].x + this.segments[0].width < -50) {
      this.segments.shift();
    }

    while (this.segments.length < Math.ceil(this.canvasWidth / this.segmentWidth) + 4) {
      const lastSeg = this.segments[this.segments.length - 1];
      const lastHue = lastSeg ? lastSeg.targetColor.h : this.neonHues[0];
      const nextHueIndex = (this.neonHues.indexOf(Math.round(lastHue)) + 1) % this.neonHues.length;
      const nextHue = this.neonHues[nextHueIndex];
      const adjustedHue = (nextHue + this.hueOffset) % 360;

      this.segments.push({
        x: (lastSeg ? lastSeg.x + lastSeg.width : 0),
        width: this.segmentWidth,
        color: { h: adjustedHue, s: 80 + this.saturationBoost, l: 55 },
        targetColor: { h: adjustedHue, s: 80 + this.saturationBoost, l: 55 },
        height: this.groundY
      });
    }

    for (const coin of this.coins) {
      coin.x -= effectiveSpeed;
      if (coin.collectAnimation < 1) {
        coin.collectAnimation = Math.min(1, coin.collectAnimation + deltaTime / 300);
      }
    }

    this.coins = this.coins.filter(c => c.x > -50 && !(c.collected && c.collectAnimation >= 1));

    if (currentTime - this.lastCoinSpawn > this.coinSpawnInterval) {
      this.spawnCoins(currentTime);
    }
  }

  private spawnCoins(currentTime: number): void {
    this.lastCoinSpawn = currentTime;

    const minX = this.canvasWidth + 100;
    const maxX = this.canvasWidth + this.segmentWidth * 3;
    const minY = this.canvasHeight * 0.3;
    const maxY = this.canvasHeight * 0.7;
    const coinRadius = Math.max(10, this.canvasWidth / 100);

    const batchSize = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < batchSize; i++) {
      const coinX = minX + Math.random() * (maxX - minX);
      const coinY = minY + Math.random() * (maxY - minY);

      const tooClose = this.coins.some(c =>
        Math.abs(c.x - coinX) < coinRadius * 4 && Math.abs(c.y - coinY) < coinRadius * 4
      );

      if (!tooClose) {
        this.coins.push({
          x: coinX,
          y: coinY,
          radius: coinRadius,
          collected: false,
          collectAnimation: 0
        });
      }
    }
  }

  onPlayerJump(): void {
    const playerSegIndex = this.getSegmentIndexAtX(this.canvasWidth * 0.2);

    if (playerSegIndex >= 0 && playerSegIndex < this.segments.length) {
      const currentSeg = this.segments[playerSegIndex];
      const newHue = this.neonHues[Math.floor(Math.random() * this.neonHues.length)];
      currentSeg.targetColor = {
        h: (newHue + this.hueOffset) % 360,
        s: 80 + this.saturationBoost,
        l: 60
      };
    }

    this.hueOffset = (this.hueOffset + 30) % 360;

    for (let i = playerSegIndex + 1; i < this.segments.length; i++) {
      const seg = this.segments[i];
      seg.targetColor = {
        h: (seg.targetColor.h + 30) % 360,
        s: 80 + this.saturationBoost,
        l: seg.targetColor.l
      };
    }
  }

  getSegmentIndexAtX(x: number): number {
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (x >= seg.x && x < seg.x + seg.width) {
        return i;
      }
    }
    return -1;
  }

  getColorAtX(x: number): HSLColor | null {
    const idx = this.getSegmentIndexAtX(x);
    if (idx >= 0) {
      return this.segments[idx].color;
    }
    return null;
  }

  getGroundYAtX(_x: number): number {
    return this.groundY;
  }

  increaseSpeed(percentage: number): void {
    this.speedMultiplier *= (1 + percentage / 100);
    this.scrollSpeed = this.baseScrollSpeed * this.speedMultiplier;
  }

  increaseSaturation(amount: number): void {
    this.saturationBoost = amount;
    for (const seg of this.segments) {
      seg.targetColor.s = Math.min(100, 80 + this.saturationBoost);
    }
  }

  collectCoin(coin: Coin): void {
    coin.collected = true;
    coin.collectAnimation = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const seg of this.segments) {
      const c = seg.color;
      const colorStr = `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
      const colorStrDark = `hsl(${c.h}, ${c.s}%, ${Math.max(20, c.l - 25)}%)`;
      const colorStrGlow = `hsla(${c.h}, ${c.s}%, ${c.l}%, 0.4)`;

      ctx.shadowColor = colorStrGlow;
      ctx.shadowBlur = 25;

      const gradient = ctx.createLinearGradient(0, seg.height - 80, 0, this.canvasHeight);
      gradient.addColorStop(0, colorStr);
      gradient.addColorStop(1, colorStrDark);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(seg.x, seg.height);
      ctx.lineTo(seg.x + seg.width, seg.height);
      ctx.lineTo(seg.x + seg.width, this.canvasHeight);
      ctx.lineTo(seg.x, this.canvasHeight);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = colorStr;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(seg.x, seg.height);
      ctx.lineTo(seg.x + seg.width, seg.height);
      ctx.stroke();
    }

    for (const coin of this.coins) {
      let scale = 1;
      let alpha = 1;

      if (coin.collected) {
        const t = coin.collectAnimation;
        scale = 1 + t * 1.5;
        alpha = 1 - t;
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(coin.x, coin.y);
      ctx.scale(scale, scale);

      const coinGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coin.radius);
      coinGradient.addColorStop(0, '#fff7a0');
      coinGradient.addColorStop(0.5, '#ffd700');
      coinGradient.addColorStop(1, '#cc9900');

      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 20;
      ctx.fillStyle = coinGradient;
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff7a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, coin.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }
}
