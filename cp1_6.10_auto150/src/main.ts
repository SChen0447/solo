import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainManager, type MarkerData } from './terrain';
import { Building, type BuildingParams, type ColorScheme } from './building';
import { UIManager } from './ui';

class CitySimulatorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: TerrainManager;
  private ui: UIManager;
  private buildings: Building[] = [];
  private globalParams: BuildingParams = {
    growthSpeed: 0.5,
    maxFloors: 6,
    colorScheme: 'gray'
  };
  private activeMarker: MarkerData | null = null;
  private readonly MAX_BUILDINGS = 60;
  private animationId: number = 0;
  private container: HTMLElement;
  private isMouseDown: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(21.2, 21.2, 21.2);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    this.setupLights();

    this.terrain = new TerrainManager(this.scene);

    this.ui = new UIManager({
      onGrowthSpeedChange: (speed) => this.handleGrowthSpeedChange(speed),
      onMaxFloorsChange: (floors) => this.handleMaxFloorsChange(floors),
      onColorSchemeChange: (scheme) => this.handleColorSchemeChange(scheme),
      onGrowAll: () => this.handleGrowAll(),
      onClearAll: () => this.handleClearAll(),
      onPopupBuild: () => this.handlePopupBuild(),
      onPopupDelete: () => this.handlePopupDelete(),
      onPopupCancel: () => this.handlePopupCancel()
    });

    this.bindInputEvents();
    window.addEventListener('resize', () => this.onWindowResize());

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(20, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    this.scene.add(directionalLight);
  }

  private bindInputEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.mouseDownTime = performance.now();
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.isMouseDown) {
        this.isMouseDown = false;
        const elapsed = performance.now() - this.mouseDownTime;
        const dx = Math.abs(e.clientX - this.mouseDownPos.x);
        const dy = Math.abs(e.clientY - this.mouseDownPos.y);

        if (elapsed < 300 && dx < 5 && dy < 5) {
          this.handleClick(e);
        }
      }
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private handleClick(event: MouseEvent): void {
    if (this.ui.isPopupVisible()) {
      return;
    }

    const clickedMarker = this.terrain.intersectMarker(event, this.camera);
    if (clickedMarker) {
      this.activeMarker = clickedMarker;
      this.ui.showPopup(event.clientX, event.clientY);
      return;
    }

    const point = this.terrain.intersectGround(event, this.camera);
    if (point) {
      if (this.activeMarker) {
        this.activeMarker = null;
      }
      this.terrain.addMarker(point);
    }
  }

  private handleGrowthSpeedChange(speed: number): void {
    this.globalParams.growthSpeed = speed;
  }

  private handleMaxFloorsChange(floors: number): void {
    this.globalParams.maxFloors = floors;
  }

  private handleColorSchemeChange(scheme: ColorScheme): void {
    this.globalParams.colorScheme = scheme;
  }

  private handleGrowAll(): void {
    for (const building of this.buildings) {
      if (!building.isCompleted && !building.isFading) {
        building.growOneFloorFast();
      }
    }
  }

  private handleClearAll(): void {
    this.terrain.clearMarkers();
    this.activeMarker = null;
    for (const building of this.buildings) {
      building.startFade();
    }
  }

  private handlePopupBuild(): void {
    if (this.activeMarker) {
      if (this.buildings.length >= this.MAX_BUILDINGS) {
        this.ui.showHint(`建筑数量已达上限 (${this.MAX_BUILDINGS})，最远建筑将被隐藏`);
      }

      const building = new Building(
        this.scene,
        this.activeMarker.position,
        { ...this.globalParams }
      );
      this.buildings.push(building);
      this.terrain.removeMarker(this.activeMarker.id);
      this.activeMarker = null;
      this.updateBuildingVisibility();
    }
  }

  private handlePopupDelete(): void {
    if (this.activeMarker) {
      this.terrain.removeMarker(this.activeMarker.id);
      this.activeMarker = null;
    }
  }

  private handlePopupCancel(): void {
    this.activeMarker = null;
  }

  private updateBuildingVisibility(): void {
    if (this.buildings.length <= this.MAX_BUILDINGS) {
      for (const b of this.buildings) {
        b.setVisible(true);
      }
      return;
    }

    const sorted = [...this.buildings].sort((a, b) => {
      const distA = this.camera.position.distanceTo(a.group.position);
      const distB = this.camera.position.distanceTo(b.group.position);
      return distA - distB;
    });

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].setVisible(i < this.MAX_BUILDINGS);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const now = performance.now();

    this.controls.update();

    this.buildings = this.buildings.filter((building) => building.update(now));

    this.updateBuildingVisibility();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CitySimulatorApp();
});
