import { Particle, type LightSource, type ParticleParams } from './particle';
import { getUIElements, bindUIEvents, applyPreset, updatePerformanceDisplay } from './ui';

const MIN_PARTICLE_COUNT = 300;
const PULSE_DURATION = 600;
const FPS_CHECK_INTERVAL = 2000;

class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private lightSource: LightSource;
  private params: ParticleParams & { count: number; minRadius: number; maxRadius: number; speed: number };
  private maxDistance: number = 0;
  private warmBias: number = 0;
  private isDraggingLight: boolean = false;
  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private lastFpsCheck: number = 0;
  private currentFps: number = 60;
  private uiElements: ReturnType<typeof getUIElements>;
  private autoDowngradeActive: boolean = false;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.params = {
      count: 1000,
      minRadius: 2,
      maxRadius: 6,
      speed: 1.25,
    };

    this.uiElements = getUIElements();
    this.setupCanvas();
    this.lightSource = this.createInitialLightSource();
    this.updateMaxDistance();
    this.createParticles(this.params.count);
    this.bindEvents();
    this.lastFrameTime = performance.now();
    this.lastFpsCheck = performance.now();
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.handleResize());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.updateMaxDistance();
  }

  private handleResize(): void {
    this.resizeCanvas();

    for (const particle of this.particles) {
      particle.x = Math.min(particle.x, window.innerWidth - particle.radius);
      particle.y = Math.min(particle.y, window.innerHeight - particle.radius);
      particle.x = Math.max(particle.x, particle.radius);
      particle.y = Math.max(particle.y, particle.radius);
    }

    if (this.lightSource) {
      this.lightSource.x = Math.min(this.lightSource.x, window.innerWidth - 20);
      this.lightSource.y = Math.min(this.lightSource.y, window.innerHeight - 20);
      this.lightSource.x = Math.max(this.lightSource.x, 20);
      this.lightSource.y = Math.max(this.lightSource.y, 20);
    }
  }

  private createInitialLightSource(): LightSource {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      baseRadius: 20,
      currentRadius: 20,
      targetRadius: 20,
      isDragging: false,
      pulseStart: 0,
    };
  }

  private updateMaxDistance(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.maxDistance = Math.sqrt(w * w + h * h) * 0.6;
  }

  private createParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(
        new Particle(
          window.innerWidth,
          window.innerHeight,
          this.params.minRadius,
          this.params.maxRadius,
          this.params.speed
        )
      );
    }
  }

  private setParticleCount(count: number): void {
    const targetCount = Math.max(MIN_PARTICLE_COUNT, count);
    this.params.count = targetCount;

    if (this.particles.length < targetCount) {
      while (this.particles.length < targetCount) {
        this.particles.push(
          new Particle(
            window.innerWidth,
            window.innerHeight,
            this.params.minRadius,
            this.params.maxRadius,
            this.params.speed
          )
        );
      }
    } else if (this.particles.length > targetCount) {
      this.particles.length = targetCount;
    }
  }

  private updateAllParticleParams(): void {
    for (const particle of this.particles) {
      particle.updateBaseParams(
        this.params.minRadius,
        this.params.maxRadius,
        this.params.speed
      );
    }
  }

  private bindEvents(): void {
    bindUIEvents(this.uiElements, {
      onDensityChange: (count) => {
        this.autoDowngradeActive = false;
        this.setParticleCount(count);
      },
      onMinRadiusChange: (radius) => {
        this.params.minRadius = radius;
        this.updateAllParticleParams();
      },
      onMaxRadiusChange: (radius) => {
        this.params.maxRadius = radius;
        this.updateAllParticleParams();
      },
      onSpeedChange: (speed) => {
        this.params.speed = speed;
        this.updateAllParticleParams();
      },
      onPresetTwilight: () => {
        this.warmBias = 1;
        for (const p of this.particles) {
          p.setTransitionTarget(0.5, 1.4);
        }
        applyPreset(this.uiElements, 'twilight', {
          onDensityChange: (c) => this.setParticleCount(c),
          onMinRadiusChange: (r) => {
            this.params.minRadius = r;
            this.updateAllParticleParams();
          },
          onMaxRadiusChange: (r) => {
            this.params.maxRadius = r;
            this.updateAllParticleParams();
          },
          onSpeedChange: (s) => {
            this.params.speed = s;
            this.updateAllParticleParams();
          },
          onPresetTwilight: () => {},
          onPresetAurora: () => {},
        }, 500);
      },
      onPresetAurora: () => {
        this.warmBias = -0.5;
        for (const p of this.particles) {
          p.setTransitionTarget(1.8, 0.7);
        }
        applyPreset(this.uiElements, 'aurora', {
          onDensityChange: (c) => this.setParticleCount(c),
          onMinRadiusChange: (r) => {
            this.params.minRadius = r;
            this.updateAllParticleParams();
          },
          onMaxRadiusChange: (r) => {
            this.params.maxRadius = r;
            this.updateAllParticleParams();
          },
          onSpeedChange: (s) => {
            this.params.speed = s;
            this.updateAllParticleParams();
          },
          onPresetTwilight: () => {},
          onPresetAurora: () => {},
        }, 500);
      },
    });

    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e.clientX, e.clientY));
    this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseup', () => this.handlePointerUp());
    this.canvas.addEventListener('mouseleave', () => this.handlePointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerDown(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handlePointerUp();
    }, { passive: false });
  }

  private handlePointerDown(x: number, y: number): void {
    const dx = x - this.lightSource.x;
    const dy = y - this.lightSource.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.lightSource.baseRadius * 2) {
      this.isDraggingLight = true;
      this.lightSource.isDragging = true;
      this.lightSource.pulseStart = performance.now();
    }
  }

  private handlePointerMove(x: number, y: number): void {
    if (this.isDraggingLight) {
      this.lightSource.x = Math.max(20, Math.min(window.innerWidth - 20, x));
      this.lightSource.y = Math.max(20, Math.min(window.innerHeight - 20, y));
    }
  }

  private handlePointerUp(): void {
    this.isDraggingLight = false;
    this.lightSource.isDragging = false;
  }

  private updateLightPulse(currentTime: number): void {
    if (this.lightSource.pulseStart > 0) {
      const elapsed = currentTime - this.lightSource.pulseStart;
      const progress = Math.min(elapsed / PULSE_DURATION, 1);

      if (progress < 0.5) {
        const t = progress * 2;
        this.lightSource.currentRadius = 20 + 20 * t;
      } else {
        const t = (progress - 0.5) * 2;
        this.lightSource.currentRadius = 40 - 20 * t;
      }

      if (progress >= 1) {
        this.lightSource.pulseStart = 0;
        this.lightSource.currentRadius = 20;
      }
    }
  }

  private checkPerformance(currentTime: number): void {
    if (currentTime - this.lastFpsCheck >= FPS_CHECK_INTERVAL) {
      this.currentFps = this.fpsFrameCount > 0
        ? this.fpsAccumulator / this.fpsFrameCount
        : 60;

      if (this.currentFps < 50 && !this.autoDowngradeActive) {
        this.autoDowngradeActive = true;
      }

      if (this.autoDowngradeActive && this.currentFps < 50) {
        const newCount = Math.max(
          MIN_PARTICLE_COUNT,
          Math.floor(this.particles.length * 0.9)
        );
        if (newCount < this.particles.length) {
          this.particles.length = newCount;
          this.params.count = newCount;
          this.uiElements.densitySlider.value = newCount.toString();
          this.uiElements.densityValue.textContent = newCount.toString();
        }
      } else if (this.currentFps >= 55 && this.autoDowngradeActive) {
        this.autoDowngradeActive = false;
      }

      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
      this.lastFpsCheck = currentTime;
    }
  }

  private drawLightSource(): void {
    const { x, y, currentRadius, baseRadius } = this.lightSource;

    if (this.lightSource.pulseStart > 0 || currentRadius > baseRadius) {
      const glowRadius = currentRadius;
      const glowGradient = this.ctx.createRadialGradient(x, y, baseRadius, x, y, glowRadius + 20);
      glowGradient.addColorStop(0, 'rgba(255, 240, 150, 0.3)');
      glowGradient.addColorStop(0.5, 'rgba(255, 220, 100, 0.1)');
      glowGradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
      this.ctx.beginPath();
      this.ctx.arc(x, y, glowRadius + 20, 0, Math.PI * 2);
      this.ctx.fillStyle = glowGradient;
      this.ctx.fill();
    }

    const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, baseRadius);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();

    const outerGlow = this.ctx.createRadialGradient(x, y, baseRadius, x, y, baseRadius * 3);
    outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.beginPath();
    this.ctx.arc(x, y, baseRadius * 3, 0, Math.PI * 2);
    this.ctx.fillStyle = outerGlow;
    this.ctx.fill();
  }

  private render = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 16.67, 2);
    this.lastFrameTime = currentTime;

    const fps = 1000 / Math.max(1, currentTime - (this.lastFrameTime - deltaTime * 16.67));
    this.fpsAccumulator += Math.min(fps, 120);
    this.fpsFrameCount++;

    this.checkPerformance(currentTime);
    updatePerformanceDisplay(this.uiElements, this.currentFps, this.particles.length);

    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    this.updateLightPulse(currentTime);

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      particle.update(w, h, this.lightSource, this.maxDistance, this.warmBias, deltaTime);
      particle.draw(this.ctx);
    }

    this.ctx.globalCompositeOperation = 'source-over';

    this.drawLightSource();

    this.animationId = requestAnimationFrame(this.render);
  };

  public start(): void {
    this.animationId = requestAnimationFrame(this.render);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

function init(): void {
  try {
    const system = new ParticleSystem();
    system.start();
  } catch (error) {
    console.error('Failed to initialize particle system:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
