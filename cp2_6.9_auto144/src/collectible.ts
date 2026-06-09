export type CrystalColor = 'red' | 'blue' | 'green';

export interface CrystalConfig {
  color: CrystalColor;
  hex: string;
  recharge: number;
}

export const CRYSTAL_CONFIGS: Record<CrystalColor, CrystalConfig> = {
  red: { color: 'red', hex: '#FF4B4B', recharge: 5 },
  blue: { color: 'blue', hex: '#4B9EFF', recharge: 10 },
  green: { color: 'green', hex: '#4BFF4B', recharge: 15 }
};

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number = 0.5;
  public color: string;
  public size: number = 3;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = this.maxLife;
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  public update(deltaTime: number): void {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.life -= deltaTime;
  }

  public isDead(): boolean {
    return this.life <= 0;
  }

  public get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class Collectible {
  public x: number;
  public y: number;
  public readonly radius: number = 10;
  public color: CrystalColor;
  public config: CrystalConfig;
  public collected: boolean = false;
  public pulsePhase: number = 0;

  private constructor(x: number, y: number, color: CrystalColor) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.config = CRYSTAL_CONFIGS[color];
  }

  public static spawn(canvasWidth: number, canvasHeight: number): Collectible {
    const colors: CrystalColor[] = ['red', 'blue', 'green'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const margin = 40;
    const x = margin + Math.random() * (canvasWidth - margin * 2);
    const y = margin + Math.random() * (canvasHeight - margin * 2);
    return new Collectible(x, y, color);
  }

  public update(deltaTime: number): void {
    this.pulsePhase += deltaTime * 3;
  }

  public createParticles(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      particles.push(new Particle(this.x, this.y, this.config.hex));
    }
    return particles;
  }
}
