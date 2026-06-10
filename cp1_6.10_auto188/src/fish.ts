export interface FishConfig {
  canvasWidth: number;
  canvasHeight: number;
  seaLevelY: number;
}

export class Fish {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
  caught: boolean;
  caughtOffsetX: number;
  caughtOffsetY: number;
  flashTimer: number;
  size: number;

  private static readonly COLORS = [
    '#ffa500', '#ff8c00', '#ff7f50', '#ff6347', '#ff4500'
  ];

  constructor(config: FishConfig) {
    this.x = Math.random() * config.canvasWidth;
    this.y = config.seaLevelY + 50 + Math.random() * (config.canvasHeight - config.seaLevelY - 80);
    this.color = Fish.COLORS[Math.floor(Math.random() * Fish.COLORS.length)];
    this.vx = (Math.random() - 0.5) * 0.6;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.caught = false;
    this.caughtOffsetX = 0;
    this.caughtOffsetY = 0;
    this.flashTimer = 0;
    this.size = 2;
  }

  update(config: FishConfig, boatX: number, boatY: number): void {
    if (this.caught) {
      this.flashTimer += 1 / 60;
      this.x = boatX + this.caughtOffsetX;
      this.y = boatY - 8 + this.caughtOffsetY;
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (Math.random() < 0.02) {
      this.vx = (Math.random() - 0.5) * 0.6;
      this.vy = (Math.random() - 0.5) * 0.3;
    }

    const minY = config.seaLevelY + 20;
    const maxY = config.canvasHeight - 20;

    if (this.x < 0) this.x = config.canvasWidth;
    if (this.x > config.canvasWidth) this.x = 0;
    if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy); }
    if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }
  }

  checkCaught(netLeft: number, netRight: number, netTop: number, netBottom: number): boolean {
    if (this.caught) return false;
    if (this.x >= netLeft && this.x <= netRight &&
        this.y >= netTop && this.y <= netBottom) {
      this.caught = true;
      this.caughtOffsetX = (Math.random() - 0.5) * 20;
      this.caughtOffsetY = -Math.random() * 15;
      return true;
    }
    return false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.caught && Math.floor(this.flashTimer * 4) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
    }
    ctx.fillRect(Math.floor(this.x), Math.floor(this.y), this.size, this.size);
    ctx.fillRect(Math.floor(this.x) - 1, Math.floor(this.y), 1, this.size);
    ctx.fillRect(Math.floor(this.x) + this.size, Math.floor(this.y), 1, this.size);
  }
}

export class FishManager {
  fishes: Fish[] = [];
  private maxFishes = 100;

  spawnFishes(config: FishConfig, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.fishes.length < this.maxFishes) {
        this.fishes.push(new Fish(config));
      }
    }
  }

  update(config: FishConfig, boatX: number, boatY: number,
         netLeft: number, netRight: number, netTop: number, netBottom: number): number {
    let caughtCount = 0;
    for (const fish of this.fishes) {
      fish.update(config, boatX, boatY);
      if (!fish.caught && fish.checkCaught(netLeft, netRight, netTop, netBottom)) {
        caughtCount++;
      }
    }

    if (this.fishes.filter(f => !f.caught).length < 30) {
      this.spawnFishes(config, 5);
    }

    if (this.fishes.length > 1000) {
      this.fishes = this.fishes.slice(-1000);
    }

    return caughtCount;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const fish of this.fishes) {
      fish.draw(ctx);
    }
  }

  cullFarFishes(centerX: number, centerY: number, maxDistance: number): void {
    this.fishes = this.fishes.filter(fish => {
      if (fish.caught) return true;
      const dx = fish.x - centerX;
      const dy = fish.y - centerY;
      return dx * dx + dy * dy < maxDistance * maxDistance;
    });
  }
}
