import * as THREE from 'three';
import { ParticleSystem, type ParticleParams } from './ParticleSystem';
import { ControlsManager } from './ControlsManager';

class NebulaApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private controlsManager: ControlsManager;

  private container: HTMLElement;
  private statParticles: HTMLElement;
  private statFps: HTMLElement;
  private statUpdate: HTMLElement;
  private fpsWarning: HTMLElement;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngle: { theta: number; phi: number } = { theta: 0, phi: Math.PI / 3 };
  private cameraDistance: number = 12;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.statParticles = document.getElementById('stat-particles') as HTMLElement;
    this.statFps = document.getElementById('stat-fps') as HTMLElement;
    this.statUpdate = document.getElementById('stat-update') as HTMLElement;
    this.fpsWarning = document.getElementById('fps-warning') as HTMLElement;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.controlsManager = new ControlsManager({
      onParamsChange: (params) => this.handleParamsChange(params),
      onReset: () => this.resetCamera()
    });

    this.particleSystem = new ParticleSystem(this.controlsManager.getCurrentParams());
    this.scene.add(this.particleSystem.mesh);

    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    camera.lookAt(0, 0, 0);
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
    renderer.setClearColor(0x0a0a1a, 1);
    return renderer;
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
    const y = this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private resetCamera(): void {
    this.cameraAngle = { theta: 0, phi: Math.PI / 3 };
    this.cameraDistance = 12;
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;
      this.cameraAngle.theta -= deltaX * 0.005;
      this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraAngle.phi + deltaY * 0.005));
      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(3, Math.min(30, this.cameraDistance + e.deltaY * 0.01));
      this.updateCameraPosition();
    }, { passive: false });

    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    this.renderer.domElement.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    this.renderer.domElement.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.previousMousePosition.x;
      const deltaY = touch.clientY - this.previousMousePosition.y;
      this.cameraAngle.theta -= deltaX * 0.005;
      this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraAngle.phi + deltaY * 0.005));
      this.updateCameraPosition();
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    }, { passive: false });
  }

  private handleResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private handleParamsChange(params: Partial<ParticleParams>): void {
    this.particleSystem.updateParams(params);
  }

  private updateStats(updateTime: number): void {
    this.frameCount++;
    this.fpsTime += this.clock.getDelta();

    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;

      this.statFps.textContent = this.currentFps.toString();
      if (this.currentFps < 30) {
        this.statFps.classList.add('fps-warning');
        this.fpsWarning.classList.add('visible');
      } else {
        this.statFps.classList.remove('fps-warning');
        this.fpsWarning.classList.remove('visible');
      }
    }

    this.statParticles.textContent = this.particleSystem.getParticleCount().toLocaleString();
    this.statUpdate.textContent = `${updateTime.toFixed(2)} ms`;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const deltaTime = this.clock.getDelta();
    const updateTime = this.particleSystem.update(deltaTime);
    this.renderer.render(this.scene, this.camera);
    this.updateStats(updateTime);
  };

  public dispose(): void {
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

let app: NebulaApp;

window.addEventListener('DOMContentLoaded', () => {
  app = new NebulaApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
