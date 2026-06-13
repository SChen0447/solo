export interface Particle {
  char: string;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  vx: number;
  vy: number;
  vz: number;
  rotation: number;
  rotationSpeed: number;
  baseFontSize: number;
  hue: number;
  saturation: number;
  lightness: number;
  targetHue: number;
  targetSaturation: number;
  targetLightness: number;
  initialHue: number;
  initialSaturation: number;
  initialLightness: number;
  alpha: number;
  targetAlpha: number;
  phase: 'diffusing' | 'drifting' | 'dispersing' | 'idle';
  isHovered: boolean;
  isAnimating: boolean;
  animTimer: number;
  savedHue: number;
  savedSaturation: number;
  savedLightness: number;
  dispersalVx: number;
  dispersalVy: number;
  dispersalVz: number;
  diffusionProgress: number;
  colorProgress: number;
  birthTime: number;
}

export interface ImageryEffect {
  type: 'rain' | 'fire' | 'stars';
  cx: number;
  cy: number;
  particles: ImageryParticle[];
  startTime: number;
  duration: number;
}

interface ImageryParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  rotation: number;
  color: string;
  shape: 'circle' | 'triangle' | 'dot';
}

export class ParticleSystem {
  particles: Particle[] = [];
  effects: ImageryEffect[] = [];
  rotX: number = 0;
  rotY: number = 0;
  zoom: number = 1;
  centerX: number = 0;
  centerY: number = 0;
  diffSpeed: number = 1;
  colorSpeed: number = 1;
  rotSensitivity: number = 1;
  isDispersing: boolean = false;
  dispersalStartTime: number = 0;
  private pendingText: string | null = null;
  private sphereRadius: number = 300;

  constructor(centerX: number, centerY: number) {
    this.centerX = centerX;
    this.centerY = centerY;
  }

  updateCenter(cx: number, cy: number) {
    this.centerX = cx;
    this.centerY = cy;
  }

  generateFromText(text: string) {
    if (this.particles.length > 0) {
      this.isDispersing = true;
      this.dispersalStartTime = performance.now();
      this.pendingText = text;
      for (const p of this.particles) {
        p.phase = 'dispersing';
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        const speed = 3 + Math.random() * 5;
        p.dispersalVx = Math.cos(angle) * Math.cos(elevation) * speed;
        p.dispersalVy = Math.sin(elevation) * speed;
        p.dispersalVz = Math.sin(angle) * Math.cos(elevation) * speed;
      }
    } else {
      this._createParticles(text);
    }
  }

  private _createParticles(text: string) {
    this.particles = [];
    this.effects = [];
    const chars = [...text].slice(0, 100);
    const now = performance.now();

    for (let i = 0; i < chars.length; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / chars.length);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = this.sphereRadius;

      const targetX = r * Math.sin(phi) * Math.cos(theta);
      const targetY = r * Math.sin(phi) * Math.sin(theta);
      const targetZ = r * Math.cos(phi);

      const hue = Math.random() * 360;
      const saturation = 60 + Math.random() * 40;
      const lightness = 70 + Math.random() * 20;

      this.particles.push({
        char: chars[i],
        x: 0,
        y: 0,
        z: 0,
        targetX,
        targetY,
        targetZ,
        vx: 0,
        vy: 0,
        vz: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.2,
        baseFontSize: 12 + Math.random() * 12,
        hue: 0,
        saturation: 0,
        lightness: 87,
        targetHue: hue,
        targetSaturation: saturation,
        targetLightness: lightness,
        initialHue: 0,
        initialSaturation: 0,
        initialLightness: 87,
        alpha: 0.3,
        targetAlpha: 0.8,
        phase: 'diffusing',
        isHovered: false,
        isAnimating: false,
        animTimer: 0,
        savedHue: 0,
        savedSaturation: 0,
        savedLightness: 87,
        dispersalVx: 0,
        dispersalVy: 0,
        dispersalVz: 0,
        diffusionProgress: 0,
        colorProgress: 0,
        birthTime: now,
      });
    }
  }

  reset() {
    const now = performance.now();
    for (const p of this.particles) {
      p.phase = 'diffusing';
      p.x = 0;
      p.y = 0;
      p.z = 0;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.hue = 0;
      p.saturation = 0;
      p.lightness = 87;
      p.alpha = 0.3;
      p.diffusionProgress = 0;
      p.colorProgress = 0;
      p.isAnimating = false;
      p.animTimer = 0;
      p.birthTime = now;
    }
    this.effects = [];
  }

  update(dt: number, now: number) {
    if (this.isDispersing) {
      const elapsed = now - this.dispersalStartTime;
      const dispersalDuration = 300;
      const progress = Math.min(elapsed / dispersalDuration, 1);

      for (const p of this.particles) {
        p.x += p.dispersalVx * dt * 60;
        p.y += p.dispersalVy * dt * 60;
        p.z += p.dispersalVz * dt * 60;
        p.alpha = 0.3 * (1 - progress);
      }

      if (progress >= 1) {
        this.isDispersing = false;
        if (this.pendingText !== null) {
          this._createParticles(this.pendingText);
          this.pendingText = null;
        }
      }
      return;
    }

    const diffDuration = 2000 / this.diffSpeed;
    const colorDuration = 2000 / this.colorSpeed;

    for (const p of this.particles) {
      p.rotation += p.rotationSpeed * dt;

      if (p.phase === 'diffusing') {
        const elapsed = now - p.birthTime;
        p.diffusionProgress = Math.min(elapsed / diffDuration, 1);
        const t = this._easeOutCubic(p.diffusionProgress);

        p.x = p.targetX * t;
        p.y = p.targetY * t;
        p.z = p.targetZ * t;

        if (p.diffusionProgress >= 1) {
          p.phase = 'drifting';
          const driftAngle = Math.random() * Math.PI * 2;
          const driftElevation = (Math.random() - 0.5) * Math.PI;
          const speed = 0.1 + Math.random() * 0.4;
          p.vx = Math.cos(driftAngle) * Math.cos(driftElevation) * speed;
          p.vy = Math.sin(driftElevation) * speed;
          p.vz = Math.sin(driftAngle) * Math.cos(driftElevation) * speed;
        }
      } else if (p.phase === 'drifting') {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        p.z += p.vz * dt * 60;

        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > this.sphereRadius * 1.2) {
          const scale = (this.sphereRadius * 1.2) / dist;
          p.x *= scale;
          p.y *= scale;
          p.z *= scale;
          p.vx *= -0.5;
          p.vy *= -0.5;
          p.vz *= -0.5;
        }
      }

      if (p.phase !== 'dispersing') {
        const colorElapsed = now - p.birthTime;
        p.colorProgress = Math.min(colorElapsed / colorDuration, 1);
        if (p.colorProgress > 0.3) {
          const ct = (p.colorProgress - 0.3) / 0.7;
          const eased = this._easeOutCubic(Math.min(ct, 1));
          p.hue = p.initialHue + (p.targetHue - p.initialHue) * eased;
          p.saturation = p.initialSaturation + (p.targetSaturation - p.initialSaturation) * eased;
          p.lightness = p.initialLightness + (p.targetLightness - p.initialLightness) * eased;
        }

        const alphaTarget = p.diffusionProgress >= 1 ? 0.8 : 0.3;
        p.targetAlpha = alphaTarget;
        p.alpha += (p.targetAlpha - p.alpha) * Math.min(dt * 3, 1);
      }

      if (p.isAnimating) {
        p.animTimer -= dt * 1000;
        if (p.animTimer <= 0) {
          p.isAnimating = false;
        }
      }
    }

    this._updateEffects(dt, now);
  }

  private _updateEffects(dt: number, now: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;

      if (progress >= 1) {
        this.effects.splice(i, 1);
        continue;
      }

      for (const ep of effect.particles) {
        ep.x += ep.vx * dt * 60;
        ep.y += ep.vy * dt * 60;
        ep.alpha = Math.max(0, (1 - progress) * 0.8);
        if (effect.type === 'fire') {
          ep.rotation += dt * 2;
        }
      }
    }
  }

  triggerImagery(particle: Particle, now: number) {
    if (particle.isAnimating) return;

    particle.isAnimating = true;
    particle.animTimer = 1500;
    particle.savedHue = particle.hue;
    particle.savedSaturation = particle.saturation;
    particle.savedLightness = particle.lightness;

    const projected = this._projectParticle(particle);
    const cx = projected.screenX;
    const cy = projected.screenY;

    let effect: ImageryEffect;

    if (particle.char === '雨') {
      effect = this._createRainEffect(cx, cy, now);
    } else if (particle.char === '火') {
      effect = this._createFireEffect(cx, cy, now);
    } else {
      effect = this._createStarsEffect(cx, cy, now);
    }

    this.effects.push(effect);
  }

  private _createRainEffect(cx: number, cy: number, now: number): ImageryEffect {
    const particles: ImageryParticle[] = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 80 / 60,
        alpha: 0.7,
        size: 2 + Math.random() * 2,
        rotation: 0,
        color: `rgba(100, 150, 255, `,
        shape: 'circle',
      });
    }
    return { type: 'rain', cx, cy, particles, startTime: now, duration: 500 };
  }

  private _createFireEffect(cx: number, cy: number, now: number): ImageryEffect {
    const particles: ImageryParticle[] = [];
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -60 / 60,
        alpha: 0.8,
        size: 6,
        rotation: Math.random() * Math.PI * 2,
        color: `rgba(255, 80, 20, `,
        shape: 'triangle',
      });
    }
    return { type: 'fire', cx, cy, particles, startTime: now, duration: 1000 };
  }

  private _createStarsEffect(cx: number, cy: number, now: number): ImageryEffect {
    const particles: ImageryParticle[] = [];
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 / 60 + Math.random() * 40 / 60;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.9,
        size: 2,
        rotation: 0,
        color: `rgba(255, 215, 0, `,
        shape: 'dot',
      });
    }
    return { type: 'stars', cx, cy, particles, startTime: now, duration: 300 };
  }

  _projectParticle(particle: Particle): { screenX: number; screenY: number; scale: number; depth: number } {
    let { x, y, z } = particle;

    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    const perspective = 800;
    const scale = perspective / (perspective + z2);

    return {
      screenX: this.centerX + x1 * scale * this.zoom,
      screenY: this.centerY + y1 * scale * this.zoom,
      scale: scale * this.zoom,
      depth: z2,
    };
  }

  hitTest(screenX: number, screenY: number): Particle | null {
    let closest: Particle | null = null;
    let closestDist = Infinity;

    for (const p of this.particles) {
      if (p.phase === 'dispersing') continue;
      const proj = this._projectParticle(p);
      const dx = screenX - proj.screenX;
      const dy = screenY - proj.screenY;
      const hitRadius = (p.baseFontSize * proj.scale) / 2 + 6;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < hitRadius && dist < closestDist) {
        closest = p;
        closestDist = dist;
      }
    }
    return closest;
  }

  getSortedParticles(): { particle: Particle; screenX: number; screenY: number; scale: number }[] {
    const result: { particle: Particle; screenX: number; screenY: number; scale: number }[] = [];

    for (const p of this.particles) {
      const proj = this._projectParticle(p);
      result.push({ particle: p, screenX: proj.screenX, screenY: proj.screenY, scale: proj.scale });
    }

    result.sort((a, b) => a.scale - b.scale);
    return result;
  }

  private _easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
