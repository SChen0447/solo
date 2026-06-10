export interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  color: { r: number; g: number; b: number };
  targetX: number;
  targetY: number;
  targetZ: number;
  targetSize: number;
  targetOpacity: number;
  targetColor: { r: number; g: number; b: number };
  driftOffsetX: number;
  driftOffsetY: number;
  driftOffsetZ: number;
  lifePhase: number;
}

export type AltitudeLevel = 'low' | 'mid' | 'high';

export interface CloudParams {
  altitude: AltitudeLevel;
  saturation: number;
}

export interface AltitudeConfig {
  yMin: number;
  yMax: number;
  sizeMin: number;
  sizeMax: number;
  opacityMin: number;
  opacityMax: number;
  color: { r: number; g: number; b: number };
  spread: number;
}

const ALTITUDE_CONFIGS: Record<AltitudeLevel, AltitudeConfig> = {
  low: {
    yMin: 0,
    yMax: 5,
    sizeMin: 0.1,
    sizeMax: 0.4,
    opacityMin: 0.2,
    opacityMax: 0.5,
    color: { r: 0.7, g: 0.7, b: 0.75 },
    spread: 6
  },
  mid: {
    yMin: 5,
    yMax: 10,
    sizeMin: 0.3,
    sizeMax: 0.6,
    opacityMin: 0.5,
    opacityMax: 0.8,
    color: { r: 0.95, g: 0.95, b: 1.0 },
    spread: 7
  },
  high: {
    yMin: 10,
    yMax: 15,
    sizeMin: 0.5,
    sizeMax: 0.8,
    opacityMin: 0.6,
    opacityMax: 0.9,
    color: { r: 0.55, g: 0.55, b: 0.65 },
    spread: 8
  }
};

const PARTICLE_COUNT = 2500;
const TRANSITION_DURATION = 1.0;

export class CloudSystem {
  private particles: Particle[] = [];
  private currentAltitude: AltitudeLevel = 'low';
  private currentSaturation: number = 50;
  private transitionProgress: number = 1.0;
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;

  constructor() {
    this.initParticles();
  }

  private initParticles(): void {
    const config = ALTITUDE_CONFIGS[this.currentAltitude];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = this.createParticle(config);
      this.particles.push(particle);
    }
  }

  private createParticle(config: AltitudeConfig): Particle {
    const x = (Math.random() - 0.5) * config.spread;
    const y = config.yMin + Math.random() * (config.yMax - config.yMin);
    const z = (Math.random() - 0.5) * config.spread;
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const baseOpacity = config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin);

    return {
      x,
      y,
      z,
      size,
      opacity: baseOpacity,
      baseOpacity,
      color: { ...config.color },
      targetX: x,
      targetY: y,
      targetZ: z,
      targetSize: size,
      targetOpacity: baseOpacity,
      targetColor: { ...config.color },
      driftOffsetX: 0,
      driftOffsetY: 0,
      driftOffsetZ: 0,
      lifePhase: Math.random()
    };
  }

  private setParticleTargets(config: AltitudeConfig): void {
    for (const p of this.particles) {
      p.targetX = (Math.random() - 0.5) * config.spread;
      p.targetY = config.yMin + Math.random() * (config.yMax - config.yMin);
      p.targetZ = (Math.random() - 0.5) * config.spread;
      p.targetSize = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
      p.baseOpacity = config.opacityMin + Math.random() * (config.opacityMax - config.opacityMin);
      p.targetColor = { ...config.color };
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public update(params: Partial<CloudParams>, deltaTime: number): void {
    let needsTransition = false;

    if (params.altitude !== undefined && params.altitude !== this.currentAltitude) {
      this.currentAltitude = params.altitude;
      this.setParticleTargets(ALTITUDE_CONFIGS[this.currentAltitude]);
      this.isTransitioning = true;
      this.transitionStartTime = performance.now() / 1000;
      this.transitionProgress = 0;
      needsTransition = true;
    }

    if (params.saturation !== undefined) {
      this.currentSaturation = params.saturation;
    }

    const currentTime = performance.now() / 1000;

    if (this.isTransitioning) {
      const elapsed = currentTime - this.transitionStartTime;
      this.transitionProgress = Math.min(elapsed / TRANSITION_DURATION, 1.0);

      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false;
      }
    }

    const tweenT = this.easeInOutCubic(this.transitionProgress);
    const satFactor = this.getSaturationFactor();

    for (const p of this.particles) {
      if (this.isTransitioning || needsTransition) {
        p.x = this.lerp(p.x, p.targetX, tweenT * 0.08);
        p.y = this.lerp(p.y, p.targetY, tweenT * 0.08);
        p.z = this.lerp(p.z, p.targetZ, tweenT * 0.08);
        p.size = this.lerp(p.size, p.targetSize, tweenT * 0.08);
        p.color.r = this.lerp(p.color.r, p.targetColor.r, tweenT * 0.08);
        p.color.g = this.lerp(p.color.g, p.targetColor.g, tweenT * 0.08);
        p.color.b = this.lerp(p.color.b, p.targetColor.b, tweenT * 0.08);
      }

      p.driftOffsetX += (Math.random() - 0.5) * 0.02;
      p.driftOffsetY += (Math.random() - 0.5) * 0.02;
      p.driftOffsetZ += (Math.random() - 0.5) * 0.02;

      p.driftOffsetX *= 0.95;
      p.driftOffsetY *= 0.95;
      p.driftOffsetZ *= 0.95;

      p.lifePhase += deltaTime * 0.1;
      if (p.lifePhase > 1) p.lifePhase -= 1;

      p.opacity = p.baseOpacity * satFactor;
      p.opacity = Math.max(0.01, Math.min(1.0, p.opacity));
    }
  }

  private getSaturationFactor(): number {
    const sat = this.currentSaturation;
    return 0.2 + (sat / 100) * 1.8;
  }

  public getParticleData(): Particle[] {
    return this.particles;
  }

  public getParticleCount(): number {
    return PARTICLE_COUNT;
  }

  public getCurrentAltitude(): AltitudeLevel {
    return this.currentAltitude;
  }

  public getCurrentSaturation(): number {
    return this.currentSaturation;
  }
}
