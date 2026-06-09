import type p5 from 'p5';

const GRAVITY = 0.02;
const DRIFT_AMPLITUDE = 0.5;
const FADE_FRAMES = 180;
const DISTURBANCE_DURATION = 30;
const FLICKER_SPEED = 0.1;

export class Droplet {
  public x: number;
  public y: number;
  public char: string;
  public size: number;
  public vy: number;
  public vx: number;
  public alpha: number;
  public phase: number;
  public disturbVx: number;
  public disturbVy: number;
  public disturbTimer: number;
  public isFading: boolean;
  public fadeTimer: number;
  public baseAlpha: number;
  public alive: boolean;
  public id: number;

  private static nextId = 0;

  constructor(
    x: number,
    y: number,
    char: string,
    size: number,
    baseSpeed: number
  ) {
    this.x = x;
    this.y = y;
    this.char = char;
    this.size = size;
    this.vy = baseSpeed;
    this.vx = (Math.random() * 2 - 1) * DRIFT_AMPLITUDE;
    this.alpha = 255;
    this.baseAlpha = 255;
    this.phase = Math.random() * Math.PI * 2;
    this.disturbVx = 0;
    this.disturbVy = 0;
    this.disturbTimer = 0;
    this.isFading = false;
    this.fadeTimer = 0;
    this.alive = true;
    this.id = Droplet.nextId++;
  }

  public applyDisturbance(dx: number, dy: number, magnitude: number): void {
    const norm = Math.sqrt(dx * dx + dy * dy) || 1;
    const strength = 0.5 + magnitude * 1.5;
    this.disturbVx += (dx / norm) * strength;
    this.disturbVy += (dy / norm) * strength;
    this.disturbTimer = DISTURBANCE_DURATION;
  }

  public startFading(): void {
    if (!this.isFading) {
      this.isFading = true;
      this.fadeTimer = 0;
    }
  }

  public update(canvasHeight: number): void {
    this.vy += GRAVITY;

    this.phase += FLICKER_SPEED;
    const flicker = (Math.sin(this.phase) + 1) * 0.5;
    this.alpha = 180 + flicker * 75;

    if (this.disturbTimer > 0) {
      this.disturbTimer--;
      const decay = 1 - this.disturbTimer / DISTURBANCE_DURATION;
      this.disturbVx *= 0.95;
      this.disturbVy *= 0.95;
      this.x += this.disturbVx * (1 - decay * 0.5);
      this.y += this.disturbVy * (1 - decay * 0.5);
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.isFading) {
      this.fadeTimer++;
      const progress = this.fadeTimer / FADE_FRAMES;
      this.alpha = this.baseAlpha * (1 - progress);
      if (this.fadeTimer >= FADE_FRAMES) {
        this.alive = false;
      }
    }

    if (this.y - this.size > canvasHeight && !this.isFading) {
      this.startFading();
    }
  }

  public draw(p: p5, canvasHeight: number): void {
    const hue = Math.min(1, this.y / canvasHeight) * 360;
    p.colorMode(p.HSL, 360, 100, 100, 255);
    p.fill(hue, 100, 60, this.alpha);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(this.size);
    p.text(this.char, this.x, this.y);
  }

  public distanceTo(px: number, py: number): number {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
