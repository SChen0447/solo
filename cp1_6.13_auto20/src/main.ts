import { Particle, Star } from './particle';
import {
  createMouseState,
  updateMouseSpeed,
  applyVortexEffect,
  applyExplosionEffect,
  triggerExplosion,
  drawExplosionGlow,
  drawVortexGlow,
  updateExplosionTime,
  type IMouseState,
} from './effects';

const PARTICLE_COUNT = 2000;
const STAR_COUNT = 150;
const TARGET_FPS = 60;

interface UIControls {
  particleCount: HTMLElement;
  fps: HTMLElement;
  mousePos: HTMLElement;
}

interface Stats {
  frameCount: number;
  lastFpsUpdate: number;
  currentFps: number;
  smoothedFps: number;
}

class NebulaGallery {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  
  private particles: Particle[] = [];
  private stars: Star[] = [];
  private mouse: IMouseState;
  
  private width: number = 0;
  private height: number = 0;
  private oldWidth: number = 0;
  private oldHeight: number = 0;
  
  private animationId: number = 0;
  private lastTime: number = 0;
  private time: number = 0;
  
  private ui: UIControls;
  private stats: Stats;
  
  private displayedParticleCount: number = 0;
  private displayedFps: number = 0;
  private displayedMouseX: number = 0;
  private displayedMouseY: number = 0;

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('canvas-container') as HTMLElement;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    
    this.mouse = createMouseState();
    
    this.ui = {
      particleCount: document.getElementById('particle-count') as HTMLElement,
      fps: document.getElementById('fps') as HTMLElement,
      mousePos: document.getElementById('mouse-pos') as HTMLElement,
    };
    
    this.stats = {
      frameCount: 0,
      lastFpsUpdate: 0,
      currentFps: TARGET_FPS,
      smoothedFps: TARGET_FPS,
    };
    
    this.init();
  }

  private init(): void {
    this.resize();
    this.createParticles();
    this.createStars();
    this.bindEvents();
    
    setTimeout(() => {
      this.start();
    }, 500);
  }

  private resize(): void {
    this.oldWidth = this.width;
    this.oldHeight = this.height;
    
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
    
    if (this.particles.length > 0) {
      this.particles.forEach(p => p.resize(this.width, this.height));
    }
    if (this.stars.length > 0) {
      this.stars.forEach(s => s.resize(this.width, this.height, this.oldWidth, this.oldHeight));
    }
  }

  private createParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(this.width, this.height));
    }
  }

  private createStars(): void {
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.push(new Star(this.width, this.height));
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());
    
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    
    window.addEventListener('mouseleave', () => {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });
    
    window.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      triggerExplosion(this.mouse, x, y);
    });
    
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private start(): void {
    this.lastTime = performance.now();
    this.stats.lastFpsUpdate = this.lastTime;
    this.loop();
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    dt = Math.min(dt, 0.05);
    this.lastTime = now;
    this.time += dt;
    
    this.update(dt);
    this.render();
    this.updateUI(now, dt);
    
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    updateMouseSpeed(this.mouse, dt);
    updateExplosionTime(this.mouse, dt);
    
    this.stars.forEach(star => star.update(this.time));
    
    this.particles.forEach(particle => {
      applyVortexEffect(particle, this.mouse, dt);
      applyExplosionEffect(particle, this.mouse, dt);
      particle.update(dt, this.mouse.smoothedSpeed);
    });
  }

  private render(): void {
    this.ctx.fillStyle = 'rgba(10, 10, 26, 0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.stars.forEach(star => star.draw(this.ctx));
    
    drawVortexGlow(this.ctx, this.mouse);
    drawExplosionGlow(this.ctx, this.mouse);
    
    this.particles.forEach(particle => {
      particle.draw(this.ctx, this.mouse.smoothedSpeed);
    });
  }

  private updateUI(now: number, dt: number): void {
    this.stats.frameCount++;
    
    if (now - this.stats.lastFpsUpdate >= 250) {
      const elapsed = (now - this.stats.lastFpsUpdate) / 1000;
      this.stats.currentFps = Math.round(this.stats.frameCount / elapsed);
      this.stats.frameCount = 0;
      this.stats.lastFpsUpdate = now;
      
      this.stats.smoothedFps += (this.stats.currentFps - this.stats.smoothedFps) * 0.3;
    }
    
    const targetParticleCount = this.particles.length;
    this.displayedParticleCount += (targetParticleCount - this.displayedParticleCount) * 0.15;
    if (Math.abs(targetParticleCount - this.displayedParticleCount) < 0.5) {
      this.displayedParticleCount = targetParticleCount;
    }
    
    const targetFps = Math.round(this.stats.smoothedFps);
    this.displayedFps += (targetFps - this.displayedFps) * 0.15;
    if (Math.abs(targetFps - this.displayedFps) < 0.5) {
      this.displayedFps = targetFps;
    }
    
    const targetMouseX = this.mouse.x > -9000 ? Math.round(this.mouse.x) : 0;
    const targetMouseY = this.mouse.y > -9000 ? Math.round(this.mouse.y) : 0;
    this.displayedMouseX += (targetMouseX - this.displayedMouseX) * 0.2;
    this.displayedMouseY += (targetMouseY - this.displayedMouseY) * 0.2;
    
    this.ui.particleCount.textContent = `${Math.round(this.displayedParticleCount)}`;
    
    const fpsValue = Math.round(this.displayedFps);
    this.ui.fps.textContent = `${fpsValue}`;
    this.ui.fps.classList.remove('fps-good', 'fps-warn', 'fps-bad');
    if (fpsValue >= 55) {
      this.ui.fps.classList.add('fps-good');
    } else if (fpsValue >= 30) {
      this.ui.fps.classList.add('fps-warn');
    } else {
      this.ui.fps.classList.add('fps-bad');
    }
    
    const mouseX = Math.round(this.displayedMouseX);
    const mouseY = Math.round(this.displayedMouseY);
    this.ui.mousePos.textContent = `${mouseX}, ${mouseY}`;
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NebulaGallery();
});
