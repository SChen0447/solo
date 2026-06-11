import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioVisualizer, PresetType } from './visualizer';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private visualizer: AudioVisualizer;
  private ui: UIManager;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.visualizer = new AudioVisualizer(this.scene);

    this.ui = new UIManager(this.container, {
      onToggle: this.handleToggle.bind(this),
      onPresetChange: this.handlePresetChange.bind(this),
      onSensitivityChange: this.handleSensitivityChange.bind(this)
    });

    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a2e, 0.015);

    const ambientLight = new THREE.AmbientLight(0x4040a0, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x4488ff, 1.2, 100);
    pointLight1.position.set(20, 20, 20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4466, 0.8, 80);
    pointLight2.position.set(-20, 10, -20);
    scene.add(pointLight2);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 35);
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
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 10;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.target.set(0, 0, 0);
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    return controls;
  }

  private async handleToggle(): Promise<void> {
    if (this.visualizer.getIsActive()) {
      this.visualizer.stopAll();
      this.ui.setRunningState(false);
    } else {
      const preset = this.visualizer.getCurrentPreset();
      if (preset === 'none') {
        const success = await this.visualizer.startMicrophone();
        if (success) {
          this.ui.setRunningState(true);
        }
      } else {
        this.visualizer.startPreset(preset);
        this.ui.setRunningState(true);
      }
    }
  }

  private handlePresetChange(preset: PresetType): void {
    if (this.visualizer.getIsActive()) {
      if (preset === 'none') {
        this.visualizer.startMicrophone().then(success => {
          this.ui.setRunningState(success);
        });
      } else {
        this.visualizer.startPreset(preset);
        this.ui.setRunningState(true);
      }
    }
  }

  private handleSensitivityChange(value: number): void {
    this.visualizer.sensitivity = value;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const elapsed = this.clock.getElapsedTime();

    this.controls.update();
    this.visualizer.update(elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.visualizer.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
