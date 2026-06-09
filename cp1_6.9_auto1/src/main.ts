import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleGalaxy } from './ParticleGalaxy';
import { UI } from './UI';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private galaxy: ParticleGalaxy;
  private ui: UI;
  private container: HTMLElement;

  private initialCameraPosition: THREE.Vector3;
  private initialControlsTarget: THREE.Vector3;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 60;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.initialCameraPosition = this.camera.position.clone();
    this.initialControlsTarget = this.controls.target.clone();

    const particleCount = this.getResponsiveParticleCount();
    this.galaxy = new ParticleGalaxy({
      particleCount,
      startHue: 260,
      endHue: 180,
      radius: 3
    });
    this.scene.add(this.galaxy.points);

    this.ui = new UI({
      onRotationSpeedChange: (speed: number) => this.galaxy.setRotationSpeed(speed),
      onParticleCountChange: (count: number) => this.galaxy.setParticleCount(count),
      onColorChange: (startHue: number, endHue: number) => this.galaxy.setColorRange(startHue, endHue)
    });

    this.ui.setParticleCount(particleCount);
    this.galaxy.setRotationSpeed(this.ui.getRotationSpeed());

    this.bindEvents();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0E14);
    scene.fog = new THREE.FogExp2(0x0B0E14, 0.08);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 6);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0B0E14, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.6;
    return controls;
  }

  private getResponsiveParticleCount(): number {
    const width = window.innerWidth;
    if (width > 1200) return 8000;
    if (width < 768) return 2000;
    return 4000;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('dblclick', () => {
      this.resetView();
    });
  }

  private resetView(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialControlsTarget);
    this.controls.update();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTime += deltaTime;

    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTime;
      this.ui.updateFPS(this.currentFPS);
      this.ui.showWarning(this.currentFPS < 30);
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.galaxy.update(elapsedTime, deltaTime);
    this.controls.update();
    this.updateFPS(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.galaxy.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}

new App();
