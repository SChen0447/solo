import type p5 from 'p5';

export const BUG_COLORS = [
  '#ffdd44',
  '#88ffaa',
  '#66ccff',
  '#ff88aa',
  '#dd88ff'
];

export const COLOR_FREQUENCIES: Record<string, number> = {
  '#ffdd44': 400,
  '#88ffaa': 520,
  '#66ccff': 640,
  '#ff88aa': 720,
  '#dd88ff': 800
};

export class PulseRing {
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  startTime: number;
  duration: number;
  done: boolean;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxRadius = 40;
    this.startTime = performance.now();
    this.duration = 800;
    this.done = false;
  }

  update(): void {
    const elapsed = performance.now() - this.startTime;
    if (elapsed >= this.duration) {
      this.done = true;
    }
  }

  draw(p: p5): void {
    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);
    const radius = this.maxRadius * t;
    const alpha = (1 - t) * 200;

    p.push();
    p.noFill();
    const c = p.color(this.color);
    c.setAlpha(alpha);
    p.stroke(c);
    p.strokeWeight(3);
    p.ellipse(this.x, this.y, radius * 2, radius * 2);
    p.pop();
  }
}

export class LightBug {
  x: number;
  y: number;
  radius: number;
  color: string;
  baseRadius: number;
  glowRadius: number;
  pulsePhase: number;
  pulseSpeed: number;
  vx: number;
  vy: number;
  collecting: boolean;
  collectStartTime: number;
  collectDuration: number;
  sceneWidth: number;
  sceneHeight: number;
  groundY: number;
  collected: boolean;

  constructor(sceneWidth: number, sceneHeight: number, groundY: number) {
    this.sceneWidth = sceneWidth;
    this.sceneHeight = sceneHeight;
    this.groundY = groundY;
    this.baseRadius = 6 + Math.random() * 4;
    this.radius = this.baseRadius;
    this.color = BUG_COLORS[Math.floor(Math.random() * BUG_COLORS.length)];
    this.glowRadius = 12;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.03 + Math.random() * 0.02;
    this.vx = (Math.random() - 0.5) * 1.6;
    this.vy = (Math.random() - 0.5) * 1.6;
    this.collecting = false;
    this.collectStartTime = 0;
    this.collectDuration = 500;
    this.collected = false;
    this.respawn();
  }

  respawn(): void {
    this.x = 40 + Math.random() * (this.sceneWidth - 80);
    this.y = 60 + Math.random() * (this.groundY - 100);
    this.baseRadius = 6 + Math.random() * 4;
    this.radius = this.baseRadius;
    this.color = BUG_COLORS[Math.floor(Math.random() * BUG_COLORS.length)];
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.vx = (Math.random() - 0.5) * 1.6;
    this.vy = (Math.random() - 0.5) * 1.6;
    this.collecting = false;
    this.collected = false;
  }

  startCollect(): void {
    if (!this.collecting) {
      this.collecting = true;
      this.collectStartTime = performance.now();
    }
  }

  update(): void {
    this.pulsePhase += this.pulseSpeed;
    this.glowRadius = 12 + (Math.sin(this.pulsePhase) + 1) * 4;

    if (this.collecting) {
      const elapsed = performance.now() - this.collectStartTime;
      const t = Math.min(elapsed / this.collectDuration, 1);
      this.radius = this.baseRadius * (1 - t);
      if (elapsed >= this.collectDuration) {
        this.collected = true;
      }
      return;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (Math.random() < 0.02) {
      this.vx = (Math.random() - 0.5) * 1.6;
      this.vy = (Math.random() - 0.5) * 1.6;
    }

    const minX = 20;
    const maxX = this.sceneWidth - 20;
    const minY = 40;
    const maxY = this.groundY - 30;

    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.abs(this.vx);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < minY) {
      this.y = minY;
      this.vy = Math.abs(this.vy);
    } else if (this.y > maxY) {
      this.y = maxY;
      this.vy = -Math.abs(this.vy);
    }
  }

  draw(p: p5): void {
    const glowAlpha = 100 + (Math.sin(this.pulsePhase) + 1) * 30;

    p.push();
    const glowColor = p.color(this.color);
    glowColor.setAlpha(glowAlpha * 0.5);
    p.noStroke();
    p.fill(glowColor);
    p.ellipse(this.x, this.y, this.glowRadius * 2, this.glowRadius * 2);
    p.pop();

    p.push();
    const coreColor = p.color(this.color);
    coreColor.setAlpha(255);
    p.noStroke();
    p.fill(coreColor);
    p.ellipse(this.x, this.y, this.radius * 2, this.radius * 2);
    p.pop();
  }
}
