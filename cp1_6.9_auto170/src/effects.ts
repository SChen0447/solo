import p5 from 'p5';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: p5.Color;
}

export class StardustBurst {
  private p: p5;
  private particles: Particle[] = [];

  constructor(p: p5, cx: number, cy: number, color: p5.Color, count: number = 150, radius: number = 150, life: number = 1.5) {
    this.p = p;
    for (let i = 0; i < count; i++) {
      const angle = p.random(0, p.TWO_PI);
      const speed = p.random(radius * 0.3, radius) / life;
      this.particles.push({
        x: cx,
        y: cy,
        vx: p.cos(angle) * speed,
        vy: p.sin(angle) * speed,
        life: life,
        maxLife: life,
        size: p.random(1.5, 4),
        color: color
      });
    }
  }

  update(dt: number): boolean {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    return this.particles.length > 0;
  }

  render(): void {
    const p = this.p;
    p.noStroke();
    for (const pt of this.particles) {
      const alpha = p.map(pt.life, 0, pt.maxLife, 0, 1);
      p.push();
      p.drawingContext.globalAlpha = alpha;
      p.fill(pt.color);
      p.ellipse(pt.x, pt.y, pt.size, pt.size);
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = pt.color.toString();
      p.pop();
    }
  }
}

export class RadialWave {
  private p: p5;
  private cx: number;
  private cy: number;
  private radius: number = 0;
  private maxRadius: number;
  private duration: number;
  private elapsed: number = 0;
  private color: p5.Color;

  constructor(p: p5, cx: number, cy: number, color: p5.Color, maxRadius: number = 60, duration: number = 0.6) {
    this.p = p;
    this.cx = cx;
    this.cy = cy;
    this.color = color;
    this.maxRadius = maxRadius;
    this.duration = duration;
  }

  update(dt: number): boolean {
    this.elapsed += dt;
    this.radius = this.p.map(this.elapsed, 0, this.duration, 0, this.maxRadius);
    return this.elapsed < this.duration;
  }

  render(): void {
    const p = this.p;
    const alpha = p.map(this.elapsed, 0, this.duration, 0.8, 0);
    const lineWidth = p.map(this.elapsed, 0, this.duration, 6, 1);
    p.push();
    p.noFill();
    p.stroke(this.color);
    p.strokeWeight(lineWidth);
    p.drawingContext.globalAlpha = alpha;
    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = this.color.toString();
    p.ellipse(this.cx, this.cy, this.radius * 2, this.radius * 2);
    p.pop();
  }
}

export class RuneRing {
  private p: p5;
  private cx: number;
  private cy: number;
  private radius: number;
  private angle: number = 0;
  private runeSymbols: string[] = ['✦', '✧', '❋', '✺', '✹', '✸', '✷', '✶', '❆', '❄', '❅', '※'];
  private currentRuneIndex: number = 0;
  private lastSwitchTime: number = 0;
  private switchInterval: number = 0.5;

  constructor(p: p5, cx: number, cy: number, radius: number) {
    this.p = p;
    this.cx = cx;
    this.cy = cy;
    this.radius = radius;
  }

  update(dt: number, t: number): void {
    this.angle += dt * 0.3;
    if (t - this.lastSwitchTime > this.switchInterval) {
      this.lastSwitchTime = t;
      this.currentRuneIndex = (this.currentRuneIndex + 1) % this.runeSymbols.length;
    }
  }

  render(): void {
    const p = this.p;
    const runeColor = p.color(136, 170, 255);
    p.push();
    p.translate(this.cx, this.cy);
    for (let i = 0; i < 12; i++) {
      const a = this.angle + (i * p.TWO_PI) / 12;
      const x = p.cos(a) * this.radius;
      const y = p.sin(a) * this.radius;
      const runeIdx = (this.currentRuneIndex + i) % this.runeSymbols.length;
      p.push();
      p.translate(x, y);
      p.rotate(a + p.HALF_PI);
      p.fill(runeColor);
      p.noStroke();
      p.textSize(18);
      p.textAlign(p.CENTER, p.CENTER);
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = runeColor.toString();
      p.text(this.runeSymbols[runeIdx], 0, 0);
      p.pop();
    }
    p.pop();
  }
}

export class BackgroundStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  period: number;
  vx: number;
  vy: number;

  constructor(p: p5, w: number, h: number) {
    this.x = p.random(0, w);
    this.y = p.random(0, h);
    this.size = p.random(1, 3);
    this.baseAlpha = p.random(0.2, 0.8);
    this.phase = p.random(0, p.TWO_PI);
    this.period = p.random(0.3, 1.8);
    const angle = p.random(0, p.TWO_PI);
    this.vx = p.cos(angle) * 0.3;
    this.vy = p.sin(angle) * 0.3;
  }

  update(dt: number, w: number, h: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.phase += (p5.prototype.TWO_PI / this.period) * dt;
    if (this.x < 0) this.x = w;
    if (this.x > w) this.x = 0;
    if (this.y < 0) this.y = h;
    if (this.y > h) this.y = 0;
  }

  render(p: p5, _t: number): void {
    const twinkle = 0.5 + 0.5 * Math.sin(this.phase);
    const alpha = this.baseAlpha * twinkle;
    p.noStroke();
    p.fill(255, 255, 255, alpha * 255);
    p.ellipse(this.x, this.y, this.size, this.size);
  }
}

export interface FlowPoint {
  t: number;
  speed: number;
}

export class ConnectionLine {
  private p: p5;
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private color: p5.Color;
  private appearTime: number = 0;
  private appearDuration: number = 0.3;
  private flowPoints: FlowPoint[] = [];
  private intensified: boolean = false;
  private flashTimer: number = 0;
  private flashCount: number = 0;
  private maxFlashes: number = 3;
  private flashDuration: number = 0.5;

  constructor(p: p5, x1: number, y1: number, x2: number, y2: number, color: p5.Color) {
    this.p = p;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    for (let i = 0; i < 3; i++) {
      this.flowPoints.push({
        t: Math.random(),
        speed: 1.0
      });
    }
  }

  update(dt: number): void {
    if (this.appearTime < this.appearDuration) {
      this.appearTime += dt;
    }
    for (const fp of this.flowPoints) {
      fp.t += fp.speed * dt;
      if (fp.t > 1) fp.t -= 1;
    }
    if (this.intensified && this.flashCount < this.maxFlashes) {
      this.flashTimer += dt;
      if (this.flashTimer >= this.flashDuration) {
        this.flashTimer = 0;
        this.flashCount++;
      }
    }
  }

  intensify(): void {
    this.intensified = true;
    this.flashTimer = 0;
    this.flashCount = 0;
  }

  isFlashing(): boolean {
    return this.intensified && this.flashCount < this.maxFlashes;
  }

  render(): void {
    const p = this.p;
    const appearProgress = Math.min(this.appearTime / this.appearDuration, 1);
    let baseAlpha = 0.6 * appearProgress;
    let lineWidth = 2;
    let glowSize = 10;

    if (this.isFlashing()) {
      const flashPhase = this.flashTimer / this.flashDuration;
      const flashIntensity = 0.5 + 0.5 * Math.sin(flashPhase * Math.PI * 2);
      baseAlpha = 0.8 + 0.2 * flashIntensity;
      lineWidth = 3 + flashIntensity * 2;
      glowSize = 20 + flashIntensity * 15;
    } else if (this.intensified) {
      baseAlpha = 0.9;
      lineWidth = 3;
      glowSize = 18;
    }

    p.push();
    p.noFill();
    p.stroke(this.color);
    p.strokeWeight(lineWidth);
    p.drawingContext.globalAlpha = baseAlpha;
    p.drawingContext.shadowBlur = glowSize;
    p.drawingContext.shadowColor = this.color.toString();
    p.line(this.x1, this.y1, this.x2, this.y2);
    p.pop();

    p.push();
    p.noStroke();
    for (const fp of this.flowPoints) {
      const px = p.lerp(this.x1, this.x2, fp.t);
      const py = p.lerp(this.y1, this.y2, fp.t);
      p.fill(this.color);
      p.drawingContext.globalAlpha = baseAlpha;
      p.drawingContext.shadowBlur = 12;
      p.drawingContext.shadowColor = this.color.toString();
      p.ellipse(px, py, 4, 4);
    }
    p.pop();
  }

  getEndpoints(): { x1: number; y1: number; x2: number; y2: number } {
    return { x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2 };
  }
}
