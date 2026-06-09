import p5 from 'p5';
import { UIController, SimulationParams } from './ui';

const PALETTE: string[] = [
  '#ff6b35', '#4ecdc4', '#ffd166', '#ef476f', '#06d6a0',
  '#118ab2', '#f78c6b', '#8338ec', '#3a86ff', '#fb5607',
  '#ff006e', '#8ac926'
];

const CONTAINER_WIDTH = 400;
const CONTAINER_HEIGHT = 600;
const CORNER_RADIUS = 20;
const MAX_PARTICLES = 2000;
const MERGE_THRESHOLD = 5;
const COLOR_DIFF_THRESHOLD = 15;
const SMALL_PARTICLE_RADIUS = 3;

interface InkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: p5.Color;
  hue: number;
  saturation: number;
  brightness: number;
  alpha: number;
  settled: boolean;
  fading: boolean;
  fadeStartAlpha: number;
  fadeFrame: number;
}

class InkSimulation {
  private p: p5;
  private particles: InkParticle[] = [];
  private ui: UIController;
  private params: SimulationParams;
  private containerX: number = 0;
  private containerY: number = 0;
  private waterSurfaceY: number = 0;

  constructor(p: p5) {
    this.p = p;
    this.ui = new UIController();
    this.params = this.ui.getParams();

    this.ui.setOnParamsChange((params) => {
      this.params = params;
    });

    this.ui.setOnClear(() => {
      this.clearContainer();
    });
  }

  public setup(): void {
    const canvas = this.p.createCanvas(this.p.windowWidth, this.p.windowHeight);
    canvas.parent('canvas-container');
    this.p.colorMode(this.p.HSB, 360, 100, 100, 100);
    this.updateContainerPosition();
  }

  public draw(): void {
    this.p.clear();
    this.updateContainerPosition();
    this.drawContainer();
    this.updateAndDrawParticles();
    this.optimizeParticles();
  }

  public windowResized(): void {
    this.p.resizeCanvas(this.p.windowWidth, this.p.windowHeight);
    this.updateContainerPosition();
  }

  public mousePressed(): void {
    if (this.isInsideContainer(this.p.mouseX, this.p.mouseY)) {
      this.spawnInkDrop(this.p.mouseX, this.p.mouseY);
    }
  }

  private updateContainerPosition(): void {
    this.containerX = (this.p.width - CONTAINER_WIDTH) / 2;
    this.containerY = (this.p.height - CONTAINER_HEIGHT) / 2;
    this.waterSurfaceY = this.containerY + 40;
  }

  private isInsideContainer(x: number, y: number): boolean {
    return (
      x >= this.containerX &&
      x <= this.containerX + CONTAINER_WIDTH &&
      y >= this.containerY &&
      y <= this.containerY + CONTAINER_HEIGHT
    );
  }

  private drawContainer(): void {
    const p = this.p;

    p.noStroke();
    const waterGradient = p.drawingContext.createLinearGradient(
      this.containerX, this.containerY,
      this.containerX, this.containerY + CONTAINER_HEIGHT
    );
    waterGradient.addColorStop(0, 'rgba(224, 247, 250, 0.4)');
    waterGradient.addColorStop(0.5, 'rgba(178, 235, 242, 0.3)');
    waterGradient.addColorStop(1, 'rgba(128, 222, 234, 0.35)');

    this.drawRoundedRect(
      this.containerX, this.containerY,
      CONTAINER_WIDTH, CONTAINER_HEIGHT,
      CORNER_RADIUS
    );
    p.drawingContext.fillStyle = waterGradient;
    p.drawingContext.fill();

    p.noFill();
    p.stroke(200, 80, 70, 80);
    p.strokeWeight(1);
    this.drawRoundedRect(
      this.containerX, this.containerY,
      CONTAINER_WIDTH, CONTAINER_HEIGHT,
      CORNER_RADIUS
    );

    p.noStroke();
    const glassGradient = p.drawingContext.createLinearGradient(
      this.containerX + 20, this.containerY,
      this.containerX + 60, this.containerY
    );
    glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    p.drawingContext.save();
    this.clipRoundedRect(
      this.containerX, this.containerY,
      CONTAINER_WIDTH, CONTAINER_HEIGHT,
      CORNER_RADIUS
    );
    p.drawingContext.fillStyle = glassGradient;
    p.drawingContext.fillRect(
      this.containerX + 15, this.containerY + 10,
      40, CONTAINER_HEIGHT - 20
    );
    p.drawingContext.restore();
  }

  private drawRoundedRect(
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    const p = this.p;
    p.beginShape();
    p.vertex(x + r, y);
    p.vertex(x + w - r, y);
    p.quadraticVertex(x + w, y, x + w, y + r);
    p.vertex(x + w, y + h - r);
    p.quadraticVertex(x + w, y + h, x + w - r, y + h);
    p.vertex(x + r, y + h);
    p.quadraticVertex(x, y + h, x, y + h - r);
    p.vertex(x, y + r);
    p.quadraticVertex(x, y, x + r, y);
    p.endShape(p.CLOSE);
  }

  private clipRoundedRect(
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    const ctx = this.p.drawingContext;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.clip();
  }

  private spawnInkDrop(x: number, y: number): void {
    const p = this.p;
    const colorHex = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const inkColor = p.color(colorHex);

    const particle: InkParticle = {
      x: x,
      y: y,
      vx: p.random(-0.2, 0.2),
      vy: 0.3,
      radius: 8,
      color: inkColor,
      hue: p.hue(inkColor),
      saturation: p.saturation(inkColor),
      brightness: p.brightness(inkColor),
      alpha: 90,
      settled: false,
      fading: false,
      fadeStartAlpha: 0,
      fadeFrame: 0,
    };

    this.particles.push(particle);
  }

  private updateAndDrawParticles(): void {
    const p = this.p;
    const ctx = p.drawingContext;

    ctx.save();
    this.clipRoundedRect(
      this.containerX, this.containerY,
      CONTAINER_WIDTH, CONTAINER_HEIGHT,
      CORNER_RADIUS
    );

    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      this.updateParticle(particle);

      if (particle.fading) {
        particle.fadeFrame++;
        particle.alpha = particle.fadeStartAlpha * (1 - particle.fadeFrame / 30);
        if (particle.fadeFrame >= 30) {
          this.particles.splice(i, 1);
          continue;
        }
      }

      p.noStroke();
      p.fill(particle.hue, particle.saturation, particle.brightness, particle.alpha);
      p.ellipse(particle.x, particle.y, particle.radius * 2, particle.radius * 2);
    }

    ctx.restore();
  }

  private updateParticle(particle: InkParticle): void {
    const p = this.p;

    if (!particle.settled) {
      const gravity = 0.3 * this.params.pigmentDensity;
      const viscosityFactor = 1 - this.params.liquidViscosity * 0.7;

      particle.vy += gravity * 0.05;
      particle.vy *= viscosityFactor;
      particle.vx *= viscosityFactor;

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.y >= this.waterSurfaceY) {
        const diffusionRate = (0.2 + p.random(0, 0.3)) * this.params.diffusionSpeed;
        particle.radius += diffusionRate;

        particle.vx += p.random(-0.1, 0.1) * (1 - this.params.liquidViscosity);

        if (particle.alpha > 40) {
          particle.alpha -= 0.15 * this.params.liquidViscosity;
        }

        this.mixWithNearbyParticles(particle);
      }

      const bottomLimit = this.containerY + CONTAINER_HEIGHT - particle.radius;
      if (particle.y > bottomLimit) {
        particle.y = bottomLimit;
        particle.vy *= -0.2;
        particle.settled = particle.radius > 20;
      }

      const leftLimit = this.containerX + particle.radius;
      const rightLimit = this.containerX + CONTAINER_WIDTH - particle.radius;
      if (particle.x < leftLimit) {
        particle.x = leftLimit;
        particle.vx *= -0.5;
      }
      if (particle.x > rightLimit) {
        particle.x = rightLimit;
        particle.vx *= -0.5;
      }

      const topLimit = this.containerY + particle.radius;
      if (particle.y < topLimit) {
        particle.y = topLimit;
        particle.vy *= -0.3;
      }
    }
  }

  private mixWithNearbyParticles(particle: InkParticle): void {
    const p = this.p;
    const mixRadius = particle.radius * 2;

    for (const other of this.particles) {
      if (other === particle) continue;
      if (other.fading) continue;

      const dx = other.x - particle.x;
      const dy = other.y - particle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < mixRadius + other.radius) {
        const mixFactor = 0.02 * (1 - this.params.liquidViscosity * 0.5);

        particle.hue = this.lerpHue(particle.hue, other.hue, mixFactor);
        other.hue = this.lerpHue(other.hue, particle.hue, mixFactor);

        particle.saturation = p.lerp(particle.saturation, other.saturation, mixFactor);
        other.saturation = p.lerp(other.saturation, particle.saturation, mixFactor);

        particle.brightness = p.lerp(particle.brightness, other.brightness, mixFactor);
        other.brightness = p.lerp(other.brightness, particle.brightness, mixFactor);
      }
    }
  }

  private lerpHue(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    let result = a + diff * t;
    if (result < 0) result += 360;
    if (result > 360) result -= 360;
    return result;
  }

  private optimizeParticles(): void {
    if (this.particles.length <= MAX_PARTICLES) return;

    const toRemove: Set<number> = new Set();
    const particles = this.particles;

    for (let i = 0; i < particles.length && toRemove.size < 100; i++) {
      if (toRemove.has(i)) continue;
      const p1 = particles[i];
      if (p1.radius > SMALL_PARTICLE_RADIUS) continue;
      if (p1.fading) continue;

      for (let j = i + 1; j < particles.length && toRemove.size < 100; j++) {
        if (toRemove.has(j)) continue;
        const p2 = particles[j];
        if (p2.radius > SMALL_PARTICLE_RADIUS) continue;
        if (p2.fading) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MERGE_THRESHOLD) {
          const hueDiff = Math.abs(p1.hue - p2.hue);
          const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);

          if (normalizedDiff < COLOR_DIFF_THRESHOLD) {
            const totalArea = p1.radius * p1.radius + p2.radius * p2.radius;
            const w1 = (p1.radius * p1.radius) / totalArea;
            const w2 = (p2.radius * p2.radius) / totalArea;

            p1.x = p1.x * w1 + p2.x * w2;
            p1.y = p1.y * w1 + p2.y * w2;
            p1.radius = Math.sqrt(totalArea);
            p1.hue = this.lerpHue(p1.hue, p2.hue, w2);
            p1.saturation = p1.saturation * w1 + p2.saturation * w2;
            p1.brightness = p1.brightness * w1 + p2.brightness * w2;
            p1.alpha = Math.max(p1.alpha, p2.alpha);

            toRemove.add(j);
          }
        }
      }
    }

    if (toRemove.size > 0) {
      this.particles = particles.filter((_, idx) => !toRemove.has(idx));
    }
  }

  private clearContainer(): void {
    for (const particle of this.particles) {
      if (!particle.fading) {
        particle.fading = true;
        particle.fadeStartAlpha = particle.alpha;
        particle.fadeFrame = 0;
      }
    }
  }
}

const sketch = (p: p5): void => {
  let simulation: InkSimulation;

  p.setup = () => {
    simulation = new InkSimulation(p);
    simulation.setup();
  };

  p.draw = () => {
    simulation.draw();
  };

  p.windowResized = () => {
    simulation.windowResized();
  };

  p.mousePressed = () => {
    simulation.mousePressed();
  };
};

new p5(sketch);
