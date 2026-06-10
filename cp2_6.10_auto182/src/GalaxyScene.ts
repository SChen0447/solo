import * as THREE from 'three';
import { ParticleSystem, ColorTheme } from './ParticleSystem';

export interface SceneCallbacks {
  onFPSUpdate: (fps: number) => void;
  onLowPerformance: () => void;
  onParticleHover: (position: THREE.Vector3 | null, screenX: number, screenY: number) => void;
}

export class GalaxyScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private cameraDistance: number = 15;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private animationId: number = 0;
  private clock: THREE.Clock;
  private callbacks: SceneCallbacks;

  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFPS: number = 60;
  private performanceOptimized: boolean = false;

  private autoRotate: boolean = true;

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.particleSystem = new ParticleSystem();

    this.scene.add(this.particleSystem.points);

    this.setupEventListeners();
    this.updateCameraPosition();

    this.animate = this.animate.bind(this);
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.autoRotate = false;
    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();

    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.005));

      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.updateCameraPosition();
    }

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkParticleHover(event.clientX, event.clientY);
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.particleSystem.setHoveredParticle(-1);
    this.callbacks.onParticleHover(null, 0, 0);
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onTouchMove(event: TouchEvent): void {
    if (this.isDragging && event.touches.length === 1) {
      event.preventDefault();
      const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = event.touches[0].clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi + deltaY * 0.005));

      this.previousMousePosition = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      };
      this.updateCameraPosition();
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance = Math.max(5, Math.min(40, this.cameraDistance + event.deltaY * 0.01));
    this.updateCameraPosition();
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private checkParticleHover(screenX: number, screenY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.particleSystem.points);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const index = intersects[0].index;
      this.particleSystem.setHoveredParticle(index);
      const position = this.particleSystem.getParticlePosition(index);
      if (position) {
        this.callbacks.onParticleHover(position, screenX, screenY);
      }
    } else {
      this.particleSystem.setHoveredParticle(-1);
      this.callbacks.onParticleHover(null, 0, 0);
    }
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 0.5) {
      this.currentFPS = Math.round(this.frameCount / this.fpsUpdateTime);
      this.callbacks.onFPSUpdate(this.currentFPS);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      if (this.currentFPS < 30 && !this.performanceOptimized) {
        this.performanceOptimized = true;
        this.callbacks.onLowPerformance();
        const currentCount = this.particleSystem.getParticleCount();
        this.setParticleCount(Math.floor(currentCount * 0.5));
      }
    }
  }

  public setParticleCount(count: number): void {
    this.particleSystem.setParticleCount(count);
  }

  public setParticleSize(size: number): void {
    this.particleSystem.setParticleSize(size);
  }

  public setColorTheme(theme: ColorTheme): void {
    this.particleSystem.setColorTheme(theme);
  }

  public setGravityStrength(strength: number): void {
    this.particleSystem.setGravityStrength(strength);
  }

  public setRotationSpeed(speed: number): void {
    this.particleSystem.setRotationSpeed(speed);
  }

  public reset(): void {
    this.particleSystem.reset();
    this.performanceOptimized = false;
    this.cameraTheta = 0;
    this.cameraPhi = Math.PI / 3;
    this.cameraDistance = 15;
    this.updateCameraPosition();
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (this.autoRotate && !this.isDragging) {
      this.cameraTheta += 0.001;
      this.updateCameraPosition();
    }

    this.particleSystem.update(deltaTime);
    this.updateFPS(deltaTime);
    this.renderer.render(this.scene, this.camera);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  public dispose(): void {
    this.stop();
    this.particleSystem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();

    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('touchend', this.onTouchEnd.bind(this));
    window.removeEventListener('touchmove', this.onTouchMove.bind(this));
  }
}
