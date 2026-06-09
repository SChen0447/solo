import p5 from 'p5';
import type { PetalColor } from './petal';

export type RippleType = 'water' | 'ground';

export class Ripple {
  public p: p5;
  public x: number;
  public y: number;
  public color: PetalColor;
  public type: RippleType;
  public radius: number;
  public maxRadius: number;
  public expansionSpeed: number;
  public alpha: number;
  public decayRate: number;
  public frequency: number;
  public ringCount: number;
  public ringSpacing: number;
  public alive: boolean;
  public id: number;

  private static nextId = 0;

  constructor(
    p: p5,
    x: number,
    y: number,
    color: PetalColor,
    type: RippleType
  ) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type;
    this.id = Ripple.nextId++;
    this.alive = true;

    if (type === 'water') {
      this.radius = 5;
      this.maxRadius = 80;
      this.expansionSpeed = 2;
      this.alpha = 0.6;
      this.decayRate = 0.012;
      this.frequency = color.frequency;
      this.ringCount = 3;
      this.ringSpacing = 15;
    } else {
      this.radius = 3;
      this.maxRadius = 50;
      this.expansionSpeed = 1.5;
      this.alpha = 0.5;
      this.decayRate = 0.025;
      this.frequency = color.frequency * 0.5;
      this.ringCount = 2;
      this.ringSpacing = 10;
    }
  }

  public update(): void {
    this.radius += this.expansionSpeed;
    this.alpha = this.p.max(0, this.alpha - this.decayRate);

    if (this.alpha <= 0 || this.radius >= this.maxRadius) {
      this.alive = false;
    }
  }

  public draw(): void {
    const p = this.p;
    p.noFill();

    for (let i = 0; i < this.ringCount; i++) {
      const ringRadius = this.radius - i * this.ringSpacing;
      if (ringRadius > 0) {
        const ringAlpha = this.alpha * (1 - i * 0.3);
        p.stroke(this.color.r, this.color.g, this.color.b, ringAlpha * 255);
        p.strokeWeight(this.type === 'water' ? 2.5 : 1.8);
        p.ellipse(this.x, this.y, ringRadius * 2, ringRadius * 2);
      }
    }

    const glowAlpha = this.alpha * 0.3;
    if (glowAlpha > 0) {
      p.noStroke();
      p.fill(this.color.r, this.color.g, this.color.b, glowAlpha * 255);
      p.ellipse(this.x, this.y, this.radius * 1.5, this.radius * 1.5);
    }
  }
}
