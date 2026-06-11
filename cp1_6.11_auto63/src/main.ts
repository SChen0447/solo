import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityGenerator, type BuildingObject, type CityParams, type BuildingData } from './cityGenerator';
import { UIController, DayNightSystem, type TimeOfDay } from './uiControls';
import { AnimationManager } from './animations';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private cityGenerator: CityGenerator;
  private uiController: UIController;
  private dayNightSystem: DayNightSystem;
  private animationManager: AnimationManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private fpsCounter: HTMLElement | null;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private currentParams: CityParams;
  private isDragging: boolean = false;

  constructor() {
    this.currentParams = {
      buildingCount: 100,
      minHeight: 20,
      maxHeight: 200,
      colorTheme: 'sunset',
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.fpsCounter = document.getElementById('fps-counter');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a2a, 300, 800);

    const container = document.getElementById('canvas-container')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    this.camera.position.set(0, 180, 350);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 100;
    this.controls.maxDistance = 800;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 80, 0);
    this.controls.update();

    this.cityGenerator = new CityGenerator(this.scene);
    this.dayNightSystem = new DayNightSystem(this.scene);
    this.animationManager = new AnimationManager(this.camera, this.controls);

    this.uiController = new UIController(
      {
        onParamsChange: (params) => this.handleParamsChange(params),
        onTimeOfDayChange: (mode) => this.handleTimeOfDayChange(mode),
        onBuildingHeightChange: (building, height) => this.handleBuildingHeightChange(building, height),
        onBuildingColorChange: (building, bottom, top) => this.handleBuildingColorChange(building, bottom, top),
      },
      this.currentParams
    );

    this.cityGenerator.generateCity(this.currentParams);
    this.animationManager.playCameraIntro();
    setTimeout(() => {
      this.animationManager.playBuildingGrowth(this.cityGenerator.getBuildings());
    }, 500);

    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.isDragging = false;
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.buttons > 0) {
        this.isDragging = true;
      }
    });

    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportConfig());
    }

    const importBtn = document.getElementById('import-btn');
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.importConfig(e));
    }

    this.setupDragAndDrop();
  }

  private setupDragAndDrop(): void {
    const container = document.getElementById('canvas-container')!;

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === 'application/json' || file.name.endsWith('.json')) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const data = JSON.parse(ev.target?.result as string) as BuildingData[];
              this.loadBuildingsFromData(data);
            } catch (err) {
              console.error('Failed to parse JSON file:', err);
              alert('无法解析JSON文件');
            }
          };
          reader.readAsText(file);
        }
      }
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const cityGroup = this.cityGenerator.getCityGroup();
    const intersects = this.raycaster.intersectObjects(cityGroup.children, true);

    if (intersects.length > 0) {
      let buildingId: number | null = null;
      for (const intersect of intersects) {
        if (intersect.object.userData?.buildingId !== undefined) {
          buildingId = intersect.object.userData.buildingId;
          break;
        }
        let parent: THREE.Object3D | null = intersect.object;
        while (parent) {
          if (parent.userData?.buildingId !== undefined) {
            buildingId = parent.userData.buildingId;
            break;
          }
          parent = parent.parent;
        }
        if (buildingId !== null) break;
      }

      if (buildingId !== null) {
        const building = this.cityGenerator.findBuildingById(buildingId);
        if (building) {
          const selected = this.cityGenerator.getSelectedBuilding();
          if (selected && selected !== building) {
            this.cityGenerator.deselectBuilding(selected);
            this.animationManager.animateBuildingDeselect(selected);
          }
          if (!building.isSelected) {
            this.cityGenerator.selectBuilding(building);
            this.animationManager.animateBuildingSelect(building);
            this.uiController.showBuildingInfo(building);
          }
        }
      }
    } else {
      const selected = this.cityGenerator.getSelectedBuilding();
      if (selected) {
        this.cityGenerator.deselectBuilding(selected);
        this.animationManager.animateBuildingDeselect(selected);
        this.uiController.hideBuildingInfo();
      }
    }
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handleParamsChange(params: CityParams): void {
    this.currentParams = { ...params };
    this.cityGenerator.generateCity(this.currentParams);
    this.animationManager.playBuildingGrowth(this.cityGenerator.getBuildings());
    const selected = this.cityGenerator.getSelectedBuilding();
    if (selected) {
      this.uiController.hideBuildingInfo();
    }
  }

  private handleTimeOfDayChange(mode: TimeOfDay): void {
    this.dayNightSystem.switchTo(mode);
    this.uiController.setTimeOfDay(mode);
  }

  private handleBuildingHeightChange(building: BuildingObject, height: number): void {
    this.animationManager.animateBuildingHeightChange(building, height, 0.5);
    this.uiController.updateBuildingHeight(height);
  }

  private handleBuildingColorChange(building: BuildingObject, bottom: string, top: string): void {
    this.animationManager.animateBuildingColorChange(building, bottom, top, 0.5);
    this.uiController.updateBuildingColors(bottom, top);
  }

  private exportConfig(): void {
    const data = this.cityGenerator.exportConfig();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `city-skyline-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private importConfig(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BuildingData[];
        this.loadBuildingsFromData(data);
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
        alert('无法解析JSON文件');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private loadBuildingsFromData(data: BuildingData[]): void {
    this.cityGenerator.importConfig(data, this.currentParams);
    this.animationManager.playBuildingGrowth(this.cityGenerator.getBuildings());
    const selected = this.cityGenerator.getSelectedBuilding();
    if (selected) {
      this.uiController.hideBuildingInfo();
    }
  }

  private updateFPS(delta: number): void {
    this.frameCount++;
    this.lastFpsUpdate += delta;

    if (this.lastFpsUpdate >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = 0;

      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
        if (this.currentFps < 25) {
          this.fpsCounter.classList.add('low');
        } else {
          this.fpsCounter.classList.remove('low');
        }
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.dayNightSystem.update(delta, this.uiController.isAutoCycleEnabled());
    this.cityGenerator.setNightMode(this.dayNightSystem.getIsNight());
    this.updateFPS(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.cityGenerator.dispose();
    this.uiController.dispose();
    this.dayNightSystem.dispose();
    this.animationManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
