import { Particle, COLORS } from './particle';
import { UIManager } from './ui';

const MAX_PARTICLES = 500;
const MAX_PARTICLES_PER_FRAME = 10;
const GRID_SPACING = 40;
const GRID_OPACITY_ACTIVE = 0.05;
const GRID_OPACITY_IDLE = 0.01;
const GRID_FADE_TIME = 2000;
const CLEAR_ANIMATION_DURATION = 1200;

class ParticleApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private uiManager: UIManager;
  private animationId: number = 0;
  private lastTime: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseDirection: number = 0;
  private isMouseOver: boolean = false;
  private isDrawing: boolean = false;
  private lastDrawTime: number = 0;
  private gridOpacity: number = GRID_OPACITY_IDLE;
  private targetGridOpacity: number = GRID_OPACITY_IDLE;
  private particlesThisFrame: number = 0;
  private isClearing: boolean = false;
  private clearStartTime: number = 0;
  private clearParticles: Particle[] = [];

  constructor() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas as HTMLCanvasElement;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;

    this.uiManager = new UIManager({
      onColorChange: () => {},
      onClear: () => this.clearWithAnimation()
    });

    this.resizeCanvas();
    this.bindEvents();
    this.startAnimation();
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousemove', (e) => {
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      const dx = this.mouseX - this.lastMouseX;
      const dy = this.mouseY - this.lastMouseY;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.mouseDirection = Math.atan2(dy, dx);
      }

      this.isMouseOver = true;
      this.isDrawing = true;
      this.lastDrawTime = performance.now();
      this.targetGridOpacity = GRID_OPACITY_ACTIVE;
      this.spawnMoveParticles();
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseOver = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseOver = false;
      this.isDrawing = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.lastDrawTime = performance.now();
      this.targetGridOpacity = GRID_OPACITY_ACTIVE;
      this.spawnBurstParticles(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;
      this.isMouseOver = true;
      this.isDrawing = true;
      this.lastDrawTime = performance.now();
      this.targetGridOpacity = GRID_OPACITY_ACTIVE;
      this.spawnBurstParticles(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
      this.mouseX = touch.clientX;
      this.mouseY = touch.clientY;

      const dx = this.mouseX - this.lastMouseX;
      const dy = this.mouseY - this.lastMouseY;
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.mouseDirection = Math.atan2(dy, dx);
      }

      this.lastDrawTime = performance.now();
      this.targetGridOpacity = GRID_OPACITY_ACTIVE;
      this.spawnMoveParticles();
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.isMouseOver = false;
      this.isDrawing = false;
    });
  }

  private spawnMoveParticles(): void {
    if (this.isClearing) return;

    const count = 6 + Math.floor(Math.random() * 7);
    const actualCount = Math.min(count, MAX_PARTICLES_PER_FRAME - this.particlesThisFrame);

    if (actualCount <= 0) return;

    const currentColor = this.uiManager.getCurrentColor();

    for (let i = 0; i < actualCount; i++) {
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetY = (Math.random() - 0.5) * 8;
      const angle = this.mouseDirection + (Math.random() - 0.5) * (Math.PI / 6);

      const particle = new Particle({
        x: this.mouseX + offsetX,
        y: this.mouseY + offsetY,
        color: currentColor,
        type: 'move',
        angle,
        speed: 0.5 + Math.random()
      });

      this.particles.push(particle);
      this.particlesThisFrame++;
    }

    this.enforceParticleLimit();
  }

  private spawnBurstParticles(x: number, y: number): void {
    if (this.isClearing) return;

    const count = 30 + Math.floor(Math.random() * 21);
    const currentColor = this.uiManager.getCurrentColor();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;

      const particle = new Particle({
        x: x,
        y: y,
        color: currentColor,
        type: 'burst',
        angle,
        speed,
        damping: 0.02,
        lifetime: 800 + Math.random() * 600
      });

      this.particles.push(particle);
    }

    this.enforceParticleLimit();
  }

  private enforceParticleLimit(): void {
    if (this.particles.length > MAX_PARTICLES) {
      const excess = this.particles.length - MAX_PARTICLES;
      this.particles.splice(0, excess);
    }
  }

  private clearWithAnimation(): void {
    if (this.isClearing) return;

    this.isClearing = true;
    this.clearStartTime = performance.now();
    this.clearParticles = [...this.particles];
    this.particles = [];
  }

  private updateClearAnimation(currentTime: number): boolean {
    if (!this.isClearing) return false;

    const elapsed = currentTime - this.clearStartTime;
    const progress = Math.min(elapsed / CLEAR_ANIMATION_DURATION, 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);
    const wipeY = progress * canvasHeight;

    this.clearParticles = this.clearParticles.filter((p) => {
      if (p.y > wipeY) {
        return true;
      } else {
        const fadeRange = 80;
        const dist = wipeY - p.y;
        if (dist < fadeRange) {
          p.alpha = p.initialAlpha * (1 - dist / fadeRange);
          return true;
        }
        return false;
      }
    });

    if (progress >= 1 && this.clearParticles.length === 0) {
      this.isClearing = false;
      this.clearParticles = [];
      return false;
    }

    return true;
  }

  private updateGridOpacity(currentTime: number): void {
    if (this.isDrawing) {
      this.targetGridOpacity = GRID_OPACITY_ACTIVE;
    } else if (currentTime - this.lastDrawTime > GRID_FADE_TIME) {
      this.targetGridOpacity = GRID_OPACITY_IDLE;
    }

    const diff = this.targetGridOpacity - this.gridOpacity;
    this.gridOpacity += diff * 0.03;
  }

  private drawBackground(): void {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0b16');
    gradient.addColorStop(0.5, '#15172b');
    gradient.addColorStop(1, '#0e1124');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawGrid(): void {
    if (this.gridOpacity <= 0.001) return;

    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.gridOpacity})`;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += GRID_SPACING) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + 0.5, 0);
      this.ctx.lineTo(x + 0.5, height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= height; y += GRID_SPACING) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(width, y + 0.5);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private updateAndDrawParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(deltaTime);

      if (p.dead || p.alpha <= 0.001) {
        this.particles.splice(i, 1);
      } else {
        p.draw(this.ctx);
      }
    }
  }

  private updateAndDrawClearParticles(deltaTime: number): void {
    for (let i = this.clearParticles.length - 1; i >= 0; i--) {
      const p = this.clearParticles[i];
      p.update(deltaTime);

      if (p.dead || p.alpha <= 0.001) {
        this.clearParticles.splice(i, 1);
      } else {
        p.draw(this.ctx);
      }
    }
  }

  private animate = (currentTime: number): void => {
    const deltaTime = this.lastTime ? currentTime - this.lastTime : 16;
    this.lastTime = currentTime;

    this.particlesThisFrame = 0;

    if (!this.isMouseOver) {
      this.isDrawing = false;
    }

    this.updateGridOpacity(currentTime);

    const clearingActive = this.updateClearAnimation(currentTime);

    this.drawBackground();
    this.drawGrid();
    this.updateAndDrawParticles(deltaTime);

    if (clearingActive) {
      this.updateAndDrawClearParticles(deltaTime);
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  private startAnimation(): void {
    this.lastTime = 0;
    this.animationId = requestAnimationFrame(this.animate);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ParticleApp();
});
