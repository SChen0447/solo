import * as THREE from 'three';
import { PlanetSystem, PlanetObject } from './planetSystem';

const SPEED_OPTIONS = [0.5, 1, 2, 4];

export class UIController {
  private planetSystem: PlanetSystem;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private simTimeEl: HTMLElement;
  private fpsCounterEl: HTMLElement;
  private speedSlider: HTMLInputElement;
  private planetInfoPanel: HTMLElement;
  private closeInfoBtn: HTMLElement;

  private selectedPlanet: PlanetObject | null = null;

  private frameCount: number = 0;
  private fpsTimeAccumulator: number = 0;
  private currentFps: number = 0;

  constructor(
    planetSystem: PlanetSystem,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.planetSystem = planetSystem;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.simTimeEl = document.getElementById('simulation-time') as HTMLElement;
    this.fpsCounterEl = document.getElementById('fps-counter') as HTMLElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.planetInfoPanel = document.getElementById('planet-info') as HTMLElement;
    this.closeInfoBtn = document.getElementById('close-info') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    document.addEventListener('keydown', (e) => this.onKeyDown(e));

    this.speedSlider.addEventListener('input', () => {
      const index = parseInt(this.speedSlider.value, 10);
      const speed = SPEED_OPTIONS[index] ?? 1;
      this.planetSystem.setTimeSpeed(speed);
    });

    this.closeInfoBtn.addEventListener('click', () => this.closeInfoPanel());

    this.planetInfoPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
      if (
        this.planetInfoPanel.classList.contains('hidden') ||
        this.planetInfoPanel.contains(e.target as Node) ||
        (e.target as HTMLElement).closest('#speed-control')
      ) {
        return;
      }
      this.closeInfoPanel();
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.planetSystem.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let hitObject = intersects[0].object;
      while (hitObject.parent && !meshes.includes(hitObject as THREE.Mesh)) {
        hitObject = hitObject.parent;
      }

      const planet = this.planetSystem.getPlanetByMesh(hitObject);
      if (planet) {
        this.selectPlanet(planet);
        event.stopPropagation();
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeInfoPanel();
    }
  }

  private selectPlanet(planet: PlanetObject): void {
    this.selectedPlanet = planet;
    this.planetSystem.selectPlanet(planet);
    this.showInfoPanel(planet);
  }

  private showInfoPanel(planet: PlanetObject): void {
    const data = planet.data;

    const nameEl = document.getElementById('planet-name') as HTMLElement;
    const periodEl = document.getElementById('planet-period') as HTMLElement;
    const diameterEl = document.getElementById('planet-diameter') as HTMLElement;
    const distanceEl = document.getElementById('planet-distance') as HTMLElement;
    const moonsEl = document.getElementById('planet-moons') as HTMLElement;

    nameEl.textContent = data.nameCn;
    periodEl.textContent = `${data.periodEarthYears} 地球年`;
    diameterEl.textContent = `${data.diameterKm.toLocaleString()} km`;
    distanceEl.textContent = `${data.distanceAu} AU`;
    moonsEl.textContent = `${data.moons} 颗`;

    this.planetInfoPanel.classList.remove('hidden');
  }

  private closeInfoPanel(): void {
    this.selectedPlanet = null;
    this.planetSystem.selectPlanet(null);
    this.planetInfoPanel.classList.add('hidden');
  }

  public update(deltaTime: number): void {
    this.updateSimulationTime();
    this.updateFps(deltaTime);
  }

  private updateSimulationTime(): void {
    const days = Math.floor(this.planetSystem.simulationDays);
    const years = Math.floor(days / 365.25);
    const remainingDays = Math.floor(days % 365.25);

    if (years > 0) {
      this.simTimeEl.textContent = `${years} 年 ${remainingDays} 天`;
    } else {
      this.simTimeEl.textContent = `${days} 地球日`;
    }
  }

  private updateFps(deltaTime: number): void {
    this.frameCount++;
    this.fpsTimeAccumulator += deltaTime;

    if (this.fpsTimeAccumulator >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimeAccumulator);
      this.frameCount = 0;
      this.fpsTimeAccumulator = 0;

      this.fpsCounterEl.textContent = `${this.currentFps} FPS`;

      if (this.currentFps < 25) {
        this.fpsCounterEl.classList.add('warning');
      } else {
        this.fpsCounterEl.classList.remove('warning');
      }
    }
  }
}
