import { TrackingData, LightMode, LightParams } from './types';

interface LightParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  angle: number;
  orbitRadius: number;
  speed: number;
  size: number;
  twinkleOffset: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

const PARTICLE_COUNT = 80;
const STAR_COUNT = 100;
const MAX_ROTATION_SPEED = 10;
const FLASH_DURATION = 300;

function hslToString(h: number, s: number, l: number, a: number = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class LightController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private particles: LightParticle[] = [];
  private stars: Star[] = [];

  private currentMode: LightMode = 'starlight';
  private targetMode: LightMode = 'starlight';
  private modeTransition: number = 1;

  private colorTemperature: 'warm' | 'cool' | 'mixed' = 'mixed';

  private mainSpotX: number = 0.5;
  private targetMainSpotX: number = 0.5;

  private rotationSpeed: number = 2;
  private targetRotationSpeed: number = 2;

  private flashActive: boolean = false;
  private flashStartTime: number = 0;
  private lastHandsDistance: number = 0;
  private flashTriggerThreshold: number = 0.15;
  private hasTriggeredFlash: boolean = false;

  private animationId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;

  private onParamsChange?: (params: LightParams) => void;

  constructor(canvas: HTMLCanvasElement, onParamsChange?: (params: LightParams) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.onParamsChange = onParamsChange;

    this.initStars();
    this.initParticles();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: randomRange(0.5, 2),
        brightness: randomRange(0.3, 0.8),
        twinkleSpeed: randomRange(0.5, 2),
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private initParticles(): void {
    this.particles = [];
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
      const orbitRadius = randomRange(50, Math.min(this.width, this.height) * 0.4);
      const hue = this.getParticleHue(i / PARTICLE_COUNT);

      this.particles.push({
        x: centerX + Math.cos(angle) * orbitRadius * 0.5,
        y: centerY + Math.sin(angle) * orbitRadius * 0.5,
        baseX: centerX,
        baseY: centerY,
        radius: orbitRadius,
        color: hslToString(hue, 100, 60),
        hue: hue,
        saturation: 100,
        lightness: 60,
        angle: angle,
        orbitRadius: orbitRadius,
        speed: randomRange(0.5, 2),
        size: randomRange(8, 25),
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  private getParticleHue(ratio: number): number {
    if (this.colorTemperature === 'warm') {
      return lerp(0, 50, ratio);
    } else if (this.colorTemperature === 'cool') {
      return lerp(200, 280, ratio);
    } else {
      return ratio * 360;
    }
  }

  updateTrackingData(data: TrackingData): void {
    const { leftHand, rightHand, handsDistance } = data;

    if (rightHand) {
      this.targetMainSpotX = 1 - rightHand.palmPosition.x;
      const yOffset = Math.abs(rightHand.palmPosition.y - 0.5) * 2;
      this.targetRotationSpeed = yOffset * MAX_ROTATION_SPEED + 0.5;
    }

    if (leftHand) {
      if (leftHand.palmUp) {
        this.colorTemperature = 'warm';
      } else if (leftHand.palmDown) {
        this.colorTemperature = 'cool';
      } else {
        this.colorTemperature = 'mixed';
      }
    }

    const primaryHand = rightHand || leftHand;
    if (primaryHand) {
      if (primaryHand.gesture === 'open') {
        this.targetMode = 'starlight';
      } else if (primaryHand.gesture === 'fist') {
        this.targetMode = 'spotlight';
      }
    }

    if (leftHand && rightHand) {
      if (this.lastHandsDistance > 0 && handsDistance - this.lastHandsDistance > this.flashTriggerThreshold) {
        if (!this.hasTriggeredFlash) {
          this.triggerFlash();
          this.hasTriggeredFlash = true;
        }
      } else if (handsDistance < this.lastHandsDistance) {
        this.hasTriggeredFlash = false;
      }
      this.lastHandsDistance = handsDistance;
    }

    this.emitParams();
  }

  private triggerFlash(): void {
    this.flashActive = true;
    this.flashStartTime = performance.now();

    for (const particle of this.particles) {
      particle.hue = Math.random() * 360;
      particle.saturation = 80 + Math.random() * 20;
      particle.lightness = 50 + Math.random() * 30;
    }
  }

  private emitParams(): void {
    if (!this.onParamsChange) return;

    const now = performance.now();
    const flashProgress = this.flashActive
      ? Math.min(1, (now - this.flashStartTime) / FLASH_DURATION)
      : 1;

    this.onParamsChange({
      mode: this.currentMode,
      colorTemperature: this.colorTemperature,
      mainSpotX: this.mainSpotX,
      rotationSpeed: this.rotationSpeed,
      flashEffect: this.flashActive,
      flashProgress
    });
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(delta, now);
    this.render();

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private update(delta: number, time: number): void {
    const modeTarget = this.targetMode === 'starlight' ? 1 : 0;
    this.modeTransition += (modeTarget - this.modeTransition) * delta * 3;

    this.mainSpotX += (this.targetMainSpotX - this.mainSpotX) * delta * 8;
    this.rotationSpeed += (this.targetRotationSpeed - this.rotationSpeed) * delta * 4;

    if (this.flashActive && time - this.flashStartTime > FLASH_DURATION) {
      this.flashActive = false;
    }

    const centerX = this.width * this.mainSpotX;
    const centerY = this.height / 2;

    for (const particle of this.particles) {
      particle.angle += particle.speed * this.rotationSpeed * delta * 0.3;

      const scatterAmount = this.modeTransition;
      const currentOrbit = particle.orbitRadius * (0.3 + scatterAmount * 0.7);

      particle.baseX = centerX;
      particle.baseY = centerY;

      particle.x = particle.baseX + Math.cos(particle.angle) * currentOrbit;
      particle.y = particle.baseY + Math.sin(particle.angle) * currentOrbit * 0.7;

      particle.color = hslToString(particle.hue, particle.saturation, particle.lightness + Math.sin(time * 0.003 + particle.twinkleOffset) * 10);
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(11, 26, 48, 0.15)';
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars();
    this.renderGlow();
    this.renderParticles();
    this.renderMainSpot();

    if (this.flashActive) {
      const elapsed = performance.now() - this.flashStartTime;
      const progress = elapsed / FLASH_DURATION;
      const alpha = Math.max(0, 1 - progress) * 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private renderStars(): void {
    const ctx = this.ctx;
    const time = performance.now() * 0.001;

    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const brightness = star.brightness * (0.6 + twinkle * 0.4);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    }
  }

  private renderGlow(): void {
    const ctx = this.ctx;
    const centerX = this.width * this.mainSpotX;
    const centerY = this.height / 2;

    const glowRadius = this.modeTransition > 0.5
      ? Math.min(this.width, this.height) * 0.6
      : Math.min(this.width, this.height) * 0.3;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, glowRadius
    );

    let glowHue = 280;
    if (this.colorTemperature === 'warm') glowHue = 30;
    else if (this.colorTemperature === 'cool') glowHue = 240;

    gradient.addColorStop(0, hsla(glowHue, 100, 70, 0.15));
    gradient.addColorStop(0.5, hsla(glowHue, 100, 50, 0.05));
    gradient.addColorStop(1, hsla(glowHue, 100, 30, 0));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    for (const particle of this.particles) {
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      );

      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(0.3, hslaFromColor(particle.color, 0.5));
      gradient.addColorStop(1, hslaFromColor(particle.color, 0));

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
    }
  }

  private renderMainSpot(): void {
    const ctx = this.ctx;
    const centerX = this.width * this.mainSpotX;
    const centerY = this.height / 2;
    const spotSize = 60;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, spotSize
    );

    let hue = 280;
    if (this.colorTemperature === 'warm') hue = 35;
    else if (this.colorTemperature === 'cool') hue = 220;

    gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.9)`);
    gradient.addColorStop(0.4, `hsla(${hue}, 100%, 70%, 0.4)`);
    gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, spotSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, spotSize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.initStars();
    this.initParticles();
  }

  destroy(): void {
    this.stop();
  }
}

function hsla(h: number, s: number, l: number, a: number): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function hslaFromColor(color: string, alpha: number): string {
  const match = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
  if (match) {
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = parseInt(match[3]);
    return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
  }
  return `rgba(255, 255, 255, ${alpha})`;
}
