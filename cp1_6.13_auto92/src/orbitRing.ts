import { Planet } from './planet';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
  size: number;
}

export interface LightThread {
  planet1: Planet;
  planet2: Planet;
  life: number;
  maxLife: number;
}

export class OrbitRing {
  centerX: number = 0;
  centerY: number = 0;
  baseA: number = 200;
  baseB: number = 150;
  a: number = 200;
  b: number = 150;
  ringWidth: number = 4;
  rotation: number = 0;
  rotationSpeed: number = 0;
  scale: number = 1;
  flashTimer: number = 0;
  flashIntensity: number = 0;
  attractionRadius: number = 50;
  totalPhases: number = 12;
  occupiedPhases: boolean[] = new Array(12).fill(false);
  particles: Particle[] = [];
  lightThreads: LightThread[] = [];
  flowerTimer: number = 0;
  flowerActive: boolean = false;

  constructor(cx: number, cy: number, totalPhases: number = 12) {
    this.centerX = cx;
    this.centerY = cy;
    this.totalPhases = totalPhases;
    this.occupiedPhases = new Array(totalPhases).fill(false);
    this.rotationSpeed = (Math.PI * 2) / (10 * 1000 / 16.67);
    this.resize(window.innerWidth, window.innerHeight);
  }

  resize(w: number, h: number) {
    const s = Math.min(w / 1280, h / 800, 1);
    this.scale = s;
    this.a = this.baseA * s;
    this.b = this.baseB * s;
    this.ringWidth = Math.max(2, 4 * s);
    this.attractionRadius = Math.max(30, 50 * s);
  }

  setCenter(cx: number, cy: number) {
    this.centerX = cx;
    this.centerY = cy;
  }

  reset() {
    this.occupiedPhases = new Array(this.totalPhases).fill(false);
    this.particles = [];
    this.lightThreads = [];
    this.flowerActive = false;
    this.flowerTimer = 0;
  }

  getNearestPhase(px: number, py: number): { phaseIndex: number; phaseAngle: number; dist: number; posX: number; posY: number } {
    const dx = px - this.centerX;
    const dy = py - this.centerY;
    const currentAngle = Math.atan2(dy, dx);
    let nearestIdx = 0;
    let nearestAngle = 0;
    let minDiff = Infinity;

    for (let i = 0; i < this.totalPhases; i++) {
      const phaseAngle = this.rotation + (i / this.totalPhases) * Math.PI * 2;
      let diff = Math.abs(this.wrapAngle(phaseAngle - currentAngle));
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
        nearestAngle = phaseAngle;
      }
    }

    const posX = this.centerX + Math.cos(nearestAngle) * this.a;
    const posY = this.centerY + Math.sin(nearestAngle) * this.b;

    const ox = px - posX;
    const oy = py - posY;
    const dist = Math.sqrt(ox * ox + oy * oy);

    return { phaseIndex: nearestIdx, phaseAngle: nearestAngle, dist, posX, posY };
  }

  private wrapAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  getDistanceToOrbit(px: number, py: number): number {
    const dx = px - this.centerX;
    const dy = py - this.centerY;
    const theta = Math.atan2(dy, dx);
    const orbitX = this.centerX + Math.cos(theta) * this.a;
    const orbitY = this.centerY + Math.sin(theta) * this.b;
    const ex = px - orbitX;
    const ey = py - orbitY;
    return Math.sqrt(ex * ex + ey * ey);
  }

  triggerFlash() {
    this.flashIntensity = 1;
    this.flashTimer = 400;
  }

  spawnBurstParticles(cx: number, cy: number, color: { r: number; g: number; b: number }) {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1500,
        maxLife: 1500,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  triggerVictoryFlower() {
    this.flowerActive = true;
    this.flowerTimer = 3000;
  }

  checkPhase(planet: Planet): { placed: boolean; burstAt?: { x: number; y: number }; color?: { r: number; g: number; b: number } } {
    if (planet.isInOrbit()) return { placed: false };

    const orbitDist = this.getDistanceToOrbit(planet.x, planet.y);
    if (orbitDist > this.attractionRadius) return { placed: false };

    const info = this.getNearestPhase(planet.x, planet.y);
    if (this.occupiedPhases[info.phaseIndex]) return { placed: false };

    this.occupiedPhases[info.phaseIndex] = true;
    planet.pullToOrbit(this.centerX, this.centerY, this.a, this.b, info.phaseAngle, info.phaseIndex);
    this.triggerFlash();

    setTimeout(() => {
      if (!planet.isPulling && planet.isInOrbit()) {
        this.spawnBurstParticles(planet.x, planet.y, planet.mainColorRgb);
      }
    }, 280);

    return {
      placed: true,
      burstAt: { x: info.posX, y: info.posY },
      color: planet.mainColorRgb
    };
  }

  releasePhase(planet: Planet) {
    const idx = planet.getPhaseIndex();
    if (idx >= 0 && idx < this.totalPhases) {
      this.occupiedPhases[idx] = false;
    }
  }

  update(dt: number, planets: Planet[]) {
    const ts = dt / 16.67;
    this.rotation += this.rotationSpeed * ts;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = 0;
        this.flashIntensity = 0;
      } else {
        this.flashIntensity = Math.min(1, this.flashTimer / 400);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * ts;
      p.y += p.vy * ts;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    const orbiting = planets.filter(p => p.isInOrbit() && !p.isPulling);
    orbiting.sort((a, b) => a.orbit.phaseAngle - b.orbit.phaseAngle);
    for (let i = 0; i < orbiting.length; i++) {
      const p1 = orbiting[i];
      const p2 = orbiting[(i + 1) % orbiting.length];
      const diff = this.wrapAngle(p2.orbit.phaseAngle - p1.orbit.phaseAngle);
      if (Math.abs(diff) < 0.08 && orbiting.length > 1) {
        const alreadyExists = this.lightThreads.some(t =>
          (t.planet1 === p1 && t.planet2 === p2) ||
          (t.planet1 === p2 && t.planet2 === p1)
        );
        if (!alreadyExists) {
          this.lightThreads.push({
            planet1: p1,
            planet2: p2,
            life: 300,
            maxLife: 300
          });
        }
      }
    }

    for (let i = this.lightThreads.length - 1; i >= 0; i--) {
      this.lightThreads[i].life -= dt;
      if (this.lightThreads[i].life <= 0) {
        this.lightThreads.splice(i, 1);
      }
    }

    if (this.flowerActive) {
      this.flowerTimer -= dt;
      if (this.flowerTimer <= 0) {
        this.flowerActive = false;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.centerX, this.centerY);

    const glowIntensity = 6 + this.flashIntensity * 18;
    ctx.shadowColor = `rgba(80, 200, 255, ${0.7 + this.flashIntensity * 0.3})`;
    ctx.shadowBlur = glowIntensity;

    const rot = this.rotation;
    const grad = ctx.createLinearGradient(-this.a, -this.b, this.a, this.b);
    const baseAlpha = 0.6 + this.flashIntensity * 0.4;
    grad.addColorStop(0, `rgba(80, 200, 255, ${baseAlpha})`);
    grad.addColorStop(0.5, `rgba(140, 180, 255, ${baseAlpha * 0.9})`);
    grad.addColorStop(1, `rgba(180, 120, 255, ${baseAlpha})`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = this.ringWidth;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.a, this.b, rot, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    for (let i = 0; i < this.totalPhases; i++) {
      const angle = rot + (i / this.totalPhases) * Math.PI * 2;
      const px = Math.cos(angle) * this.a;
      const py = Math.sin(angle) * this.b;
      const occupied = this.occupiedPhases[i];
      ctx.beginPath();
      if (occupied) {
        ctx.arc(px, py, Math.max(3, 5 * this.scale), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 220, 255, 0.55)';
        ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
      } else {
        ctx.arc(px, py, Math.max(2, 3 * this.scale), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120, 160, 220, 0.25)';
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    for (const t of this.lightThreads) {
      const a = t.life / t.maxLife;
      const c1 = t.planet1.mainColorRgb;
      const c2 = t.planet2.mainColorRgb;
      const r = Math.round((c1.r + c2.r) / 2);
      const g = Math.round((c1.g + c2.g) / 2);
      const b = Math.round((c1.b + c2.b) / 2);
      ctx.save();
      ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
      ctx.lineWidth = Math.max(1, 2 * this.scale);
      ctx.shadowColor = `rgba(${r},${g},${b},${a})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(t.planet1.x, t.planet1.y);
      const mx = (t.planet1.x + t.planet2.x) / 2 + (Math.random() - 0.5) * 10;
      const my = (t.planet1.y + t.planet2.y) / 2 + (Math.random() - 0.5) * 10;
      ctx.quadraticCurveTo(mx, my, t.planet2.x, t.planet2.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
      ctx.shadowColor = `rgba(${p.color.r},${p.color.g},${p.color.b},${alpha})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.flowerActive) {
      this.drawFlower(ctx);
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D) {
    const t = 1 - this.flowerTimer / 3000;
    const expand = t < 0.4 ? t / 0.4 : 1;
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const petals = 12;

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(t * Math.PI * 1.2);

    for (let i = 0; i < petals; i++) {
      ctx.save();
      ctx.rotate((i / petals) * Math.PI * 2);
      const petalLen = 180 * expand * this.scale;
      const petalWidth = 40 * expand * this.scale;
      const hue = (i / petals) * 360 + t * 180;

      const pg = ctx.createLinearGradient(0, 0, petalLen, 0);
      pg.addColorStop(0, `hsla(${hue}, 100%, 75%, ${0.9 * fade})`);
      pg.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 65%, ${0.7 * fade})`);
      pg.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 55%, ${0 * fade})`);

      ctx.strokeStyle = pg;
      ctx.lineWidth = petalWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${fade})`;
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(petalLen * 0.5, -petalWidth * 0.4, petalLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(petalLen * 0.5, petalWidth * 0.4, petalLen, 0);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  isPhaseOccupied(idx: number): boolean {
    return this.occupiedPhases[idx];
  }
}
