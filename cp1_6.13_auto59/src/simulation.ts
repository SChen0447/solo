export interface Vec2 {
  x: number;
  y: number;
}

export interface StarColor {
  r: number;
  g: number;
  b: number;
}

export interface HaloEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: StarColor;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: StarColor;
}

export interface Fragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: StarColor;
  rotation: number;
  rotationSpeed: number;
}

export interface VortexEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

export interface SupernovaEffect {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  particles: Particle[];
}

const STAR_COLORS: StarColor[] = [
  { r: 255, g: 80, b: 60 },
  { r: 255, g: 150, b: 50 },
  { r: 255, g: 230, b: 100 },
  { r: 100, g: 180, b: 255 },
  { r: 200, g: 100, b: 255 }
];

export class Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  diameter: number;
  mass: number;
  color: StarColor;
  flamePhase: number;
  trail: Vec2[];
  maxTrailLength: number;
  isDragging: boolean;
  id: number;
  dragOffsetX: number;
  dragOffsetY: number;

  private static nextId = 0;

  constructor(x: number, y: number, diameter: number, color: StarColor) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.diameter = diameter;
    this.mass = diameter * diameter;
    this.color = color;
    this.flamePhase = Math.random() * Math.PI * 2;
    this.trail = [];
    this.maxTrailLength = 40;
    this.isDragging = false;
    this.id = Star.nextId++;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }

  updateTrail() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  setMaxTrailLength(len: number) {
    this.maxTrailLength = len;
    while (this.trail.length > len) {
      this.trail.shift();
    }
  }
}

export type SimulationCallback = (
  stars: Star[],
  halos: HaloEffect[],
  particles: Particle[],
  fragments: Fragment[],
  vortex: VortexEffect | null,
  supernova: SupernovaEffect | null,
  paused: boolean
) => void;

export class SimulationManager {
  stars: Star[] = [];
  halos: HaloEffect[] = [];
  particles: Particle[] = [];
  fragments: Fragment[] = [];
  vortex: VortexEffect | null = null;
  supernova: SupernovaEffect | null = null;
  gravityConstant: number = 1.0;
  paused: boolean = false;
  particlesEnabled: boolean = true;
  width: number = 0;
  height: number = 0;
  zoom: number = 1;
  targetZoom: number = 1;
  private onUpdate: SimulationCallback | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setCallback(cb: SimulationCallback) {
    this.onUpdate = cb;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  setGravity(g: number) {
    this.gravityConstant = g;
  }

  setParticlesEnabled(enabled: boolean) {
    this.particlesEnabled = enabled;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  addStar(x: number, y: number) {
    const diameter = 30 + Math.random() * 20;
    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    const star = new Star(x, y, diameter, color);
    this.stars.push(star);
    this.halos.push({
      x,
      y,
      radius: diameter * 0.5,
      maxRadius: diameter * 2,
      life: 0.8,
      maxLife: 0.8,
      color: { ...color }
    });
    this.adjustTrailLengths();
  }

  clearStars() {
    this.vortex = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.6,
      life: 1.2,
      maxLife: 1.2
    };
  }

  private adjustTrailLengths() {
    const count = this.stars.length;
    let maxLen = 40;
    if (count > 120) maxLen = 15;
    else if (count > 80) maxLen = 20;
    this.stars.forEach(s => s.setMaxTrailLength(maxLen));
  }

  private particleCount(): number {
    return this.stars.length > 120 ? 16 : 32;
  }

  private spawnMergeParticles(x: number, y: number, color: StarColor) {
    if (!this.particlesEnabled) return;
    const count = this.particleCount();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 60 + Math.random() * 40;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5,
        maxLife: 1.5,
        size: 2 + Math.random() * 2,
        color: { ...color }
      });
    }
  }

  private spawnFragments(star: Star, bigger: Star) {
    const dx = star.x - bigger.x;
    const dy = star.y - bigger.y;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const tx = -dy / dist;
    const ty = dx / dist;
    for (let i = 0; i < 8; i++) {
      const baseAngle = Math.atan2(ty, tx);
      const angle = baseAngle + (i / 8) * Math.PI * 2 - Math.PI + (Math.random() - 0.5) * 0.5;
      const speed = 40 + Math.random() * 60;
      this.fragments.push({
        x: star.x,
        y: star.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: star.diameter * 0.15 + Math.random() * star.diameter * 0.1,
        color: { ...star.color },
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8
      });
    }
  }

  private spawnSupernova(x: number, y: number) {
    const parts: Particle[] = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      parts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2.5,
        maxLife: 2.5,
        size: 3 + Math.random() * 4,
        color: { r: 255, g: 255, b: 255 }
      });
    }
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 10 + Math.random() * 50;
      const hue = Math.random();
      const c: StarColor = hue < 0.33
        ? { r: 180, g: 200, b: 255 }
        : hue < 0.66
          ? { r: 255, g: 200, b: 220 }
          : { r: 220, g: 180, b: 255 };
      parts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2.5,
        maxLife: 2.5,
        size: 2 + Math.random() * 3,
        color: c
      });
    }
    this.supernova = {
      x,
      y,
      life: 2.5,
      maxLife: 2.5,
      particles: parts
    };
  }

  private mergeStars(a: Star, b: Star): Star {
    const totalMass = a.mass + b.mass;
    const newDiameter = Math.sqrt(a.diameter * a.diameter + b.diameter * b.diameter);
    const newX = (a.x * a.mass + b.x * b.mass) / totalMass;
    const newY = (a.y * a.mass + b.y * b.mass) / totalMass;
    const newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
    const newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
    const color: StarColor = {
      r: Math.round((a.color.r * a.mass + b.color.r * b.mass) / totalMass),
      g: Math.round((a.color.g * a.mass + b.color.g * b.mass) / totalMass),
      b: Math.round((a.color.b * a.mass + b.color.b * b.mass) / totalMass)
    };
    const star = new Star(newX, newY, newDiameter, color);
    star.vx = newVx;
    star.vy = newVy;
    star.flamePhase = (a.flamePhase + b.flamePhase) / 2;
    const ratio = Math.max(a.mass, b.mass) / Math.min(a.mass, b.mass);
    if (ratio < 3) {
      this.spawnMergeParticles(newX, newY, color);
    }
    return star;
  }

  private computeCenterOfMass(): Vec2 {
    if (this.stars.length === 0) return { x: this.width / 2, y: this.height / 2 };
    let totalMass = 0;
    let cx = 0, cy = 0;
    for (const s of this.stars) {
      cx += s.x * s.mass;
      cy += s.y * s.mass;
      totalMass += s.mass;
    }
    return { x: cx / totalMass, y: cy / totalMass };
  }

  update(dt: number) {
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 5);

    this.halos = this.halos.filter(h => {
      h.life -= dt;
      const t = 1 - h.life / h.maxLife;
      h.radius = h.maxRadius * t;
      return h.life > 0;
    });

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      return p.life > 0;
    });

    this.fragments = this.fragments.filter(f => {
      f.life -= dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rotation += f.rotationSpeed * dt;
      f.vx *= 0.97;
      f.vy *= 0.97;
      return f.life > 0;
    });

    if (this.vortex) {
      this.vortex.life -= dt;
      const t = 1 - this.vortex.life / this.vortex.maxLife;
      this.vortex.radius = this.vortex.maxRadius * t;
      if (this.vortex.life <= 0) {
        this.stars = [];
        this.halos = [];
        this.particles = [];
        this.fragments = [];
        this.vortex = null;
      }
    }

    if (this.supernova) {
      this.supernova.life -= dt;
      this.supernova.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      });
      if (this.supernova.life <= 0) {
        this.supernova = null;
      }
    }

    if (this.paused || this.stars.length === 0) {
      if (this.onUpdate) {
        this.onUpdate(this.stars, this.halos, this.particles, this.fragments, this.vortex, this.supernova, this.paused);
      }
      return;
    }

    const n = this.stars.length;
    for (const s of this.stars) {
      if (!s.isDragging) {
        s.vx *= 0.999;
        s.vy *= 0.999;
      }
    }

    for (let i = 0; i < n; i++) {
      const a = this.stars[i];
      if (a.isDragging) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.stars[j];
        if (b.isDragging) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (a.diameter + b.diameter) * 0.25;
        const effectiveDistSq = Math.max(distSq, minDist * minDist);
        const dist = Math.sqrt(effectiveDistSq);
        const force = (this.gravityConstant * 50 * a.mass * b.mass) / effectiveDistSq;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        a.vx += (fx / a.mass) * dt;
        a.vy += (fy / a.mass) * dt;
        b.vx -= (fx / b.mass) * dt;
        b.vy -= (fy / b.mass) * dt;
      }
    }

    if (n <= 3 && n >= 2) {
      const com = this.computeCenterOfMass();
      for (const s of this.stars) {
        if (s.isDragging) continue;
        const dx = com.x - s.x;
        const dy = com.y - s.y;
        s.vx += dx * 0.02 * dt * 60;
        s.vy += dy * 0.02 * dt * 60;
      }
    }

    for (const s of this.stars) {
      if (!s.isDragging) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      s.flamePhase += dt * 2;
      s.updateTrail();
    }

    const toRemove = new Set<number>();
    const toAdd: Star[] = [];
    for (let i = 0; i < n; i++) {
      if (toRemove.has(this.stars[i].id)) continue;
      for (let j = i + 1; j < n; j++) {
        if (toRemove.has(this.stars[j].id)) continue;
        const a = this.stars[i];
        const b = this.stars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (a.diameter + b.diameter) * 0.5;
        if (dist < minDist) {
          const ratio = Math.max(a.mass, b.mass) / Math.min(a.mass, b.mass);
          if (ratio >= 3) {
            const smaller = a.mass < b.mass ? a : b;
            const bigger = a.mass >= b.mass ? a : b;
            this.spawnFragments(smaller, bigger);
            bigger.vx = (bigger.vx * bigger.mass + smaller.vx * smaller.mass) / (bigger.mass + smaller.mass);
            bigger.vy = (bigger.vy * bigger.mass + smaller.vy * smaller.mass) / (bigger.mass + smaller.mass);
            bigger.diameter = Math.sqrt(bigger.diameter * bigger.diameter + smaller.diameter * smaller.diameter * 0.3);
            bigger.mass = bigger.diameter * bigger.diameter;
            toRemove.add(smaller.id);
          } else {
            const newStar = this.mergeStars(a, b);
            toRemove.add(a.id);
            toRemove.add(b.id);
            toAdd.push(newStar);
          }
        }
      }
    }
    this.stars = this.stars.filter(s => !toRemove.has(s.id));
    this.stars.push(...toAdd);
    this.adjustTrailLengths();

    if (n >= 2 && this.stars.length === 1 && !this.supernova) {
      const s = this.stars[0];
      this.spawnSupernova(s.x, s.y);
    }

    if (this.onUpdate) {
      this.onUpdate(this.stars, this.halos, this.particles, this.fragments, this.vortex, this.supernova, this.paused);
    }
  }

  getStarAt(x: number, y: number): Star | null {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy <= (s.diameter * 0.5) * (s.diameter * 0.5)) {
        return s;
      }
    }
    return null;
  }
}
