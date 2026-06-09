import type p5 from 'p5';
import { ColorPalette, type HSLColor } from './colorPalette';
import { InteractionManager } from './interaction';

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  baseColor: HSLColor;
  currentColor: HSLColor;
  size: number;
  baseSize: number;
  alpha: number;
  targetAlpha: number;
  life: number;
  maxLife: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  speedJitter: number;
}

export class FlowFieldRenderer {
  private p: p5;
  private particles: Particle[];
  private particleCount: number;
  private fieldScale: number;
  private cols: number;
  private rows: number;
  private field: { x: number; y: number }[];
  private time: number;
  private colorPalette: ColorPalette;
  private interactionManager: InteractionManager;
  private width: number;
  private height: number;
  private fadingParticles: Set<number>;
  private spawningNew: boolean;
  private spawnProgress: number;

  constructor(
    p: p5,
    width: number,
    height: number,
    colorPalette: ColorPalette,
    interactionManager: InteractionManager
  ) {
    this.p = p;
    this.width = width;
    this.height = height;
    this.colorPalette = colorPalette;
    this.interactionManager = interactionManager;
    this.particles = [];
    this.particleCount = 250;
    this.fieldScale = 40;
    this.cols = Math.ceil(width / this.fieldScale) + 1;
    this.rows = Math.ceil(height / this.fieldScale) + 1;
    this.field = [];
    this.time = 0;
    this.fadingParticles = new Set();
    this.spawningNew = false;
    this.spawnProgress = 0;

    this.initField();
    this.initParticles(30);
  }

  private initField(): void {
    this.field = [];
    for (let i = 0; i < this.cols * this.rows; i++) {
      this.field.push({ x: 0, y: 0 });
    }
  }

  private initParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(x?: number, y?: number, fadeIn: boolean = false): Particle {
    const px = x ?? Math.random() * this.width;
    const py = y ?? Math.random() * this.height;
    const color = this.colorPalette.getIsTransitioning()
      ? this.colorPalette.getInterpolatedColor()
      : this.colorPalette.getRandomColor();

    return {
      x: px,
      y: py,
      prevX: px,
      prevY: py,
      vx: 0,
      vy: 0,
      baseColor: { ...color },
      currentColor: { ...color },
      size: Math.random() * 8 + 4,
      baseSize: Math.random() * 8 + 4,
      alpha: fadeIn ? 0 : Math.random() * 0.15 + 0.05,
      targetAlpha: Math.random() * 0.15 + 0.05,
      life: Math.random() * 500 + 200,
      maxLife: 700,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
      speedJitter: Math.random() * 0.5 + 0.8
    };
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cols = Math.ceil(width / this.fieldScale) + 1;
    this.rows = Math.ceil(height / this.fieldScale) + 1;
    this.initField();
  }

  startSeasonTransition(): void {
    this.fadingParticles = new Set(this.particles.map((_, i) => i));
    this.spawningNew = true;
    this.spawnProgress = 0;
  }

  update(): void {
    this.time += 0.003;
    this.updateFlowField();

    const isTransitioning = this.colorPalette.getIsTransitioning();
    const transitionProgress = this.colorPalette.getTransitionProgress();

    if (isTransitioning && this.spawningNew) {
      this.spawnProgress = transitionProgress;
      const targetCount = this.particleCount;
      const currentCount = this.particles.filter((p) => !this.fadingParticles.has(this.particles.indexOf(p))).length;
      const desiredCount = Math.floor(targetCount * this.spawnProgress);

      while (currentCount + this.particles.filter((p) => p.alpha > 0.01 && !this.fadingParticles.has(this.particles.indexOf(p))).length - currentCount < desiredCount) {
        const newParticle = this.createParticle(undefined, undefined, true);
        newParticle.targetAlpha = Math.random() * 0.15 + 0.05;
        this.particles.push(newParticle);
        if (this.particles.length > this.particleCount * 2) break;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      this.updateParticle(particle, i);

      if (this.fadingParticles.has(i)) {
        particle.targetAlpha = 0;
        particle.alpha = this.p.lerp(particle.alpha, particle.targetAlpha, 0.03);
        if (particle.alpha < 0.01) {
          this.particles.splice(i, 1);
          this.fadingParticles.delete(i);
          continue;
        }
      } else if (particle.alpha < particle.targetAlpha) {
        particle.alpha = this.p.lerp(particle.alpha, particle.targetAlpha, 0.02);
      }

      particle.life--;
      if (particle.life <= 0 && !this.fadingParticles.has(i)) {
        const idx = this.particles.indexOf(particle);
        this.particles.splice(idx, 1);
        this.particles.push(this.createParticle());
      }
    }

    if (!isTransitioning) {
      while (this.particles.length < this.particleCount) {
        this.particles.push(this.createParticle());
      }
      this.spawningNew = false;
    }
  }

  private updateFlowField(): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const index = y * this.cols + x;
        const noiseVal = this.p.noise(x * 0.1, y * 0.1, this.time);
        const angle = noiseVal * this.p.TWO_PI * 2;
        this.field[index].x = Math.cos(angle);
        this.field[index].y = Math.sin(angle);
      }
    }
  }

  private updateParticle(particle: Particle, index: number): void {
    particle.prevX = particle.x;
    particle.prevY = particle.y;

    const gridX = Math.floor(particle.x / this.fieldScale);
    const gridY = Math.floor(particle.y / this.fieldScale);
    const clampedX = this.p.constrain(gridX, 0, this.cols - 1);
    const clampedY = this.p.constrain(gridY, 0, this.rows - 1);
    const fieldIndex = clampedY * this.cols + clampedX;
    const fieldVector = this.field[fieldIndex];

    let baseSpeed = (Math.random() * 0.9 + 0.3) * particle.speedJitter;

    const heatEffect = this.interactionManager.getHeatEffect(particle.x, particle.y);
    const coldEffect = this.interactionManager.getColdEffect(particle.x, particle.y);

    if (heatEffect > 0) {
      baseSpeed = this.p.lerp(baseSpeed, baseSpeed * 2.5, heatEffect);
    }

    const contraction = this.interactionManager.getColdContraction(particle.x, particle.y);

    particle.vx = fieldVector.x * baseSpeed + contraction.dx;
    particle.vy = fieldVector.y * baseSpeed + contraction.dy;

    const jitterX = (Math.random() - 0.5) * 0.3;
    const jitterY = (Math.random() - 0.5) * 0.3;

    particle.x += particle.vx + jitterX;
    particle.y += particle.vy + jitterY;

    if (particle.x < -20) particle.x = this.width + 20;
    if (particle.x > this.width + 20) particle.x = -20;
    if (particle.y < -20) particle.y = this.height + 20;
    if (particle.y > this.height + 20) particle.y = -20;

    this.updateParticleColor(particle, heatEffect, coldEffect);

    const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
    particle.size = particle.baseSize + this.p.map(speed, 0, 3, 0, 4);
  }

  private updateParticleColor(particle: Particle, heatEffect: number, coldEffect: number): void {
    let color = { ...particle.baseColor };

    if (this.colorPalette.getIsTransitioning()) {
      const t = this.colorPalette.getTransitionProgress();
      color = this.colorPalette.getInterpolatedColor();
      particle.baseColor = { ...color };
    }

    color = this.colorPalette.getDiffusionEffect(particle.x, particle.y, color);

    if (heatEffect > 0) {
      const warmColor = this.colorPalette.shiftColorWarm(color);
      color.h = this.p.lerp(color.h, warmColor.h, heatEffect * 0.5);
      color.s = this.p.lerp(color.s, warmColor.s, heatEffect * 0.5);
      color.l = this.p.lerp(color.l, warmColor.l, heatEffect * 0.5);
    }

    if (coldEffect > 0) {
      const coolColor = this.colorPalette.shiftColorCool(color);
      color.h = this.p.lerp(color.h, coolColor.h, coldEffect * 0.5);
      color.s = this.p.lerp(color.s, coolColor.s, coldEffect * 0.5);
      color.l = this.p.lerp(color.l, coolColor.l, coldEffect * 0.5);
    }

    const pulseMult = this.interactionManager.getPulseBrightnessMultiplier();
    color.l = Math.min(color.l * pulseMult, 100);

    particle.currentColor = color;
  }

  draw(): void {
    const pg = this.p;

    for (const particle of this.particles) {
      if (particle.alpha < 0.01) continue;

      const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
      const blurRadius = this.p.map(speed, 0, 3, 0.5, 2.0);

      const colorStr = ColorPalette.hslToString(particle.currentColor, particle.alpha);

      pg.stroke(colorStr);
      pg.strokeWeight(particle.size + blurRadius);
      pg.strokeCap(this.p.ROUND);
      pg.line(particle.prevX, particle.prevY, particle.x, particle.y);

      pg.noStroke();
      pg.fill(colorStr);
      pg.ellipse(particle.x, particle.y, particle.size, particle.size);
    }
  }

  drawBackgroundWash(): void {
    this.p.noStroke();
    for (let i = 0; i < 15; i++) {
      const color = this.colorPalette.getRandomColor();
      const alpha = 0.03;
      this.p.fill(ColorPalette.hslToString(color, alpha));
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const r = Math.random() * 300 + 200;
      this.p.ellipse(x, y, r, r);
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
