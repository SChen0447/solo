import p5 from 'p5';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  radius: number;
  age: number;
  maxAge: number;
}

export interface HaloEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: p5.Color;
  alpha: number;
  duration: number;
  age: number;
  active: boolean;
}

export interface ColorTransition {
  fromR: number;
  fromG: number;
  fromB: number;
  toR: number;
  toG: number;
  toB: number;
  progress: number;
  duration: number;
  active: boolean;
}

export class AnimationManager {
  private p: p5;
  private trails: Map<number, TrailPoint[]> = new Map();
  private halos: HaloEffect[] = [];
  private colorTransition: ColorTransition;

  constructor(p: p5) {
    this.p = p;
    this.colorTransition = {
      fromR: 230, fromG: 230, fromB: 255,
      toR: 230, toG: 230, toB: 255,
      progress: 1,
      duration: 180,
      active: false
    };
  }

  addTrailPoint(fragmentId: number, x: number, y: number, color: p5.Color): void {
    if (!this.trails.has(fragmentId)) {
      this.trails.set(fragmentId, []);
    }
    const trail = this.trails.get(fragmentId)!;
    const r = this.p.red(color);
    const g = this.p.green(color);
    const b = this.p.blue(color);
    trail.push({
      x, y,
      alpha: 0.6,
      radius: this.p.random(3, 6),
      age: 0,
      maxAge: 30
    });
    if (trail.length > 50) {
      trail.shift();
    }
  }

  updateTrails(): void {
    this.trails.forEach((trail) => {
      for (let i = trail.length - 1; i >= 0; i--) {
        const pt = trail[i];
        pt.age++;
        pt.alpha = 0.6 * (1 - pt.age / pt.maxAge);
        if (pt.age >= pt.maxAge) {
          trail.splice(i, 1);
        }
      }
    });
  }

  drawTrails(fragmentId: number, color: p5.Color): void {
    const trail = this.trails.get(fragmentId);
    if (!trail) return;
    const r = this.p.red(color);
    const g = this.p.green(color);
    const b = this.p.blue(color);
    this.p.noStroke();
    for (const pt of trail) {
      const a = this.p.constrain(pt.alpha, 0, 1);
      this.p.fill(r, g, b, a * 255);
      this.p.circle(pt.x, pt.y, pt.radius * 2);
    }
  }

  clearTrail(fragmentId: number): void {
    this.trails.delete(fragmentId);
  }

  createHalo(x: number, y: number, color: p5.Color, maxRadius: number = 120): void {
    this.halos.push({
      x, y,
      radius: 0,
      maxRadius,
      color: this.p.color(this.p.red(color), this.p.green(color), this.p.blue(color)),
      alpha: 0.8,
      duration: 36,
      age: 0,
      active: true
    });
  }

  updateHalos(): void {
    for (let i = this.halos.length - 1; i >= 0; i--) {
      const halo = this.halos[i];
      if (!halo.active) continue;
      halo.age++;
      const t = halo.age / halo.duration;
      halo.radius = halo.maxRadius * this.easeOutCubic(t);
      halo.alpha = 0.8 * (1 - t);
      if (halo.age >= halo.duration) {
        halo.active = false;
        this.halos.splice(i, 1);
      }
    }
  }

  drawHalos(): void {
    for (const halo of this.halos) {
      if (!halo.active) continue;
      const r = this.p.red(halo.color);
      const g = this.p.green(halo.color);
      const b = this.p.blue(halo.color);
      for (let i = 3; i >= 0; i--) {
        const rad = halo.radius * (1 - i * 0.15);
        const a = halo.alpha * (1 - i * 0.2);
        this.p.noStroke();
        this.p.fill(r, g, b, a * 80);
        this.p.circle(halo.x, halo.y, rad * 2);
      }
      this.p.noFill();
      this.p.stroke(r, g, b, halo.alpha * 255);
      this.p.strokeWeight(3);
      this.p.circle(halo.x, halo.y, halo.radius * 2);
    }
  }

  startColorTransition(targetColor: p5.Color): void {
    const current = this.getCurrentParticleColor();
    this.colorTransition = {
      fromR: current.r,
      fromG: current.g,
      fromB: current.b,
      toR: this.p.red(targetColor),
      toG: this.p.green(targetColor),
      toB: this.p.blue(targetColor),
      progress: 0,
      duration: 180,
      active: true
    };
  }

  updateColorTransition(): void {
    if (this.colorTransition.active && this.colorTransition.progress < 1) {
      this.colorTransition.progress += 1 / this.colorTransition.duration;
      if (this.colorTransition.progress >= 1) {
        this.colorTransition.progress = 1;
        this.colorTransition.active = false;
      }
    }
  }

  getCurrentParticleColor(): { r: number; g: number; b: number } {
    const t = this.easeInOutCubic(this.colorTransition.progress);
    return {
      r: this.p.lerp(this.colorTransition.fromR, this.colorTransition.toR, t),
      g: this.p.lerp(this.colorTransition.fromG, this.colorTransition.toG, t),
      b: this.p.lerp(this.colorTransition.fromB, this.colorTransition.toB, t)
    };
  }

  getPulseAlpha(time: number, base: number = 0.1): number {
    return base + Math.sin(time * 0.002 * Math.PI * 2) * 0.05;
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }

  lerpColor(from: p5.Color, to: p5.Color, t: number): p5.Color {
    return this.p.color(
      this.p.lerp(this.p.red(from), this.p.red(to), t),
      this.p.lerp(this.p.green(from), this.p.green(to), t),
      this.p.lerp(this.p.blue(from), this.p.blue(to), t),
      this.p.lerp(this.p.alpha(from), this.p.alpha(to), t)
    );
  }
}
