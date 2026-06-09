import { AudioEngine } from './audioEngine';

const PARTICLE_COUNT = 500;
const ROWS = 10;
const COLS = 50;
const FRICTION = 0.92;
const PULSE_MAX_RADIUS = 400;
const PULSE_DURATION = 2000;
const COLOR_TRANSITION_DURATION = 1500;
const STATIONARY_THRESHOLD = 0.1;
const STATIONARY_TIMEOUT = 3000;
const BREATHING_PERIOD = 2000;

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  saturation: number;
  brightness: number;
  colorTransitionStart: number;
  colorTransitionDuration: number;
  originalHue: number;
  targetHue: number;
  stationarySince: number;
  triggeredPulses: Set<number>;
}

interface Pulse {
  id: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function sineInOut(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function hsvToRgb(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  return `rgb(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)})`;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private particles: Particle[] = [];
  private pulses: Pulse[] = [];
  private pulseIdCounter = 0;
  private performanceMode = false;

  constructor(canvas: HTMLCanvasElement, audioEngine: AudioEngine) {
    this.canvas = canvas;
    this.audioEngine = audioEngine;
    this.initParticles();
  }

  private initParticles(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const marginX = width * 0.05;
    const marginY = height * 0.05;
    const usableWidth = width - marginX * 2;
    const usableHeight = height - marginY * 2;
    const spacingX = usableWidth / (COLS - 1);
    const spacingY = usableHeight / (ROWS - 1);

    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = marginX + col * spacingX;
      const y = marginY + row * spacingY;
      const hue = (i / PARTICLE_COUNT) * 360;

      this.particles.push({
        x,
        y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        radius: 3 + Math.random() * 7,
        hue,
        saturation: 0.8,
        brightness: 0.7,
        colorTransitionStart: -1,
        colorTransitionDuration: COLOR_TRANSITION_DURATION,
        originalHue: hue,
        targetHue: hue,
        stationarySince: 0,
        triggeredPulses: new Set()
      });
    }
  }

  triggerPulse(x: number, y: number): void {
    const now = performance.now();
    const pulse: Pulse = {
      id: this.pulseIdCounter++,
      x,
      y,
      startTime: now,
      duration: PULSE_DURATION,
      maxRadius: PULSE_MAX_RADIUS
    };
    this.pulses.push(pulse);
  }

  resetToMatrix(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const marginX = width * 0.05;
    const marginY = height * 0.05;
    const usableWidth = width - marginX * 2;
    const usableHeight = height - marginY * 2;
    const spacingX = usableWidth / (COLS - 1);
    const spacingY = usableHeight / (ROWS - 1);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const x = marginX + col * spacingX;
      const y = marginY + row * spacingY;
      const p = this.particles[i];
      p.originX = x;
      p.originY = y;
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.stationarySince = 0;
      p.triggeredPulses.clear();
    }
  }

  randomizePositions(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    for (const p of this.particles) {
      const x = 30 + Math.random() * (width - 60);
      const y = 30 + Math.random() * (height - 60);
      p.originX = x;
      p.originY = y;
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.stationarySince = 0;
      p.triggeredPulses.clear();
    }
  }

  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled;
  }

  getPerformanceMode(): boolean {
    return this.performanceMode;
  }

  private getInterpolatedHue(p: Particle, now: number): number {
    if (p.colorTransitionStart < 0) {
      return p.originalHue;
    }
    const elapsed = now - p.colorTransitionStart;
    const t = Math.min(elapsed / p.colorTransitionDuration, 1);

    if (t <= 0.5) {
      const halfT = t * 2;
      const eased = easeOutCubic(halfT);
      return p.originalHue + (p.targetHue - p.originalHue) * eased;
    } else {
      const halfT = (t - 0.5) * 2;
      const eased = easeOutCubic(halfT);
      return p.targetHue + (p.originalHue - p.targetHue) * eased;
    }
  }

  private getBreathingAlpha(p: Particle, now: number): number {
    if (p.stationarySince <= 0 || (now - p.stationarySince) < STATIONARY_TIMEOUT) {
      return 1;
    }
    const breathingTime = (now - p.stationarySince - STATIONARY_TIMEOUT) % BREATHING_PERIOD;
    const t = breathingTime / BREATHING_PERIOD;
    const eased = sineInOut(t);
    return 0.7 + 0.3 * eased;
  }

  update(now: number): void {
    for (const p of this.particles) {
      for (const pulse of this.pulses) {
        if (p.triggeredPulses.has(pulse.id)) continue;

        const pulseElapsed = now - pulse.startTime;
        const pulseProgress = Math.min(pulseElapsed / pulse.duration, 1);
        const easedPulseProgress = easeOutCubic(pulseProgress);
        const currentPulseRadius = easedPulseProgress * pulse.maxRadius;

        const dx = p.x - pulse.x;
        const dy = p.y - pulse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= currentPulseRadius && dist <= pulse.maxRadius) {
          p.triggeredPulses.add(pulse.id);

          const distFactor = 1 - Math.min(dist / pulse.maxRadius, 1);
          const bounceDistance = 20 + 30 * distFactor;

          let angle: number;
          if (dist < 0.1) {
            angle = Math.random() * Math.PI * 2;
          } else {
            angle = Math.atan2(dy, dx);
          }

          const speed = bounceDistance * 0.35 + Math.random() * 2;
          p.vx += Math.cos(angle) * speed;
          p.vy += Math.sin(angle) * speed;

          const randomHue = Math.random() * 360;
          p.targetHue = randomHue;
          p.colorTransitionStart = now;

          const frequency = this.audioEngine.getFrequencyFromColor(p.originalHue);
          this.audioEngine.playTone(frequency, 0.1 + 0.1 * distFactor);
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed < STATIONARY_THRESHOLD) {
        p.vx = 0;
        p.vy = 0;
        if (p.stationarySince <= 0) {
          p.stationarySince = now;
        }
      } else {
        p.stationarySince = 0;
      }
    }

    this.pulses = this.pulses.filter(pulse => {
      return now - pulse.startTime < pulse.duration;
    });

    for (const p of this.particles) {
      const expiredIds: number[] = [];
      for (const id of p.triggeredPulses) {
        if (!this.pulses.find(pl => pl.id === id)) {
          expiredIds.push(id);
        }
      }
      for (const id of expiredIds) {
        p.triggeredPulses.delete(id);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      const hue = this.getInterpolatedHue(p, now);
      const alpha = this.getBreathingAlpha(p, now);

      if (this.performanceMode) {
        ctx.fillStyle = hsvToRgb(hue, p.saturation, p.brightness);
        ctx.globalAlpha = alpha;
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = hsvToRgb(hue, p.saturation, p.brightness);
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    for (const pulse of this.pulses) {
      const elapsed = now - pulse.startTime;
      const progress = Math.min(elapsed / pulse.duration, 1);
      const easedProgress = easeOutCubic(progress);
      const radius = easedProgress * pulse.maxRadius;
      const alpha = (1 - progress) * 0.5;

      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 206, 209, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (radius > 20) {
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, radius * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(138, 43, 226, ${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
