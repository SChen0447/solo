import { ParticleSystem } from './particle';
import { Emitter, FireworkConfig } from './emitter';
import { UIController, UIConfig } from './ui';

class FireworksApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private particleSystem: ParticleSystem;
  private emitter: Emitter;
  private uiController: UIController;
  
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  
  private lastTime: number = 0;
  private animationId: number = 0;
  private fps: number = 60;
  private fpsCounter: number = 0;
  private fpsLastUpdate: number = 0;
  private targetFPS: number = 60;
  private frameInterval: number = 1000 / this.targetFPS;
  private accumulatedTime: number = 0;
  
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeTime: number = 0;
  private shakeX: number = 0;
  private shakeY: number = 0;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.container = document.getElementById('canvas-container') as HTMLElement;
    
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    
    this.particleSystem = new ParticleSystem(this.width, this.height);
    this.emitter = new Emitter(this.width, this.height, this.particleSystem);
    this.uiController = new UIController();
    
    this.setupEventListeners();
    this.emitter.setOnExplosionCallback(() => this.triggerShake());
    
    this.lastTime = performance.now();
    this.fpsLastUpdate = this.lastTime;
    this.animate = this.animate.bind(this);
    this.animate(this.lastTime);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.scale(this.dpr, this.dpr);
    
    if (this.particleSystem) {
      this.particleSystem.resize(this.width, this.height);
    }
    if (this.emitter) {
      this.emitter.resize(this.width, this.height);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    this.uiController.setOnChangeCallback((config: UIConfig) => {
      this.handleUIChange(config);
    });
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.width / rect.width);
    const y = (e.clientY - rect.top) * (this.height / rect.height);
    
    const clickedPoint = this.emitter.getLaunchPointAt(x, y);
    const config = this.uiController.getConfig();
    
    if (config.launchMode === 'multi') {
      if (clickedPoint && !clickedPoint.isMain) {
        this.emitter.removeLaunchPoint(x, y);
        return;
      }
      
      if (e.altKey) {
        this.emitter.addLaunchPoint(x, y);
        return;
      }
      
      const launchPoints = this.emitter.getLaunchPoints();
      let nearestIndex = 0;
      let nearestDist = Infinity;
      
      launchPoints.forEach((point, index) => {
        const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = index;
        }
      });
      
      this.launchFirework(x, y, nearestIndex);
    } else {
      if (clickedPoint && !clickedPoint.isMain) {
        this.emitter.removeLaunchPoint(x, y);
        return;
      }
      
      if (e.altKey) {
        this.emitter.addLaunchPoint(x, y);
        return;
      }
      
      this.launchFirework(x, y, 0);
    }
  }

  private launchFirework(x: number, y: number, launchPointIndex: number): void {
    const fireworkConfig: FireworkConfig = this.uiController.getFireworkConfig();
    this.emitter.launch(x, y, fireworkConfig, launchPointIndex);
  }

  private handleUIChange(_config: UIConfig): void {
    this.emitter.clear();
  }

  private triggerShake(): void {
    this.shakeIntensity = 3;
    this.shakeDuration = 0.3;
    this.shakeTime = 0;
  }

  private updateShake(deltaTime: number): void {
    if (this.shakeDuration > 0) {
      this.shakeTime += deltaTime;
      
      if (this.shakeTime >= this.shakeDuration) {
        this.shakeDuration = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        return;
      }
      
      const progress = this.shakeTime / this.shakeDuration;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const intensity = this.shakeIntensity * (1 - easedProgress);
      
      this.shakeX = Math.sin(progress * Math.PI * 8) * intensity;
      this.shakeY = Math.cos(progress * Math.PI * 6) * intensity;
    }
  }

  private updateFPS(currentTime: number): void {
    this.fpsCounter++;
    if (currentTime - this.fpsLastUpdate >= 1000) {
      this.fps = this.fpsCounter;
      this.fpsCounter = 0;
      this.fpsLastUpdate = currentTime;
      
      const fpsElement = document.getElementById('fps-counter');
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${this.fps} | 粒子: ${this.particleSystem.getParticleCount()}`;
      }
    }
  }

  private animate(currentTime: number): void {
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    
    this.accumulatedTime += deltaTime * 1000;
    
    let fixedDelta = deltaTime;
    while (this.accumulatedTime >= this.frameInterval) {
      fixedDelta = this.frameInterval / 1000;
      this.accumulatedTime -= this.frameInterval;
      
      this.update(fixedDelta);
    }
    
    this.render();
    this.updateFPS(currentTime);
  }

  private update(deltaTime: number): void {
    this.updateShake(deltaTime);
    this.particleSystem.update(deltaTime);
    this.emitter.update(deltaTime);
  }

  private render(): void {
    this.ctx.save();
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#0a1628';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.translate(this.shakeX, this.shakeY);
    
    this.particleSystem.render(this.ctx);
    this.emitter.render(this.ctx);
    
    this.ctx.restore();
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FireworksApp();
});
