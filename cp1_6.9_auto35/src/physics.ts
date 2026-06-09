import p5 from 'p5';

export interface EnvironmentState {
  windSpeed: number;
  temperature: number;
}

export class Environment {
  private windX: number = 0;
  private windY: number = 0;
  private windSpeed: number = 2;
  private temperature: number = 20;
  private noiseOffsetX: number = 0;
  private noiseOffsetY: number = 1000;
  private p: p5;

  constructor(p: p5) {
    this.p = p;
  }

  setWindSpeed(speed: number): void {
    this.windSpeed = p5.prototype.constrain(speed, 0, 10);
  }

  getWindSpeed(): number {
    return this.windSpeed;
  }

  setTemperature(temp: number): void {
    this.temperature = p5.prototype.constrain(temp, 0, 40);
  }

  getTemperature(): number {
    return this.temperature;
  }

  update(): void {
    this.noiseOffsetX += 0.003;
    this.noiseOffsetY += 0.003;
    const magnitude = this.windSpeed * 0.5;
    this.windX = (this.p.noise(this.noiseOffsetX) - 0.5) * 2 * magnitude;
    this.windY = (this.p.noise(this.noiseOffsetY) - 0.5) * 2 * magnitude;
  }

  getWindVector(): { x: number; y: number } {
    return { x: this.windX, y: this.windY };
  }

  getLifeExtension(): number {
    const baseTemp = 20;
    const tempDiff = baseTemp - this.temperature;
    const steps = Math.floor(Math.max(0, tempDiff) / 5);
    return Math.min(steps * 2, 8);
  }

  getBrownianMagnitude(): number {
    return 1 + this.windSpeed * 0.2;
  }
}
