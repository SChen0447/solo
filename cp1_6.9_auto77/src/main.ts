import * as THREE from 'three';
import { Fountain } from './Fountain';
import { Interaction } from './Interaction';
import { Background } from './Background';

class App {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  private fountain: Fountain;
  private background: Background;
  private interaction: Interaction;

  private animationId: number = 0;
  private rateDisplay: HTMLElement | null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.rateDisplay = document.getElementById('rate-display');

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(
      55,
      1,
      0.1,
      200
    );
    this.camera.position.set(0, 0, 14);
    this.camera.lookAt(0, 0, 0);

    this.fountain = new Fountain();
    this.scene.add(this.fountain.points);
    this.scene.add(this.fountain.lines);

    this.background = new Background();
    this.scene.add(this.background.points);

    this.interaction = new Interaction(
      this.container,
      this.camera,
      this.fountain,
      this.background,
      {
        onRateChange: (rate: number) => {
          this.updateRateDisplay(rate);
        }
      }
    );

    this.addLights();
    this.resize();
    this.bindEvents();
    this.animate();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0x4444ff, 0.8, 30);
    point1.position.set(5, 3, 5);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xff44aa, 0.6, 30);
    point2.position.set(-5, 2, 3);
    this.scene.add(point2);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    this.renderer.setSize(size, size, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
  };

  private updateRateDisplay(rate: number): void {
    if (this.rateDisplay) {
      this.rateDisplay.textContent = `粒子速率: ${rate}/秒`;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.elapsedTime;

    const camAngle = elapsedTime * 0.08;
    const camRadius = 14;
    this.camera.position.x = Math.sin(camAngle) * camRadius;
    this.camera.position.z = Math.cos(camAngle) * camRadius;
    this.camera.position.y = 2 + Math.sin(elapsedTime * 0.3) * 0.5;
    this.camera.lookAt(0, 0, 0);

    this.fountain.update(deltaTime);
    this.background.update(deltaTime, elapsedTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resize);
    this.interaction.dispose();
    this.fountain.dispose();
    this.background.dispose();
    this.renderer.dispose();
  }
}

const app = new App();

(window as any).__app = app;
