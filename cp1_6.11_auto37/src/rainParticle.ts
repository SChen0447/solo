interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
  swayOffset: number;
  swaySpeed: number;
  swayAmplitude: number;
}

export class RainParticleSystem {
  private drops: RainDrop[] = [];
  private maxDrops: number = 300;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  init(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.drops = [];
    for (let i = 0; i < this.maxDrops; i++) {
      this.drops.push(this.createDrop());
    }
  }

  private createDrop(): RainDrop {
    return {
      x: Math.random() * this.canvasWidth,
      y: Math.random() * this.canvasHeight,
      speed: 2 + Math.random() * 4,
      length: 10 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.3,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.5 + Math.random() * 1.5,
      swayAmplitude: 0.3 + Math.random() * 0.7,
    };
  }

  update(deltaTime: number, time: number): void {
    const dt = deltaTime / 1000;
    for (const drop of this.drops) {
      drop.y += drop.speed * dt * 60;
      drop.x += Math.sin(time * drop.swaySpeed + drop.swayOffset) * drop.swayAmplitude * dt * 60;
      if (drop.y > this.canvasHeight + drop.length) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.canvasWidth;
      }
      if (drop.x < 0) drop.x = this.canvasWidth;
      if (drop.x > this.canvasWidth) drop.x = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const drop of this.drops) {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + 0.5, drop.y + drop.length);
      ctx.strokeStyle = `rgba(150, 180, 255, ${drop.opacity})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
