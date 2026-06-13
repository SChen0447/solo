import * as THREE from 'three';
import { Galaxy, GalaxyParams } from './galaxy';
import { InteractionManager } from './interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private galaxy: Galaxy;
  private interaction: InteractionManager;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 16);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    const galaxyParams: GalaxyParams = {
      count: 15000,
      radius: 12,
      minRadius: 2,
      rotationPeriod: 30
    };
    this.galaxy = new Galaxy(galaxyParams);
    this.scene.add(this.galaxy.points);

    this.interaction = new InteractionManager(
      this.camera,
      this.galaxy,
      this.renderer.domElement,
      this.clock
    );

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  public start(): void {
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.interaction.update();
    this.galaxy.update(elapsedTime, deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.interaction.dispose();
    this.renderer.dispose();
    this.galaxy.geometry.dispose();
    this.galaxy.material.dispose();
    if (this.galaxy.material.map) {
      this.galaxy.material.map.dispose();
    }
  }
}

const container = document.getElementById('app');
if (container) {
  const app = new App(container);
  app.start();
}
