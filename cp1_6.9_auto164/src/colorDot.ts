import p5 from 'p5';

export interface Ripple {
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
  color: p5.Color;
  rings: number;
}

export class ColorDot {
  p: p5;
  x: number;
  y: number;
  hue: number;
  saturation: number;
  lightness: number;
  targetRadius: number;
  currentRadius: number;
  glowSize: number;
  spawnTime: number;
  spawnDuration: number;
  destroyTime: number;
  destroyDuration: number;
  isDestroying: boolean;
  isAlive: boolean;
  ripples: Ripple[];
  id: number;

  constructor(p: p5, x: number, y: number, id: number) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.id = id;
    this.hue = Math.floor(Math.random() * 360);
    this.saturation = 80;
    this.lightness = 70;
    this.targetRadius = 15;
    this.currentRadius = 0;
    this.glowSize = 3;
    this.spawnTime = p.millis();
    this.spawnDuration = 500;
    this.destroyTime = 0;
    this.destroyDuration = 500;
    this.isDestroying = false;
    this.isAlive = true;
    this.ripples = [];
  }

  easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  triggerRipple(): void {
    const complementaryHue = (this.hue + 180) % 360;
    this.ripples.push({
      radius: 0,
      maxRadius: 120,
      startTime: this.p.millis(),
      duration: 1500,
      color: this.p.color(`hsl(${complementaryHue}, 80%, 70%)`),
      rings: 8
    });
  }

  startDestroy(): void {
    if (!this.isDestroying) {
      this.isDestroying = true;
      this.destroyTime = this.p.millis();
    }
  }

  contains(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.targetRadius + this.glowSize;
  }

  getHue(): number {
    return this.hue;
  }

  update(): boolean {
    const now = this.p.millis();

    if (this.isDestroying) {
      const elapsed = now - this.destroyTime;
      if (elapsed >= this.destroyDuration) {
        this.isAlive = false;
        return false;
      }
      const progress = elapsed / this.destroyDuration;
      this.currentRadius = this.targetRadius * (1 - progress);
    } else {
      const spawnElapsed = now - this.spawnTime;
      if (spawnElapsed < this.spawnDuration) {
        const progress = spawnElapsed / this.spawnDuration;
        this.currentRadius = this.targetRadius * this.easeOutElastic(progress);
      } else {
        this.currentRadius = this.targetRadius;
      }
    }

    this.ripples = this.ripples.filter((ripple) => {
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) return false;
      ripple.radius = ripple.maxRadius * (elapsed / ripple.duration);
      return true;
    });

    return true;
  }

  draw(): void {
    const p = this.p;
    p.noStroke();

    const glowAlpha = this.isDestroying ? 0.3 * (1 - (p.millis() - this.destroyTime) / this.destroyDuration) : 0.4;
    p.drawingContext.shadowBlur = this.glowSize * 4;
    p.drawingContext.shadowColor = `hsla(${this.hue}, ${this.saturation}%, ${this.lightness}%, ${glowAlpha})`;

    const mainColor = p.color(`hsl(${this.hue}, ${this.saturation}%, ${this.lightness}%)`);
    p.fill(mainColor);
    p.circle(this.x, this.y, this.currentRadius * 2);

    p.drawingContext.shadowBlur = 0;

    const innerColor = p.color(`hsl(${this.hue}, ${this.saturation}%, 90%)`);
    p.fill(innerColor);
    p.circle(this.x, this.y, this.currentRadius * 0.6);

    this.drawRipples();
  }

  drawRipples(): void {
    const p = this.p;
    p.noFill();

    for (const ripple of this.ripples) {
      const elapsed = p.millis() - ripple.startTime;
      const progress = elapsed / ripple.duration;
      const alpha = (1 - progress) * 0.6;

      for (let i = 0; i < ripple.rings; i++) {
        const ringProgress = (i + 1) / ripple.rings;
        const ringRadius = ripple.radius * ringProgress;
        const ringAlpha = alpha * (1 - ringProgress * 0.5);
        const hue = (this.hue + 180 + i * 15) % 360;

        p.strokeWeight(2);
        p.stroke(p.color(`hsla(${hue}, 80%, 70%, ${ringAlpha})`));
        p.circle(this.x, this.y, ringRadius * 2);
      }
    }
  }

  getActiveRipples(): Ripple[] {
    return this.ripples;
  }
}
