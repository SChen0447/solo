export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface VineState {
  id: number;
  stoneAId: number;
  stoneBId: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlPoints: { x: number; y: number }[];
  currentLength: number;
  totalLength: number;
  targetLength: number;
  isGrowing: boolean;
  isShrinking: boolean;
  isFullyGrown: boolean;
  growthSpeed: number;
}

const GROWTH_SPEED = 80;
const PARTICLE_MAX = 200;
const PARTICLE_LIFE = 0.8;
const PARTICLE_EMIT_RATE = 8;
const VINE_LINE_WIDTH = 6;
const VINE_COLOR = '#4a2c0a';
const VINE_ALPHA = 0.8;

let vineIdCounter = 0;
let particlePool: Particle[] = [];

function getParticle(): Particle {
  const p = particlePool.pop();
  if (p) return p;
  return { x: 0, y: 0, vx: 0, vy: 0, size: 0, life: 0, maxLife: 0, active: false };
}

function releaseParticle(p: Particle): void {
  if (particlePool.length < PARTICLE_MAX * 2) {
    p.active = false;
    particlePool.push(p);
  }
}

export class Vine {
  state: VineState;
  private particles: Particle[] = [];
  private particleEmitAccumulator = 0;
  private activeParticleCount = 0;

  constructor(
    stoneAId: number,
    stoneBId: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) {
    const controlPoints = this.generateControlPoints(startX, startY, endX, endY);
    const totalLength = this.calculateBezierLength(startX, startY, endX, endY, controlPoints);

    this.state = {
      id: ++vineIdCounter,
      stoneAId,
      stoneBId,
      startX,
      startY,
      endX,
      endY,
      controlPoints,
      currentLength: 0,
      totalLength,
      targetLength: 0,
      isGrowing: false,
      isShrinking: false,
      isFullyGrown: false,
      growthSpeed: GROWTH_SPEED,
    };
  }

  private generateControlPoints(
    x0: number, y0: number, x3: number, y3: number
  ): { x: number; y: number }[] {
    const dx = x3 - x0;
    const dy = y3 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist;
    const ny = dx / dist;

    const offset1 = dist * (0.25 + Math.random() * 0.1);
    const offset2 = dist * (0.25 + Math.random() * 0.1);
    const amp1 = dist * (0.15 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1);
    const amp2 = dist * (0.15 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1);

    return [
      { x: x0 + dx * offset1 + nx * amp1, y: y0 + dy * offset1 + ny * amp1 },
      { x: x0 + dx * (1 - offset2) + nx * amp2, y: y0 + dy * (1 - offset2) + ny * amp2 },
    ];
  }

  private calculateBezierLength(
    x0: number, y0: number, x3: number, y3: number,
    cps: { x: number; y: number }[]
  ): number {
    let length = 0;
    const steps = 50;
    let prevX = x0, prevY = y0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = this.bezierPoint(t, x0, y0, x3, y3, cps);
      length += Math.sqrt((p.x - prevX) ** 2 + (p.y - prevY) ** 2);
      prevX = p.x;
      prevY = p.y;
    }
    return length;
  }

  private bezierPoint(
    t: number, x0: number, y0: number, x3: number, y3: number,
    cps: { x: number; y: number }[]
  ): { x: number; y: number } {
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * cps[0].x +
      3 * mt * t * t * cps[1].x + t * t * t * x3;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * cps[0].y +
      3 * mt * t * t * cps[1].y + t * t * t * y3;
    return { x, y };
  }

  getPointAtLength(targetLen: number): { x: number; y: number; t: number } {
    if (targetLen <= 0) {
      return { x: this.state.startX, y: this.state.startY, t: 0 };
    }
    if (targetLen >= this.state.totalLength) {
      return { x: this.state.endX, y: this.state.endY, t: 1 };
    }

    let acc = 0;
    const steps = 100;
    let prevX = this.state.startX, prevY = this.state.startY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = this.bezierPoint(
        t, this.state.startX, this.state.startY,
        this.state.endX, this.state.endY, this.state.controlPoints
      );
      const seg = Math.sqrt((p.x - prevX) ** 2 + (p.y - prevY) ** 2);
      if (acc + seg >= targetLen) {
        const ratio = (targetLen - acc) / seg;
        return {
          x: prevX + (p.x - prevX) * ratio,
          y: prevY + (p.y - prevY) * ratio,
          t: t - (1 - ratio) / steps,
        };
      }
      acc += seg;
      prevX = p.x;
      prevY = p.y;
    }
    return { x: this.state.endX, y: this.state.endY, t: 1 };
  }

  startGrowth(): void {
    if (this.state.isFullyGrown) return;
    this.state.isGrowing = true;
    this.state.isShrinking = false;
    this.state.targetLength = this.state.totalLength;
  }

  startShrink(): void {
    if (this.state.currentLength <= 0) return;
    this.state.isShrinking = true;
    this.state.isGrowing = false;
    this.state.targetLength = 0;
  }

  toggle(): void {
    if (this.state.isFullyGrown || this.state.isGrowing) {
      this.startShrink();
    } else {
      this.startGrowth();
    }
  }

  update(deltaTime: number): void {
    if (this.state.isGrowing) {
      this.state.currentLength += this.state.growthSpeed * deltaTime;
      if (this.state.currentLength >= this.state.totalLength) {
        this.state.currentLength = this.state.totalLength;
        this.state.isGrowing = false;
        this.state.isFullyGrown = true;
      }
    } else if (this.state.isShrinking) {
      this.state.currentLength -= this.state.growthSpeed * deltaTime;
      if (this.state.currentLength <= 0) {
        this.state.currentLength = 0;
        this.state.isShrinking = false;
        this.state.isFullyGrown = false;
      }
    }

    if (this.state.isGrowing || this.state.isShrinking) {
      this.particleEmitAccumulator += deltaTime;
      const emitInterval = 1 / PARTICLE_EMIT_RATE;
      while (this.particleEmitAccumulator >= emitInterval && this.activeParticleCount < PARTICLE_MAX) {
        this.emitParticle();
        this.particleEmitAccumulator -= emitInterval;
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 20 * deltaTime;
      if (p.life <= 0) {
        p.active = false;
        this.activeParticleCount--;
        releaseParticle(p);
      }
    }
    this.particles = this.particles.filter(p => p.active);
  }

  private emitParticle(): void {
    const tip = this.getPointAtLength(this.state.currentLength);
    const p = getParticle();
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * 20;
    p.x = tip.x;
    p.y = tip.y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 15;
    p.size = 3 + Math.random() * 2;
    p.life = PARTICLE_LIFE;
    p.maxLife = PARTICLE_LIFE;
    p.active = true;
    this.particles.push(p);
    this.activeParticleCount++;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state.currentLength <= 0) {
      this.renderParticles(ctx);
      return;
    }

    const progress = this.state.currentLength / this.state.totalLength;
    const { x0, y0 } = this.buildPartialBezier(progress);

    ctx.beginPath();
    ctx.moveTo(x0[0], y0[0]);
    ctx.bezierCurveTo(x0[1], y0[1], x0[2], y0[2], x0[3], y0[3]);
    ctx.strokeStyle = `rgba(74, 44, 10, ${VINE_ALPHA})`;
    ctx.lineWidth = VINE_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x0[0], y0[0]);
    ctx.bezierCurveTo(x0[1], y0[1], x0[2], y0[2], x0[3], y0[3]);
    ctx.strokeStyle = 'rgba(120, 80, 40, 0.4)';
    ctx.lineWidth = VINE_LINE_WIDTH * 0.4;
    ctx.lineCap = 'round';
    ctx.stroke();

    this.renderParticles(ctx);
  }

  private buildPartialBezier(progress: number): { x0: number[]; y0: number[] } {
    const s = this.state;
    const P0 = { x: s.startX, y: s.startY };
    const P1 = s.controlPoints[0];
    const P2 = s.controlPoints[1];
    const P3 = { x: s.endX, y: s.endY };

    const Q0 = { x: P0.x + (P1.x - P0.x) * progress, y: P0.y + (P1.y - P0.y) * progress };
    const Q1 = { x: P1.x + (P2.x - P1.x) * progress, y: P1.y + (P2.y - P1.y) * progress };
    const Q2 = { x: P2.x + (P3.x - P2.x) * progress, y: P2.y + (P3.y - P2.y) * progress };

    const R0 = { x: Q0.x + (Q1.x - Q0.x) * progress, y: Q0.y + (Q1.y - Q0.y) * progress };
    const R1 = { x: Q1.x + (Q2.x - Q1.x) * progress, y: Q1.y + (Q2.y - Q1.y) * progress };

    const B = { x: R0.x + (R1.x - R0.x) * progress, y: R0.y + (R1.y - R0.y) * progress };

    return {
      x0: [P0.x, Q0.x, R0.x, B.x],
      y0: [P0.y, Q0.y, R0.y, B.y],
    };
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = (p.life / p.maxLife) * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(144, 238, 144, ${alpha})`;
      ctx.fill();
    }
  }
}
