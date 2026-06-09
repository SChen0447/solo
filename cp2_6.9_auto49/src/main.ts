import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SoundSource } from './SoundSource';
import { ParticleSystem } from './ParticleSystem';
import { WaveRingManager } from './WaveRing';

class App {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly clock: THREE.Clock;

  private readonly soundSource: SoundSource;
  private readonly particleSystem: ParticleSystem;
  private readonly waveRingManager: WaveRingManager;

  private readonly container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0B1A);
    this.scene.fog = new THREE.Fog(0x0B0B1A, 30, 80);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 8, 20);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0B0B1A, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 2, 0);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGround();

    this.soundSource = new SoundSource();
    this.scene.add(this.soundSource.mesh);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);

    this.waveRingManager = new WaveRingManager();
    this.scene.add(this.waveRingManager.group);

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate = this.animate.bind(this);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x6688aa, 0x0B0B1A, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupGround(): void {
    const gridSize = 80;
    const gridDivisions = 80;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x33FFAA,
      0x33FFAA
    );
    const gridMaterial = gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.15;
    gridHelper.position.y = -0.01;
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(0);
    this.scene.add(axesHelper);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.soundSource.update(delta);
    this.particleSystem.update(delta, this.soundSource.position, this.soundSource.velocity);
    this.waveRingManager.update(delta, this.soundSource.position, this.soundSource.speed);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.animate();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.particleSystem.dispose();
    this.waveRingManager.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

const app = new App();
app.start();

(window as any).__app = app;
