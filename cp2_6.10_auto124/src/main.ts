import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FluidParticleSystem, ParticleParams } from './FluidParticleSystem';
import { GUIController } from './GUIController';
import { VideoExporter } from './VideoExporter';

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private particleSystem!: FluidParticleSystem;
  private guiController!: GUIController;
  private videoExporter!: VideoExporter;

  private lastFrameTime: number = 0;
  private animationFrameId: number = 0;

  private fadeScene!: THREE.Scene;
  private fadeCamera!: THREE.OrthographicCamera;
  private fadeMaterial!: THREE.MeshBasicMaterial;

  constructor() {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initFadeEffect();

    this.particleSystem = new FluidParticleSystem();
    this.scene.add(this.particleSystem.getPoints());

    this.videoExporter = new VideoExporter(this.renderer.domElement);

    this.guiController = new GUIController(
      this.handleParamChange.bind(this),
      this.handleExport.bind(this)
    );

    window.addEventListener('resize', this.handleResize.bind(this));

    this.animate(performance.now());
  }

  private initRenderer(): void {
    const container = document.getElementById('canvas-container') as HTMLElement;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.autoClear = false;
    container.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = null;
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 7.5;
    this.controls.maxDistance = 75;
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = false;
  }

  private initFadeEffect(): void {
    this.fadeScene = new THREE.Scene();
    this.fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0a1a,
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending,
      depthTest: false,
      depthWrite: false
    });

    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(quadGeometry, this.fadeMaterial);
    this.fadeScene.add(quad);
  }

  private handleParamChange(params: Partial<ParticleParams>): void {
    this.particleSystem.setParams(params);
  }

  private handleExport(): void {
    if (!this.videoExporter.isCurrentlyRecording()) {
      this.videoExporter.startExport();
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(currentTime: number): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const elapsed = currentTime - this.lastFrameTime;

    if (elapsed >= FRAME_INTERVAL) {
      const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = currentTime - (elapsed % FRAME_INTERVAL);

      this.update(deltaTime, currentTime);
      this.render();
    }
  }

  private update(deltaTime: number, currentTime: number): void {
    this.controls.update();
    this.particleSystem.update(deltaTime);
    this.videoExporter.update(currentTime);
  }

  private render(): void {
    this.renderer.render(this.fadeScene, this.fadeCamera);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.particleSystem.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

let app: App;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
