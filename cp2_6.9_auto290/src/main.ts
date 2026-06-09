import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { SimulationEngine, SimulationParams } from './SimulationEngine';
import { MolecularRenderer } from './MolecularRenderer';
import { EnergyVisualizer } from './EnergyVisualizer';

const DEFAULT_PARAMS: SimulationParams = {
  temperature: 300,
  particleCount: 120,
  moleculeSize: 0.5
};

class MolecularDanceApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private gui: GUI;
  private simulationEngine: SimulationEngine;
  private molecularRenderer: MolecularRenderer;
  private energyVisualizer: EnergyVisualizer;
  private params: SimulationParams;
  private containerWireframe!: THREE.LineSegments;
  private floorGrid!: THREE.GridHelper;
  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private initialCameraPosition!: THREE.Vector3;
  private initialTarget!: THREE.Vector3;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private containerMesh!: THREE.Mesh;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.params = { ...DEFAULT_PARAMS };
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.gui = this.createGUI();

    this.initialCameraPosition = this.camera.position.clone();
    this.initialTarget = this.controls.target.clone();

    this.createLights();
    this.createContainer();
    this.createFloorGrid();

    this.simulationEngine = new SimulationEngine(this.params);
    this.molecularRenderer = new MolecularRenderer(this.scene);
    this.energyVisualizer = new EnergyVisualizer(this.scene);

    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x050510, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 10);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI * 80 / 180;
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private createGUI(): GUI {
    const gui = new GUI({ autoPlace: false, width: 280 });
    document.getElementById('gui-panel')!.appendChild(gui.domElement);

    const controlsFolder = gui.addFolder('参数控制');
    controlsFolder.open();

    controlsFolder
      .add(this.params, 'temperature', 200, 1000, 10)
      .name('温度 (K)')
      .onChange((value: number) => {
        this.simulationEngine.setParams({ temperature: value });
        this.updateDisplay();
      });

    controlsFolder
      .add(this.params, 'particleCount', 60, 200, 1)
      .name('粒子数')
      .onChange((value: number) => {
        this.simulationEngine.setParams({ particleCount: Math.round(value) });
        this.updateDisplay();
      });

    controlsFolder
      .add(this.params, 'moleculeSize', 0.3, 0.8, 0.01)
      .name('分子大小')
      .onChange((value: number) => {
        this.simulationEngine.setParams({ moleculeSize: value });
      });

    return gui;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 15, 10);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00FFFF, 0.8, 30);
    pointLight1.position.set(7, 4, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFF6600, 0.4, 25);
    pointLight2.position.set(-7, -4, 5);
    this.scene.add(pointLight2);
  }

  private createContainer(): void {
    const size = 10;
    const half = size / 2;

    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
    const material = new THREE.LineBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.6
    });
    this.containerWireframe = new THREE.LineSegments(geometry, material);
    this.scene.add(this.containerWireframe);

    const boxGeometry = new THREE.BoxGeometry(size, size, size);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    this.containerMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    this.scene.add(this.containerMesh);
  }

  private createFloorGrid(): void {
    this.floorGrid = new THREE.GridHelper(10, 10, 0x00FFFF, 0x00FFFF);
    this.floorGrid.position.y = -5;
    (this.floorGrid.material as THREE.Material).transparent = true;
    (this.floorGrid.material as THREE.Material).opacity = 0.2;
    this.scene.add(this.floorGrid);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('dblclick', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const intersects = this.raycaster.intersectObject(this.containerMesh);
      if (intersects.length > 0) {
        this.resetCamera();
      }
    });
  }

  private resetCamera(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPos = this.initialCameraPosition.clone();
    const endTarget = this.initialTarget.clone();
    const duration = 800;
    const startTime = performance.now();

    const animateCamera = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, endPos, easeT);
      this.controls.target.lerpVectors(startTarget, endTarget, easeT);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateDisplay(): void {
    const tempEl = document.getElementById('temp-display');
    const countEl = document.getElementById('count-display');
    const energyEl = document.getElementById('energy-display');

    if (tempEl) tempEl.textContent = `${Math.round(this.simulationEngine.getTemperature())} K`;
    if (countEl) countEl.textContent = `${this.simulationEngine.getParticleCount()}`;
    if (energyEl) energyEl.textContent = this.simulationEngine.getAverageKineticEnergy().toFixed(4);
  }

  private updateFloorGridIntensity(): void {
    const temp = this.simulationEngine.getTemperature();
    const normalizedTemp = (temp - 200) / (1000 - 200);
    const opacity = 0.15 + normalizedTemp * 0.35;
    (this.floorGrid.material as THREE.Material).opacity = opacity;
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = this.frameCount * 1000 / (now - this.lastFpsUpdate);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        fpsEl.textContent = `FPS: ${fps.toFixed(0)}`;
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.simulationEngine.update(deltaTime);

    const molecules = this.simulationEngine.getMolecules();
    const collisions = this.simulationEngine.getCollisions();
    this.molecularRenderer.update(molecules, collisions);

    const energies = this.simulationEngine.getKineticEnergies();
    const avgEnergy = this.simulationEngine.getAverageKineticEnergy();
    const maxEnergy = this.simulationEngine.getMaxKineticEnergy();
    this.energyVisualizer.update(energies, avgEnergy, maxEnergy);

    this.updateFloorGridIntensity();
    this.updateDisplay();
    this.updateFPS();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.gui.destroy();
    this.molecularRenderer.dispose();
    this.energyVisualizer.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MolecularDanceApp();
});
