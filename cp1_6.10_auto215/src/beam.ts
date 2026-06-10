import { Mirror, Edge } from './mirror';

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  color: string;
}

export interface BeamConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  speed: number;
  splitCount: number;
  maxSplits: number;
}

const REFL_COLOR = '#81c784';
const REFR_COLOR = '#ffd54f';
const EMITTER_X = 30;
const EMITTER_Y = 30;

export class Beam {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public color: string;
  public speed: number;
  public radius: number;
  public splitCount: number;
  public maxSplits: number;
  public active: boolean;
  public hitReceiver: boolean;
  public id: number;

  private static _idCounter = 0;

  constructor(config: BeamConfig) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = config.color;
    this.speed = config.speed;
    this.radius = 6;
    this.splitCount = config.splitCount;
    this.maxSplits = config.maxSplits;
    this.active = true;
    this.hitReceiver = false;
    this.id = Beam._idCounter++;
  }

  public updatePosition(dt: number): void {
    this.x += this.vx * this.speed * dt;
    this.y += this.vy * this.speed * dt;
  }

  public checkBoundary(w: number, h: number): boolean {
    const pad = 50;
    if (this.x < -pad || this.x > w + pad || this.y < -pad || this.y > h + pad) {
      this.active = false;
      return true;
    }
    return false;
  }

  public reflect(nx: number, ny: number): void {
    const dot = this.vx * nx + this.vy * ny;
    this.vx = this.vx - 2 * dot * nx;
    this.vy = this.vy - 2 * dot * ny;
    const len = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
    this.vx /= len;
    this.vy /= len;
    this.color = REFL_COLOR;
  }

  public refract(nx: number, ny: number): Beam | null {
    if (this.splitCount >= this.maxSplits) return null;
    const dot = this.vx * nx + this.vy * ny;
    let rx = this.vx - 2 * dot * nx;
    let ry = this.vy - 2 * dot * ny;
    const angleOffset = 0.4;
    const cos = Math.cos(angleOffset);
    const sin = Math.sin(angleOffset);
    const nrx = rx * cos - ry * sin;
    const nry = rx * sin + ry * cos;
    const len = Math.sqrt(nrx * nrx + nry * nry) || 1;

    return new Beam({
      x: this.x,
      y: this.y,
      vx: nrx / len,
      vy: nry / len,
      color: REFR_COLOR,
      speed: this.speed,
      splitCount: this.splitCount + 1,
      maxSplits: this.maxSplits,
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

interface RayHit {
  dist: number;
  edge: Edge;
  mirror: Mirror;
}

export class BeamManager {
  public beams: Beam[];
  private particles: Particle[];
  private emitterX: number;
  private emitterY: number;
  public beamSpeed: number;
  public maxSplits: number;
  private mirrors: Mirror[];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    emitterX: number,
    emitterY: number,
    beamSpeed: number,
    maxSplits: number,
    mirrors: Mirror[],
    w: number,
    h: number
  ) {
    this.emitterX = emitterX;
    this.emitterY = emitterY;
    this.beamSpeed = beamSpeed;
    this.maxSplits = maxSplits;
    this.mirrors = mirrors;
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.beams = [];
    this.particles = [];
    this.spawnInitialBeam();
  }

  public setMirrors(mirrors: Mirror[]): void {
    this.mirrors = mirrors;
  }

  public resize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  public setBeamSpeed(speed: number): void {
    this.beamSpeed = speed;
    this.beams.forEach((b) => (b.speed = speed));
  }

  public setMaxSplits(n: number): void {
    this.maxSplits = n;
    this.beams.forEach((b) => (b.maxSplits = n));
  }

  public reset(): void {
    this.beams = [];
    this.particles = [];
    this.spawnInitialBeam();
  }

  private spawnInitialBeam(): void {
    const angle = Math.PI / 4;
    this.beams.push(
      new Beam({
        x: this.emitterX,
        y: this.emitterY,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        color: '#ffffff',
        speed: this.beamSpeed,
        splitCount: 0,
        maxSplits: this.maxSplits,
      })
    );
  }

  private raySegmentIntersect(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    edge: Edge
  ): number | null {
    const x1 = edge.x1,
      y1 = edge.y1;
    const x2 = edge.x2,
      y2 = edge.y2;
    const sx = x2 - x1,
      sy = y2 - y1;
    const denom = dx * sy - dy * sx;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((x1 - ox) * sy - (y1 - oy) * sx) / denom;
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / denom;
    if (t > 1e-6 && u >= 0 && u <= 1) return t;
    return null;
  }

  private findClosestHit(beam: Beam, maxDist: number): RayHit | null {
    let best: RayHit | null = null;
    for (const mirror of this.mirrors) {
      for (const edge of mirror.getEdges()) {
        const t = this.raySegmentIntersect(beam.x, beam.y, beam.vx, beam.vy, edge);
        if (t !== null && t <= maxDist) {
          if (!best || t < best.dist) {
            best = { dist: t, edge, mirror };
          }
        }
      }
    }
    return best;
  }

  private pushParticles(x: number, y: number, color: string, dt: number): void {
    const rate = 3;
    const count = Math.max(1, Math.floor(rate * dt * 60));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 3,
        age: 0,
        maxAge: 1.2,
        color,
      });
    }
  }

  public update(dt: number, receiverX: number, receiverY: number, receiverR: number): string[] {
    const hitColors: string[] = [];
    const newBeams: Beam[] = [];
    const step = 1 / 60;
    let accum = dt;

    while (accum > 0) {
      const sub = Math.min(accum, step);
      accum -= sub;

      for (const beam of this.beams) {
        if (!beam.active) continue;

        this.pushParticles(beam.x, beam.y, beam.color, sub);

        const maxDist = beam.speed * sub;
        const hit = this.findClosestHit(beam, maxDist);

        if (hit) {
          beam.x += beam.vx * (hit.dist - 0.5);
          beam.y += beam.vy * (hit.dist - 0.5);

          const child = beam.refract(hit.edge.nx, hit.edge.ny);
          if (child) newBeams.push(child);

          beam.reflect(hit.edge.nx, hit.edge.ny);

          beam.x += beam.vx * 1.5;
          beam.y += beam.vy * 1.5;
        } else {
          beam.updatePosition(sub);
        }

        const dx = beam.x - receiverX;
        const dy = beam.y - receiverY;
        const distToReceiver = Math.sqrt(dx * dx + dy * dy);
        if (distToReceiver < receiverR && dx < 0) {
          if (!beam.hitReceiver) {
            beam.hitReceiver = true;
            hitColors.push(beam.color);
          }
        }

        beam.checkBoundary(this.canvasWidth, this.canvasHeight);
      }
    }

    this.beams = this.beams.filter((b) => b.active);
    this.beams.push(...newBeams);

    if (this.beams.length === 0) {
      this.spawnInitialBeam();
    }

    for (const p of this.particles) {
      p.age += dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.maxAge);

    return hitColors;
  }

  public renderEmitter(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.emitterX, this.emitterY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.age / p.maxAge;
      const alpha = 0.8 * (1 - t);
      const radius = 3 * (1 - t * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderParticles(ctx);
    for (const beam of this.beams) {
      beam.render(ctx);
    }
    this.renderEmitter(ctx);
  }
}
