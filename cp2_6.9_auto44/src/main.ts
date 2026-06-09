import * as THREE from 'three';
import { GalleryBuilder, PaintingObject } from './galleryBuilder';
import { ControlsManager } from './controlsManager';
import { ArtDetailPanel } from './artDetailPanel';
import { GALLERY_CONFIG } from './galleryData';

class GalleryApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private paintings: PaintingObject[] = [];
  private controlsManager: ControlsManager | null = null;
  private artDetailPanel: ArtDetailPanel | null = null;

  private animationId: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.clock = new THREE.Clock();

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.container.appendChild(this.renderer.domElement);

    this.artDetailPanel = new ArtDetailPanel();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);

    const { depth } = GALLERY_CONFIG;
    camera.position.set(0, 1.7, depth / 2 - 1.5);

    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    return renderer;
  }

  public async init(): Promise<void> {
    this.paintings = await GalleryBuilder.build(this.scene);

    this.controlsManager = new ControlsManager(
      this.camera,
      this.container,
      this.paintings,
      (artwork) => {
        this.artDetailPanel?.show(artwork);
      }
    );

    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }

    this.animate();
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    if (this.controlsManager) {
      this.controlsManager.update(deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.handleResize);

    this.controlsManager?.dispose();
    this.artDetailPanel?.dispose();

    this.renderer.dispose();
  }
}

const app = new GalleryApp();
app.init().catch((error) => {
  console.error('Failed to initialize gallery:', error);
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.textContent = '画廊加载失败，请刷新页面重试';
  }
});
