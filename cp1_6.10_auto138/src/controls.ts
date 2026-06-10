import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NebulaSystem, ColorTheme, NebulaParams } from './nebula';

export class ControlManager {
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private nebula: NebulaSystem;
  private orbitControls: OrbitControls;
  
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  
  constructor(
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    nebula: NebulaSystem
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.nebula = nebula;
    
    this.canvasWidth = renderer.domElement.clientWidth;
    this.canvasHeight = renderer.domElement.clientHeight;
    
    this.orbitControls = new OrbitControls(camera, renderer.domElement);
    this.setupOrbitControls();
    this.setupEventListeners();
  }
  
  private setupOrbitControls(): void {
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.2;
    this.orbitControls.rotateSpeed = 0.5;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 30;
    this.orbitControls.target.set(0, 0, 0);
    this.orbitControls.enablePan = false;
  }
  
  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('mousemove', this.onMouseMove);
    
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    
    window.addEventListener('resize', this.onResize);
  }
  
  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };
  
  private onMouseUp = (): void => {
    this.isDragging = false;
  };
  
  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const time = performance.now() / 1000;
      this.nebula.handleMouseMove(
        x, y, this.camera,
        this.canvasWidth, this.canvasHeight,
        time
      );
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };
  
  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  };
  
  private onTouchEnd = (): void => {
    this.isDragging = false;
  };
  
  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      if (!this.isDragging) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const y = e.touches[0].clientY - rect.top;
        const time = performance.now() / 1000;
        this.nebula.handleMouseMove(
          x, y, this.camera,
          this.canvasWidth, this.canvasHeight,
          time
        );
      }
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  };
  
  private onResize = (): void => {
    this.canvasWidth = this.renderer.domElement.clientWidth;
    this.canvasHeight = this.renderer.domElement.clientHeight;
  };
  
  update(): void {
    this.orbitControls.update();
  }
  
  setDensity(value: number): void {
    this.nebula.params.density = value;
  }
  
  setRotationSpeed(value: number): void {
    this.nebula.params.rotationSpeed = value;
  }
  
  setColorTheme(theme: ColorTheme): void {
    this.nebula.setColorTheme(theme);
  }
  
  reset(): void {
    this.nebula.reset();
  }
  
  getParams(): NebulaParams {
    return this.nebula.params;
  }
  
  dispose(): void {
    const canvas = this.renderer.domElement;
    
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseUp);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchend', this.onTouchEnd);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    
    window.removeEventListener('resize', this.onResize);
    
    this.orbitControls.dispose();
  }
}
