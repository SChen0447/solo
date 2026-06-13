import * as THREE from 'three';
import { GardenGenerator } from './GardenGenerator';
import { ParticleSystem } from './ParticleSystem';
import { CrystalManager } from './CrystalManager';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container!: HTMLElement;
  private clock!: THREE.Clock;
  private gardenGenerator!: GardenGenerator;
  private particleSystem!: ParticleSystem;
  private crystalManager!: CrystalManager;
  private animationId: number = 0;
  private startTime: number = 0;

  constructor() {
    this.init();
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.startTime = performance.now() / 1000;

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();

    this.gardenGenerator = new GardenGenerator(this.scene);
    this.particleSystem = new ParticleSystem(this.scene, this.gardenGenerator);
    this.crystalManager = new CrystalManager(
      this.scene,
      this.camera,
      this.renderer,
      this.gardenGenerator,
      this.particleSystem
    );

    this.handleResize();
  }

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.0015);
  }

  private createCamera(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 5000);
    this.camera.position.set(0, 400, 800);
    this.camera.lookAt(0, 0, 0);
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0e1a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(200, 400, 300);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xc44dff, 0.6, 2000, 0.5);
    fillLight.position.set(-300, 200, -200);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x4ecdc4, 0.5, 2000, 0.5);
    rimLight.position.set(300, 100, -300);
    this.scene.add(rimLight);

    const bottomLight = new THREE.PointLight(0xff6b9d, 0.4, 1500, 0.6);
    bottomLight.position.set(0, -200, 0);
    this.scene.add(bottomLight);
  }

  private handleResize(): void {
    const width = Math.max(window.innerWidth, 800);
    const height = Math.max(window.innerHeight, 600);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.gardenGenerator) {
      this.gardenGenerator.resize();
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now() / 1000;
    const elapsedTime = currentTime - this.startTime;
    const deltaTime = this.clock.getDelta();

    const clampedDelta = Math.min(deltaTime, 0.05);

    const cameraAngle = elapsedTime * 0.03;
    const cameraRadius = 900;
    const cameraHeight = 400 + Math.sin(elapsedTime * 0.15) * 50;

    this.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
    this.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
    this.camera.position.y = cameraHeight;
    this.camera.lookAt(0, 50, 0);

    this.gardenGenerator.update(elapsedTime, clampedDelta);
    this.particleSystem.update(elapsedTime, clampedDelta);
    this.crystalManager.update(elapsedTime, clampedDelta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    this.crystalManager.dispose();
    this.renderer.dispose();
  }
}

const app = new App();

(window as unknown as { app?: App }).app = app;
