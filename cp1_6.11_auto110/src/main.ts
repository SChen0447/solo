import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CoralSystem } from './coral/CoralSystem';
import { GenotypeController } from './coral/GenotypeController';
import { PostEffect } from './effects/PostEffect';
import './styles/main.css';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private coralSystem: CoralSystem;
  private genotypeController: GenotypeController;
  private postEffect: PostEffect;
  private clock: THREE.Clock;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0a0a14');
    this.scene.fog = new THREE.FogExp2('#0a0a14', 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2 + Math.PI / 6;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.target.set(0, 3, 0);

    this.setupLights();

    this.coralSystem = new CoralSystem(this.scene);

    this.genotypeController = new GenotypeController(
      document.body,
      this.coralSystem
    );

    this.postEffect = new PostEffect(this.scene, this.camera);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xff8855, 1);
    keyLight.position.set(5, 10, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x5555ff, 0.5);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff4488, 0.3);
    rimLight.position.set(0, 8, -8);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0xff6633, 0.8, 15);
    pointLight.position.set(0, 6, 0);
    this.scene.add(pointLight);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.controls.update();
    this.coralSystem.update(deltaTime);
    this.postEffect.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stop();
    this.coralSystem.dispose();
    this.genotypeController.dispose();
    this.postEffect.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

const container = document.getElementById('app') || document.body;
const app = new App(container);
app.start();

(window as any).app = app;
