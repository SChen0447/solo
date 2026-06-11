import type { Jellyfish } from './jellyfish';

export interface Fish {
  pathProgress: number;
  offsetX: number;
  offsetY: number;
  offsetDriftX: number;
  offsetDriftY: number;
  speed: number;
  size: number;
  x: number;
  y: number;
  angle: number;
  prevX: number;
  prevY: number;
}

interface PathPoint {
  x: number;
  y: number;
}

export class FishSchool {
  fishes: Fish[] = [];
  pathPoints: PathPoint[] = [];
  private pathRegenInterval = 60000;
  private lastPathRegen = 0;
  private canvasW: number;
  private canvasH: number;

  constructor(count: number, canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.regeneratePath(canvasW, canvasH);
    this.setCount(count);
  }

  resize(canvasW: number, canvasH: number): void {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.regeneratePath(canvasW, canvasH);
  }

  regeneratePath(canvasW: number, canvasH: number): void {
    const numPoints = 3 + Math.floor(Math.random() * 3);
    this.pathPoints = [];
    const margin = 80;
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const x = margin + Math.random() * (canvasW - margin * 2);
      const yBase = canvasH * (0.25 + t * 0.5);
      const y = yBase + (Math.random() - 0.5) * canvasH * 0.3;
      this.pathPoints.push({ x, y });
    }
    this.lastPathRegen = performance.now();
  }

  setCount(count: number): void {
    if (count > this.fishes.length) {
      while (this.fishes.length < count) {
        this.fishes.push(this.createFish());
      }
    } else if (count < this.fishes.length) {
      this.fishes.length = count;
    }
  }

  private createFish(): Fish {
    return {
      pathProgress: Math.random(),
      offsetX: (Math.random() - 0.5) * 30,
      offsetY: (Math.random() - 0.5) * 30,
      offsetDriftX: (Math.random() - 0.5) * 0.02,
      offsetDriftY: (Math.random() - 0.5) * 0.02,
      speed: 0.00008 + Math.random() * 0.00004,
      size: 6 + Math.random() * 4,
      x: 0,
      y: 0,
      angle: 0,
      prevX: 0,
      prevY: 0
    };
  }

  getPointOnPath(t: number): PathPoint {
    if (this.pathPoints.length < 2) return { x: 0, y: 0 };
    let points = this.pathPoints.slice();
    while (points.length > 1) {
      const next: PathPoint[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        next.push({
          x: points[i].x * (1 - t) + points[i + 1].x * t,
          y: points[i].y * (1 - t) + points[i + 1].y * t
        });
      }
      points = next;
    }
    return points[0];
  }

  update(dt: number, jellyfishes: Jellyfish[]): void {
    const now = performance.now();
    if (now - this.lastPathRegen > this.pathRegenInterval) {
      this.regeneratePath(this.canvasW, this.canvasH);
    }

    for (const fish of this.fishes) {
      fish.prevX = fish.x;
      fish.prevY = fish.y;

      fish.pathProgress += fish.speed * dt;
      if (fish.pathProgress > 1) fish.pathProgress -= 1;
      if (fish.pathProgress < 0) fish.pathProgress += 1;

      fish.offsetX += fish.offsetDriftX * dt;
      fish.offsetY += fish.offsetDriftY * dt;
      if (Math.abs(fish.offsetX) > 15) fish.offsetDriftX *= -1;
      if (Math.abs(fish.offsetY) > 15) fish.offsetDriftY *= -1;

      const pt = this.getPointOnPath(fish.pathProgress);
      fish.x = pt.x + fish.offsetX;
      fish.y = pt.y + fish.offsetY;

      const dx = fish.x - fish.prevX;
      const dy = fish.y - fish.prevY;
      if (dx * dx + dy * dy > 0.001) {
        fish.angle = Math.atan2(dy, dx);
      }
    }

    this.disperseJellyfish(jellyfishes);
  }

  private disperseJellyfish(jellyfishes: Jellyfish[]): void {
    for (const fish of this.fishes) {
      for (const jf of jellyfishes) {
        const dx = fish.x - jf.x;
        const dy = fish.y - jf.y;
        const distSq = dx * dx + dy * dy;
        const triggerR = jf.radius * 2.5;
        if (distSq < triggerR * triggerR && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const pushForce = (1 - dist / triggerR) * 2.5;
          jf.x -= nx * pushForce;
          jf.y -= ny * pushForce;
          jf.recoveryTime = 800;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const fish of this.fishes) {
      ctx.save();
      ctx.translate(fish.x, fish.y);
      ctx.rotate(fish.angle);

      const s = fish.size;
      const grad = ctx.createLinearGradient(-s, 0, s, 0);
      grad.addColorStop(0, 'rgba(180, 190, 200, 0.85)');
      grad.addColorStop(0.5, 'rgba(230, 235, 240, 0.95)');
      grad.addColorStop(1, 'rgba(150, 160, 170, 0.75)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.7, -s * 0.45);
      ctx.lineTo(-s * 0.4, 0);
      ctx.lineTo(-s * 0.7, s * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(s * 0.3, -s * 0.1, s * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();
  }
}
