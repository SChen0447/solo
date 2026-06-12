export type WeatherType = 'rain' | 'snow' | 'thunder';

export interface WeatherConfig {
  type: WeatherType;
  particleCount: number;
  fallSpeedMin: number;
  fallSpeedMax: number;
  colorStart: string;
  colorEnd: string;
  horizontalSpread: number;
  sineAmplitude?: number;
  sineFrequency?: number;
  hasLightning?: boolean;
  lightningIntervalMin?: number;
  lightningIntervalMax?: number;
  lightningDuration?: number;
  particleSizeMin: number;
  particleSizeMax: number;
  spawnHeight: number;
  groundY: number;
}

export const WEATHER_PATTERNS: Record<WeatherType, WeatherConfig> = {
  rain: {
    type: 'rain',
    particleCount: 8000,
    fallSpeedMin: 8,
    fallSpeedMax: 12,
    colorStart: '#4FC3F7',
    colorEnd: '#1565C0',
    horizontalSpread: 30,
    particleSizeMin: 0.05,
    particleSizeMax: 0.15,
    spawnHeight: 30,
    groundY: 0
  },
  snow: {
    type: 'snow',
    particleCount: 4000,
    fallSpeedMin: 1,
    fallSpeedMax: 3,
    colorStart: '#FFFFFF',
    colorEnd: '#B0BEC5',
    horizontalSpread: 30,
    sineAmplitude: 3,
    sineFrequency: 0.5,
    particleSizeMin: 0.08,
    particleSizeMax: 0.2,
    spawnHeight: 30,
    groundY: 0
  },
  thunder: {
    type: 'thunder',
    particleCount: 6000,
    fallSpeedMin: 10,
    fallSpeedMax: 15,
    colorStart: '#1A237E',
    colorEnd: '#FFD54F',
    horizontalSpread: 30,
    hasLightning: true,
    lightningIntervalMin: 2,
    lightningIntervalMax: 3,
    lightningDuration: 0.1,
    particleSizeMin: 0.05,
    particleSizeMax: 0.18,
    spawnHeight: 30,
    groundY: 0
  }
};

export class WeatherPattern {
  private currentConfig: WeatherConfig;
  private targetConfig: WeatherConfig;
  private transitionProgress: number;
  private isTransitioning: boolean;
  private transitionDuration: number;
  private lightningActive: boolean;
  private lightningTimer: number;
  private nextLightningTime: number;
  private lightningSpeedBoost: boolean;
  private lightningSpeedBoostTimer: number;

  constructor(initialType: WeatherType = 'rain') {
    this.currentConfig = { ...WEATHER_PATTERNS[initialType] };
    this.targetConfig = { ...WEATHER_PATTERNS[initialType] };
    this.transitionProgress = 1;
    this.isTransitioning = false;
    this.transitionDuration = 1.5;
    this.lightningActive = false;
    this.lightningTimer = 0;
    this.nextLightningTime = this.calculateNextLightningTime();
    this.lightningSpeedBoost = false;
    this.lightningSpeedBoostTimer = 0;
  }

  switchTo(type: WeatherType): void {
    this.targetConfig = { ...WEATHER_PATTERNS[type] };
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.currentConfig = { ...this.targetConfig };
      }
    }

    if (this.getCurrentConfig().hasLightning) {
      this.updateLightning(deltaTime);
    }
  }

  private updateLightning(deltaTime: number): void {
    this.lightningTimer += deltaTime;

    if (this.lightningSpeedBoost) {
      this.lightningSpeedBoostTimer -= deltaTime;
      if (this.lightningSpeedBoostTimer <= 0) {
        this.lightningSpeedBoost = false;
      }
    }

    if (this.lightningActive) {
      const config = this.getCurrentConfig();
      const duration = config.lightningDuration || 0.1;
      if (this.lightningTimer >= duration) {
        this.lightningActive = false;
      }
    } else if (this.lightningTimer >= this.nextLightningTime) {
      this.triggerLightning();
    }
  }

  private triggerLightning(): void {
    this.lightningActive = true;
    this.lightningTimer = 0;
    this.lightningSpeedBoost = true;
    this.lightningSpeedBoostTimer = 0.3;
    this.nextLightningTime = this.calculateNextLightningTime();
  }

  private calculateNextLightningTime(): number {
    const config = this.targetConfig.hasLightning ? this.targetConfig : this.currentConfig;
    if (!config.hasLightning) return Infinity;
    const min = config.lightningIntervalMin || 2;
    const max = config.lightningIntervalMax || 3;
    return min + Math.random() * (max - min);
  }

  getCurrentConfig(): WeatherConfig {
    if (!this.isTransitioning || this.transitionProgress >= 1) {
      return this.currentConfig;
    }

    const t = this.easeInOutCubic(this.transitionProgress);
    return {
      ...this.currentConfig,
      particleCount: Math.round(this.lerp(this.currentConfig.particleCount, this.targetConfig.particleCount, t)),
      fallSpeedMin: this.lerp(this.currentConfig.fallSpeedMin, this.targetConfig.fallSpeedMin, t),
      fallSpeedMax: this.lerp(this.currentConfig.fallSpeedMax, this.targetConfig.fallSpeedMax, t),
      horizontalSpread: this.lerp(this.currentConfig.horizontalSpread, this.targetConfig.horizontalSpread, t),
      sineAmplitude: this.targetConfig.sineAmplitude !== undefined
        ? this.lerp(this.currentConfig.sineAmplitude || 0, this.targetConfig.sineAmplitude, t)
        : undefined,
      sineFrequency: this.targetConfig.sineFrequency !== undefined
        ? this.lerp(this.currentConfig.sineFrequency || 0, this.targetConfig.sineFrequency, t)
        : undefined,
      particleSizeMin: this.lerp(this.currentConfig.particleSizeMin, this.targetConfig.particleSizeMin, t),
      particleSizeMax: this.lerp(this.currentConfig.particleSizeMax, this.targetConfig.particleSizeMax, t),
      spawnHeight: this.lerp(this.currentConfig.spawnHeight, this.targetConfig.spawnHeight, t),
      groundY: this.lerp(this.currentConfig.groundY, this.targetConfig.groundY, t),
      hasLightning: this.targetConfig.hasLightning
    };
  }

  getColor(ratio: number, lightningInfluence: number = 0): { r: number; g: number; b: number } {
    const config = this.getCurrentConfig();
    const startColor = this.hexToRgb(config.colorStart);
    const endColor = this.hexToRgb(config.colorEnd);

    let r = this.lerp(startColor.r, endColor.r, ratio);
    let g = this.lerp(startColor.g, endColor.g, ratio);
    let b = this.lerp(startColor.b, endColor.b, ratio);

    if (lightningInfluence > 0) {
      const lightningColor = { r: 1, g: 0.84, b: 0.31 };
      r = this.lerp(r, lightningColor.r, lightningInfluence);
      g = this.lerp(g, lightningColor.g, lightningInfluence);
      b = this.lerp(b, lightningColor.b, lightningInfluence);
    }

    return { r, g, b };
  }

  isLightningActive(): boolean {
    return this.lightningActive;
  }

  getLightningIntensity(): number {
    if (!this.lightningActive) return 0;
    const config = this.getCurrentConfig();
    const duration = config.lightningDuration || 0.1;
    const progress = this.lightningTimer / duration;
    return Math.max(0, 1 - progress);
  }

  hasSpeedBoost(): boolean {
    return this.lightningSpeedBoost;
  }

  getSpeedMultiplier(): number {
    if (this.lightningSpeedBoost) {
      const fadeOut = Math.max(0, this.lightningSpeedBoostTimer / 0.3);
      return 1 + 2 * fadeOut;
    }
    return 1;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  getTargetType(): WeatherType {
    return this.targetConfig.type;
  }

  getCurrentType(): WeatherType {
    return this.currentConfig.type;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        }
      : { r: 1, g: 1, b: 1 };
  }
}
