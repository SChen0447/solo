import * as THREE from 'three';
import { generateTerrain, createTrees, getHeightAt, TerrainData } from './terrain.js';
import { FireSystem } from './fire.js';
import { UIManager, Minimap } from './ui.js';

class ForestFireApp {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private clock!: THREE.Clock;
  private elapsedTime: number = 0;

  private terrainData!: TerrainData;
  private treesMesh!: THREE.InstancedMesh;
  private fireSystem!: FireSystem;
  private uiManager!: UIManager;
  private minimap!: Minimap;

  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;

  private viewMode: number = 2;
  private camTargetPos: THREE.Vector3 = new THREE.Vector3();
  private camActualPos: THREE.Vector3 = new THREE.Vector3();
  private camTargetLook: THREE.Vector3 = new THREE.Vector3();
  private camActualLook: THREE.Vector3 = new THREE.Vector3();
  private viewTransitionProgress: number = 1;
  private readonly TRANSITION_DURATION: number = 0.4;

  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private camTheta: number = 0;
  private camPhi: number = 0.7;
  private targetCamTheta: number = 0;
  private targetCamPhi: number = 0.7;
  private camDistance: number = 120;
  private targetCamDistance: number = 120;
  private readonly MIN_SCALE: number = 0.3;
  private readonly MAX_SCALE: number = 3.0;
  private readonly BASE_DISTANCE: number = 120;
  private readonly DAMPING: number = 0.12;

  private fireFocusPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private lastMinimapUpdate: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container #${containerId} not found`);
    this.container = container;

    this.init();
    this.createSceneObjects();
    this.setupEventListeners();
    this.animate();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2634);
    this.scene.fog = new THREE.Fog(0x1a2634, 150, 380);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.7);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.1);
    dirLight.position.set(80, 160, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -150;
    dirLight.shadow.camera.right = 150;
    dirLight.shadow.camera.top = 150;
    dirLight.shadow.camera.bottom = -150;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0x404050, 0.25);
    this.scene.add(ambLight);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camTheta = -Math.PI / 4;
    this.targetCamTheta = this.camTheta;
  }

  private createSceneObjects() {
    this.terrainData = generateTerrain(42, 200, 128);
    this.terrainData.mesh.geometry.computeBoundingSphere();
    this.scene.add(this.terrainData.mesh);

    this.treesMesh = createTrees(this.terrainData.treePositions);
    this.treesMesh.frustumCulled = false;
    const bs = new THREE.Sphere(new THREE.Vector3(0, 15, 0), 200);
    this.treesMesh.geometry.boundingSphere = bs;
    this.scene.add(this.treesMesh);

    this.fireSystem = new FireSystem(this.terrainData, 4);
    this.scene.add(this.fireSystem.burnOverlayMesh);
    this.scene.add(this.fireSystem.fireParticlePoints);

    this.uiManager = new UIManager(this.container, {
      onWindSpeedChange: (speed) => {
        this.fireSystem.windSpeed = speed;
      },
      onWindDirectionChange: (angleDeg) => {
        this.fireSystem.windAngle = (angleDeg * Math.PI) / 180;
      },
      onSwitchView: () => {
        this.switchViewMode();
      },
      onReset: () => {
        this.fireSystem.reset();
        this.fireFocusPos.set(0, 0, 0);
      }
    });

    this.minimap = new Minimap(this.container);

    this.fireSystem.windSpeed = this.uiManager.getWindSpeed();
    this.fireSystem.windAngle = (this.uiManager.getWindDirection() * Math.PI) / 180;

    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 10, 0);
    this.camTargetPos.copy(this.camera.position);
    this.camActualPos.copy(this.camera.position);
    this.camTargetLook.set(0, 5, 0);
    this.camActualLook.set(0, 5, 0);
    this.updateCameraFromAngles();
  }

  private setupEventListeners() {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
    this.renderer.domElement.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onPointerDown(e: PointerEvent) {
    this.isDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
    this.targetCamTheta -= dx * 0.005;
    this.targetCamPhi += dy * 0.004;
    this.targetCamPhi = Math.max(0.08, Math.min(1.5, this.targetCamPhi));
  }

  private onPointerUp() {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;
    const baseDist = this.BASE_DISTANCE;
    const minDist = baseDist * this.MIN_SCALE;
    const maxDist = baseDist * this.MAX_SCALE;
    this.targetCamDistance = Math.max(minDist, Math.min(maxDist, this.targetCamDistance * zoomFactor));
  }

  private onClick(e: MouseEvent) {
    if (this.isDragging) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrainData.mesh);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.fireSystem.ignite(point.x, point.z, 3);
      this.fireFocusPos.copy(point);
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      this.switchViewMode();
    }
  }

  private switchViewMode() {
    this.viewMode = (this.viewMode + 1) % 3;
    this.uiManager.setViewMode(this.viewMode);
    this.viewTransitionProgress = 0;
    this.computeViewTargets();
  }

  private computeViewTargets() {
    const focus = this.getCameraFocusPoint();
    let targetPos: THREE.Vector3;
    let targetLook: THREE.Vector3;

    switch (this.viewMode) {
      case 0: {
        const dist = 1.5;
        const height = 6;
        const x = focus.x + Math.sin(this.targetCamTheta) * dist;
        const z = focus.z + Math.cos(this.targetCamTheta) * dist;
        const y = getHeightAt(x, z, this.terrainData) + height;
        targetPos = new THREE.Vector3(x, y, z);
        targetLook = new THREE.Vector3(
          focus.x + Math.sin(this.targetCamTheta) * 50,
          focus.y + 8,
          focus.z + Math.cos(this.targetCamTheta) * 50
        );
        break;
      }
      case 1: {
        const height = 4;
        const offset = 8;
        const x = focus.x - Math.sin(this.targetCamTheta) * offset;
        const z = focus.z - Math.cos(this.targetCamTheta) * offset;
        const y = getHeightAt(x, z, this.terrainData) + height + 8;
        targetPos = new THREE.Vector3(x, y, z);
        targetLook = new THREE.Vector3(focus.x, focus.y + 6, focus.z);
        break;
      }
      case 2:
      default: {
        const dist = this.targetCamDistance;
        const phi = this.targetCamPhi;
        const x = focus.x + dist * Math.sin(phi) * Math.sin(this.targetCamTheta);
        const z = focus.z + dist * Math.sin(phi) * Math.cos(this.targetCamTheta);
        const y = focus.y + dist * Math.cos(phi) + 20;
        targetPos = new THREE.Vector3(x, y, z);
        targetLook = new THREE.Vector3(focus.x, focus.y + 5, focus.z);
        break;
      }
    }

    this.camTargetPos.copy(targetPos);
    this.camTargetLook.copy(targetLook);
  }

  private getCameraFocusPoint(): THREE.Vector3 {
    const positions = this.fireSystem.getAllBurningPositions();
    if (positions.length > 0) {
      let cx = 0, cz = 0;
      for (const p of positions) {
        cx += p.x;
        cz += p.z;
      }
      cx /= positions.length;
      cz /= positions.length;
      this.fireFocusPos.x = cx;
      this.fireFocusPos.z = cz;
      this.fireFocusPos.y = getHeightAt(cx, cz, this.terrainData);
    }
    return this.fireFocusPos;
  }

  private updateCameraFromAngles() {
    if (this.viewMode === 2) {
      this.camTheta += (this.targetCamTheta - this.camTheta) * this.DAMPING;
      this.camPhi += (this.targetCamPhi - this.camPhi) * this.DAMPING;
      this.camDistance += (this.targetCamDistance - this.camDistance) * this.DAMPING;
    } else {
      this.targetCamTheta += (this.targetCamTheta === this.camTheta ? 0 : 0);
      this.camTheta += (this.targetCamTheta - this.camTheta) * this.DAMPING;
    }
    this.computeViewTargets();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCamera(delta: number) {
    this.updateCameraFromAngles();

    if (this.viewTransitionProgress < 1) {
      this.viewTransitionProgress = Math.min(1, this.viewTransitionProgress + delta / this.TRANSITION_DURATION);
    }

    const t = this.easeInOutCubic(Math.min(1, this.viewTransitionProgress));
    this.camActualPos.lerpVectors(this.camActualPos, this.camTargetPos, t < 1 ? 0.08 : 0.15);
    this.camActualLook.lerpVectors(this.camActualLook, this.camTargetLook, t < 1 ? 0.08 : 0.15);

    this.camera.position.copy(this.camActualPos);
    this.camera.lookAt(this.camActualLook);
  }

  private updateMinimap() {
    if (this.elapsedTime - this.lastMinimapUpdate < 0.1) return;
    this.lastMinimapUpdate = this.elapsedTime;

    const gridInfo = this.fireSystem.getGridInfo();
    const burnGrid: { burning: boolean; burnTime: number }[][] = [];
    for (let r = 0; r < gridInfo.rows; r++) {
      burnGrid[r] = [];
      for (let c = 0; c < gridInfo.cols; c++) {
        const cell = this.fireSystem.getBurnCell(r, c);
        burnGrid[r][c] = cell ? { burning: cell.burning, burnTime: cell.burnTime } : { burning: false, burnTime: 0 };
      }
    }

    const camAngle = -this.targetCamTheta + Math.PI / 2;
    const fireFrontSet = this.fireSystem.getAllBurningPositions();
    const fireFrontStr = new Set<string>();
    for (const p of fireFrontSet) {
      const { col, row } = this.fireSystem.worldToGrid(p.x, p.z);
      fireFrontStr.add(`${row},${col}`);
    }

    this.minimap.update(
      this.terrainData.heightField,
      fireFrontStr,
      burnGrid,
      gridInfo.cols,
      gridInfo.rows,
      { x: this.camera.position.x, z: this.camera.position.z },
      camAngle,
      this.terrainData.size
    );
  }

  private updateTreesBurned() {
    // 可扩展：根据燃烧状态修改树木显示
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    const delta = Math.min(0.05, this.clock.getDelta());
    this.elapsedTime += delta;

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = this.fpsFrames / this.fpsTime;
      this.uiManager.updateFPS(fps);
      this.fpsFrames = 0;
      this.fpsTime = 0;
      const fireCount = this.fireSystem.getAllBurningPositions().length;
      this.uiManager.updateFireCount(fireCount);
    }

    this.updateCamera(delta);
    this.fireSystem.update(delta, this.elapsedTime);
    this.updateMinimap();

    this.renderer.render(this.scene, this.camera);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  new ForestFireApp('app');
});
