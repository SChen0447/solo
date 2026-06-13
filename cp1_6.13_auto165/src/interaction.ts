import * as THREE from 'three';
import { SandClock } from './sandClock';
import { degToRad, clamp } from './utils';

export interface InteractionState {
  isDragging: boolean;
  dragDeltaX: number;
  dragDeltaY: number;
  dragSpeed: number;
}

export class InteractionManager {
  private sandClock: SandClock;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private isDragging: boolean = false;
  private isHovering: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseTime: number = 0;
  
  private dragDeltaX: number = 0;
  private dragDeltaY: number = 0;
  private dragSpeed: number = 0;
  private speedHistory: number[] = [];
  
  private targetRotationY: number = 0;
  private targetRotationX: number = degToRad(5);
  
  private glassMeshes: THREE.Mesh[] = [];
  
  private canvas: HTMLCanvasElement;
  
  private clickStartTime: number = 0;
  private clickStartX: number = 0;
  private clickStartY: number = 0;
  private readonly CLICK_THRESHOLD: number = 5;
  private readonly CLICK_TIME_THRESHOLD: number = 200;
  
  private onExplosionCallback: (() => void) | null = null;
  
  constructor(
    sandClock: SandClock,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.sandClock = sandClock;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.canvas = renderer.domElement;
    
    this.glassMeshes = sandClock.getGlassMeshes();
    
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    
    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }
  
  private onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    
    this.updateMousePosition(event);
    
    if (this.isHoveringOverGlass()) {
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      this.lastMouseTime = performance.now();
      
      this.clickStartTime = performance.now();
      this.clickStartX = event.clientX;
      this.clickStartY = event.clientY;
      
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
      this.dragSpeed = 0;
      this.speedHistory = [];
      
      this.canvas.style.cursor = 'grabbing';
    }
  }
  
  private onMouseMove(event: MouseEvent): void {
    event.preventDefault();
    
    this.updateMousePosition(event);
    this.updateHoverState();
    
    if (this.isDragging) {
      const now = performance.now();
      const deltaTime = (now - this.lastMouseTime) / 1000;
      
      if (deltaTime > 0) {
        const dx = event.clientX - this.lastMouseX;
        const dy = event.clientY - this.lastMouseY;
        
        this.dragDeltaX = dx;
        this.dragDeltaY = dy;
        
        const instantSpeed = Math.sqrt(dx * dx + dy * dy) / deltaTime / 1000;
        this.speedHistory.push(instantSpeed);
        if (this.speedHistory.length > 5) {
          this.speedHistory.shift();
        }
        this.dragSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
        this.dragSpeed = clamp(this.dragSpeed, 0, 2);
        
        const rotationSpeed = 0.005;
        this.targetRotationY += dx * rotationSpeed;
        this.targetRotationX += dy * rotationSpeed;
        
        const maxTiltY = degToRad(45);
        const maxTiltX = degToRad(30);
        this.targetRotationY = clamp(this.targetRotationY, -maxTiltY, maxTiltY);
        this.targetRotationX = clamp(this.targetRotationX, -maxTiltX, maxTiltX);
        
        this.sandClock.updateRotation(this.targetRotationX, this.targetRotationY);
        this.sandClock.updateColors(dx, dy);
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.lastMouseTime = now;
      }
    }
  }
  
  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      const now = performance.now();
      const dx = event.clientX - this.clickStartX;
      const dy = event.clientY - this.clickStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const elapsed = now - this.clickStartTime;
      
      if (distance < this.CLICK_THRESHOLD && elapsed < this.CLICK_TIME_THRESHOLD) {
        if (this.isHoveringOverGlass()) {
          this.handleClick(event.clientX, event.clientY);
        }
      }
      
      this.isDragging = false;
      this.dragSpeed = 0;
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
      
      this.updateHoverState();
    }
  }
  
  private onMouseLeave(_event: MouseEvent): void {
    this.isHovering = false;
    this.canvas.style.cursor = 'default';
    
    if (this.isDragging) {
      this.isDragging = false;
      this.dragSpeed = 0;
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
    }
  }
  
  private onMouseEnter(event: MouseEvent): void {
    this.updateMousePosition(event);
    this.updateHoverState();
  }
  
  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    
    this.updateMousePosition(touch);
    
    if (this.isHoveringOverGlass()) {
      this.isDragging = true;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMouseTime = performance.now();
      
      this.clickStartTime = performance.now();
      this.clickStartX = touch.clientX;
      this.clickStartY = touch.clientY;
      
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
      this.dragSpeed = 0;
      this.speedHistory = [];
    }
  }
  
  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    
    if (this.isDragging) {
      const now = performance.now();
      const deltaTime = (now - this.lastMouseTime) / 1000;
      
      if (deltaTime > 0) {
        const dx = touch.clientX - this.lastMouseX;
        const dy = touch.clientY - this.lastMouseY;
        
        this.dragDeltaX = dx;
        this.dragDeltaY = dy;
        
        const instantSpeed = Math.sqrt(dx * dx + dy * dy) / deltaTime / 1000;
        this.speedHistory.push(instantSpeed);
        if (this.speedHistory.length > 5) {
          this.speedHistory.shift();
        }
        this.dragSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
        this.dragSpeed = clamp(this.dragSpeed, 0, 2);
        
        const rotationSpeed = 0.005;
        this.targetRotationY += dx * rotationSpeed;
        this.targetRotationX += dy * rotationSpeed;
        
        const maxTiltY = degToRad(45);
        const maxTiltX = degToRad(30);
        this.targetRotationY = clamp(this.targetRotationY, -maxTiltY, maxTiltY);
        this.targetRotationX = clamp(this.targetRotationX, -maxTiltX, maxTiltX);
        
        this.sandClock.updateRotation(this.targetRotationX, this.targetRotationY);
        this.sandClock.updateColors(dx, dy);
        
        this.lastMouseX = touch.clientX;
        this.lastMouseY = touch.clientY;
        this.lastMouseTime = now;
      }
    }
  }
  
  private onTouchEnd(event: TouchEvent): void {
    if (this.isDragging) {
      const touch = event.changedTouches[0];
      const now = performance.now();
      const dx = touch.clientX - this.clickStartX;
      const dy = touch.clientY - this.clickStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const elapsed = now - this.clickStartTime;
      
      if (distance < this.CLICK_THRESHOLD && elapsed < this.CLICK_TIME_THRESHOLD) {
        this.updateMousePosition(touch);
        if (this.isHoveringOverGlass()) {
          this.handleClick(touch.clientX, touch.clientY);
        }
      }
      
      this.isDragging = false;
      this.dragSpeed = 0;
      this.dragDeltaX = 0;
      this.dragDeltaY = 0;
    }
  }
  
  private updateMousePosition(event: { clientX: number; clientY: number }): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }
  
  private updateHoverState(): void {
    this.isHovering = this.isHoveringOverGlass();
    
    if (this.isDragging) {
      this.canvas.style.cursor = 'grabbing';
    } else if (this.isHovering) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }
  
  private isHoveringOverGlass(): boolean {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.glassMeshes, true);
    return intersects.length > 0;
  }
  
  private handleClick(x: number, y: number): void {
    this.createRipple(x, y);
    this.sandClock.triggerExplosion();
    
    if (this.onExplosionCallback) {
      this.onExplosionCallback();
    }
  }
  
  private createRipple(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    
    document.body.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  public getState(): InteractionState {
    return {
      isDragging: this.isDragging,
      dragDeltaX: this.dragDeltaX,
      dragDeltaY: this.dragDeltaY,
      dragSpeed: this.dragSpeed
    };
  }
  
  public onExplosion(callback: () => void): void {
    this.onExplosionCallback = callback;
  }
  
  public update(deltaTime: number): void {
    if (!this.isDragging && this.dragSpeed > 0) {
      this.dragSpeed *= Math.pow(0.9, deltaTime * 60);
      if (this.dragSpeed < 0.01) {
        this.dragSpeed = 0;
      }
    }
  }
  
  public dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.removeEventListener('mouseenter', this.onMouseEnter.bind(this));
    
    this.canvas.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}
