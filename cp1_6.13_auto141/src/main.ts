import { ParticleSystem } from './particle';
import { InteractionManager, AudioManager } from './interaction';
import { ControlPanel } from './ui';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private interactionManager: InteractionManager;
  private audioManager: AudioManager;
  private controlPanel: ControlPanel;
  private borderFrame: HTMLElement;
  
  private lastTime: number = 0;
  private animationId: number = 0;
  private startTime: number = 0;
  
  private isMobile: boolean = false;
  private sphereRadius: number = 150;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.borderFrame = document.getElementById('border-frame') as HTMLElement;
    
    this.particleSystem = new ParticleSystem();
    this.audioManager = new AudioManager();
    this.interactionManager = new InteractionManager(this.canvas, this.particleSystem, this.audioManager);
    this.controlPanel = new ControlPanel(this.particleSystem, this.audioManager);
    
    this.init();
  }

  private init(): void {
    this.resize();
    this.setupParticleSystem();
    this.bindEvents();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.animate();
  }

  private setupParticleSystem(): void {
    const particleCount = 650;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.sphereRadius = this.calculateSphereRadius();
    this.particleSystem.init(particleCount, centerX, centerY, this.sphereRadius);
    
    this.updateBorderFrame();
  }

  private calculateSphereRadius(): number {
    const minDim = Math.min(this.canvas.width, this.canvas.height);
    this.isMobile = window.innerWidth <= 768;
    
    if (this.isMobile) {
      return minDim * 0.4;
    } else {
      return minDim * 0.35;
    }
  }

  private updateBorderFrame(): void {
    const frameSize = this.sphereRadius * 2 + 30;
    this.borderFrame.style.width = frameSize + 'px';
    this.borderFrame.style.height = frameSize + 'px';
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.resize();
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.sphereRadius = this.calculateSphereRadius();
    
    this.particleSystem.resize(centerX, centerY, this.sphereRadius);
    this.updateBorderFrame();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
  }

  private animate(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    dt = Math.min(dt, 0.1);
    this.lastTime = now;
    
    const time = (now - this.startTime) / 1000;
    
    this.update(dt, time);
    this.render();
    
    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  private update(dt: number, time: number): void {
    this.particleSystem.update(dt, time);
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    
    ctx.clearRect(0, 0, w, h);
    
    this.drawBackground(ctx, w, h);
    
    this.particleSystem.render(ctx, w, h);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0d0d1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
