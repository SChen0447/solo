import * as THREE from 'three';
import { stars, StarData } from './starData';
import { StarField } from './starField';
import { InteractionManager, HoverInfo } from './interaction';
import { UIManager } from './ui';
import './style.css';

class StarBrowserApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private starField: StarField;
  private interaction: InteractionManager;
  private ui: UIManager;

  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('star-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 400);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.starField = new StarField(stars);
    this.scene.add(this.starField.getObject3D());

    this.interaction = new InteractionManager(this.camera, this.renderer, this.starField);

    this.ui = new UIManager({
      onSearch: this.handleSearch.bind(this),
      onMagnitudeChange: this.handleMagnitudeChange.bind(this)
    });

    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.setupInteractionCallbacks();

    this.starField.setMagnitudeThreshold(this.ui.getMagnitudeValue());

    this.startAnimation();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupInteractionCallbacks(): void {
    this.interaction.onHover((info: HoverInfo | null) => {
      if (info) {
        this.ui.showTooltip(
          info.screenPosition.x,
          info.screenPosition.y,
          info.star.name,
          info.star.magnitude
        );
      } else {
        this.ui.hideTooltip();
      }
    });
  }

  private handleSearch(star: StarData): void {
    const starIndex = stars.findIndex(s => s.id === star.id);
    if (starIndex >= 0) {
      this.interaction.flyToStar(starIndex, 1000);
    }
  }

  private handleMagnitudeChange(value: number): void {
    this.starField.setMagnitudeThreshold(value);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private startAnimation(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();

      this.starField.update(deltaTime);
      this.interaction.update(deltaTime);

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.interaction.dispose();
    this.renderer.dispose();
  }
}

let app: StarBrowserApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new StarBrowserApp();
});

export { app };
