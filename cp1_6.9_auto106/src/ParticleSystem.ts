import p5 from 'p5';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  char: string;
  alpha: number;
  baseAlpha: number;
  sizePhase: number;
  sizeSpeed: number;
  alphaPhase: number;
  birthFrame: number;
  angle: number;
  radius: number;
}

export interface ParticleSystemParams {
  density: number;
  speed: number;
  rotationStrength: number;
  color: string;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export class ParticleSystem {
  private p: p5;
  private particles: Particle[] = [];
  private params: ParticleSystemParams;
  private mouseX: number = -1;
  private mouseY: number = -1;
  private mouseActive: boolean = false;
  private clickPoint: { x: number; y: number } | null = null;
  private clickFrames: number = 0;
  private gathering: boolean = false;
  private holdFrames: number = 0;
  private gatheringAll: boolean = false;

  constructor(p: p5) {
    this.p = p;
    this.params = {
      density: 300,
      speed: 1.0,
      rotationStrength: 0.01,
      color: '#ffffff'
    };
    this.initParticles();
  }

  setParams(params: ParticleSystemParams): void {
    const oldDensity = this.params.density;
    this.params = { ...params };

    if (params.density > oldDensity) {
      const toAdd = params.density - oldDensity;
      for (let i = 0; i < toAdd; i++) {
        this.particles.push(this.createParticle(false));
      }
    } else if (params.density < oldDensity) {
      const toRemove = oldDensity - params.density;
      this.particles.splice(0, toRemove);
    }
  }

  getParams(): ParticleSystemParams {
    return { ...this.params };
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.params.density; i++) {
      this.particles.push(this.createParticle(false));
    }
  }

  private createParticle(fromCenter: boolean): Particle {
    const p = this.p;
    const cx = p.width / 2;
    const cy = p.height / 2;
    const angle = p.random(p.TWO_PI);
    const maxRadius = Math.min(p.width, p.height) / 2.5;
    const radius = fromCenter ? 0 : p.random(20, maxRadius);
    const speed = this.params.speed * p.random(1.0, 3.0);
    const baseSize = p.random(10, 28);
    const baseAlpha = p.random(0.3, 1.0);

    return {
      x: cx + p.cos(angle) * radius,
      y: cy + p.sin(angle) * radius,
      vx: p.cos(angle) * speed,
      vy: p.sin(angle) * speed,
      size: baseSize,
      baseSize: baseSize,
      char: LETTERS.charAt(Math.floor(p.random(LETTERS.length))),
      alpha: baseAlpha,
      baseAlpha: baseAlpha,
      sizePhase: p.random(p.TWO_PI),
      sizeSpeed: p.random(0.02, 0.06),
      alphaPhase: p.random(p.TWO_PI),
      birthFrame: p.frameCount,
      angle: angle,
      radius: radius
    };
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseActive = true;
  }

  clearMouse(): void {
    this.mouseActive = false;
  }

  triggerClick(x: number, y: number): void {
    this.clickPoint = { x, y };
    this.gathering = true;
    this.holdFrames = 0;
  }

  update(): void {
    const p = this.p;
    const cx = p.width / 2;
    const cy = p.height / 2;
    const rotStrength = this.params.rotationStrength;
    const speedMult = this.params.speed;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];

      if (this.gathering && this.clickPoint) {
        const dx = this.clickPoint.x - pt.x;
        const dy = this.clickPoint.y - pt.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (this.holdFrames < 30) {
          if (dist > 2) {
            pt.vx = (dx / dist) * 15;
            pt.vy = (dy / dist) * 15;
          } else {
            pt.vx *= 0.8;
            pt.vy *= 0.8;
          }
        } else if (this.holdFrames < 60) {
          pt.vx *= 0.95;
          pt.vy *= 0.95;
        } else {
          this.gathering = false;
          this.clickPoint = null;
          this.holdFrames = 0;
          const newAngle = p.random(p.TWO_PI);
          const newSpeed = p.random(3, 6) * speedMult;
          pt.vx = p.cos(newAngle) * newSpeed;
          pt.vy = p.sin(newAngle) * newSpeed;
          continue;
        }
        this.holdFrames++;
      } else {
        const dx = pt.x - cx;
        const dy = pt.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curAngle = Math.atan2(dy, dx);

        const rotCos = Math.cos(rotStrength);
        const rotSin = Math.sin(rotStrength);
        const rvx = pt.vx * rotCos - pt.vy * rotSin;
        const rvy = pt.vx * rotSin + pt.vy * rotCos;

        const outwardFactor = 0.15 * speedMult;
        pt.vx = rvx + (dx / (dist || 1)) * outwardFactor;
        pt.vy = rvy + (dy / (dist || 1)) * outwardFactor;

        const maxSpeed = 8 * speedMult;
        const curSpeed = Math.sqrt(pt.vx * pt.vx + pt.vy * pt.vy);
        if (curSpeed > maxSpeed) {
          pt.vx = (pt.vx / curSpeed) * maxSpeed;
          pt.vy = (pt.vy / curSpeed) * maxSpeed;
        } else if (curSpeed < 0.5 * speedMult) {
          const boostAngle = p.random(p.TWO_PI);
          pt.vx += p.cos(boostAngle) * 0.5 * speedMult;
          pt.vy += p.sin(boostAngle) * 0.5 * speedMult;
        }

        if (this.mouseActive) {
          const mdx = this.mouseX - pt.x;
          const mdy = this.mouseY - pt.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          const maxDist = 250;
          if (mDist < maxDist && mDist > 0) {
            const attract = (1 - mDist / maxDist) * 5;
            pt.vx += (mdx / mDist) * attract;
            pt.vy += (mdy / mDist) * attract;
          }
        }
      }

      pt.x += pt.vx;
      pt.y += pt.vy;

      if (pt.x < 0) {
        pt.x = 0;
        pt.vx = Math.abs(pt.vx) * 0.9;
      } else if (pt.x > p.width) {
        pt.x = p.width;
        pt.vx = -Math.abs(pt.vx) * 0.9;
      }
      if (pt.y < 0) {
        pt.y = 0;
        pt.vy = Math.abs(pt.vy) * 0.9;
      } else if (pt.y > p.height) {
        pt.y = p.height;
        pt.vy = -Math.abs(pt.vy) * 0.9;
      }

      pt.sizePhase += pt.sizeSpeed;
      pt.size = pt.baseSize + Math.sin(pt.sizePhase) * 3;

      pt.alphaPhase += 0.02;
      pt.alpha = pt.baseAlpha + Math.sin(pt.alphaPhase) * 0.1;
      pt.alpha = Math.max(0.3, Math.min(1.0, pt.alpha));

      if (p.random(1) < 0.02 && !this.gathering) {
        this.particles.splice(i, 1);
        this.particles.push(this.createParticle(true));
      }
    }

    while (this.particles.length < this.params.density) {
      this.particles.push(this.createParticle(true));
    }
  }

  draw(): void {
    const p = this.p;
    const ctx = p.drawingContext;
    const color = this.params.color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    ctx.save();
    ctx.shadowBlur = 2;
    ctx.shadowColor = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const pt of this.particles) {
      const age = p.frameCount - pt.birthFrame;
      if (age < 5) {
        const haloAlpha = 0.5 * (1 - age / 5);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 15, 0, p.TWO_PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${haloAlpha})`;
        ctx.fill();
        ctx.restore();
      }

      ctx.font = `bold ${pt.size}px sans-serif`;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pt.alpha})`;
      ctx.fillText(pt.char, pt.x, pt.y);
    }

    ctx.restore();
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
