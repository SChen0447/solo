import type { OrganismType, DepthLayer, GlowParticle, MigrationState } from './types';

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function depthToLayer(depth: number): DepthLayer {
  if (depth <= 200) return 'epipelagic';
  if (depth <= 700) return 'mesopelagic';
  return 'bathypelagic';
}

export abstract class Organism {
  x: number;
  y: number;
  type: OrganismType;
  depthLayer: DepthLayer;
  glowing: boolean = false;
  glowTriggerTime: number = 0;
  glowDuration: number = 0;
  glowCount: number = 0;
  migration: MigrationState | null = null;
  baseY: number = 0;
  depthOffset: number = 0;
  hovered: boolean = false;

  protected canvasWidth: number;
  protected canvasHeight: number;

  constructor(x: number, y: number, type: OrganismType, canvasWidth: number, canvasHeight: number) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.type = type;
    this.depthLayer = depthToLayer((y / canvasHeight) * 1000);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  abstract update(time: number, dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D, time: number): void;
  abstract triggerGlow(time: number): void;
  abstract getCollisionRadius(): number;

  startMigration(targetY: number, time: number, duration: number = 2000): void {
    this.migration = {
      isMigrating: true,
      startTime: time,
      duration,
      fromY: this.y,
      toY: targetY,
    };
  }

  updateMigration(time: number): boolean {
    if (!this.migration) return false;
    const elapsed = time - this.migration.startTime;
    const progress = Math.min(elapsed / this.migration.duration, 1);
    const eased = easeOutQuad(progress);
    this.y = this.migration.fromY + (this.migration.toY - this.migration.fromY) * eased;
    if (progress >= 1) {
      this.baseY = this.y;
      this.migration = null;
    }
    return true;
  }

  updateDepthLayer(): void {
    this.depthLayer = depthToLayer((this.y / this.canvasHeight) * 1000);
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const rx = this.x / this.canvasWidth;
    const ry = this.y / this.canvasHeight;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = rx * canvasWidth;
    this.y = ry * canvasHeight;
    this.baseY = ry * canvasHeight;
  }

  isPointInside(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.getCollisionRadius();
  }
}

export class Jellyfish extends Organism {
  private pulsePhase: number;
  private tentacleCount: number = 30;
  private tentaclePhases: number[];
  private tentacleAmplitudes: number[];
  private glowRingRadius: number = 0;
  private glowRingAlpha: number = 0;
  private bodyWidth: number = 24;
  private bodyHeight: number = 18;

  constructor(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    super(x, y, 'jellyfish', canvasWidth, canvasHeight);
    this.pulsePhase = rand(0, Math.PI * 2);
    this.tentaclePhases = [];
    this.tentacleAmplitudes = [];
    for (let i = 0; i < this.tentacleCount; i++) {
      this.tentaclePhases.push(rand(0, Math.PI * 2));
      this.tentacleAmplitudes.push(rand(2, 5));
    }
  }

  getCollisionRadius(): number {
    return 30;
  }

  update(time: number, dt: number): void {
    if (this.updateMigration(time)) {
      this.updateDepthLayer();
      return;
    }
    this.pulsePhase += (dt / 1000) * ((2 * Math.PI) / 1.5);
    const drift = Math.sin(time / 3000 + this.pulsePhase) * 0.15;
    this.x += drift;
    if (this.x < 20) this.x = 20;
    if (this.x > this.canvasWidth - 20) this.x = this.canvasWidth - 20;
    const pulseCycle = Math.sin(this.pulsePhase);
    const verticalDrift = pulseCycle > 0 ? -0.3 : 0.1;
    this.y = this.baseY + Math.sin(time / 4000 + this.pulsePhase * 0.5) * 8 + verticalDrift * (dt / 16);
    this.baseY += verticalDrift * (dt / 16) * 0.1;
    this.updateDepthLayer();

    if (this.glowing && time - this.glowTriggerTime > this.glowDuration) {
      this.glowing = false;
      this.glowRingRadius = 0;
      this.glowRingAlpha = 0;
    }
    if (this.glowing) {
      const elapsed = time - this.glowTriggerTime;
      const progress = elapsed / this.glowDuration;
      this.glowRingRadius = 10 + 30 * progress;
      this.glowRingAlpha = 1 - progress;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    const pulseCycle = Math.sin(this.pulsePhase);
    const scaleY = 0.7 + 0.3 * ((pulseCycle + 1) / 2);
    const scaleX = 1 + (1 - scaleY) * 0.5;

    if (this.hovered) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
      gradient.addColorStop(0, 'rgba(0, 255, 204, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(this.x, this.y);
    ctx.scale(scaleX, scaleY);

    const bellGrad = ctx.createRadialGradient(0, -2, 2, 0, 0, this.bodyWidth);
    bellGrad.addColorStop(0, this.glowing ? 'rgba(0, 255, 200, 0.9)' : 'rgba(139, 94, 60, 0.7)');
    bellGrad.addColorStop(0.5, this.glowing ? 'rgba(0, 230, 180, 0.5)' : 'rgba(139, 94, 60, 0.4)');
    bellGrad.addColorStop(1, 'rgba(139, 94, 60, 0.1)');
    ctx.fillStyle = bellGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.bodyWidth, this.bodyHeight, 0, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = this.glowing ? 'rgba(0, 255, 204, 0.6)' : 'rgba(139, 94, 60, 0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.bodyWidth, this.bodyHeight, 0, Math.PI, 0);
    ctx.stroke();

    ctx.scale(1 / scaleX, 1 / scaleY);

    for (let i = 0; i < this.tentacleCount; i++) {
      const angle = (i / this.tentacleCount) * Math.PI;
      const startX = -this.bodyWidth + (2 * this.bodyWidth * i) / this.tentacleCount;
      const swingPhase = this.tentaclePhases[i] + time / 800;
      const amp = this.tentacleAmplitudes[i];
      ctx.strokeStyle = this.glowing ? 'rgba(0, 255, 204, 0.4)' : 'rgba(139, 94, 60, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(startX * scaleX, 0);
      const tentLen = 20 + Math.sin(swingPhase) * 5;
      const midSwing = Math.sin(swingPhase) * amp;
      const endSwing = Math.sin(swingPhase + 0.5) * amp;
      ctx.quadraticCurveTo(
        startX * scaleX + midSwing,
        tentLen * 0.5,
        startX * scaleX + endSwing,
        tentLen
      );
      ctx.stroke();
    }

    if (this.glowing) {
      ctx.scale(scaleX, scaleY);
      const ringGrad = ctx.createRadialGradient(0, 0, this.glowRingRadius - 5, 0, 0, this.glowRingRadius);
      ringGrad.addColorStop(0, `rgba(0, 255, 204, 0)`);
      ringGrad.addColorStop(0.7, `rgba(0, 255, 204, ${this.glowRingAlpha * 0.5})`);
      ringGrad.addColorStop(1, `rgba(0, 255, 204, 0)`);
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.glowRingRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  triggerGlow(time: number): void {
    this.glowing = true;
    this.glowTriggerTime = time;
    this.glowDuration = 800;
    this.glowCount++;
    this.glowRingRadius = 10;
    this.glowRingAlpha = 1;
  }
}

export class Krill extends Organism {
  private jumpTimer: number = 0;
  private jumpInterval: number = 300;
  private legCount: number;
  private legPhase: number = 0;
  private facingLeft: boolean = Math.random() > 0.5;
  private particles: GlowParticle[] = [];
  private bodyLength: number = 12;
  private bodyHeight: number = 4;

  constructor(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    super(x, y, 'krill', canvasWidth, canvasHeight);
    this.jumpInterval = rand(250, 400);
    this.legCount = Math.floor(rand(10, 13));
  }

  getCollisionRadius(): number {
    return 12;
  }

  update(time: number, dt: number): void {
    if (this.updateMigration(time)) {
      this.updateDepthLayer();
      return;
    }

    this.jumpTimer += dt;
    if (this.jumpTimer >= this.jumpInterval) {
      this.jumpTimer = 0;
      this.jumpInterval = rand(250, 400);
      const jumpDist = rand(8, 15);
      const angle = rand(-Math.PI * 0.3, Math.PI * 0.3) + (this.facingLeft ? Math.PI : 0);
      this.x += Math.cos(angle) * jumpDist;
      this.y += Math.sin(angle) * jumpDist * 0.3;
      this.baseY = this.y;
      this.facingLeft = Math.random() > 0.5;
    }

    this.legPhase += (dt / 1000) * 12;

    this.x = Math.max(20, Math.min(this.canvasWidth - 20, this.x));
    this.y = Math.max(20, Math.min(this.canvasHeight - 20, this.y));
    this.baseY = this.y;

    this.updateDepthLayer();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (time - p.startTime > p.duration) {
        this.particles.splice(i, 1);
      }
    }

    if (this.glowing && time - this.glowTriggerTime > this.glowDuration) {
      this.glowing = false;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();

    if (this.hovered) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 15);
      gradient.addColorStop(0, 'rgba(0, 255, 204, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
      ctx.fill();
    }

    const dir = this.facingLeft ? -1 : 1;
    ctx.translate(this.x, this.y);
    ctx.scale(dir, 1);

    const krillGrad = ctx.createLinearGradient(-this.bodyLength, 0, this.bodyLength, 0);
    krillGrad.addColorStop(0, this.glowing ? 'rgba(0, 150, 255, 0.8)' : 'rgba(231, 111, 81, 0.7)');
    krillGrad.addColorStop(1, this.glowing ? 'rgba(0, 100, 255, 0.4)' : 'rgba(231, 111, 81, 0.3)');
    ctx.fillStyle = krillGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.bodyLength, this.bodyHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.glowing ? 'rgba(0, 150, 255, 0.5)' : 'rgba(231, 111, 81, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.bodyLength, this.bodyHeight, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < this.legCount; i++) {
      const lx = -this.bodyLength + (2 * this.bodyLength * i) / this.legCount;
      const legAngle = Math.sin(this.legPhase + i * 0.5) * 0.4;
      ctx.strokeStyle = this.glowing ? 'rgba(0, 150, 255, 0.4)' : 'rgba(231, 111, 81, 0.3)';
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(lx, this.bodyHeight);
      ctx.lineTo(lx + Math.sin(legAngle) * 4, this.bodyHeight + 5 + Math.cos(legAngle) * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, -this.bodyHeight);
      ctx.lineTo(lx + Math.sin(legAngle) * 4, -this.bodyHeight - 5 - Math.cos(legAngle) * 2);
      ctx.stroke();
    }

    ctx.scale(dir, 1);

    for (const p of this.particles) {
      const elapsed = time - p.startTime;
      const progress = elapsed / p.duration;
      const alpha = 1 - progress;
      ctx.fillStyle = `rgba(0, 120, 255, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(p.x - this.x, p.y - this.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  triggerGlow(time: number): void {
    this.glowing = true;
    this.glowTriggerTime = time;
    this.glowDuration = 1200;
    this.glowCount++;
    const count = Math.floor(rand(8, 16));
    for (let i = 0; i < count; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(2, 4);
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        startTime: time,
        duration: 1200,
        size: rand(1.5, 3),
        color: '#0078ff',
      });
    }
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}

export class Siphonophore extends Organism {
  private segmentCount: number;
  private segments: { length: number; width: number; glowPhase: number }[];
  private totalLength: number;
  private driftPhase: number;
  private chainGlowProgress: number = -1;
  private chainGlowStartTime: number = 0;
  private chainGlowDirection: number = 0;

  constructor(x: number, y: number, canvasWidth: number, canvasHeight: number) {
    super(x, y, 'siphonophore', canvasWidth, canvasHeight);
    this.segmentCount = Math.floor(rand(6, 11));
    this.segments = [];
    this.totalLength = 0;
    for (let i = 0; i < this.segmentCount; i++) {
      const segLen = rand(8, 12);
      const segWid = 6;
      this.segments.push({
        length: segLen,
        width: segWid,
        glowPhase: rand(0, Math.PI * 2),
      });
      this.totalLength += segLen;
    }
    this.totalLength = Math.max(80, Math.min(120, this.totalLength));
    this.driftPhase = rand(0, Math.PI * 2);
  }

  getCollisionRadius(): number {
    return this.totalLength / 2;
  }

  update(time: number, dt: number): void {
    if (this.updateMigration(time)) {
      this.updateDepthLayer();
      return;
    }

    this.driftPhase += (dt / 1000) * 0.5;
    this.x += Math.sin(this.driftPhase) * 0.2;
    this.y = this.baseY + Math.cos(this.driftPhase * 0.7) * 5;

    if (this.x < 20) this.x = 20;
    if (this.x > this.canvasWidth - 20) this.x = this.canvasWidth - 20;

    this.updateDepthLayer();

    if (this.glowing && time - this.glowTriggerTime > this.glowDuration) {
      this.glowing = false;
      this.chainGlowProgress = -1;
    }
    if (this.glowing && this.chainGlowProgress >= 0) {
      const elapsed = time - this.chainGlowStartTime;
      this.chainGlowProgress = elapsed / 1000;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();

    if (this.hovered) {
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 25);
      gradient.addColorStop(0, 'rgba(0, 255, 204, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    const segSpacing = this.totalLength / this.segmentCount;
    const startY = this.y - this.totalLength / 2;

    for (let i = 0; i < this.segmentCount; i++) {
      const seg = this.segments[i];
      const sy = startY + i * segSpacing;
      const sx = this.x + Math.sin(this.driftPhase + i * 0.3) * 3;

      const innerGlow = (Math.sin(time / 500 + seg.glowPhase) + 1) / 2;

      let isChainGlowing = false;
      if (this.glowing && this.chainGlowProgress >= 0) {
        const distFromCenter = Math.abs(i - this.segmentCount / 2) * segSpacing;
        const glowReach = this.chainGlowProgress * 50;
        isChainGlowing = distFromCenter <= glowReach;
      }

      const alpha = isChainGlowing ? 0.9 : 0.4 + innerGlow * 0.3;
      const segGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, seg.width);
      segGrad.addColorStop(
        0,
        isChainGlowing
          ? `rgba(0, 229, 255, ${alpha})`
          : `rgba(43, 45, 66, ${alpha})`
      );
      segGrad.addColorStop(
        1,
        isChainGlowing
          ? `rgba(0, 150, 255, ${alpha * 0.5})`
          : `rgba(43, 45, 66, ${alpha * 0.3})`
      );
      ctx.fillStyle = segGrad;
      ctx.beginPath();
      ctx.ellipse(sx, sy, seg.width, seg.length / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      if (innerGlow > 0.5 || isChainGlowing) {
        const dotAlpha = isChainGlowing ? 0.9 : innerGlow * 0.6;
        ctx.fillStyle = isChainGlowing
          ? `rgba(0, 229, 255, ${dotAlpha})`
          : `rgba(0, 200, 255, ${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = this.glowing ? 'rgba(0, 229, 255, 0.4)' : 'rgba(43, 45, 66, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i < this.segmentCount; i++) {
      const sy = startY + i * segSpacing;
      const sx = this.x + Math.sin(this.driftPhase + i * 0.3) * 3;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.restore();
  }

  triggerGlow(time: number): void {
    this.glowing = true;
    this.glowTriggerTime = time;
    this.glowDuration = 1000;
    this.glowCount++;
    this.chainGlowProgress = 0;
    this.chainGlowStartTime = time;
    this.chainGlowDirection = 0;
  }
}
