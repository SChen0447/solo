const MAX_RIPPLES = 200;

interface Ripple {
  radius: number;
  maxRadius: number;
  width: number;
  opacity: number;
  age: number;
  lifespan: number;
  alive: boolean;
  hue: number;
}

function lerpColor(t: number): string {
  const r = Math.round(127 + t * 93);
  const g = Math.round(255 - t * 234);
  const b = Math.round(212 - t * 194);
  return `rgb(${r}, ${g}, ${b})`;
}

export class RippleManager {
  private ripples: Ripple[] = [];
  private pool: Ripple[] = [];
  private speedMultiplier: number = 1;

  setSpeedMultiplier(mult: number) {
    this.speedMultiplier = mult;
  }

  addRipple(recordRadius: number) {
    let ripple: Ripple;
    if (this.pool.length > 0) {
      ripple = this.pool.pop()!;
    } else if (this.ripples.length >= MAX_RIPPLES) {
      const oldest = this.ripples.shift();
      if (oldest) {
        oldest.alive = false;
        ripple = oldest;
      } else {
        ripple = this.createRipple(recordRadius);
      }
    } else {
      ripple = this.createRipple(recordRadius);
    }

    ripple.radius = 5;
    ripple.maxRadius = recordRadius * 0.95;
    ripple.width = 2;
    ripple.opacity = 0.7;
    ripple.age = 0;
    ripple.lifespan = 2500 / this.speedMultiplier;
    ripple.alive = true;
    ripple.hue = Math.random() * 0.1;

    this.ripples.push(ripple);
  }

  private createRipple(recordRadius: number): Ripple {
    return {
      radius: 5,
      maxRadius: recordRadius * 0.95,
      width: 2,
      opacity: 0.7,
      age: 0,
      lifespan: 2500 / this.speedMultiplier,
      alive: true,
      hue: 0
    };
  }

  update(dt: number) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      if (!r.alive) {
        this.ripples.splice(i, 1);
        continue;
      }

      r.age += dt * this.speedMultiplier;
      const progress = r.age / r.lifespan;

      if (progress >= 1) {
        r.alive = false;
        this.pool.push(r);
        this.ripples.splice(i, 1);
        continue;
      }

      r.radius = 5 + (r.maxRadius - 5) * this.easeOutCubic(progress);
      r.width = 2 + 10 * Math.sin(progress * Math.PI);
      r.opacity = 0.7 * (1 - progress) * (1 - progress);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    for (const r of this.ripples) {
      if (!r.alive || r.opacity < 0.01) continue;

      const progress = r.age / r.lifespan;
      const colorT = progress;
      const color = lerpColor(colorT);

      ctx.beginPath();
      ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = r.opacity;
      ctx.lineWidth = r.width;
      ctx.stroke();

      if (r.opacity > 0.1) {
        ctx.beginPath();
        ctx.arc(cx, cy, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = r.opacity * 0.3;
        ctx.lineWidth = r.width + 4;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  getActiveCount(): number {
    return this.ripples.filter(r => r.alive).length;
  }

  reset() {
    for (const r of this.ripples) {
      r.alive = false;
      this.pool.push(r);
    }
    this.ripples = [];
  }
}
