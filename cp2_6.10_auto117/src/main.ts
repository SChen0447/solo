import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Atom } from './atom';
import { ControlPanel } from './controls';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private atom: Atom;
  private controlPanel: ControlPanel;
  private container: HTMLElement;
  private fpsCounter: HTMLElement;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.fpsCounter = document.getElementById('fps-counter') || document.createElement('div');

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 0.5 * 5;
    this.controls.maxDistance = 5.0 * 5;
    this.controls.enablePan = false;
    this.controls.zoomSpeed = 0.8;

    this.atom = new Atom(this.scene);

    const guiContainer = document.getElementById('gui-container') || document.createElement('div');
    this.controlPanel = new ControlPanel(guiContainer, this.atom, this.camera, this.controls);

    this.setupEventListeners();
    this.animate = this.animate.bind(this);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });

    this.renderer.domElement.addEventListener('wheel', (event) => {
      const distance = this.camera.position.length();
      this.controls.zoomSpeed = Math.max(0.3, 1.2 - distance * 0.05);
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  private animate(currentTime: number): void {
    this.animationId = requestAnimationFrame(this.animate);

    this.updateFPS(currentTime);

    this.atom.animate(currentTime);

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.lastFpsUpdate = performance.now();
    this.animate(performance.now());
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.atom.dispose();
    this.controlPanel.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Application();
  app.start();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
