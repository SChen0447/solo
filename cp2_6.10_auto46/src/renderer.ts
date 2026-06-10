import type { BeatMode, RhythmPattern } from './beatEngine';
import { RHYTHM_PATTERNS } from './beatEngine';

interface OrbState {
  index: number;
  color: string;
  baseAngle: number;
  bounceStart: number;
  bounceDuration: number;
  isBouncing: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const ORB_COLORS = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3'];
const BOUNCE_HEIGHT = 40;
const BOUNCE_DURATION = 200;
const PARTICLE_COUNT = 20;
const PARTICLE_LIFE = 500;
const TRANSITION_DURATION = 1000;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private centerX = 0;
  private centerY = 0;
  private trackRadius = 0;
  private orbs: OrbState[] = [];
  private particles: Particle[] = [];
  private rafId: number | null = null;
  private currentPattern: RhythmPattern = RHYTHM_PATTERNS.simple;
  private targetPattern: RhythmPattern = RHYTHM_PATTERNS.simple;
  private transitionStart = 0;
  private isTransitioning = false;
  private currentProgress = 0;
  private totalProgressSteps = 4;
  private onResizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.initOrbs();
    this.onResizeHandler = () => this.resize();
    window.addEventListener('resize', this.onResizeHandler);
    this.resize();
  }

  private initOrbs(): void {
    this.orbs = ORB_COLORS.map((color, index) => ({
      index,
      color,
      baseAngle: -Math.PI / 2 + (index * Math.PI) / 2,
      bounceStart: 0,
      bounceDuration: BOUNCE_DURATION,
      isBouncing: false
    }));
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    const isMobile = window.innerWidth <= 768;
    const sizeRatio = isMobile ? 0.8 : 0.6;
    const minDim = Math.min(this.width, this.height);
    this.trackRadius = (minDim * sizeRatio) / 2;
  }

  setPattern(mode: BeatMode): void {
    this.targetPattern = RHYTHM_PATTERNS[mode];
    this.transitionStart = performance.now();
    this.isTransitioning = true;
    this.totalProgressSteps = 4 * this.targetPattern.subdivision;
  }

  setProgress(current: number, total: number): void {
    this.currentProgress = current;
    this.totalProgressSteps = total;
  }

  triggerOrbBounce(orbIndex: number): void {
    const orb = this.orbs[orbIndex % this.orbs.length];
    if (orb) {
      orb.isBouncing = true;
      orb.bounceStart = performance.now();
      this.emitParticles(orb);
    }
  }

  triggerBounceAtAngle(angle: number): void {
    let closestIndex = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.orbs.length; i++) {
      const diff = Math.abs(this.normalizeAngle(this.orbs[i].baseAngle - angle));
      if (diff < closestDist) {
        closestDist = diff;
        closestIndex = i;
      }
    }
    this.triggerOrbBounce(closestIndex);
    return closestIndex;
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  getOrbPositionOnCanvas(clientX: number, clientY: number): { angle: number; onTrack: boolean } {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.centerX;
    const y = clientY - rect.top - this.centerY;
    const distance = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(y, x);
    const tolerance = Math.max(30, this.trackRadius * 0.3);
    const onTrack = Math.abs(distance - this.trackRadius) < tolerance;
    return { angle, onTrack };
  }

  private emitParticles(orb: OrbState): void {
    const pos = this.getOrbPosition(orb, 0);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 1,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        color: orb.color,
        size: 2 + Math.random() * 4
      });
    }
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  private getOrbPosition(orb: OrbState, now: number): { x: number; y: number; bounceOffset: number; scale: number } {
    let bounceOffset = 0;
    let scale = 1;

    if (orb.isBouncing) {
      const elapsed = now - orb.bounceStart;
      const progress = Math.min(elapsed / orb.bounceDuration, 1);
      const bounceProgress = this.easeOutElastic(progress);

      const upDown = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      bounceOffset = -BOUNCE_HEIGHT * this.easeOutElastic(upDown);
      scale = 1 + 0.4 * bounceProgress;

      if (progress >= 1) {
        orb.isBouncing = false;
      }
    }

    const radius = this.trackRadius + bounceOffset;
    const x = this.centerX + Math.cos(orb.baseAngle) * radius;
    const y = this.centerY + Math.sin(orb.baseAngle) * radius;

    return { x, y, bounceOffset, scale };
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  start(): void {
    if (this.rafId !== null) return;
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private render(): void {
    const now = performance.now();
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackgroundGlow();

    let pattern = this.currentPattern;
    if (this.isTransitioning) {
      const t = Math.min((now - this.transitionStart) / TRANSITION_DURATION, 1);
      const easedT = 1 - Math.pow(1 - t, 3);
      const interpolatedColor = this.interpolateColor(
        this.currentPattern.trackColor,
        this.targetPattern.trackColor,
        easedT
      );
      const interpolatedGlow =
        this.currentPattern.glowIntensity +
        (this.targetPattern.glowIntensity - this.currentPattern.glowIntensity) * easedT;
      pattern = {
        ...this.targetPattern,
        trackColor: interpolatedColor,
        glowIntensity: interpolatedGlow
      };
      if (t >= 1) {
        this.isTransitioning = false;
        this.currentPattern = this.targetPattern;
      }
    }

    this.drawTrack(pattern);
    this.drawProgressRing(pattern);
    this.updateAndDrawParticles(now);
    this.drawOrbs(now);
  }

  private drawBackgroundGlow(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      0,
      this.centerX,
      this.centerY,
      this.trackRadius * 1.5
    );
    gradient.addColorStop(0, 'rgba(78, 205, 196, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawTrack(pattern: RhythmPattern): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.shadowColor = pattern.trackColor;
    ctx.shadowBlur = 20 * pattern.glowIntensity;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.trackRadius, 0, Math.PI * 2);
    ctx.strokeStyle = pattern.trackColor;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.trackRadius, 0, Math.PI * 2);
    ctx.strokeStyle = pattern.trackColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke();

    ctx.restore();

    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2 - Math.PI / 2;
      const innerR = this.trackRadius - 8;
      const outerR = this.trackRadius - 2;
      ctx.beginPath();
      ctx.moveTo(this.centerX + Math.cos(angle) * innerR, this.centerY + Math.sin(angle) * innerR);
      ctx.lineTo(this.centerX + Math.cos(angle) * outerR, this.centerY + Math.sin(angle) * outerR);
      ctx.strokeStyle = pattern.trackColor;
      ctx.globalAlpha = i % 4 === 0 ? 0.5 : 0.2;
      ctx.lineWidth = i % 4 === 0 ? 2 : 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawProgressRing(pattern: RhythmPattern): void {
    if (this.totalProgressSteps <= 0) return;
    const ctx = this.ctx;
    const progress = this.currentProgress / this.totalProgressSteps;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;
    const radius = this.trackRadius + 20;

    ctx.save();
    ctx.shadowColor = pattern.trackColor;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, radius, startAngle, endAngle);
    const gradient = ctx.createLinearGradient(
      this.centerX - radius,
      this.centerY,
      this.centerX + radius,
      this.centerY
    );
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(1, '#4ECDC4');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  private updateAndDrawParticles(now: number): void {
    const ctx = this.ctx;
    const delta = 16;

    this.particles = this.particles.filter((p) => {
      p.life -= delta;
      if (p.life <= 0) return false;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;

      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  private drawOrbs(now: number): void {
    const ctx = this.ctx;

    for (const orb of this.orbs) {
      const pos = this.getOrbPosition(orb, now);
      const baseRadius = 18;
      const radius = baseRadius * pos.scale;

      ctx.save();
      ctx.shadowColor = orb.color;
      ctx.shadowBlur = 25;

      const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, orb.color);
      gradient.addColorStop(1, orb.color);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResizeHandler);
    this.particles = [];
  }
}
