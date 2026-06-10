import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityModule, TimePeriod } from './CityModule';
import { BirdSwarm } from './BirdSwarm';
import { UIPanel, TIME_PERIODS, Bounds } from './UIPanel';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private cityModule: CityModule;
  private birdSwarm: BirdSwarm;
  private uiPanel: UIPanel;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedBuildingId: string | null = null;
  private isDraggingSelection: boolean = false;
  private mouseDownPos: { x: number; y: number } | null = null;
  private stars: THREE.Points | null = null;
  private targetBackground: THREE.Color;
  private currentBackground: THREE.Color;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.targetBackground = new THREE.Color(0x0a0e27);
    this.currentBackground = new THREE.Color(0x0a0e27);

    this.scene = new THREE.Scene();
    this.scene.background = this.currentBackground;
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.006);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(60, 70, 90);
    this.camera.lookAt(0, 15, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0e27, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 180;
    this.controls.target.set(0, 10, 0);

    this.cityModule = new CityModule(this.scene);
    this.birdSwarm = new BirdSwarm(this.scene, this.cityModule);
    this.uiPanel = new UIPanel();

    this.createStars();
    this.cityModule.generateBuildings(25);
    this.birdSwarm.generateFlocks(4, 120);

    this.setupUICallbacks();
    this.setupEventListeners();
    this.applyInitialPeriod();

    this.animate();
  }

  private createStars(): void {
    const starCount = 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 50;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.5 + Math.random() * 0.5;
      const tint = Math.random();
      colors[i * 3] = brightness * (0.8 + tint * 0.2);
      colors[i * 3 + 1] = brightness * (0.85 + tint * 0.15);
      colors[i * 3 + 2] = brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private applyInitialPeriod(): void {
    const nightPeriod = TIME_PERIODS[1];
    this.cityModule.applyTimePeriod(nightPeriod);
    this.birdSwarm.applyTimePeriod(nightPeriod);
    this.targetBackground.copy(nightPeriod.backgroundTint).multiplyScalar(0.15).add(new THREE.Color(0x050818));
  }

  private setupUICallbacks(): void {
    this.uiPanel.onTimeChange((period: TimePeriod, _progress: number) => {
      this.cityModule.applyTimePeriod(period);
      this.birdSwarm.applyTimePeriod(period);
      this.targetBackground.copy(period.backgroundTint).multiplyScalar(0.15).add(new THREE.Color(0x050818));
    });

    this.uiPanel.onColorTempChange((buildingId: string, kelvin: number) => {
      this.cityModule.setBuildingColorTemp(buildingId, kelvin);
    });

    this.uiPanel.onBlinkModeChange((buildingId: string, mode) => {
      this.cityModule.setBuildingBlinkMode(buildingId, mode);
    });

    this.uiPanel.onBrightnessChange((buildingId: string, brightness: number) => {
      this.cityModule.setBuildingBrightness(buildingId, brightness);
    });

    this.uiPanel.onAreaAction((action: 'dim' | 'warm', _bounds: Bounds) => {
      if (action === 'dim') {
        this.cityModule.dimArea(-100, 100, -100, 100);
      } else if (action === 'warm') {
        this.cityModule.warmArea(-100, 100, -100, 100);
      }
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 0) {
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.mouseDownPos) {
        const dx = Math.abs(e.clientX - this.mouseDownPos.x);
        const dy = Math.abs(e.clientY - this.mouseDownPos.y);
        if ((dx > 8 || dy > 8) && !this.isDraggingSelection) {
          if (e.shiftKey || e.ctrlKey) {
            this.isDraggingSelection = true;
            this.controls.enabled = false;
            this.uiPanel.startSelection(this.mouseDownPos.x, this.mouseDownPos.y);
          }
        }
      }

      if (this.isDraggingSelection) {
        this.uiPanel.updateSelection(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('pointerup', (e: PointerEvent) => {
      if (this.isDraggingSelection) {
        const bounds = this.uiPanel.endSelection();
        if (bounds) {
          const worldBounds = this.screenToWorldBounds(bounds);
          if (worldBounds) {
            this.cityModule.dimArea(worldBounds.minX, worldBounds.maxX, worldBounds.minZ, worldBounds.maxZ);
            setTimeout(() => {
              this.cityModule.warmArea(worldBounds.minX, worldBounds.maxX, worldBounds.minZ, worldBounds.maxZ);
            }, 100);
          }
        }
        this.isDraggingSelection = false;
        this.controls.enabled = true;
      } else if (this.mouseDownPos && e.button === 0) {
        const dx = Math.abs(e.clientX - this.mouseDownPos.x);
        const dy = Math.abs(e.clientY - this.mouseDownPos.y);
        if (dx < 5 && dy < 5) {
          this.handleClick(e);
        }
      }
      this.mouseDownPos = null;
    });

    canvas.addEventListener('pointercancel', () => {
      if (this.isDraggingSelection) {
        this.uiPanel.endSelection();
        this.isDraggingSelection = false;
        this.controls.enabled = true;
      }
      this.mouseDownPos = null;
    });
  }

  private screenToWorldBounds(screenBounds: Bounds): Bounds | null {
    const ndc1 = new THREE.Vector2(
      (screenBounds.minX / window.innerWidth) * 2 - 1,
      -(screenBounds.minZ / window.innerHeight) * 2 + 1
    );
    const ndc2 = new THREE.Vector2(
      (screenBounds.maxX / window.innerWidth) * 2 - 1,
      -(screenBounds.maxZ / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(ndc1, this.camera);
    const p1 = new THREE.Vector3();
    this.raycaster.ray.at(50, p1);

    this.raycaster.setFromCamera(ndc2, this.camera);
    const p2 = new THREE.Vector3();
    this.raycaster.ray.at(50, p2);

    return {
      minX: Math.min(p1.x, p2.x),
      maxX: Math.max(p1.x, p2.x),
      minZ: Math.min(p1.z, p2.z),
      maxZ: Math.max(p1.z, p2.z)
    };
  }

  private handleClick(e: PointerEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const building = this.cityModule.getBuildingByMesh(intersects[0].object);
      if (building) {
        if (this.selectedBuildingId !== building.id) {
          this.selectedBuildingId = building.id;
          this.cityModule.highlightBuilding(building.id);
          this.uiPanel.showBuildingPanel(building);
        }
        return;
      }
    }

    this.selectedBuildingId = null;
    this.cityModule.highlightBuilding(null);
    this.uiPanel.hideBuildingPanel();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();
    this.cityModule.update(elapsedTime);
    this.birdSwarm.update(deltaTime);

    this.currentBackground.lerp(this.targetBackground, 0.02);
    (this.scene.background as THREE.Color).copy(this.currentBackground);
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.copy(this.currentBackground);
    }

    if (this.stars) {
      this.stars.rotation.y += deltaTime * 0.005;
    }

    this.uiPanel.updateStats(
      this.birdSwarm.getTotalCount(),
      this.birdSwarm.getAffectedPercentage(),
      this.birdSwarm.getAverageSpeed()
    );

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application();
});
