interface InkFlower {
  x: number;
  y: number;
  angle: number;
  size: number;
  age: number;
  lifespan: number;
  alive: boolean;
  petalOffsets: number[];
  petalRotations: number[];
  petalWidths: number[];
  inkAlpha: number;
}

export class FlowerManager {
  private flowers: InkFlower[] = [];
  private density: number = 3;
  private lastSpawnTime: number = 0;
  private spawnAccumulator: number = 0;

  setDensity(d: number) {
    this.density = d;
  }

  addFlower(cx: number, cy: number, recordRadius: number) {
    const angle = Math.random() * Math.PI * 2;
    const dist = recordRadius * (0.55 + Math.random() * 0.25);
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const size = 15 + Math.random() * 20;

    const petalOffsets: number[] = [];
    const petalRotations: number[] = [];
    const petalWidths: number[] = [];
    for (let i = 0; i < 6; i++) {
      petalOffsets.push((Math.random() - 0.5) * 4);
      petalRotations.push((Math.random() - 0.5) * 0.2);
      petalWidths.push(0.8 + Math.random() * 0.4);
    }

    this.flowers.push({
      x, y,
      angle: Math.random() * Math.PI * 2,
      size,
      age: 0,
      lifespan: 1500,
      alive: true,
      petalOffsets,
      petalRotations,
      petalWidths,
      inkAlpha: 0.6 + Math.random() * 0.3
    });

    if (this.flowers.length > 50) {
      const oldest = this.flowers.shift();
      if (oldest) oldest.alive = false;
    }
  }

  update(dt: number) {
    for (let i = this.flowers.length - 1; i >= 0; i--) {
      const f = this.flowers[i];
      f.age += dt;
      if (f.age >= f.lifespan) {
        f.alive = false;
        this.flowers.splice(i, 1);
      }
    }
  }

  trySpawn(dt: number, cx: number, cy: number, recordRadius: number): number {
    if (this.density <= 0) return 0;

    this.spawnAccumulator += dt;
    const interval = 10000 / this.density;

    let spawned = 0;
    while (this.spawnAccumulator >= interval) {
      this.spawnAccumulator -= interval;
      this.addFlower(cx, cy, recordRadius);
      spawned++;
    }

    return spawned;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const f of this.flowers) {
      if (!f.alive) continue;
      this.drawFlower(ctx, f);
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D, f: InkFlower) {
    const progress = f.age / f.lifespan;

    let scale: number;
    let alpha: number;

    if (progress < 0.3) {
      const t = progress / 0.3;
      scale = this.easeOutBack(t);
      alpha = t * f.inkAlpha;
    } else if (progress < 0.6) {
      scale = 1;
      alpha = f.inkAlpha;
    } else {
      const t = (progress - 0.6) / 0.4;
      scale = 1 - t * 0.1;
      alpha = f.inkAlpha * (1 - t * t);
    }

    if (alpha < 0.01) return;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    for (let i = 0; i < 6; i++) {
      const petalAngle = (Math.PI * 2 / 6) * i + f.petalRotations[i];
      this.drawPetal(ctx, f, petalAngle, i);
    }

    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(60, 30, 10, ${alpha})`;
    ctx.fill();

    const stamenAlpha = alpha * 0.6;
    for (let i = 0; i < 4; i++) {
      const sa = (Math.PI * 2 / 4) * i + f.angle * 0.5;
      const sd = 4;
      ctx.beginPath();
      ctx.arc(Math.cos(sa) * sd, Math.sin(sa) * sd, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 150, 50, ${stamenAlpha})`;
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPetal(ctx: CanvasRenderingContext2D, f: InkFlower, angle: number, index: number) {
    const len = f.size;
    const widthFactor = f.petalWidths[index];
    const offset = f.petalOffsets[index];

    ctx.save();
    ctx.rotate(angle);

    const cp1x = len * 0.3;
    const cp1y = -len * 0.25 * widthFactor + offset;
    const cp2x = len * 0.7;
    const cp2y = -len * 0.18 * widthFactor + offset;
    const endX = len;
    const endY = offset;

    const cp3x = len * 0.7;
    const cp3y = len * 0.18 * widthFactor + offset;
    const cp4x = len * 0.3;
    const cp4y = len * 0.25 * widthFactor + offset;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, 0, 0);
    ctx.closePath();

    const inkDarkness = 20 + Math.random() * 15;
    ctx.fillStyle = `rgba(${inkDarkness}, ${inkDarkness * 0.6}, ${inkDarkness * 0.4}, 0.85)`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, 0, 0);
    ctx.closePath();
    ctx.strokeStyle = `rgba(10, 5, 2, 0.5)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len * 0.85, offset * 0.5);
    ctx.strokeStyle = `rgba(80, 50, 30, 0.3)`;
    ctx.lineWidth = 0.3;
    ctx.stroke();

    ctx.restore();
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  getActiveCount(): number {
    return this.flowers.filter(f => f.alive).length;
  }

  reset() {
    this.flowers = [];
    this.spawnAccumulator = 0;
  }
}
