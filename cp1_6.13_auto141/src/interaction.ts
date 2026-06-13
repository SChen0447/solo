import { ParticleSystem } from './particle';

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  ensureContext(): void {
    if (!this.initialized) {
      this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playSwipeSound(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;
    
    this.ensureContext();
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  playSliderBeep(): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;
    
    this.ensureContext();
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 1200;
    
    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.08);
  }
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  
  private isDragging: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMoveTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private speedThreshold: number = 300;
  
  private lastClickTime: number = 0;
  private doubleClickDelay: number = 300;
  
  private trailCooldown: number = 0;
  private isMouseInSphere: boolean = false;

  constructor(canvas: HTMLCanvasElement, particleSystem: ParticleSystem, audioManager: AudioManager) {
    this.canvas = canvas;
    this.particleSystem = particleSystem;
    this.audioManager = audioManager;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  private checkMouseInSphere(x: number, y: number): boolean {
    const dx = x - this.particleSystem.centerX;
    const dy = y - this.particleSystem.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.particleSystem.baseRadius * 1.5;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    
    this.audioManager.ensureContext();
    
    const pos = this.getCanvasPos(e);
    this.isMouseInSphere = this.checkMouseInSphere(pos.x, pos.y);
    
    if (this.isMouseInSphere) {
      this.isDragging = true;
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.lastMoveTime = performance.now();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    const now = performance.now();
    const dt = Math.max((now - this.lastMoveTime) / 1000, 0.001);
    
    this.velocityX = (pos.x - this.lastMouseX) / dt;
    this.velocityY = (pos.y - this.lastMouseY) / dt;
    
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    
    this.lastMouseX = pos.x;
    this.lastMouseY = pos.y;
    this.lastMoveTime = now;
    
    this.isMouseInSphere = this.checkMouseInSphere(pos.x, pos.y);
    
    if (this.isDragging && this.isMouseInSphere) {
      const intensity = Math.min(speed / 200, 1.5);
      this.particleSystem.applyStretch(pos.x, pos.y, intensity);
      
      if (speed > this.speedThreshold && this.trailCooldown <= 0) {
        this.handleFastSwipe(pos.x, pos.y, speed);
        this.trailCooldown = 0.05;
      }
    }
    
    if (this.trailCooldown > 0) {
      this.trailCooldown -= dt;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.particleSystem.bounceBack();
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    
    if (this.checkMouseInSphere(pos.x, pos.y)) {
      this.audioManager.ensureContext();
      this.particleSystem.triggerSplitAnimation();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    
    this.audioManager.ensureContext();
    
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    this.isMouseInSphere = this.checkMouseInSphere(pos.x, pos.y);
    
    if (this.isMouseInSphere) {
      this.isDragging = true;
      this.mouseX = pos.x;
      this.mouseY = pos.y;
      this.lastMouseX = pos.x;
      this.lastMouseY = pos.y;
      this.lastMoveTime = performance.now();
      
      const now = performance.now();
      if (now - this.lastClickTime < this.doubleClickDelay) {
        this.particleSystem.triggerSplitAnimation();
      }
      this.lastClickTime = now;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    const now = performance.now();
    const dt = Math.max((now - this.lastMoveTime) / 1000, 0.001);
    
    this.velocityX = (pos.x - this.lastMouseX) / dt;
    this.velocityY = (pos.y - this.lastMouseY) / dt;
    
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    
    this.lastMouseX = pos.x;
    this.lastMouseY = pos.y;
    this.lastMoveTime = now;
    
    if (this.isDragging) {
      const intensity = Math.min(speed / 200, 1.5);
      this.particleSystem.applyStretch(pos.x, pos.y, intensity);
      
      if (speed > this.speedThreshold && this.trailCooldown <= 0) {
        this.handleFastSwipe(pos.x, pos.y, speed);
        this.trailCooldown = 0.08;
      }
    }
    
    if (this.trailCooldown > 0) {
      this.trailCooldown -= dt;
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.particleSystem.bounceBack();
    }
  }

  private handleFastSwipe(x: number, y: number, speed: number): void {
    this.particleSystem.triggerWarmMode(1.5);
    
    const trailCount = Math.floor(this.particleSystem.trailCount * (speed / this.speedThreshold) * 0.3);
    this.particleSystem.spawnTrail(x, y, trailCount, this.velocityX * 0.1, this.velocityY * 0.1);
    
    this.audioManager.playSwipeSound();
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  getMousePos(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  getVelocity(): { vx: number; vy: number } {
    return { vx: this.velocityX, vy: this.velocityY };
  }
}
