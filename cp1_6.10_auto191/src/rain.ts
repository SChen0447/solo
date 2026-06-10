export interface RainParams {
  amount: number;
  speed: number;
  wind: number;
}

interface Raindrop {
  x: number;
  y: number;
  length: number;
  speed: number;
}

export class Rain {
  private drops: Raindrop[] = [];
  private params: RainParams;
  private width: number = 0;
  private height: number = 0;
  minCount: number = 800;
  maxCount: number = 1200;

  constructor(params: RainParams) {
    this.params = { ...params };
  }

  setParams(params: Partial<RainParams>) {
    Object.assign(this.params, params);
  }

  getParams(): RainParams {
    return { ...this.params };
  }

  getCount(): number {
    return this.drops.length;
  }

  setCount(count: number) {
    const target = Math.max(this.minCount, Math.min(this.maxCount, Math.floor(count)));
    while (this.drops.length < target) {
      this.drops.push(this.createDrop(Math.random()));
    }
    while (this.drops.length > target) {
      this.drops.pop();
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private createDrop(initialY: number = Math.random()): Raindrop {
    return {
      x: Math.random() * this.width,
      y: initialY * this.height - this.height,
      length: 10 + Math.random() * 8,
      speed: 0.5 + Math.random() * 0.5
    };
  }

  init(count: number, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.drops = [];
    this.setCount(count);
  }

  update(): { x: number; y: number }[] {
    const impacts: { x: number; y: number }[] = [];
    const groundY = this.height * 0.8;
    const baseSpeed = this.params.speed;
    const wind = this.params.wind;

    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.y += drop.speed * baseSpeed * 2;
      drop.x += wind * 0.3;

      if (drop.y >= groundY) {
        impacts.push({ x: drop.x, y: drop.y });
        drop.x = Math.random() * this.width;
        drop.y = -drop.length;
        drop.speed = 0.5 + Math.random() * 0.5;
      }

      if (drop.x < -20) {
        drop.x = this.width + 20;
      } else if (drop.x > this.width + 20) {
        drop.x = -20;
      }
    }

    return impacts;
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(200,220,255,0.4)';
    ctx.lineWidth = 1;
    const wind = this.params.wind;

    ctx.beginPath();
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      const dx = wind * 0.15;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + dx, drop.y + drop.length);
    }
    ctx.stroke();
  }
}
