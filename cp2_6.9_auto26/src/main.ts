import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlanetSystem, PlanetObject } from './PlanetSystem';
import { UI } from './UI';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private planetSystem!: PlanetSystem;
  private ui!: UI;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedPlanet: PlanetObject | null = null;
  private labelContainer!: HTMLDivElement;

  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLabelContainer();
    this.initPlanetSystem();
    this.initUI();
    this.initEvents();

    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
  }

  private initCamera(): void {
    const container = document.getElementById('three-container')!;
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 40, 80);
  }

  private initRenderer(): void {
    const container = document.getElementById('three-container')!;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI * 0.9;
  }

  private initLabelContainer(): void {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    document.getElementById('app')!.appendChild(this.labelContainer);
  }

  private initPlanetSystem(): void {
    this.planetSystem = new PlanetSystem(this.scene, this.camera, this.labelContainer);
  }

  private initUI(): void {
    this.ui = new UI({
      onSpeedChange: (speed: number) => {
        this.planetSystem.setSpeed(speed);
      },
      onOrbitToggle: (visible: boolean) => {
        this.planetSystem.toggleOrbits(visible);
      },
      onCardClose: () => {
        this.selectedPlanet = null;
      }
    });
  }

  private initEvents(): void {
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });

    this.renderer.domElement.addEventListener('click', (e) => {
      this.onMouseClick(e);
    });
  }

  private onWindowResize(): void {
    const container = document.getElementById('three-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const planetMeshes = this.planetSystem.getPlanetMeshes();
    const intersects = this.raycaster.intersectObjects(planetMeshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const planet = this.planetSystem.findPlanetByMesh(clickedMesh);
      if (planet) {
        this.selectedPlanet = planet;
        this.ui.showInfoCard(planet.data);
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.controls.update();
    this.planetSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
