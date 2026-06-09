import type { Fragment, Particle, Shockwave, SpiralStar } from './types';

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

const INITIAL_FRAGMENT_COUNT = 30;
const TRIGGER_DISTANCE = 25;
const PARTICLE_LIFE_FRAMES = Math.floor(1.5 * 30);
const AGGREGATION_THRESHOLD = 5;
const SPIRAL_POINT_COUNT = 100;
const SPIRAL_DIAMETER = 120;
const AGGREGATION_DURATION_FRAMES = 10 * 30;
const STAR_DISPLAY_FRAMES = 5 * 30;
const STAR_TOTAL_DURATION = AGGREGATION_DURATION_FRAMES + STAR_DISPLAY_FRAMES;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function pickColor(): string {
  return COLOR_PALETTE[randInt(0, COLOR_PALETTE.length - 1)];
}

function generatePolygonVertices(sides: number, radius: number): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const r = radius * rand(0.75, 1.15);
    verts.push({
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
    });
  }
  return verts;
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
}

export interface FragmentManagerState {
  chainCount: number;
  remainingCount: number;
}

export class FragmentManager {
  fragments: Fragment[] = [];
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  spiralStar: SpiralStar | null = null;
  private nextId = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private chainCount = 0;
  private gravityMode = false;
  private aggregationFrameCount = 0;
  private pendingNextRound = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.spawnFragments(INITIAL_FRAGMENT_COUNT, false);
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  spawnFragments(count: number, spreadOut: boolean): void {
    const margin = 60;
    const minDist = spreadOut ? 120 : 50;
    const positions: { x: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      let x = 0;
      let y = 0;
      let attempts = 0;
      do {
        if (spreadOut) {
          const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
          const baseR = Math.min(this.canvasWidth, this.canvasHeight) * 0.35;
          const r = baseR * rand(0.6, 1.1);
          x = this.canvasWidth / 2 + Math.cos(angle) * r;
          y = this.canvasHeight / 2 + Math.sin(angle) * r;
        } else {
          x = rand(margin, this.canvasWidth - margin);
          y = rand(margin, this.canvasHeight - margin);
        }
        attempts++;
        if (attempts > 30) break;
      } while (positions.some((p) => Math.hypot(p.x - x, p.y - y) < minDist));

      positions.push({ x, y });

      const sides = randInt(3, 6);
      const radius = rand(12, 20);
      const speed = rand(0.1, 0.3);
      const angle = rand(0, Math.PI * 2);
      this.fragments.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        sides,
        radius,
        rotation: rand(0, Math.PI * 2),
        angularVelocity: rand(0.05, 0.15) * (Math.random() < 0.5 ? -1 : 1),
        color: pickColor(),
        exploded: false,
        vertices: generatePolygonVertices(sides, radius),
      });
    }
  }

  explodeFragment(fragment: Fragment): void {
    if (fragment.exploded) return;
    fragment.exploded = true;
    this.chainCount++;

    const particleCount = randInt(6, 10);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + rand(-0.2, 0.2);
      const speed = rand(2, 4);
      this.particles.push({
        x: fragment.x,
        y: fragment.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: rand(2, 4),
        color: fragment.color,
        life: PARTICLE_LIFE_FRAMES,
        maxLife: PARTICLE_LIFE_FRAMES,
      });
    }

    this.shockwaves.push({
      x: fragment.x,
      y: fragment.y,
      radius: 5,
      maxRadius: 30,
      color: fragment.color,
      opacity: 0.6,
      triggered: new Set<number>(),
    });
  }

  checkPlayerCollision(playerX: number, playerY: number): void {
    if (this.gravityMode) return;
    for (const frag of this.fragments) {
      if (frag.exploded) continue;
      const dx = frag.x - playerX;
      const dy = frag.y - playerY;
      if (dx * dx + dy * dy <= TRIGGER_DISTANCE * TRIGGER_DISTANCE) {
        this.explodeFragment(frag);
      }
    }
  }

  private checkChainCollisions(): void {
    for (const wave of this.shockwaves) {
      for (const frag of this.fragments) {
        if (frag.exploded || wave.triggered.has(frag.id)) continue;
        const dx = frag.x - wave.x;
        const dy = frag.y - wave.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= wave.radius) {
          wave.triggered.add(frag.id);
          this.explodeFragment(frag);
        }
      }
    }
  }

  private updateFragments(): void {
    for (const frag of this.fragments) {
      if (frag.exploded) continue;
      frag.x += frag.vx;
      frag.y += frag.vy;
      frag.rotation += frag.angularVelocity;

      if (frag.x - frag.radius < 0) {
        frag.x = frag.radius;
        frag.vx = Math.abs(frag.vx);
      } else if (frag.x + frag.radius > this.canvasWidth) {
        frag.x = this.canvasWidth - frag.radius;
        frag.vx = -Math.abs(frag.vx);
      }
      if (frag.y - frag.radius < 0) {
        frag.y = frag.radius;
        frag.vy = Math.abs(frag.vy);
      } else if (frag.y + frag.radius > this.canvasHeight) {
        frag.y = this.canvasHeight - frag.radius;
        frag.vy = -Math.abs(frag.vy);
      }
    }
  }

  private updateParticles(): void {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;
    const maxSpeed = 3;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (this.gravityMode) {
        const dx = cx - p.x;
        const dy = cy - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          const ax = (dx / dist) * 0.02;
          const ay = (dy / dist) * 0.02;
          p.vx += ax;
          p.vy += ay;
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > maxSpeed) {
            p.vx = (p.vx / sp) * maxSpeed;
            p.vy = (p.vy / sp) * maxSpeed;
          }
        }
        p.life = Math.min(p.maxLife, p.life + 2);
      } else {
        p.life--;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateShockwaves(): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      const t = 1 - (wave.maxRadius - wave.radius) / (wave.maxRadius - 5);
      wave.radius = Math.min(wave.maxRadius, wave.radius + 1.2);
      wave.opacity = 0.6 * (1 - t);
      if (wave.radius >= wave.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private initSpiralStar(): void {
    const points: SpiralStar['points'] = [];
    const a = 0;
    const b = SPIRAL_DIAMETER / (2 * Math.PI * 4.5);
    for (let i = 0; i < SPIRAL_POINT_COUNT; i++) {
      const t = i / SPIRAL_POINT_COUNT;
      const theta = t * Math.PI * 2 * 4.5;
      const r = a + b * theta;
      const tx = Math.cos(theta) * r;
      const ty = Math.sin(theta) * r;
      const startAngle = rand(0, Math.PI * 2);
      const startR = Math.min(this.canvasWidth, this.canvasHeight) * 0.4;
      points.push({
        x: Math.cos(startAngle) * startR,
        y: Math.sin(startAngle) * startR,
        targetX: tx,
        targetY: ty,
        radius: rand(1, 3),
        color: lerpColor('#FF4500', '#00BFFF', t),
        angle: theta,
      });
    }
    this.spiralStar = {
      active: true,
      points,
      rotation: 0,
      haloParticles: [],
      timeActive: 0,
      maxDuration: STAR_TOTAL_DURATION,
    };
  }

  private updateSpiralStar(): void {
    if (!this.spiralStar) return;
    this.spiralStar.timeActive++;
    const star = this.spiralStar;

    if (star.timeActive < AGGREGATION_DURATION_FRAMES) {
      const t = star.timeActive / AGGREGATION_DURATION_FRAMES;
      const ease = 1 - Math.pow(1 - t, 3);
      for (const pt of star.points) {
        pt.x = pt.x + (pt.targetX - pt.x) * ease * 0.15;
        pt.y = pt.y + (pt.targetY - pt.y) * ease * 0.15;
      }
    } else {
      for (const pt of star.points) {
        pt.x = pt.targetX;
        pt.y = pt.targetY;
      }
    }

    star.rotation += 0.01;

    if (star.timeActive >= AGGREGATION_DURATION_FRAMES - 30) {
      if (Math.random() < 0.4) {
        const angle = rand(0, Math.PI * 2);
        const r = SPIRAL_DIAMETER / 2 + rand(5, 20);
        const colors = ['#ADD8E6', '#E6E6FA', '#B0C4DE', '#D8BFD8'];
        star.haloParticles.push({
          x: this.canvasWidth / 2 + Math.cos(angle + star.rotation) * r,
          y: this.canvasHeight / 2 + Math.sin(angle + star.rotation) * r,
          vx: Math.cos(angle) * rand(0.3, 0.8),
          vy: Math.sin(angle) * rand(0.3, 0.8),
          radius: rand(1, 2),
          color: colors[randInt(0, colors.length - 1)],
          life: 60,
          maxLife: 60,
        });
      }
    }

    for (let i = star.haloParticles.length - 1; i >= 0; i--) {
      const hp = star.haloParticles[i];
      hp.x += hp.vx;
      hp.y += hp.vy;
      hp.life--;
      if (hp.life <= 0) {
        star.haloParticles.splice(i, 1);
      }
    }

    if (star.timeActive > star.maxDuration) {
      this.startNextRound();
    }
  }

  private startNextRound(): void {
    this.spiralStar = null;
    this.fragments = [];
    this.particles = [];
    this.shockwaves = [];
    this.gravityMode = false;
    this.aggregationFrameCount = 0;
    this.chainCount = 0;
    this.pendingNextRound = false;
    this.spawnFragments(INITIAL_FRAGMENT_COUNT, true);
  }

  update(): void {
    if (this.spiralStar) {
      this.updateSpiralStar();
      this.updateParticles();
      return;
    }

    this.updateFragments();
    this.updateShockwaves();
    this.checkChainCollisions();
    this.updateParticles();

    const remaining = this.fragments.filter((f) => !f.exploded).length;
    if (remaining < AGGREGATION_THRESHOLD && !this.gravityMode && this.particles.length > 0) {
      this.gravityMode = true;
      this.aggregationFrameCount = 0;
    }

    if (this.gravityMode) {
      this.aggregationFrameCount++;
      if (this.aggregationFrameCount > 60 && !this.spiralStar) {
        this.initSpiralStar();
      }
    }
  }

  reset(): void {
    this.fragments = [];
    this.particles = [];
    this.shockwaves = [];
    this.spiralStar = null;
    this.chainCount = 0;
    this.gravityMode = false;
    this.aggregationFrameCount = 0;
    this.pendingNextRound = false;
    this.spawnFragments(INITIAL_FRAGMENT_COUNT, false);
  }

  getState(): FragmentManagerState {
    return {
      chainCount: this.chainCount,
      remainingCount: this.fragments.filter((f) => !f.exploded).length,
    };
  }

  get spiralStarCenter(): { x: number; y: number } {
    return { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
  }
}
