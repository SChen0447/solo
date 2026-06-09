import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CrystalSimulator } from './CrystalSimulator';
import { ControlPanel } from './ControlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private simulator: CrystalSimulator;
  private controlPanel: ControlPanel;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private solutionSphere: THREE.Mesh;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0F0F23);
    this.scene.fog = new THREE.FogExp2(0x0F0F23, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);

    this.setupLights();
    this.setupEnvironment();

    this.simulator = new CrystalSimulator(this.scene);

    this.solutionSphere = this.createSolutionSphere();
    this.scene.add(this.solutionSphere);

    this.controlPanel = new ControlPanel({
      onTemperatureChange: (value) => this.simulator.setTemperature(value),
      onSaturationChange: (value) => this.simulator.setSaturation(value),
      onStirSpeedChange: (value) => this.simulator.setStirSpeed(value),
      onCrystalTypeChange: (type) => this.simulator.setCrystalType(type)
    });

    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4FC3F7, 0.5, 30);
    pointLight1.position.set(-5, 3, -5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x9C27B0, 0.3, 30);
    pointLight2.position.set(5, -3, 5);
    this.scene.add(pointLight2);
  }

  private setupEnvironment(): void {
    const gridHelper = new THREE.GridHelper(10, 20, 0x1A1A3A, 0x1A1A3A);
    gridHelper.position.y = -5;
    this.scene.add(gridHelper);
  }

  private createSolutionSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(4, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x4FC3F7,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 100
    });
    const sphere = new THREE.Mesh(geometry, material);
    return sphere;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.solutionSphere);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.simulator.addSeed(point);
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.simulator.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
