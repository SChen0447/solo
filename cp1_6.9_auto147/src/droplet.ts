import p5 from 'p5';

export interface RGBColor {
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
  size: number;
  color: RGBColor;
}

export interface LightPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: RGBColor;
  type: 'merge' | 'split' | 'golden';
}

export type DropletState = 'sinking' | 'heating' | 'rising' | 'staying' | 'falling';

export class Droplet {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public radius: number;
  public color: RGBColor;
  public stretchRatio: number;
  public targetStretch: number;
  public hasSplit: boolean;
  public parent: Droplet | null;
  public state: DropletState;
  public stateTimer: number;
  public baseSpeed: number;
  public wobblePhase: number;
  public wobbleSpeed: number;
  public brightnessBoost: number;
  public age: number;

  private static readonly PRESET_COLORS: RGBColor[] = [
    { r: 255, g: 68, b: 102 },
    { r: 255, g: 136, b: 68 },
    { r: 255, g: 204, b: 68 },
    { r: 68, g: 255, b: 136 },
    { r: 68, g: 136, b: 255 },
    { r: 170, g: 102, b: 255 }
  ];

  constructor(x: number, y: number, radius: number, color?: RGBColor) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.color = color || Droplet.randomColor();
    this.stretchRatio = 1;
    this.targetStretch = 1;
    this.hasSplit = false;
    this.parent = null;
    this.state = 'sinking';
    this.stateTimer = 0;
    this.baseSpeed = 0.5 + Math.random() * 1.0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.03;
    this.brightnessBoost = 0;
    this.age = 0;
  }

  public static randomColor(): RGBColor {
    return { ...Droplet.PRESET_COLORS[Math.floor(Math.random() * Droplet.PRESET_COLORS.length)] };
  }

  public static getPresetColors(): RGBColor[] {
    return Droplet.PRESET_COLORS.map(c => ({ ...c }));
  }

  public update(
    p: p5,
    lampLeft: number,
    lampRight: number,
    lampTop: number,
    lampBottom: number,
    heatPlateTop: number,
    temperatureMultiplier: number,
    onSplitBurst: (x: number, y: number, color: RGBColor) => void,
    onGoldenSplit: (x: number, y: number) => void
  ): Droplet[] | null {
    this.age++;
    this.stateTimer++;
    this.wobblePhase += this.wobbleSpeed;

    const wobble = Math.sin(this.wobblePhase) * 0.3;
    this.vx = wobble;

    const speed = this.baseSpeed * temperatureMultiplier;

    switch (this.state) {
      case 'sinking':
        this.vy = speed * 0.8;
        if (this.y >= heatPlateTop - this.radius) {
          this.y = heatPlateTop - this.radius;
          this.state = 'heating';
          this.stateTimer = 0;
        }
        break;

      case 'heating':
        this.vy = 0;
        const heatTime = 60 + Math.random() * 60;
        if (this.stateTimer >= heatTime) {
          this.state = 'rising';
          this.targetStretch = 1.2 + Math.random() * 0.8;
        }
        break;

      case 'rising':
        this.vy = -speed;
        this.stretchRatio += (this.targetStretch - this.stretchRatio) * 0.02;

        if (!this.hasSplit && Math.random() < 0.003 && this.radius > 8) {
          const children = this.performSplit(onSplitBurst);
          return children;
        }

        if (this.y <= lampTop + this.radius + 20) {
          this.y = lampTop + this.radius + 20;
          this.state = 'staying';
          this.stateTimer = 0;
        }
        break;

      case 'staying':
        this.vy *= 0.95;
        const stayTime = 30 + Math.random() * 30;
        if (this.stateTimer >= stayTime) {
          this.state = 'falling';
          this.targetStretch = 1;
          this.brightnessBoost = 0.2;
        }
        break;

      case 'falling':
        this.vy = speed;
        this.stretchRatio += (this.targetStretch - this.stretchRatio) * 0.03;

        if (this.y >= heatPlateTop - this.radius) {
          this.y = heatPlateTop - this.radius;

          if (!this.hasSplit && this.radius > 12 && Math.random() < 0.3) {
            this.hasSplit = true;
            const angle = (Math.random() - 0.5) * Math.PI / 2;
            const splitSpeed = 0.3;
            const child1 = new Droplet(
              this.x - this.radius * 0.5,
              this.y,
              this.radius * 0.6,
              { ...this.color }
            );
            child1.vx = Math.cos(angle + Math.PI) * splitSpeed;
            child1.vy = -1;
            child1.parent = this;
            child1.hasSplit = true;
            child1.state = 'rising';
            child1.targetStretch = 1.2 + Math.random() * 0.6;

            const child2 = new Droplet(
              this.x + this.radius * 0.5,
              this.y,
              this.radius * 0.6,
              { ...this.color }
            );
            child2.vx = Math.cos(angle) * splitSpeed;
            child2.vy = -1;
            child2.parent = this;
            child2.hasSplit = true;
            child2.state = 'rising';
            child2.targetStretch = 1.2 + Math.random() * 0.6;

            onGoldenSplit(this.x, this.y);
            return [child1, child2];
          }

          this.state = 'heating';
          this.stateTimer = 0;
          this.brightnessBoost = 0;
        }
        break;
    }

    this.x += this.vx;
    this.y += this.vy;

    const minX = lampLeft + this.radius;
    const maxX = lampRight - this.radius;
    if (this.x < minX) { this.x = minX; this.vx *= -0.5; }
    if (this.x > maxX) { this.x = maxX; this.vx *= -0.5; }

    return null;
  }

  private performSplit(
    onSplitBurst: (x: number, y: number, color: RGBColor) => void
  ): Droplet[] {
    this.hasSplit = true;
    const childCount = 2 + Math.floor(Math.random() * 2);
    const children: Droplet[] = [];
    const newRadius = this.radius * 0.6;

    for (let i = 0; i < childCount; i++) {
      const angle = (Math.PI * 2 * i) / childCount + Math.random() * 0.5;
      const offsetX = Math.cos(angle) * this.radius * 0.4;
      const offsetY = Math.sin(angle) * this.radius * 0.4;

      const child = new Droplet(
        this.x + offsetX,
        this.y + offsetY,
        newRadius,
        { ...this.color }
      );
      child.parent = this;
      child.hasSplit = true;
      child.state = this.state;
      child.stateTimer = 0;
      child.targetStretch = this.targetStretch;
      child.vx = Math.cos(angle) * 0.5;
      child.vy = this.vy;
      children.push(child);
    }

    onSplitBurst(this.x, this.y, this.color);
    return children;
  }

  public merge(other: Droplet): Droplet {
    const totalR1 = this.radius * this.radius;
    const totalR2 = other.radius * other.radius;
    const newR = Math.sqrt((totalR1 + totalR2) * 0.7);

    const weightedR = (this.color.r * totalR1 + other.color.r * totalR2) / (totalR1 + totalR2);
    const weightedG = (this.color.g * totalR1 + other.color.g * totalR2) / (totalR1 + totalR2);
    const weightedB = (this.color.b * totalR1 + other.color.b * totalR2) / (totalR1 + totalR2);

    const newX = (this.x * totalR1 + other.x * totalR2) / (totalR1 + totalR2);
    const newY = (this.y * totalR1 + other.y * totalR2) / (totalR1 + totalR2);

    const merged = new Droplet(newX, newY, newR, {
      r: Math.min(255, weightedR),
      g: Math.min(255, weightedG),
      b: Math.min(255, weightedB)
    });

    const bothFalling = this.state === 'falling' && other.state === 'falling';
    const bothRising = this.state === 'rising' && other.state === 'rising';

    if (bothRising || (!bothFalling && this.state === 'rising')) {
      merged.state = 'rising';
      merged.targetStretch = Math.max(this.targetStretch, other.targetStretch);
    } else if (bothFalling || this.state === 'falling') {
      merged.state = 'falling';
      merged.targetStretch = Math.min(this.targetStretch, other.targetStretch);
    } else {
      merged.state = this.state;
      merged.targetStretch = this.targetStretch;
    }

    merged.vy = (this.vy * totalR1 + other.vy * totalR2) / (totalR1 + totalR2);
    merged.hasSplit = this.hasSplit || other.hasSplit;

    return merged;
  }

  public collidesWith(other: Droplet): boolean {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (this.radius + other.radius) * 0.8;
  }

  public draw(p: p5): void {
    const displayColor = this.getDisplayColor();

    p.push();
    p.translate(this.x, this.y);

    p.drawingContext.shadowColor = `rgba(${displayColor.r}, ${displayColor.g}, ${displayColor.b}, 0.6)`;
    p.drawingContext.shadowBlur = 15;

    p.noStroke();
    p.fill(displayColor.r, displayColor.g, displayColor.b, 230);

    const stretchX = 1 / Math.sqrt(this.stretchRatio);
    const stretchY = this.stretchRatio / Math.sqrt(this.stretchRatio);
    p.scale(stretchX, stretchY);

    p.ellipse(0, 0, this.radius * 2, this.radius * 2);

    p.drawingContext.shadowBlur = 0;
    p.fill(255, 255, 255, 40);
    p.ellipse(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.5, this.radius * 0.5);

    p.pop();

    p.push();
    p.noFill();
    p.stroke(displayColor.r, displayColor.g, displayColor.b, 100);
    p.strokeWeight(1);
    p.ellipse(this.x, this.y, this.radius * 2 + 2, this.radius * 2 + 2);
    p.pop();
  }

  public getDisplayColor(): RGBColor {
    const boost = this.brightnessBoost * 255;
    return {
      r: Math.min(255, this.color.r + boost * 0.2),
      g: Math.min(255, this.color.g + boost * 0.2),
      b: Math.min(255, this.color.b + boost * 0.2)
    };
  }
}
