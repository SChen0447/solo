import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { InteractionManager } from './interaction';

class CosmicTideApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private interactionManager: InteractionManager;
  private container: HTMLElement;
  private guiContainer: HTMLElement;
  private animationId: number = 0;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.guiContainer = document.getElementById('gui-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000005, 1);
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(8000);
    this.scene.add(this.particleSystem.points);
    this.scene.add(this.particleSystem.gammaBurstPoints);

    this.interactionManager = new InteractionManager(
      this.camera,
      this.scene,
      this.particleSystem,
      this.container,
      this.guiContainer
    );

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();

    this.interactionManager.update();
    this.particleSystem.update(this.camera, currentTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.interactionManager.dispose();
    this.particleSystem.geometry.dispose();
    this.particleSystem.material.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

const app = new CosmicTideApp();
app.start();
