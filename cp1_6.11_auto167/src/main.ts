import './style.css';
import { Particle, gaussianRandom } from './particle';
import { ParticleRenderer } from './renderer';
import { Controls } from './controls';
import { NebulaPreset } from './presets';

class NebulaSynthesizer {
  private canvas: HTMLCanvasElement;
  private renderer: ParticleRenderer;
  private controls: Controls;
  private particles: Particle[];
  private isDrawing: boolean;
  private mouseX: number;
  private mouseY: number;
  private centerX: number;
  private centerY: number;
  private canvasSize: number;
  private lastTime: number;
  private animationId: number | null;
  private isShrinking: boolean;
  private shrinkStartTime: number;
  private particlesBeforeReset: Particle[];

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.particles = [];
    this.isDrawing = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.canvasSize = 500;
    this.lastTime = 0;
    this.animationId = null;
    this.isShrinking = false;
    this.shrinkStartTime = 0;
    this.particlesBeforeReset = [];

    this.setupCanvasSize();
    this.renderer = new ParticleRenderer(this.canvas);
    this.controls = new Controls();

    this.centerX = this.renderer.getWidth() / 2;
    this.centerY = this.renderer.getHeight() / 2;
    this.mouseX = this.centerX;
    this.mouseY = this.centerY;

    this.setupEvents();
    this.startAnimation();
    this.spawnPreviewParticles();
  }

  private setupCanvasSize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvasSize = Math.min(rect.width, rect.height, 500);
    }
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onMouseUp());

    this.controls.state.onCapture = () => this.captureSnapshot();
    this.controls.state.onReset = () => this.resetSystem();
    this.controls.state.onPresetChange = (preset) => this.onPresetChange(preset);

    window.addEventListener('resize', () => this.onResize());
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.isShrinking) return;
    this.isDrawing = true;
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;
    this.spawnParticles(100);
  }

  private onMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;

    if (this.isDrawing && !this.isShrinking) {
      this.spawnParticles(5);
    }
  }

  private onMouseUp(): void {
    this.isDrawing = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (this.isShrinking) return;
    if (e.touches.length > 0) {
      this.isDrawing = true;
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
      this.spawnParticles(100);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;

      if (this.isDrawing && !this.isShrinking) {
        this.spawnParticles(5);
      }
    }
  }

  private spawnParticles(count: number): void {
    const preset = this.controls.state.selectedPreset;
    const mixWeight = this.controls.state.mixWeight / 100;
    const lifetime = this.controls.state.lifetime;

    let avgR = preset.r;
    let avgG = preset.g;
    let avgB = preset.b;

    if (this.particles.length > 0 && mixWeight < 1) {
      const recentParticles = this.particles.slice(-50);
      const sumR = recentParticles.reduce((sum, p) => sum + p.r, 0);
      const sumG = recentParticles.reduce((sum, p) => sum + p.g, 0);
      const sumB = recentParticles.reduce((sum, p) => sum + p.b, 0);
      const count = recentParticles.length;

      const avgExistingR = sumR / count;
      const avgExistingG = sumG / count;
      const avgExistingB = sumB / count;

      avgR = Math.round(avgExistingR + (preset.r - avgExistingR) * mixWeight);
      avgG = Math.round(avgExistingG + (preset.g - avgExistingG) * mixWeight);
      avgB = Math.round(avgExistingB + (preset.b - avgExistingB) * mixWeight);
    }

    for (let i = 0; i < count; i++) {
      const offsetX = gaussianRandom() * 40;
      const offsetY = gaussianRandom() * 40;
      const size = 3 + Math.random() * 5;

      const colorVariation = 20;
      const r = Math.max(0, Math.min(255, avgR + (Math.random() - 0.5) * colorVariation));
      const g = Math.max(0, Math.min(255, avgG + (Math.random() - 0.5) * colorVariation));
      const b = Math.max(0, Math.min(255, avgB + (Math.random() - 0.5) * colorVariation));

      const particle = new Particle({
        x: this.mouseX + offsetX,
        y: this.mouseY + offsetY,
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        size,
        lifetime,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });

      this.particles.push(particle);
    }

    if (this.particles.length > 3500) {
      this.particles = this.particles.slice(-3000);
    }
  }

  private spawnPreviewParticles(): void {
    const preset = this.controls.state.selectedPreset;
    const count = 500;
    const duration = 2000;
    const startTime = performance.now();

    const spawnParticle = (index: number, angle: number, radius: number) => {
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      const size = 3 + Math.random() * 5;

      const colorVariation = 20;
      const r = Math.max(0, Math.min(255, preset.r + (Math.random() - 0.5) * colorVariation));
      const g = Math.max(0, Math.min(255, preset.g + (Math.random() - 0.5) * colorVariation));
      const b = Math.max(0, Math.min(255, preset.b + (Math.random() - 0.5) * colorVariation));

      const particle = new Particle({
        x,
        y,
        r: Math.round(r),
        g: Math.round(g),
        b: Math.round(b),
        size,
        lifetime: this.controls.state.lifetime,
        vx: 0,
        vy: 0,
      });

      this.particles.push(particle);
    };

    let spawned = 0;
    const spawnInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const targetCount = Math.floor(count * progress);

      while (spawned < targetCount) {
        const angle = spawned * 0.05;
        const startRadius = this.canvasSize / 2 - 20;
        const radius = startRadius - spawned * (startRadius / count) * 2;
        
        if (radius > 0) {
          spawnParticle(spawned, angle, radius);
        }
        spawned++;
      }

      if (progress >= 1) {
        clearInterval(spawnInterval);
      }
    }, 16);
  }

  private startAnimation(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (this.isShrinking) {
      this.updateShrinkAnimation(currentTime);
    } else {
      this.updateParticles(deltaTime);
    }

    this.renderer.render(this.particles, currentTime);
    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateParticles(deltaTime: number): void {
    const starWind = this.controls.state.starWind;
    const gravity = this.controls.state.gravity;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.update(
        deltaTime,
        starWind,
        gravity,
        this.centerX,
        this.centerY,
        this.mouseX,
        this.mouseY
      );

      if (!particle.active) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateShrinkAnimation(currentTime: number): void {
    const elapsed = (currentTime - this.shrinkStartTime) / 1000;
    const duration = 0.5;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const original = this.particlesBeforeReset[i];

      if (original) {
        particle.x = original.x + (this.centerX - original.x) * easeProgress;
        particle.y = original.y + (this.centerY - original.y) * easeProgress;
        particle.alpha = 1 - easeProgress;
      }
    }

    if (progress >= 1) {
      this.isShrinking = false;
      this.particles = [];
      this.particlesBeforeReset = [];
      this.controls.resetToDefaults();
    }
  }

  private captureSnapshot(): void {
    const dataUrl = this.renderer.captureSnapshot(this.particles, 1024);
    this.controls.showPreview(dataUrl);
  }

  private resetSystem(): void {
    if (this.isShrinking) return;

    this.isShrinking = true;
    this.shrinkStartTime = performance.now();
    this.particlesBeforeReset = this.particles.map((p) => ({
      ...p,
    })) as Particle[];
  }

  private onPresetChange(_preset: NebulaPreset): void {
    this.particles = [];
    this.spawnPreviewParticles();
  }

  private onResize(): void {
    this.setupCanvasSize();
    this.renderer.resize(this.canvasSize, this.canvasSize);
    this.centerX = this.renderer.getWidth() / 2;
    this.centerY = this.renderer.getHeight() / 2;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NebulaSynthesizer();
});
