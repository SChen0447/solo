import * as THREE from 'three';
import { Ocean } from './Ocean';
import { CurrentPath } from './CurrentPath';
import { PlanktonSystem } from './PlanktonSystem';
import { InteractionControls } from './InteractionControls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private ocean: Ocean;
  private currentPath: CurrentPath;
  private planktonSystem: PlanktonSystem;
  private controls: InteractionControls;

  private clock: THREE.Clock;
  private time: number = 0;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();

    this.ocean = new Ocean();
    this.scene.add(this.ocean.group);

    this.currentPath = new CurrentPath();
    this.scene.add(this.currentPath.group);

    this.planktonSystem = new PlanktonSystem(this.currentPath.getPathData());
    this.scene.add(this.planktonSystem.points);

    this.controls = new InteractionControls(
      this.camera,
      this.renderer.domElement,
      this.currentPath,
      this.planktonSystem
    );

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(
      0x2a6a9a,
      0x0f1a2a,
      0.6
    );
    this.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 15, 10);
    this.scene.add(directionalLight);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    this.time += deltaTime;

    this.ocean.update(this.time);
    this.currentPath.update(deltaTime, this.time);
    this.planktonSystem.update(deltaTime, this.time);
    this.controls.update(deltaTime, this.time);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

const app = new App();
app.start();
