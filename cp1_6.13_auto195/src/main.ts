import * as THREE from 'three';
import { CrystalCaveData } from './data/CrystalCaveData';
import { MouseController } from './controllers/MouseController';
import { CrystalRenderer } from './renderers/CrystalRenderer';

class CrystalCaveApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private dataManager: CrystalCaveData;
  private mouseController: MouseController;
  private crystalRenderer: CrystalRenderer;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  constructor() {
    this.container = document.body;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.dataManager = new CrystalCaveData();
    this.mouseController = new MouseController(this.renderer.domElement, this.dataManager, this.camera);
    this.crystalRenderer = new CrystalRenderer(this.scene, this.camera, this.dataManager);

    this.init();
    this.bindEvents();
    this.startAnimationLoop();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    camera.position.set(0, 4, 8);
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
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private init(): void {
    this.crystalRenderer.initScene();

    const wallMesh = this.crystalRenderer.getWallMesh();
    if (wallMesh) {
      this.mouseController.setWallMesh(wallMesh);
    }

    this.mouseController.updateCamera();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = Math.min(this.clock.getDelta(), 0.1);

      this.update(deltaTime);
      this.render();
    };

    animate();
  }

  private update(deltaTime: number): void {
    this.mouseController.updateCamera();

    this.dataManager.updateGrowth(deltaTime);
    this.dataManager.updateFireflies(deltaTime, this.dataManager.mouseIntersection);
    this.dataManager.updateParticles(deltaTime);

    this.crystalRenderer.updateCrystals(this.dataManager);
    this.crystalRenderer.updateWall(this.dataManager);
    this.crystalRenderer.updateFirefliesRender();
    this.crystalRenderer.updateParticlesRender();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize.bind(this));

    this.mouseController.dispose();
    this.crystalRenderer.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: CrystalCaveApp | null = null;

const initApp = () => {
  if (app) {
    app.dispose();
  }
  app = new CrystalCaveApp();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { CrystalCaveApp };
