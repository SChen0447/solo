import * as THREE from 'three';
import { Earth } from './earth';
import { WindParticles } from './windParticles';
import { CameraControls } from './controls';

interface AppState {
  timeSpeed: number;
  isRotating: boolean;
}

class WindFieldApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private earth: Earth;
  private windParticles: WindParticles;
  private controls: CameraControls;
  private clock: THREE.Clock;
  private state: AppState;
  private container: HTMLElement;

  private static readonly EARTH_RADIUS: number = 2;
  private static readonly PARTICLE_COUNT: number = 2500;
  private static readonly WIND_ALTITUDE: number = 0.02;
  private static readonly ROTATION_SPEED: number = 0.002;

  constructor(containerId: string) {
    this.clock = new THREE.Clock();
    this.state = {
      timeSpeed: 1,
      isRotating: true
    };
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(container);
    this.setupLighting();
    this.earth = new Earth({
      radius: WindFieldApp.EARTH_RADIUS,
      rotationSpeed: WindFieldApp.ROTATION_SPEED
    });
    this.scene.add(this.earth.mesh);
    this.windParticles = new WindParticles({
      particleCount: WindFieldApp.PARTICLE_COUNT,
      earthRadius: WindFieldApp.EARTH_RADIUS,
      altitude: WindFieldApp.WIND_ALTITUDE
    });
    this.scene.add(this.windParticles.points);
    this.scene.add(this.windParticles.trails);
    this.controls = new CameraControls(this.camera, container, WindFieldApp.EARTH_RADIUS);
    this.controls.setupUIControls({
      onTimeSpeedChange: (speed: number) => {
        this.state.timeSpeed = speed;
      },
      onToggleRotation: () => {
        this.state.isRotating = !this.state.isRotating;
        this.earth.setRotating(this.state.isRotating);
      },
      onResetView: () => {}
    });
    window.addEventListener('resize', this.onResize);
    this.onResize();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    return camera;
  }

  private createRenderer(container: HTMLElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x6080a0, 0.3);
    fillLight.position.set(-3, -1, -2);
    this.scene.add(fillLight);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.earth.update(delta * 60);
    this.windParticles.update(delta * 60, this.state.timeSpeed);
    this.controls.update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  public getState(): Readonly<AppState> {
    return this.state;
  }

  public setTimeSpeed(speed: number): void {
    this.state.timeSpeed = Math.max(1, Math.min(10, speed));
  }

  public setRotating(enabled: boolean): void {
    this.state.isRotating = enabled;
    this.earth.setRotating(enabled);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: WindFieldApp | null = null;

try {
  app = new WindFieldApp('canvas-container');
} catch (error) {
  console.error('Failed to initialize WindFieldApp:', error);
}

export { WindFieldApp, app };
