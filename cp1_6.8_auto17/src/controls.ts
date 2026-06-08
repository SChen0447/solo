import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ControlEvents {
  onPause?: () => void;
  onReset?: () => void;
  onForceField?: (position: THREE.Vector3, strength: number, radius: number) => void;
}

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;
  private orbitControls: OrbitControls;
  private events: ControlEvents;
  
  private isDragging: boolean = false;
  private isForceMode: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private forceFieldPlane: THREE.Plane;
  
  private keysPressed: Set<string> = new Set();

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    domElement: HTMLElement,
    events: ControlEvents
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.domElement = domElement;
    this.events = events;
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.forceFieldPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    
    this.orbitControls = new OrbitControls(this.camera, this.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.minDistance = 5;
    this.orbitControls.maxDistance = 50;
    this.orbitControls.maxPolarAngle = Math.PI * 0.85;
    this.orbitControls.minPolarAngle = 0.1;
    this.orbitControls.target.set(0, 5, 0);
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const dom = this.domElement;
    
    dom.addEventListener('mousedown', this.onMouseDown);
    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('mouseleave', this.onMouseUp);
    dom.addEventListener('contextmenu', this.onContextMenu);
    
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    
    dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
    dom.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.mouseDownTime = performance.now();
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
    } else if (e.button === 2) {
      e.preventDefault();
      this.addForceFieldAtMouse(e.clientX, e.clientY);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isDragging && e.buttons === 1) {
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 5) {
        this.isForceMode = true;
        this.orbitControls.enabled = true;
      }
    }
    
    if (this.isForceMode && (e.buttons & 2)) {
      this.addForceFieldAtMouse(e.clientX, e.clientY);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 && this.isDragging) {
      const elapsed = performance.now() - this.mouseDownTime;
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (elapsed < 300 && dist < 5) {
        this.addForceFieldAtMouse(e.clientX, e.clientY, 8, 4);
      }
      
      this.isDragging = false;
      this.isForceMode = false;
      this.orbitControls.enabled = true;
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.mouseDownTime = performance.now();
      this.mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.orbitControls.enabled = true;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.mouseDownPos.x;
      const dy = e.touches[0].clientY - this.mouseDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 10) {
        this.isForceMode = true;
      }
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging && !this.isForceMode) {
      const elapsed = performance.now() - this.mouseDownTime;
      if (elapsed < 300) {
        this.addForceFieldAtMouse(this.mouseDownPos.x, this.mouseDownPos.y, 8, 4);
      }
    }
    
    this.isDragging = false;
    this.isForceMode = false;
  };

  private addForceFieldAtMouse(
    clientX: number,
    clientY: number,
    strength: number = 10,
    radius: number = 3
  ): void {
    const rect = this.domElement.getBoundingClientRect();
    
    this.mouse.x = (clientX - rect.left) / rect.width * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const targetPoint = new THREE.Vector3();
    this.forceFieldPlane.setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 5, 0)
    );
    
    const intersectPoint = new THREE.Vector3();
    const hasIntersection = this.raycaster.ray.intersectPlane(this.forceFieldPlane, intersectPoint);
    
    if (!hasIntersection) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const dist = 15;
      intersectPoint.copy(this.camera.position).add(dir.multiplyScalar(dist));
    }
    
    if (this.events.onForceField) {
      this.events.onForceField(intersectPoint, strength, radius);
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.keysPressed.has(e.code)) return;
    this.keysPressed.add(e.code);
    
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (this.events.onPause) {
          this.events.onPause();
        }
        break;
      case 'KeyR':
        if (this.events.onReset) {
          this.events.onReset();
        }
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
  };

  update(deltaTime: number): void {
    this.orbitControls.update();
  }

  getOrbitControls(): OrbitControls {
    return this.orbitControls;
  }

  dispose(): void {
    const dom = this.domElement;
    
    dom.removeEventListener('mousedown', this.onMouseDown);
    dom.removeEventListener('mousemove', this.onMouseMove);
    dom.removeEventListener('mouseup', this.onMouseUp);
    dom.removeEventListener('mouseleave', this.onMouseUp);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    dom.removeEventListener('touchstart', this.onTouchStart);
    dom.removeEventListener('touchmove', this.onTouchMove);
    dom.removeEventListener('touchend', this.onTouchEnd);
    
    this.orbitControls.dispose();
  }
}
