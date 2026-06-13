import gsap from 'gsap';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  radius: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  originalColor: string;
  isAttracted: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
  speedMultiplier: number;
  phaseOffset: number;
  butterflyTargetX: number;
  butterflyTargetY: number;
}

export interface Ripple {
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
  hue: number;
}

export interface LineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  alpha: number;
}

export interface Config {
  particleCount: number;
  speedMultiplier: number;
  showLines: boolean;
}

const PARTICLE_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff', '#a29bfe'];
const PINK_COLORS = ['#ff9ff3', '#f8a5c2', '#f78fb3', '#e056a0', '#fd79a8'];
const ATTRACT_RADIUS = 150;
const LINE_DISTANCE = 30;
const MAX_LINES = 200;
const TRAIL_MAX_POINTS = 10;

export class ParticleSystem {
  particles: Particle[] = [];
  ripples: Ripple[] = [];
  lines: LineData[] = [];
  config: Config;
  width: number;
  height: number;
  mouseX: number = -1000;
  mouseY: number = -1000;
  isDragging: boolean = false;

  private initialParticles: Array<{
    x: number;
    y: number;
    baseVx: number;
    baseVy: number;
    color: string;
    radius: number;
    phaseOffset: number;
  }> = [];

  constructor(width: number, height: number, config?: Partial<Config>) {
    this.width = width;
    this.height = height;
    this.config = {
      particleCount: config?.particleCount ?? 400,
      speedMultiplier: config?.speedMultiplier ?? 1,
      showLines: config?.showLines ?? true,
    };
    this.createParticles();
  }

  createParticles() {
    this.particles = [];
    this.initialParticles = [];
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.5;
      const baseVx = Math.cos(angle) * speed;
      const baseVy = Math.sin(angle) * speed;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      const radius = 2 + Math.random() * 3;
      const alpha = 0.5 + Math.random() * 0.4;
      const phaseOffset = Math.random() * Math.PI * 2;

      const particle: Particle = {
        x,
        y,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        radius,
        color,
        alpha,
        targetAlpha: alpha,
        originalColor: color,
        isAttracted: false,
        trail: [],
        speedMultiplier: 1,
        phaseOffset,
        butterflyTargetX: 0,
        butterflyTargetY: 0,
      };

      this.particles.push(particle);
      this.initialParticles.push({
        x,
        y,
        baseVx,
        baseVy,
        color,
        radius,
        phaseOffset,
      });
    }

    this.assignButterflyTargets();
  }

  private assignButterflyTargets() {
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 12;
      const r =
        Math.exp(Math.sin(t)) -
        2 * Math.cos(4 * t) +
        Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
      const scale = 12;
      this.particles[i].butterflyTargetX = Math.sin(t) * r * scale;
      this.particles[i].butterflyTargetY = -Math.cos(t) * r * scale;
    }
  }

  update(deltaTime: number) {
    const dt = Math.min(deltaTime, 33) / 16;
    const now = performance.now();

    for (const p of this.particles) {
      if (this.isDragging) {
        const dx = this.mouseX - p.x;
        const dy = this.mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTRACT_RADIUS) {
          if (!p.isAttracted) {
            p.isAttracted = true;
            const pinkColor = PINK_COLORS[Math.floor(Math.random() * PINK_COLORS.length)];
            gsap.to(p, {
              color: pinkColor,
              duration: 0.4,
              ease: 'power2.out',
            });
            gsap.to(p, {
              targetAlpha: 0.9,
              duration: 0.3,
              ease: 'power2.out',
            });
          }

          const targetX = this.mouseX + p.butterflyTargetX;
          const targetY = this.mouseY + p.butterflyTargetY;
          const toTargetX = targetX - p.x;
          const toTargetY = targetY - p.y;
          const strength = 0.06 * dt;

          p.vx += toTargetX * strength;
          p.vy += toTargetY * strength;
          p.vx *= 0.92;
          p.vy *= 0.92;
        } else {
          if (p.isAttracted) {
            p.isAttracted = false;
            gsap.to(p, {
              color: p.originalColor,
              duration: 0.6,
              ease: 'power2.out',
            });
            gsap.to(p, {
              targetAlpha: 0.5 + Math.random() * 0.4,
              duration: 0.5,
              ease: 'power2.out',
            });
          }
          this.applyDefaultMotion(p, dt);
        }
      } else {
        if (p.isAttracted) {
          p.isAttracted = false;
          gsap.to(p, {
            color: p.originalColor,
            duration: 0.6,
            ease: 'power2.out',
          });
          gsap.to(p, {
            targetAlpha: 0.5 + Math.random() * 0.4,
            duration: 0.5,
            ease: 'power2.out',
          });
        }
        this.applyDefaultMotion(p, dt);
      }

      p.x += p.vx * this.config.speedMultiplier * p.speedMultiplier * dt;
      p.y += p.vy * this.config.speedMultiplier * p.speedMultiplier * dt;

      if (p.speedMultiplier > 1) {
        p.speedMultiplier = Math.max(1, p.speedMultiplier - 0.02 * dt);
      }

      p.alpha += (p.targetAlpha - p.alpha) * 0.1 * dt;

      if (!p.isAttracted) {
        p.targetAlpha = 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(now * 0.001 + p.phaseOffset));
      }

      this.wrapBounds(p);

      if (p.speedMultiplier > 1.2 || p.isAttracted) {
        p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
        if (p.trail.length > TRAIL_MAX_POINTS) {
          p.trail.shift();
        }
      }

      for (let t = p.trail.length - 1; t >= 0; t--) {
        p.trail[t].alpha -= 0.04 * dt;
        if (p.trail[t].alpha <= 0) {
          p.trail.splice(t, 1);
        }
      }
    }

    this.updateRipples(now);

    if (this.config.showLines) {
      this.calculateLines();
    } else {
      this.lines = [];
    }
  }

  private applyDefaultMotion(p: Particle, dt: number) {
    const time = performance.now() * 0.0005;
    const wobbleX = Math.sin(time + p.phaseOffset) * 0.02;
    const wobbleY = Math.cos(time * 0.7 + p.phaseOffset) * 0.02;

    p.vx += (p.baseVx - p.vx) * 0.02 * dt + wobbleX * dt;
    p.vy += (p.baseVy - p.vy) * 0.02 * dt + wobbleY * dt;
  }

  private wrapBounds(p: Particle) {
    const margin = 20;
    if (p.x < -margin) p.x = this.width + margin;
    if (p.x > this.width + margin) p.x = -margin;
    if (p.y < -margin) p.y = this.height + margin;
    if (p.y > this.height + margin) p.y = -margin;
  }

  private updateRipples(now: number) {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const elapsed = now - r.startTime;
      const progress = Math.min(elapsed / r.duration, 1);

      r.currentRadius = 10 + (r.maxRadius - 10) * progress;
      r.alpha = 0.8 * (1 - progress);

      if (progress >= 1) {
        this.ripples.splice(i, 1);
      }
    }
  }

  handleClick(x: number, y: number) {
    const ripple: Ripple = {
      x,
      y,
      currentRadius: 10,
      maxRadius: 80,
      alpha: 0.8,
      startTime: performance.now(),
      duration: 2000,
      hue: Math.random() * 360,
    };
    this.ripples.push(ripple);

    const rippleMaxR = 80;
    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < rippleMaxR && dist > 0) {
        const force = (1 - dist / rippleMaxR) * 3;
        const angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force;
        p.vy += Math.sin(angle) * force;
        p.speedMultiplier = 2;

        p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
      }
    }
  }

  private calculateLines() {
    this.lines = [];
    const cellSize = LINE_DISTANCE;
    const grid = new Map<string, number[]>();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = `${cx},${cy}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }

    let lineCount = 0;

    for (const [key, indices] of grid) {
      if (lineCount >= MAX_LINES) break;

      const [cxStr, cyStr] = key.split(',');
      const cx = parseInt(cxStr);
      const cy = parseInt(cyStr);

      for (let dx = 0; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy < 0) continue;
          const neighborKey = `${cx + dx},${cy + dy}`;
          const neighborIndices = grid.get(neighborKey);
          if (!neighborIndices) continue;

          for (const i of indices) {
            if (lineCount >= MAX_LINES) break;
            for (const j of neighborIndices) {
              if (i >= j) continue;
              if (lineCount >= MAX_LINES) break;

              const p1 = this.particles[i];
              const p2 = this.particles[j];
              const ddx = p1.x - p2.x;
              const ddy = p1.y - p2.y;
              const dist = Math.sqrt(ddx * ddx + ddy * ddy);

              if (dist < LINE_DISTANCE) {
                const lineAlpha = 0.3 + 0.3 * (1 - dist / LINE_DISTANCE);
                const avgColor = this.averageColors(p1.color, p2.color);
                this.lines.push({
                  x1: p1.x,
                  y1: p1.y,
                  x2: p2.x,
                  y2: p2.y,
                  color: avgColor,
                  alpha: lineAlpha,
                });
                lineCount++;
              }
            }
          }
        }
      }
    }
  }

  private averageColors(c1: string, c2: string): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round((r1 + r2) / 2);
    const g = Math.round((g1 + g2) / 2);
    const b = Math.round((b1 + b2) / 2);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  setMousePosition(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  setDragging(isDragging: boolean) {
    this.isDragging = isDragging;
  }

  updateConfig(config: Partial<Config>) {
    const oldCount = this.config.particleCount;
    Object.assign(this.config, config);

    if (config.particleCount !== undefined && config.particleCount !== oldCount) {
      this.createParticles();
    }
  }

  reset() {
    for (let i = 0; i < this.particles.length && i < this.initialParticles.length; i++) {
      const init = this.initialParticles[i];
      const p = this.particles[i];
      gsap.to(p, {
        x: init.x,
        y: init.y,
        vx: init.baseVx,
        vy: init.baseVy,
        color: init.color,
        alpha: 0.5 + Math.random() * 0.4,
        duration: 1,
        ease: 'power2.out',
      });
      p.baseVx = init.baseVx;
      p.baseVy = init.baseVy;
      p.originalColor = init.color;
      p.targetAlpha = p.alpha;
      p.isAttracted = false;
      p.speedMultiplier = 1;
      p.trail = [];
    }
    this.ripples = [];
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
