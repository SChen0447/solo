import * as THREE from 'three';
import { SpaceScene } from './scene';
import { ControlPanel } from './controls';
import { InteractionManager } from './interaction';
import './style.css';

class App {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private spaceScene: SpaceScene;
  private controls: ControlPanel;
  private interaction: InteractionManager;

  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(15, 10, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0d1117, 1);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.cursor = 'grab';

    this.spaceScene = new SpaceScene();
    this.controls = new ControlPanel(this.spaceScene);
    this.interaction = new InteractionManager(
      this.spaceScene,
      this.camera,
      this.renderer
    );

    this.bindEvents();
    this.start();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.interaction.onResize();
  }

  private start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = Math.min(this.clock.getDelta(), 0.05);
      const time = this.clock.getElapsedTime();

      this.spaceScene.update(delta, time);
      this.interaction.update(delta, time);
      this.renderer.render(this.spaceScene.scene, this.camera);
    };
    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
