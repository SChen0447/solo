import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private userControls: Controls;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private particleCountEl: HTMLElement;
  private fpsValueEl: HTMLElement;
  private attractionValueEl: HTMLElement;
  private displayAttractionValue: number = 2.0;
  private targetAttractionValue: number = 2.0;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.particleCountEl = document.getElementById('particle-count') as HTMLElement;
    this.fpsValueEl = document.getElementById('fps-value') as HTMLElement;
    this.attractionValueEl = document.getElementById('attraction-value') as HTMLElement;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createOrbitControls();

    this.particleSystem = new ParticleSystem(this.scene, window.innerWidth);
    this.userControls = new Controls(this.container);

    this.setupEventListeners();
    this.updateUI();
    this.onWindowResize();

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0a0a');
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createOrbitControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 30;
    controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.touches = {
      ONE: null as unknown as THREE.TOUCH,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);

    this.userControls.on('sizeChange', (data: unknown) => {
      const size = data as number;
      this.particleSystem.setParticleSize(size);
    });

    this.userControls.on('attractionChange', (data: unknown) => {
      const strength = data as number;
      this.particleSystem.setAttractionStrength(strength);
      this.targetAttractionValue = strength;
    });

    this.userControls.on('rotationChange', (data: unknown) => {
      const speed = data as number;
      this.particleSystem.setRotationSpeed(speed);
    });

    this.userControls.on('reset', () => {
      this.particleSystem.reset();
    });

    this.userControls.on('mouseDown', (data: unknown) => {
      const eventData = data as { worldPos: THREE.Vector3 };
      this.userControls.updateMouseWorldPosition(this.camera);
      const worldPos = this.userControls.getMouseWorldPosition();
      this.particleSystem.setMouseDown(true, worldPos);
    });

    this.userControls.on('mouseMove', (data: unknown) => {
      this.userControls.updateMouseWorldPosition(this.camera);
      const worldPos = this.userControls.getMouseWorldPosition();
      const eventData = data as { deltaTime: number };
      this.particleSystem.setMousePosition(worldPos, eventData.deltaTime);
    });

    this.userControls.on('mouseUp', () => {
      this.particleSystem.setMouseDown(false);
    });
  }

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
      this.fpsValueEl.textContent = this.currentFps.toString();

      if (this.currentFps >= 55) {
        this.fpsValueEl.style.color = '#2ecc71';
      } else if (this.currentFps >= 30) {
        this.fpsValueEl.style.color = '#f39c12';
      } else {
        this.fpsValueEl.style.color = '#e74c3c';
      }
    }
  }

  private updateUI(): void {
    this.particleCountEl.textContent = this.particleSystem.getParticleCount().toString();
    this.attractionValueEl.textContent = this.displayAttractionValue.toFixed(1);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = performance.now();

    this.updateFPS(currentTime);

    const valueDiff = this.targetAttractionValue - this.displayAttractionValue;
    if (Math.abs(valueDiff) > 0.001) {
      const step = valueDiff * deltaTime * 8;
      this.displayAttractionValue += step;
      this.attractionValueEl.textContent = this.displayAttractionValue.toFixed(1);
    }

    const startTime = performance.now();
    this.particleSystem.updateParticles(deltaTime);
    const updateTime = performance.now() - startTime;

    if (updateTime > 8) {
      console.warn(`Particle update took ${updateTime.toFixed(2)}ms, exceeding 8ms budget`);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onWindowResize);
    this.userControls.dispose();
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
