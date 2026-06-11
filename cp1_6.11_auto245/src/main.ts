import * as THREE from 'three';
import { NebulaSystem, NebulaConfig } from './nebula';
import { setupUI, UICallbacks } from './ui';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private nebulaSystem: NebulaSystem;
  private clock: THREE.Clock;
  
  private isDragging = false;
  private draggedNebulaId: number | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private fps = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private qualityLevel = 2;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    
    this.camera = new THREE.OrthographicCamera(
      -WORLD_WIDTH / 2,
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      -WORLD_HEIGHT / 2,
      0.1,
      2000
    );
    this.camera.position.z = 500;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x050510, 1);
    this.container.appendChild(this.renderer.domElement);

    this.setupBackground();

    const initialConfig: NebulaConfig = {
      density: 1.0,
      collisionSpeed: 1.0,
      pulseFrequency: 1.0,
    };

    this.nebulaSystem = new NebulaSystem(
      this.scene,
      initialConfig,
      { width: WORLD_WIDTH, height: WORLD_HEIGHT }
    );

    const callbacks: UICallbacks = {
      onDensityChange: (value) => this.nebulaSystem.setConfig({ density: value }),
      onSpeedChange: (value) => this.nebulaSystem.setConfig({ collisionSpeed: value }),
      onPulseChange: (value) => this.nebulaSystem.setConfig({ pulseFrequency: value }),
      onCapture: () => this.captureStarMap(),
      getCollisionCount: () => this.nebulaSystem.getCollisionCount(),
      getStarExists: () => this.nebulaSystem.getStarExists(),
      getRenderer: () => this.renderer,
    };

    setupUI(this.container, callbacks);

    this.setupEventListeners();
    this.animate();
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 350);
    gradient.addColorStop(0, '#2a0a3a');
    gradient.addColorStop(0.4, '#150825');
    gradient.addColorStop(0.7, '#0a0618');
    gradient.addColorStop(1, '#050510');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    const bgGeometry = new THREE.PlaneGeometry(WORLD_WIDTH * 2.5, WORLD_HEIGHT * 2.5);
    const bgMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -500;
    this.scene.add(bgMesh);
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    
    this.renderer.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    
    this.renderer.domElement.addEventListener('touchstart', (e) => this.onTouchStart(e));
    window.addEventListener('touchmove', (e) => this.onTouchMove(e));
    window.addEventListener('touchend', () => this.onTouchEnd());
  }

  private onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const aspect = width / height;
    const targetAspect = WORLD_WIDTH / WORLD_HEIGHT;
    
    let viewWidth = WORLD_WIDTH;
    let viewHeight = WORLD_HEIGHT;
    
    if (aspect > targetAspect) {
      viewWidth = WORLD_HEIGHT * aspect;
    } else {
      viewHeight = WORLD_WIDTH / aspect;
    }
    
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    
    this.nebulaSystem.resize({ width: viewWidth, height: viewHeight });
  }

  private updateMouse(e: MouseEvent | Touch) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((screenX - rect.left) / rect.width) * 2 - 1;
    const y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);
    
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    
    return pos;
  }

  private onMouseDown(e: MouseEvent) {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const hitId = this.getHitNebula();
    if (hitId !== null) {
      this.isDragging = true;
      this.draggedNebulaId = hitId;
      this.renderer.domElement.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.isDragging && this.draggedNebulaId !== null) {
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      worldPos.z = 0;
      this.nebulaSystem.setNebulaPosition(this.draggedNebulaId, worldPos);
    } else {
      this.updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hitId = this.getHitNebula();
      this.renderer.domElement.style.cursor = hitId !== null ? 'grab' : 'default';
    }
  }

  private onMouseUp() {
    this.isDragging = false;
    this.draggedNebulaId = null;
    this.renderer.domElement.style.cursor = 'default';
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.updateMouse(touch);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const hitId = this.getHitNebula();
      if (hitId !== null) {
        this.isDragging = true;
        this.draggedNebulaId = hitId;
        e.preventDefault();
      }
    }
  }

  private onTouchMove(e: TouchEvent) {
    if (this.isDragging && this.draggedNebulaId !== null && e.touches.length === 1) {
      const touch = e.touches[0];
      const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
      worldPos.z = 0;
      this.nebulaSystem.setNebulaPosition(this.draggedNebulaId, worldPos);
      e.preventDefault();
    }
  }

  private onTouchEnd() {
    this.isDragging = false;
    this.draggedNebulaId = null;
  }

  private getHitNebula(): number | null {
    for (let i = 0; i < 2; i++) {
      const center = this.nebulaSystem.getNebulaCenter(i);
      const distance = this.mouse.distanceTo(new THREE.Vector2(
        (center.x / (WORLD_WIDTH / 2)),
        (center.y / (WORLD_HEIGHT / 2))
      ));
      
      const hitRadius = 150 / (WORLD_WIDTH / 2);
      if (distance < hitRadius) {
        return i;
      }
    }
    return null;
  }

  private captureStarMap(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(400, 300, 50, 400, 300, 400);
    gradient.addColorStop(0, '#1a0a2a');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    const sourceCanvas = this.renderer.domElement;
    const sourceAspect = sourceCanvas.width / sourceCanvas.height;
    const targetAspect = 800 / 600;
    
    let sx = 0, sy = 0, sw = sourceCanvas.width, sh = sourceCanvas.height;
    
    if (sourceAspect > targetAspect) {
      sw = sourceCanvas.height * targetAspect;
      sx = (sourceCanvas.width - sw) / 2;
    } else {
      sh = sourceCanvas.width / targetAspect;
      sy = (sourceCanvas.height - sh) / 2;
    }
    
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, 800, 600);
    
    return canvas;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.adjustQuality();
    }
    
    this.nebulaSystem.update(delta);
    
    this.renderer.render(this.scene, this.camera);
  }

  private adjustQuality() {
    if (this.fps < 25 && this.qualityLevel > 0) {
      this.qualityLevel--;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1 + this.qualityLevel * 0.5));
    } else if (this.fps > 50 && this.qualityLevel < 2) {
      this.qualityLevel++;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1 + this.qualityLevel * 0.5));
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
