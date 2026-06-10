import { SCALES } from './audio';

export interface ParticleOptions {
  x: number;
  y: number;
  scaleIndex: number;
}

export class Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  scaleIndex: number;
  vx: number;
  vy: number;
  isJumping: boolean;
  jumpHeight: number;
  jumpProgress: number;
  jumpDirection: number;
  noiseTexture: { x: number; y: number; alpha: number }[];
  exploding: boolean;
  explodeProgress: number;
  hasCollided: Set<number>;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.baseX = options.x;
    this.baseY = options.y;
    this.radius = 5 + Math.random() * 10;
    this.scaleIndex = options.scaleIndex;
    this.color = SCALES[options.scaleIndex].color;
    this.vx = 0;
    this.vy = 0;
    this.isJumping = false;
    this.jumpHeight = 50 - (this.radius - 5) * 3;
    this.jumpProgress = 0;
    this.jumpDirection = 1;
    this.noiseTexture = this.generateNoiseTexture();
    this.exploding = false;
    this.explodeProgress = 0;
    this.hasCollided = new Set();
  }

  private generateNoiseTexture(): { x: number; y: number; alpha: number }[] {
    const noise: { x: number; y: number; alpha: number }[] = [];
    const count = Math.floor(this.radius * 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.radius * 0.8;
      noise.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        alpha: 0.2 + Math.random() * 0.4
      });
    }
    return noise;
  }

  startJump(): void {
    if (!this.isJumping && !this.exploding) {
      this.isJumping = true;
      this.jumpProgress = 0;
      this.jumpDirection = -1;
      this.baseX = this.x;
      this.baseY = this.y;
      this.vx = (Math.random() - 0.5) * this.jumpHeight * 0.1;
    }
  }

  update(deltaTime: number): void {
    if (this.exploding) {
      this.explodeProgress += deltaTime * 2;
      if (this.explodeProgress >= 1) {
        this.explodeProgress = 1;
      }
      return;
    }

    if (this.isJumping) {
      this.jumpProgress += deltaTime * 1.5 * this.jumpDirection;

      if (this.jumpProgress <= 0) {
        this.jumpProgress = 0;
        this.isJumping = false;
        this.x = this.baseX + (Math.random() - 0.5) * this.jumpHeight * 0.2;
        this.y = this.baseY;
        this.vx = 0;
        this.vy = 0;
      } else if (this.jumpProgress >= 1) {
        this.jumpProgress = 1;
        this.jumpDirection = 1;
      }

      const jumpOffset = Math.sin(this.jumpProgress * Math.PI) * this.jumpHeight;
      this.y = this.baseY - jumpOffset;
      this.x += this.vx * deltaTime * 60;
    }
  }

  startExplode(): void {
    this.exploding = true;
    this.explodeProgress = 0;
  }

  isAlive(): boolean {
    return !(this.exploding && this.explodeProgress >= 1);
  }
}
