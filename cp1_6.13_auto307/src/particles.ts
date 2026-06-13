import { ParticleType, Particle, LightWave, MouseState, ResponsiveConfig } from './types';

const WIND_RADIUS = 150;
const WARM_COLOR_R = 255;
const WARM_COLOR_G = 159;
const WARM_COLOR_B = 67;
const WARM_DURATION = 1.5;
const LERP_FACTOR = 0.03;

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function lerpColor(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
  t: number
): [number, number, number] {
  return [
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  ];
}

export class ParticleSystem {
  particles: Particle[] = [];
  lightWaves: LightWave[] = [];
  mouse: MouseState = { x: 0, y: 0, prevX: 0, prevY: 0, moving: false, moveTimer: 0 };
  private pool: Particle[] = [];
  private wavePool: LightWave[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;
  private config: ResponsiveConfig;

  constructor(config: ResponsiveConfig) {
    this.config = config;
  }

  resize(width: number, height: number, config: ResponsiveConfig) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    const oldConfig = this.config;
    this.config = config;

    const needRebuild =
      oldConfig.raindropCount !== config.raindropCount ||
      oldConfig.fireflyCount !== config.fireflyCount ||
      oldConfig.sporeCount !== config.sporeCount;

    if (needRebuild) {
      this.rebuild();
    }
  }

  private rebuild() {
    const c = this.config;
    const total = c.raindropCount + c.fireflyCount + c.sporeCount;

    while (this.particles.length > total) {
      const p = this.particles.pop()!;
      p.active = false;
      this.pool.push(p);
    }

    this.initParticles(ParticleType.Raindrop, 0, c.raindropCount);
    this.initParticles(ParticleType.Firefly, c.raindropCount, c.raindropCount + c.fireflyCount);
    this.initParticles(ParticleType.Spore, c.raindropCount + c.fireflyCount, total);
  }

  private initParticles(type: ParticleType, startIdx: number, endIdx: number) {
    for (let i = startIdx; i < endIdx; i++) {
      if (i < this.particles.length) {
        this.resetParticle(this.particles[i], type);
      } else {
        let p = this.pool.pop();
        if (!p) {
          p = this.createParticle();
        }
        this.resetParticle(p, type);
        this.particles.push(p);
      }
    }
  }

  private createParticle(): Particle {
    return {
      type: ParticleType.Raindrop,
      x: 0, y: 0, vx: 0, vy: 0,
      size: 2, alpha: 0.5, baseAlpha: 0.5,
      colorR: 0, colorG: 0, colorB: 0,
      baseColorR: 0, baseColorG: 0, baseColorB: 0,
      warmColorTimer: 0,
      phase: 0, rotation: 0, rotationSpeed: 0,
      active: true, age: 0,
    };
  }

  private resetParticle(p: Particle, type: ParticleType) {
    p.type = type;
    p.active = true;
    p.warmColorTimer = 0;
    p.age = 0;

    const w = this.canvasWidth;
    const h = this.canvasHeight;

    switch (type) {
      case ParticleType.Raindrop: {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
        p.vx = 0;
        p.vy = 3 + Math.random() * 4;
        p.size = 1.5;
        const t = Math.random();
        const [r, g, b] = lerpColor(...hexToRgb('#a8e6cf'), ...hexToRgb('#d4a5a5'), t);
        p.colorR = r; p.colorG = g; p.colorB = b;
        p.baseColorR = r; p.baseColorG = g; p.baseColorB = b;
        p.alpha = 0.4 + Math.random() * 0.3;
        p.baseAlpha = p.alpha;
        p.phase = Math.random() * Math.PI * 2;
        p.rotation = 0;
        p.rotationSpeed = 0;
        break;
      }
      case ParticleType.Firefly: {
        p.x = Math.random() * w;
        p.y = h * 0.2 + Math.random() * h * 0.6;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = (Math.random() - 0.5) * 0.3;
        p.size = 2 + Math.random() * 2;
        const t = Math.random();
        const [r, g, b] = lerpColor(...hexToRgb('#ffd700'), ...hexToRgb('#ffaa00'), t);
        p.colorR = r; p.colorG = g; p.colorB = b;
        p.baseColorR = r; p.baseColorG = g; p.baseColorB = b;
        p.alpha = 0.6 + Math.random() * 0.3;
        p.baseAlpha = p.alpha;
        p.phase = Math.random() * Math.PI * 2;
        p.rotation = 0;
        p.rotationSpeed = 0;
        break;
      }
      case ParticleType.Spore: {
        p.x = Math.random() * w;
        p.y = h * 0.5 + Math.random() * h * 0.5;
        p.vx = (Math.random() - 0.5) * 0.3;
        p.vy = -(0.3 + Math.random() * 0.5);
        p.size = 4 + Math.random() * 3;
        const t = Math.random();
        const [r, g, b] = lerpColor(...hexToRgb('#98d8c8'), ...hexToRgb('#e8a87c'), t);
        p.colorR = r; p.colorG = g; p.colorB = b;
        p.baseColorR = r; p.baseColorG = g; p.baseColorB = b;
        p.alpha = 0.6 + Math.random() * 0.2;
        p.baseAlpha = p.alpha;
        p.phase = Math.random() * Math.PI * 2;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = 0.02 + Math.random() * 0.03;
        break;
      }
    }
  }

  update(dt: number, timePhase: number) {
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    this.mouse.moveTimer -= dt;
    if (this.mouse.moveTimer <= 0) {
      this.mouse.moving = false;
    }

    const mDx = this.mouse.x - this.mouse.prevX;
    const mDy = this.mouse.y - this.mouse.prevY;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.age += dt;

      switch (p.type) {
        case ParticleType.Raindrop: {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y > h + 10) {
            p.y = -10;
            p.x = Math.random() * w;
          }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
          p.vx *= 0.95;
          break;
        }
        case ParticleType.Firefly: {
          p.phase += dt * 1.5;
          p.x += p.vx + Math.sin(p.phase) * 0.8;
          p.y += p.vy + Math.cos(p.phase * 0.7) * 0.4;
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          if (p.y < h * 0.1) p.vy += 0.02;
          if (p.y > h * 0.85) p.vy -= 0.02;
          p.vx *= 0.98;
          p.vy *= 0.98;
          break;
        }
        case ParticleType.Spore: {
          p.phase += dt * 0.8;
          p.rotation += p.rotationSpeed;
          p.x += p.vx + Math.sin(p.phase) * 0.3;
          p.y += p.vy;
          if (p.y < -20) {
            p.y = h + 20;
            p.x = Math.random() * w;
          }
          if (p.x < -20) p.x = w + 20;
          if (p.x > w + 20) p.x = -20;
          p.vx *= 0.99;
          break;
        }
      }

      if (this.mouse.moving) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < WIND_RADIUS && dist > 0) {
          const factor = 1 - dist / WIND_RADIUS;
          const pushDist = (5 + Math.random() * 10) * factor;
          const mLen = Math.sqrt(mDx * mDx + mDy * mDy);
          if (mLen > 0) {
            p.vx += (mDx / mLen) * pushDist * 0.3;
            p.vy += (mDy / mLen) * pushDist * 0.3;
          }
          if (p.warmColorTimer <= 0) {
            p.warmColorTimer = WARM_DURATION;
          }
        }
      }

      if (p.warmColorTimer > 0) {
        p.warmColorTimer -= dt;
        const warmT = Math.max(0, p.warmColorTimer / WARM_DURATION);
        p.colorR += (p.baseColorR + (WARM_COLOR_R - p.baseColorR) * warmT - p.colorR) * LERP_FACTOR * 3;
        p.colorG += (p.baseColorG + (WARM_COLOR_G - p.baseColorG) * warmT - p.colorG) * LERP_FACTOR * 3;
        p.colorB += (p.baseColorB + (WARM_COLOR_B - p.baseColorB) * warmT - p.colorB) * LERP_FACTOR * 3;
      } else {
        p.colorR += (p.baseColorR - p.colorR) * LERP_FACTOR;
        p.colorG += (p.baseColorG - p.colorG) * LERP_FACTOR;
        p.colorB += (p.baseColorB - p.colorB) * LERP_FACTOR;
      }
    }

    for (let i = this.lightWaves.length - 1; i >= 0; i--) {
      const wave = this.lightWaves[i];
      if (!wave.active) {
        this.wavePool.push(wave);
        this.lightWaves.splice(i, 1);
        continue;
      }
      wave.elapsed += dt;
      const progress = wave.elapsed / wave.duration;
      wave.radius = progress * wave.maxRadius;

      if (progress >= 1) {
        wave.active = false;
        this.wavePool.push(wave);
        this.lightWaves.splice(i, 1);
        continue;
      }

      for (let j = 0; j < this.particles.length; j++) {
        const p = this.particles[j];
        if (!p.active) continue;
        const dx = p.x - wave.x;
        const dy = p.y - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const waveEdge = wave.radius;
        const waveWidth = 30;
        if (dist > waveEdge - waveWidth && dist < waveEdge + waveWidth && dist > 0) {
          const pushDist = 30 + Math.random() * 30;
          p.vx += (dx / dist) * pushDist * 0.15;
          p.vy += (dy / dist) * pushDist * 0.15;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, timePhase: number) {
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    for (const p of this.particles) {
      if (!p.active) continue;

      const r = Math.round(Math.max(0, Math.min(255, p.colorR)));
      const g = Math.round(Math.max(0, Math.min(255, p.colorG)));
      const b = Math.round(Math.max(0, Math.min(255, p.colorB)));

      switch (p.type) {
        case ParticleType.Raindrop: {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.size * 4);
          ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha})`;
          ctx.lineWidth = p.size * 0.8;
          ctx.stroke();
          break;
        }
        case ParticleType.Firefly: {
          const glowSize = p.size * 3;
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowSize);
          gradient.addColorStop(0, `rgba(${r},${g},${b},${p.alpha * 0.8})`);
          gradient.addColorStop(0.4, `rgba(${r},${g},${b},${p.alpha * 0.3})`);
          gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowSize, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 30)},${p.alpha})`;
          ctx.fill();
          break;
        }
        case ParticleType.Spore: {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const edgeGlow = p.size * 2;
          const gradient = ctx.createRadialGradient(0, 0, p.size * 0.3, 0, 0, edgeGlow);
          gradient.addColorStop(0, `rgba(${r},${g},${b},${p.alpha})`);
          gradient.addColorStop(0.5, `rgba(${r},${g},${b},${p.alpha * 0.4})`);
          gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(0, 0, edgeGlow, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * 0.9})`;
          ctx.fill();
          ctx.restore();
          break;
        }
      }
    }

    for (const wave of this.lightWaves) {
      if (!wave.active) continue;
      const progress = wave.elapsed / wave.duration;
      const alpha = (1 - progress) * 0.6;

      const [c1r, c1g, c1b] = hexToRgb('#48dbfb');
      const [c2r, c2g, c2b] = hexToRgb('#a29bfe');
      const [cr, cg, cb] = lerpColor(c1r, c1g, c1b, c2r, c2g, c2b, progress);

      const innerR = Math.max(0, wave.radius - 15);
      const outerR = wave.radius + 15;

      const gradient = ctx.createRadialGradient(wave.x, wave.y, innerR, wave.x, wave.y, outerR);
      gradient.addColorStop(0, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);
      gradient.addColorStop(0.4, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha * 0.7})`);
      gradient.addColorStop(0.7, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${alpha})`);
      gradient.addColorStop(1, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},0)`);

      ctx.beginPath();
      ctx.arc(wave.x, wave.y, outerR, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  onMouseMove(x: number, y: number) {
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.moving = true;
    this.mouse.moveTimer = 0.1;
  }

  onBottomClick(x: number, y: number) {
    let wave = this.wavePool.pop();
    if (!wave) {
      wave = { x: 0, y: 0, radius: 0, maxRadius: 0, elapsed: 0, duration: 0, active: false };
    }
    wave.x = x;
    wave.y = y;
    wave.radius = 0;
    wave.maxRadius = 250;
    wave.elapsed = 0;
    wave.duration = 1.2;
    wave.active = true;
    this.lightWaves.push(wave);
  }

  getParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }
}
