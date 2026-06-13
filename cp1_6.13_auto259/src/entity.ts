export const METEOR_COLORS: Array<{ border: string; gradient: [string, string] }> = [
  { border: '#ff6b6b', gradient: ['#ff6b6b', '#c44569'] },
  { border: '#48dbfb', gradient: ['#48dbfb', '#0abde3'] },
  { border: '#feca57', gradient: ['#feca57', '#ff9f43'] }
];

export interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleOffset: number;
  twinklePeriod: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  opacity: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 2 + Math.random() * 3;
    this.color = color;
    this.maxLife = 1.2;
    this.life = this.maxLife;
    this.opacity = 1;
  }

  update(deltaTime: number): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05;
    this.life -= deltaTime;
    this.opacity = Math.max(0, this.life / this.maxLife);
    return this.life > 0;
  }
}

export class Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
  trail: Array<{ x: number; opacity: number }>;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.width = 120;
    this.height = 16;
    this.x = canvasWidth / 2 - this.width / 2;
    this.y = canvasHeight - 40 - this.height;
    this.targetX = this.x;
    this.trail = [];
  }

  update(canvasWidth: number): void {
    this.x += (this.targetX - this.x) * 0.25;

    this.trail.unshift({ x: this.x + this.width / 2, opacity: 1 });
    if (this.trail.length > 12) {
      this.trail.pop();
    }
    this.trail.forEach((t, i) => {
      t.opacity = 1 - i / this.trail.length;
    });
  }

  isNearLeftEdge(canvasWidth: number): boolean {
    return this.x < 0;
  }

  isNearRightEdge(canvasWidth: number): boolean {
    return this.x + this.width > canvasWidth;
  }

  getReflectionAngle(hitX: number): number {
    const relativeX = (hitX - this.x) / this.width;
    if (relativeX < 1 / 3) {
      return -30 * (Math.PI / 180);
    } else if (relativeX > 2 / 3) {
      return 30 * (Math.PI / 180);
    }
    return 0;
  }
}

export class Meteor {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  borderColor: string;
  gradientColors: [string, string];
  isGold: boolean;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
  bounceCount: number;

  constructor(canvasWidth: number, baseSpeed: number, isGold: boolean = false) {
    this.isGold = isGold;

    if (isGold) {
      this.width = 80;
      this.height = 80;
      this.borderColor = '#ffd700';
      this.gradientColors = ['#ffd700', '#ff8c00'];
    } else {
      this.width = 40 + Math.random() * 20;
      this.height = 40 + Math.random() * 20;
      const colorIndex = Math.floor(Math.random() * METEOR_COLORS.length);
      this.borderColor = METEOR_COLORS[colorIndex].border;
      this.gradientColors = METEOR_COLORS[colorIndex].gradient;
    }

    this.x = Math.random() * (canvasWidth - this.width);
    this.y = -this.height;
    this.vx = 0;
    this.vy = baseSpeed;
    this.rotation = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    this.active = true;
    this.bounceCount = 0;
  }

  update(canvasWidth: number, canvasHeight: number): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    if (this.x <= 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.width >= canvasWidth) {
      this.x = canvasWidth - this.width;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y > canvasHeight + this.height) {
      this.active = false;
      return false;
    }

    return true;
  }

  reflect(angle: number): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) * 1.02;
    const baseAngle = -Math.PI / 2;
    const finalAngle = baseAngle + angle;
    this.vx = Math.cos(finalAngle) * speed;
    this.vy = Math.sin(finalAngle) * speed;
    if (this.vy > 0) this.vy = -Math.abs(this.vy);
    this.bounceCount++;
  }

  getRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.width, h: this.height };
  }
}

export function createStars(count: number, width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      baseOpacity: 0.3 + Math.random() * 0.3,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinklePeriod: 2 + Math.random() * 2
    });
  }
  return stars;
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
