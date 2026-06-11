export interface ParticleOptions {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  size: number;
  lifetime: number;
  vx?: number;
  vy?: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  size: number;
  lifetime: number;
  age: number;
  alpha: number;
  active: boolean;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.vx = options.vx ?? 0;
    this.vy = options.vy ?? 0;
    this.r = options.r;
    this.g = options.g;
    this.b = options.b;
    this.size = options.size;
    this.lifetime = options.lifetime;
    this.age = 0;
    this.alpha = 1;
    this.active = true;
  }

  update(
    deltaTime: number,
    starWind: number,
    gravity: number,
    centerX: number,
    centerY: number,
    mouseX: number,
    mouseY: number
  ): void {
    if (!this.active) return;

    this.age += deltaTime;

    if (this.age >= this.lifetime) {
      this.alpha = Math.max(0, 1 - (this.age - this.lifetime) / 0.5);
      if (this.alpha <= 0) {
        this.active = false;
        return;
      }
    }

    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    if (distFromCenter > 0) {
      const windForce = starWind * 0.1;
      this.vx += (dx / distFromCenter) * windForce * deltaTime;
      this.vy += (dy / distFromCenter) * windForce * deltaTime;
    }

    if (gravity > 0) {
      const gdx = mouseX - this.x;
      const gdy = mouseY - this.y;
      const distFromMouse = Math.sqrt(gdx * gdx + gdy * gdy);

      if (distFromMouse > 1) {
        const gravityForce = gravity * 0.05;
        this.vx += (gdx / distFromMouse) * gravityForce * deltaTime;
        this.vy += (gdy / distFromMouse) * gravityForce * deltaTime;
      }

      const noiseMagnitude = gravity * 0.2;
      this.vx += (Math.random() - 0.5) * noiseMagnitude * deltaTime;
      this.vy += (Math.random() - 0.5) * noiseMagnitude * deltaTime;
    }

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    this.vx *= 0.99;
    this.vy *= 0.99;
  }
}

export const gaussianRandom = (): number => {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const lerpColor = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  t: number
): { r: number; g: number; b: number } => {
  return {
    r: Math.round(r1 + (r2 - r1) * t),
    g: Math.round(g1 + (g2 - g1) * t),
    b: Math.round(b1 + (b2 - b1) * t),
  };
};
