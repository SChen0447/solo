import p5 from 'p5';

interface Particle {
  baseX: number;
  baseY: number;
  baseSize: number;
  color: p5.Color;
  breathPhase: number;
  breathPeriod: number;
  alphaPhase: number;
  alphaPeriod: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: p5.Color;
  life: number;
  maxLife: number;
}

export interface ShockWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  active: boolean;
}

export type LineState = 'drawing' | 'rotating' | 'fading' | 'exploding';

export class ParticleLine {
  private p: p5;
  private particles: Particle[] = [];
  private explosionParticles: ExplosionParticle[] = [];
  private lastPoint: { x: number; y: number } | null = null;
  private accumulatedDistance = 0;
  private state: LineState = 'drawing';
  private rotationAngle = 0;
  private rotationSpeed: number;
  private fadeProgress = 0;
  private fadeDuration = 180;
  private centerX = 0;
  private centerY = 0;
  public shockWave: ShockWave | null = null;
  private isExploding = false;
  private explodingTimer = 0;
  private explodingDuration = 120;
  private creationTime: number;

  constructor(p: p5, centerX: number, centerY: number) {
    this.p = p;
    this.centerX = centerX;
    this.centerY = centerY;
    this.rotationSpeed = (p.TWO_PI / 30) / 60;
    this.creationTime = p.frameCount;
  }

  public addPoint(x: number, y: number, speed: number): void {
    if (this.state !== 'drawing') return;

    if (this.lastPoint === null) {
      this.lastPoint = { x, y };
      this.addParticle(x, y, speed);
      return;
    }

    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const dist = this.p.sqrt(dx * dx + dy * dy);
    this.accumulatedDistance += dist;

    while (this.accumulatedDistance >= 5 && this.particles.length < 300) {
      const t = (this.accumulatedDistance - dist + 5) / dist;
      const px = this.lastPoint.x + dx * t;
      const py = this.lastPoint.y + dy * t;
      this.addParticle(px, py, speed);
      this.accumulatedDistance -= 5;
    }

    this.lastPoint = { x, y };
  }

  private addParticle(x: number, y: number, speed: number): void {
    if (this.particles.length >= 300) return;

    let colorHex: string;
    if (speed < 1.5) {
      colorHex = '#ff6699';
    } else if (speed < 3.5) {
      colorHex = '#66ccff';
    } else {
      colorHex = '#ffcc44';
    }

    const particle: Particle = {
      baseX: x,
      baseY: y,
      baseSize: this.p.random(3, 6),
      color: this.p.color(colorHex),
      breathPhase: this.p.random(this.p.TWO_PI),
      breathPeriod: this.p.random(1.5, 3),
      alphaPhase: this.p.random(this.p.TWO_PI),
      alphaPeriod: this.p.random(1.5, 3)
    };

    this.particles.push(particle);
  }

  public finishDrawing(): void {
    if (this.state === 'drawing') {
      this.state = 'rotating';
    }
  }

  public update(centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;

    if (this.state === 'rotating') {
      this.rotationAngle += this.rotationSpeed;
    } else if (this.state === 'fading') {
      this.fadeProgress++;
      if (this.fadeProgress >= this.fadeDuration) {
        this.state = 'dead';
      }
    } else if (this.state === 'exploding') {
      this.isExploding = true;
      this.explodingTimer++;
      this.updateExplosion();
      if (this.explodingTimer >= this.explodingDuration) {
        this.state = 'dead';
      }
    }

    if (this.shockWave && this.shockWave.active) {
      this.shockWave.progress += 1 / 90;
      if (this.shockWave.progress >= 1) {
        this.shockWave.active = false;
      }
    }
  }

  private updateExplosion(): void {
    for (const ep of this.explosionParticles) {
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.vx *= 0.98;
      ep.vy *= 0.98;
      ep.life--;
    }
  }

  public draw(): void {
    const p = this.p;

    if (this.shockWave && this.shockWave.active) {
      const sw = this.shockWave;
      const currentRadius = sw.maxRadius * sw.progress;
      const alpha = (1 - sw.progress) * 255;
      p.noFill();
      p.stroke(255, 255, 255, alpha);
      p.strokeWeight(3);
      p.ellipse(sw.x, sw.y, currentRadius * 2, currentRadius * 2);
      p.strokeWeight(1);
    }

    if (this.isExploding) {
      for (const ep of this.explosionParticles) {
        if (ep.life <= 0) continue;
        const lifeRatio = ep.life / ep.maxLife;
        const size = ep.size * lifeRatio;
        const a = p.alpha(ep.color) * lifeRatio;
        p.noStroke();
        p.fill(p.red(ep.color), p.green(ep.color), p.blue(ep.color), a);
        p.ellipse(ep.x, ep.y, size, size);
      }
      return;
    }

    if (this.state === 'dead') return;

    let globalAlpha = 255;
    if (this.state === 'fading') {
      globalAlpha = 255 * (1 - this.fadeProgress / this.fadeDuration);
    }

    p.push();
    if (this.state === 'rotating' || this.state === 'fading') {
      p.translate(this.centerX, this.centerY);
      p.rotate(this.rotationAngle);
      p.translate(-this.centerX, -this.centerY);
    }

    const frameCount = p.frameCount;

    for (const particle of this.particles) {
      const breathValue = p.sin(
        frameCount / 60 * (p.TWO_PI / particle.breathPeriod) + particle.breathPhase
      );
      const size = particle.baseSize * (0.8 + 0.4 * (breathValue + 1) / 2);

      const alphaValue = p.sin(
        frameCount / 60 * (p.TWO_PI / particle.alphaPeriod) + particle.alphaPhase
      );
      const alpha = (0.3 + 0.5 * (alphaValue + 1) / 2) * (globalAlpha / 255) * 255;

      const r = p.red(particle.color);
      const g = p.green(particle.color);
      const b = p.blue(particle.color);

      p.noStroke();
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha / 255})`;
      p.fill(r, g, b, alpha);
      p.ellipse(particle.baseX, particle.baseY, size, size);
      p.drawingContext.shadowBlur = 0;
    }

    p.pop();
  }

  public hitTest(mx: number, my: number): boolean {
    if (this.state === 'dead' || this.isExploding) return false;

    const p = this.p;
    let cos = 1;
    let sin = 0;
    if (this.state === 'rotating' || this.state === 'fading') {
      cos = p.cos(-this.rotationAngle);
      sin = p.sin(-this.rotationAngle);
    }

    const dx = mx - this.centerX;
    const dy = my - this.centerY;
    const localX = this.centerX + dx * cos - dy * sin;
    const localY = this.centerY + dx * sin + dy * cos;

    for (const particle of this.particles) {
      const ddx = localX - particle.baseX;
      const ddy = localY - particle.baseY;
      const dist = p.sqrt(ddx * ddx + ddy * ddy);
      if (dist < particle.baseSize + 15) {
        return true;
      }
    }
    return false;
  }

  public explode(clickX: number, clickY: number): void {
    if (this.state === 'dead' || this.isExploding) return;

    this.state = 'exploding';
    const p = this.p;

    let cos = 1;
    let sin = 0;
    if (this.state === 'rotating' || this.state === 'fading') {
      cos = p.cos(-this.rotationAngle);
      sin = p.sin(-this.rotationAngle);
    }
    const dx = clickX - this.centerX;
    const dy = clickY - this.centerY;
    const localClickX = this.centerX + dx * cos - dy * sin;
    const localClickY = this.centerY + dx * sin + dy * cos;

    for (const particle of this.particles) {
      const ex = particle.baseX;
      const ey = particle.baseY;
      const vdx = ex - localClickX;
      const vdy = ey - localClickY;
      const dist = p.max(p.sqrt(vdx * vdx + vdy * vdy), 1);
      const speed = p.random(2, 8);

      this.explosionParticles.push({
        x: clickX + (ex - this.centerX) * p.cos(this.rotationAngle) - (ey - this.centerY) * p.sin(this.rotationAngle),
        y: clickY + (ex - this.centerX) * p.sin(this.rotationAngle) + (ey - this.centerY) * p.cos(this.rotationAngle),
        vx: (vdx / dist) * speed + p.random(-1, 1),
        vy: (vdy / dist) * speed + p.random(-1, 1),
        size: particle.baseSize,
        color: particle.color,
        life: this.explodingDuration,
        maxLife: this.explodingDuration
      });
    }

    this.shockWave = {
      x: clickX,
      y: clickY,
      radius: 0,
      maxRadius: 200,
      progress: 0,
      active: true
    };
  }

  public startFading(): void {
    if (this.state === 'rotating') {
      this.state = 'fading';
      this.fadeProgress = 0;
    }
  }

  public isDead(): boolean {
    return this.state === 'dead';
  }

  public getState(): LineState {
    return this.state;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getCreationTime(): number {
    return this.creationTime;
  }
}
