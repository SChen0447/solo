import p5 from 'p5';

const COLORS = [
  { r: 255, g: 221, b: 68 },
  { r: 136, g: 255, b: 136 },
  { r: 102, g: 204, b: 255 },
];

const WARM_COLOR = { r: 255, g: 221, b: 68 };
const COLD_COLOR = { r: 102, g: 204, b: 255 };

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Firefly {
  private p: p5;
  x: number;
  y: number;
  vx: number;
  vy: number;
  brightness: number;
  pulsePhase: number;
  pulsePeriod: number;
  baseColor: { r: number; g: number; b: number };
  currentColor: { r: number; g: number; b: number };
  targetColor: { r: number; g: number; b: number };
  colorTransitionProgress: number;
  trail: TrailPoint[];
  maxTrailLength: number;
  baseSpeed: number;
  attractMode: boolean;
  repelMode: boolean;
  orbitTarget: { x: number; y: number } | null;
  orbitAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  inOrbit: boolean;

  constructor(p: p5, x: number, y: number) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.baseSpeed = 0.3 + p.random(0.3);
    const angle = p.random(p.TWO_PI);
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.brightness = 0.2;
    this.pulsePhase = p.random(p.TWO_PI);
    this.pulsePeriod = 1 + p.random(2);
    this.baseColor = COLORS[Math.floor(p.random(COLORS.length))];
    this.currentColor = { ...this.baseColor };
    this.targetColor = COLORS[Math.floor(p.random(COLORS.length))];
    this.colorTransitionProgress = p.random(1);
    this.trail = [];
    this.maxTrailLength = 8;
    this.attractMode = false;
    this.repelMode = false;
    this.orbitTarget = null;
    this.orbitAngle = p.random(p.TWO_PI);
    this.orbitRadius = 0;
    this.orbitSpeed = 0.5;
    this.inOrbit = false;
  }

  update(dt: number, time: number, mouseX: number, mouseY: number) {
    this.brightness = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin((time / this.pulsePeriod) * this.p.TWO_PI + this.pulsePhase));

    this.colorTransitionProgress += dt * 0.15;
    if (this.colorTransitionProgress >= 1) {
      this.colorTransitionProgress = 0;
      this.baseColor = this.targetColor;
      this.targetColor = COLORS[Math.floor(this.p.random(COLORS.length))];
    }

    const t = this.colorTransitionProgress;
    let r = this.baseColor.r + (this.targetColor.r - this.baseColor.r) * t;
    let g = this.baseColor.g + (this.targetColor.g - this.baseColor.g) * t;
    let b = this.baseColor.b + (this.targetColor.b - this.baseColor.b) * t;

    if (this.attractMode) {
      r = r + (WARM_COLOR.r - r) * 0.6;
      g = g + (WARM_COLOR.g - g) * 0.6;
      b = b + (WARM_COLOR.b - b) * 0.6;
    } else if (this.repelMode) {
      r = r + (COLD_COLOR.r - r) * 0.6;
      g = g + (COLD_COLOR.g - g) * 0.6;
      b = b + (COLD_COLOR.b - b) * 0.6;
    }

    this.currentColor = { r, g, b };

    this.trail.unshift({ x: this.x, y: this.y, alpha: 0 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      if (i < 3) {
        this.trail[i].alpha = 0;
      } else {
        this.trail[i].alpha = (1 - i / this.maxTrailLength) * 0.5;
      }
    }

    if (this.inOrbit && this.orbitTarget) {
      this.orbitAngle += this.orbitSpeed * dt;
      const targetX = this.orbitTarget.x + Math.cos(this.orbitAngle) * this.orbitRadius;
      const targetY = this.orbitTarget.y + Math.sin(this.orbitAngle) * this.orbitRadius * 0.6;
      this.vx = (targetX - this.x) * 0.08;
      this.vy = (targetY - this.y) * 0.08;
    } else {
      this.vx += (this.p.random() - 0.5) * 0.1;
      this.vy += (this.p.random() - 0.5) * 0.1;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    let maxSpeed = this.baseSpeed;
    if (this.repelMode) maxSpeed *= 2;
    if (this.attractMode) maxSpeed *= 0.6;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }
    if (speed < this.baseSpeed * 0.3) {
      this.vx = (this.vx / speed) * this.baseSpeed * 0.3;
      this.vy = (this.vy / speed) * this.baseSpeed * 0.3;
    }

    this.x += this.vx;
    this.y += this.vy;
  }

  applyMouseForce(mouseX: number, mouseY: number, mousePressed: boolean, isRightButton: boolean, forceRadius: number) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (mousePressed && dist < forceRadius) {
      const strength = 1 - dist / forceRadius;
      if (!isRightButton) {
        this.attractMode = true;
        this.repelMode = false;
        this.vx += (dx / dist) * strength * 0.8;
        this.vy += (dy / dist) * strength * 0.8;
      } else {
        this.attractMode = false;
        this.repelMode = true;
        this.vx -= (dx / dist) * strength * 1.5;
        this.vy -= (dy / dist) * strength * 1.5;
      }
    } else {
      this.attractMode = false;
      this.repelMode = false;
    }
  }

  enterOrbit(centerX: number, centerY: number, radius: number) {
    this.inOrbit = true;
    this.orbitTarget = { x: centerX, y: centerY };
    this.orbitRadius = radius * (0.8 + this.p.random(0.4));
    this.orbitAngle = this.p.random(this.p.TWO_PI);
    this.orbitSpeed = (0.4 + this.p.random(0.2)) * (this.p.random() > 0.5 ? 1 : -1);
  }

  exitOrbit() {
    this.inOrbit = false;
    this.orbitTarget = null;
  }

  draw() {
    const p = this.p;

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      if (point.alpha <= 0) continue;
      p.noStroke();
      p.fill(this.currentColor.r, this.currentColor.g, this.currentColor.b, point.alpha * 255);
      p.ellipse(point.x, point.y, 2, 2);
    }

    const glowSize = 8 * this.brightness;
    p.noStroke();
    for (let i = 3; i >= 1; i--) {
      const size = glowSize * i * 1.5;
      const alpha = (this.brightness / i) * 0.15;
      p.fill(this.currentColor.r, this.currentColor.g, this.currentColor.b, alpha * 255);
      p.ellipse(this.x, this.y, size, size);
    }

    p.fill(this.currentColor.r, this.currentColor.g, this.currentColor.b, this.brightness * 255);
    p.ellipse(this.x, this.y, 3, 3);
  }
}

export class FireflyManager {
  private p: p5;
  fireflies: Firefly[];
  maxCount: number;

  constructor(p: p5, maxCount: number) {
    this.p = p;
    this.maxCount = maxCount;
    this.fireflies = [];
    this.spawnInitial();
  }

  spawnInitial() {
    const count = Math.min(this.maxCount, 400);
    for (let i = 0; i < count; i++) {
      const x = this.p.random(this.p.width);
      const y = this.p.random(this.p.height);
      this.fireflies.push(new Firefly(this.p, x, y));
    }
  }

  update(dt: number, time: number, mouseX: number, mouseY: number, mousePressed: boolean, isRightButton: boolean) {
    const forceRadius = 150;
    for (const firefly of this.fireflies) {
      firefly.applyMouseForce(mouseX, mouseY, mousePressed, isRightButton, forceRadius);
      firefly.update(dt, time, mouseX, mouseY);

      if (firefly.x < -50) firefly.x = this.p.width + 50;
      if (firefly.x > this.p.width + 50) firefly.x = -50;
      if (firefly.y < -50) firefly.y = this.p.height + 50;
      if (firefly.y > this.p.height + 50) firefly.y = -50;
    }
  }

  attractToPoint(x: number, y: number, count: number, radius: number) {
    const candidates: Firefly[] = [];
    for (const f of this.fireflies) {
      if (!f.inOrbit) {
        candidates.push(f);
      }
    }
    candidates.sort((a, b) => {
      const da = (a.x - x) ** 2 + (a.y - y) ** 2;
      const db = (b.x - x) ** 2 + (b.y - y) ** 2;
      return da - db;
    });
    const selected = candidates.slice(0, Math.min(count, candidates.length));
    for (const f of selected) {
      f.enterOrbit(x, y, radius);
    }
  }

  draw() {
    for (const firefly of this.fireflies) {
      firefly.draw();
    }
  }
}
