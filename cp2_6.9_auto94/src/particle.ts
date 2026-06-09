export interface SceneConfig {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  isMobile: boolean;
  baseFriction: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const WARM_COLORS: string[] = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#9B59B6'
];

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const rr = Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
  const gg = Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0');
  const bb = Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

export function mixRgb(c1: RGB, c2: RGB): RGB {
  return {
    r: (c1.r + c2.r) / 2,
    g: (c1.g + c2.g) / 2,
    b: (c1.b + c2.b) / 2
  };
}

export class Particle {
  public id: number;
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: RGB;
  public radius: number;
  public alpha: number;
  public friction: number;
  public rotation: number;
  public rotationSpeed: number;
  public isFused: boolean;
  public flashTime: number;
  public flashDuration: number;
  public mouseHighlightTime: number;
  public mouseHighlightDuration: number;
  public isDying: boolean;
  public age: number;

  private static nextId = 0;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: RGB,
    radius: number,
    friction: number = 0.98
  ) {
    this.id = Particle.nextId++;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.radius = radius;
    this.alpha = 0.6;
    this.friction = friction;
    this.rotation = 0;
    this.rotationSpeed = this.id % 2 === 0 ? 0.005 : -0.005;
    this.isFused = false;
    this.flashTime = 0;
    this.flashDuration = 0.5;
    this.mouseHighlightTime = 0;
    this.mouseHighlightDuration = 0.2;
    this.isDying = false;
    this.age = 0;
  }

  get displayAlpha(): number {
    let a = this.alpha;
    if (this.isFused && this.flashTime < this.flashDuration) {
      const pulse = Math.sin((this.flashTime / this.flashDuration) * Math.PI * 2 * (this.flashDuration / 0.3));
      a += 0.5 + (pulse * 0.5);
    }
    if (this.mouseHighlightTime < this.mouseHighlightDuration) {
      a += 0.2;
    }
    return Math.max(0, Math.min(1, a));
  }

  get hexColor(): string {
    return rgbToHex(this.color.r, this.color.g, this.color.b);
  }

  triggerMouseHighlight(): void {
    this.mouseHighlightTime = 0;
  }

  update(dt: number, config: SceneConfig, mouseX: number, mouseY: number): void {
    this.age += dt;
    this.rotation += this.rotationSpeed;

    if (this.isFused && this.flashTime < this.flashDuration) {
      this.flashTime += dt;
    }
    if (this.mouseHighlightTime < this.mouseHighlightDuration) {
      this.mouseHighlightTime += dt;
    }

    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);
    if (distToMouse < 50 && distToMouse > 0) {
      const force = 0.5 * (1 - distToMouse / 50);
      this.vx += (dx / distToMouse) * force;
      this.vy += (dy / distToMouse) * force;
      this.triggerMouseHighlight();
    }

    const edgeMargin = 30;
    const edgeAccel = 0.1;
    if (this.x < edgeMargin) {
      this.vx += edgeAccel;
    } else if (this.x > config.width - edgeMargin) {
      this.vx -= edgeAccel;
    }
    if (this.y < edgeMargin) {
      this.vy += edgeAccel;
    } else if (this.y > config.height - edgeMargin) {
      this.vy -= edgeAccel;
    }

    this.vx *= this.friction;
    this.vy *= this.friction;

    this.x += this.vx;
    this.y += this.vy;

    if (!this.isDying) {
      this.alpha = Math.min(1, this.alpha + 0.02 * dt);
    }

    if (this.radius > 20 && !this.isDying) {
      this.isDying = true;
    }

    if (this.isDying) {
      this.radius = Math.max(0, this.radius - 0.5 * dt);
      this.alpha = Math.max(0, this.alpha - 0.03 * dt);
    }
  }

  isDead(): boolean {
    return this.radius < 2 || this.alpha <= 0;
  }

  static createRandom(config: SceneConfig): Particle {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 200;
    const x = config.centerX + Math.cos(angle) * distance;
    const y = config.centerY + Math.sin(angle) * distance;

    const speedAngle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    const vx = Math.cos(speedAngle) * speed;
    const vy = Math.sin(speedAngle) * speed;

    const hexColor = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
    const color = hexToRgb(hexColor);

    const radius = 3 + Math.random() * 5;
    const friction = config.isMobile ? 0.95 : config.baseFriction;

    return new Particle(x, y, vx, vy, color, radius, friction);
  }

  static createFused(p1: Particle, p2: Particle): Particle {
    const x = (p1.x + p2.x) / 2;
    const y = (p1.y + p2.y) / 2;

    const speedAngle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 2;
    const vx = Math.cos(speedAngle) * speed;
    const vy = Math.sin(speedAngle) * speed;

    const color = mixRgb(p1.color, p2.color);
    const radius = Math.min(25, p1.radius + p2.radius);

    const particle = new Particle(x, y, vx, vy, color, radius, 0.99);
    particle.isFused = true;
    particle.alpha = 0.6;
    return particle;
  }

  static distance(p1: Particle, p2: Particle): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static checkCollision(p1: Particle, p2: Particle): boolean {
    return Particle.distance(p1, p2) < p1.radius + p2.radius;
  }
}
