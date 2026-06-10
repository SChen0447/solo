import * as THREE from 'three';
import { Forest } from './Forest';
import { Firefly } from './Firefly';
import { UserInteraction } from './UserInteraction';

class FireflyForestApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private forest: Forest;
  private fireflies: Firefly[];
  private userInteraction: UserInteraction;
  private fadeOverlay: HTMLDivElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.fireflies = [];

    this.fadeOverlay = this.createFadeOverlay();

    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.forest = new Forest(this.scene);

    for (let i = 0; i < 30; i++) {
      this.fireflies.push(new Firefly(this.scene));
    }

    this.userInteraction = new UserInteraction(
      this.scene,
      this.camera,
      this.renderer,
      this.fireflies,
      () => this.resetFireflies()
    );

    this.animate = this.animate.bind(this);
    this.startFadeIn();
    this.animate();
  }

  private createFadeOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000000;
      z-index: 9999;
      pointer-events: none;
      transition: opacity 2s ease;
      opacity: 1;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  private startFadeIn(): void {
    requestAnimationFrame(() => {
      this.fadeOverlay.style.opacity = '0';
    });
    setTimeout(() => {
      if (this.fadeOverlay.parentNode) {
        this.fadeOverlay.parentNode.removeChild(this.fadeOverlay);
      }
    }, 2200);
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 1.5, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    return renderer;
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private resetFireflies(): void {
    for (const ff of this.fireflies) {
      ff.reset();
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    const angle = elapsed * 0.05;
    const radius = 5.5;
    this.camera.position.x = Math.sin(angle) * radius;
    this.camera.position.z = Math.cos(angle) * radius;
    this.camera.position.y = 2.8 + Math.sin(elapsed * 0.15) * 0.3;
    this.camera.lookAt(0, 1.5, 0);

    for (const ff of this.fireflies) {
      ff.update(delta, elapsed);
    }

    this.userInteraction.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.userInteraction.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireflyForestApp();
});
