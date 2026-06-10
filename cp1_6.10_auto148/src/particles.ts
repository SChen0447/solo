export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseColor: RGB;
  size: number;
  initialSize: number;
}

export interface LightSource {
  x: number;
  y: number;
  colorTemp: number;
  brightness: number;
}

const FOOTPRINT_COLORS: RGB[] = [
  { r: 255, g: 107, b: 107 },
  { r: 254, g: 202, b: 87 },
  { r: 72, g: 219, b: 251 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function getGradientColor(position: number): RGB {
  const clampedPos = Math.max(0, Math.min(1, position));
  const scaledPos = clampedPos * (FOOTPRINT_COLORS.length - 1);
  const index = Math.floor(scaledPos);
  const t = scaledPos - index;

  if (index >= FOOTPRINT_COLORS.length - 1) {
    return FOOTPRINT_COLORS[FOOTPRINT_COLORS.length - 1];
  }

  return lerpRGB(FOOTPRINT_COLORS[index], FOOTPRINT_COLORS[index + 1], t);
}

function colorTempToRGB(temp: number): RGB {
  if (temp <= 2000) return { r: 255, g: 140, b: 0 };
  if (temp >= 8000) return { r: 102, g: 136, b: 255 };

  const stops: Array<{ temp: number; color: RGB }> = [
    { temp: 2000, color: { r: 255, g: 140, b: 0 } },
    { temp: 4000, color: { r: 255, g: 221, b: 102 } },
    { temp: 5500, color: { r: 255, g: 255, b: 255 } },
    { temp: 7000, color: { r: 170, g: 204, b: 255 } },
    { temp: 8000, color: { r: 102, g: 136, b: 255 } },
  ];

  for (let i = 0; i < stops.length - 1; i++) {
    const current = stops[i];
    const next = stops[i + 1];
    if (temp >= current.temp && temp <= next.temp) {
      const t = (temp - current.temp) / (next.temp - current.temp);
      return lerpRGB(current.color, next.color, t);
    }
  }

  return { r: 255, g: 255, b: 255 };
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;
  public wind: number = 0;
  private lastEmitTime: number = 0;
  private emitCooldown: number = 200;

  public get count(): number {
    return this.particles.length;
  }

  public get capacity(): number {
    return this.maxParticles;
  }

  public emit(x: number, y: number, xProgress: number): void {
    const now = performance.now();
    if (now - this.lastEmitTime < this.emitCooldown) return;
    this.lastEmitTime = now;

    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }

    const maxLife = 3000;
    const initialSize = 8;
    const baseColor = getGradientColor(xProgress);

    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 2,
      life: maxLife,
      maxLife,
      baseColor,
      size: initialSize,
      initialSize,
    });
  }

  public update(deltaTime: number): void {
    const alive: Particle[] = [];

    for (const p of this.particles) {
      p.life -= deltaTime;
      if (p.life <= 0) continue;

      p.x += p.vx + this.wind;
      p.y += p.vy;

      const lifeRatio = p.life / p.maxLife;
      p.size = p.initialSize * lifeRatio;

      alive.push(p);
    }

    this.particles = alive;
  }

  public render(ctx: CanvasRenderingContext2D, light: LightSource): void {
    const lightColor = colorTempToRGB(light.colorTemp);

    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio <= 0) continue;

      const finalR = Math.min(255, (p.baseColor.r * lightColor.r) / 255);
      const finalG = Math.min(255, (p.baseColor.g * lightColor.g) / 255);
      const finalB = Math.min(255, (p.baseColor.b * lightColor.b) / 255);
      const finalAlpha = 0.8 * lifeRatio * light.brightness;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${finalAlpha})`);
      gradient.addColorStop(0.5, `rgba(${finalR}, ${finalG}, ${finalB}, ${finalAlpha * 0.7})`);
      gradient.addColorStop(1, `rgba(${finalR}, ${finalG}, ${finalB}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public clear(): void {
    this.particles = [];
  }

  public throttleIfNeeded(fps: number): boolean {
    if (fps < 50 && this.maxParticles > 50) {
      this.maxParticles = Math.floor(this.maxParticles / 2);
      const keepCount = Math.floor(this.particles.length / 2);
      this.particles = this.particles.slice(this.particles.length - keepCount);
      return true;
    }
    return false;
  }
}

export { colorTempToRGB };
