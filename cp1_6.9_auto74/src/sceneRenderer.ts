import * as THREE from 'three';
import { ParticleController, ParticleControllerState } from './particleController';
import {
  generateStars,
  StarData,
  updateStarRotation,
  updateTwinkle,
  updateBrightStars,
  PARTICLE_COUNT
} from './starGenerator';

export interface SceneRendererCallbacks {
  onFpsUpdate: (fps: number) => void;
}

export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private starData: StarData;
  private points: THREE.Points | null = null;
  private particleController: ParticleController | null = null;
  private animationId: number | null = null;
  private callbacks: SceneRendererCallbacks;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private controllerState: ParticleControllerState = {
    gesture: 'none',
    handOpenness: 0
  };
  private startTime: number = 0;

  constructor(container: HTMLElement, callbacks: SceneRendererCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.getAspectRatio(),
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    this.starData = generateStars();
    this.setupLighting();
    this.createParticleSystem();
    this.scene.add(this.starData.group);
    this.setupResizeHandler();
    this.particleController = new ParticleController(
      this.camera,
      this.starData.colors,
      this.starData.originalColors,
      this.starData.distances
    );
  }

  private getAspectRatio(): number {
    return this.container.clientWidth / this.container.clientHeight;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x88ccff, 1, 500);
    pointLight1.position.set(100, 50, 100);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff88cc, 0.6, 500);
    pointLight2.position.set(-100, -50, -100);
    this.scene.add(pointLight2);
  }

  private createParticleSystem(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(200, 220, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.starData.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.starData.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.starData.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      map: texture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(geometry, material);
    this.starData.group.add(this.points);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  setControllerState(state: ParticleControllerState): void {
    this.controllerState = state;
  }

  start(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaMs = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.callbacks.onFpsUpdate(fps);
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    const elapsed = currentTime - this.startTime;

    if (this.particleController) {
      this.particleController.update(this.controllerState, deltaMs);
    }

    updateStarRotation(this.starData.group, deltaMs);
    updateTwinkle(
      this.starData.colors,
      this.starData.originalColors,
      this.starData.twinklePhases,
      this.starData.twinkleSpeeds,
      elapsed
    );
    updateBrightStars(this.starData.group, elapsed);

    if (this.points) {
      const colorAttr = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
      colorAttr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.stop();

    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }

    this.starData.group.children.forEach((child) => {
      if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
