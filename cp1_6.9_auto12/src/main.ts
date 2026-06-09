import * as THREE from 'three';
import { DataManager } from './DataManager';
import { BuildingSystem } from './BuildingSystem';
import { UIController } from './UIController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private dataManager: DataManager;
  private buildingSystem: BuildingSystem;
  private uiController: UIController;

  private isPointerLocked = false;
  private yaw = 0;
  private pitch = -0.35;
  private cameraOrbitRadius = 140;
  private orbitTarget = new THREE.Vector3(0, 15, 0);

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private keys: Record<string, boolean> = {};
  private velocity = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();

  private firstPersonMode = false;
  private fpCameraPos = new THREE.Vector3(0, 8, 120);
  private fpYaw = Math.PI;
  private fpPitch = -0.15;
  private readonly MOVE_SPEED = 60;
  private readonly CAMERA_HEIGHT = 6;
  private readonly COLLISION_RADIUS = 2;

  private buildingBoxes: { id: string; box: THREE.Box3 }[] = [];
  private prevTime = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.Fog(0x0a0e1a, 150, 400);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.dataManager = new DataManager();
    this.buildingSystem = new BuildingSystem(this.scene, this.camera, this.renderer);
    this.uiController = new UIController({
      dataManager: this.dataManager,
      buildingSystem: this.buildingSystem
    });

    this.initLights();
    this.initGround();
    this.setupEvents();
    this.updateOrbitCamera();

    this.init().catch(err => console.error('[App] init failed:', err));
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x3a4a7a, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x6a8aff, 0x1a2040, 0.35);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(60, 90, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -150;
    dir.shadow.camera.right = 150;
    dir.shadow.camera.top = 150;
    dir.shadow.camera.bottom = -150;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 350;
    dir.shadow.bias = -0.0005;
    this.scene.add(dir);

    const point1 = new THREE.PointLight(0x00d4ff, 0.5, 200);
    point1.position.set(-80, 30, -80);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0x7b61ff, 0.4, 200);
    point2.position.set(80, 30, 80);
    this.scene.add(point2);
  }

  private initGround(): void {
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e1a,
      metalness: 0.1,
      roughness: 0.9,
      transparent: true,
      opacity: 0.98
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridSize = 500;
    const gridDivisions = 80;
    const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x1a2a4a, 0x142040);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    grid.position.y = 0.02;
    this.scene.add(grid);

    const strongGrid = new THREE.GridHelper(gridSize, 10, 0x2a4a8a, 0x1a3060);
    (strongGrid.material as THREE.Material).transparent = true;
    (strongGrid.material as THREE.Material).opacity = 0.35;
    strongGrid.position.y = 0.03;
    this.scene.add(strongGrid);
  }

  private async init(): Promise<void> {
    await this.dataManager.loadData();
    const data = this.dataManager.getProcessedData();
    this.buildingSystem.buildScene(data);
    this.buildingBoxes = this.buildingSystem.getBuildingAABBs();

    this.buildingSystem.setOnBuildingClick((id, pos) => {
      this.uiController.showInfoCard(id, pos);
    });

    this.dataManager.onDataUpdate((processed) => {
      this.buildingSystem.updateData(processed);
    });

    this.animate(performance.now());
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      dom.setPointerCapture(e.pointerId);
    });

    dom.addEventListener('pointermove', (e) => {
      if (this.isDragging && !this.firstPersonMode) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.yaw -= dx * 0.005;
        this.pitch = Math.max(-1.2, Math.min(0.2, this.pitch - dy * 0.004));
        this.updateOrbitCamera();
      }
    });

    dom.addEventListener('pointerup', (e) => {
      this.isDragging = false;
      try { dom.releasePointerCapture(e.pointerId); } catch {}
    });

    dom.addEventListener('wheel', (e) => {
      if (this.firstPersonMode) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      this.cameraOrbitRadius = Math.max(40, Math.min(350, this.cameraOrbitRadius * factor));
      this.updateOrbitCamera();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyV') {
        this.toggleFirstPerson();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  private toggleFirstPerson(): void {
    this.firstPersonMode = !this.firstPersonMode;
    if (this.firstPersonMode) {
      this.fpCameraPos.copy(this.camera.position);
      this.fpCameraPos.y = this.CAMERA_HEIGHT;
      this.fpYaw = this.yaw + Math.PI;
      this.fpPitch = -this.pitch;
    } else {
      this.updateOrbitCamera();
    }
  }

  private updateOrbitCamera(): void {
    const x = this.orbitTarget.x + this.cameraOrbitRadius * Math.cos(this.pitch) * Math.sin(this.yaw);
    const y = this.orbitTarget.y + this.cameraOrbitRadius * Math.sin(this.pitch);
    const z = this.orbitTarget.z + this.cameraOrbitRadius * Math.cos(this.pitch) * Math.cos(this.yaw);
    this.camera.position.set(x, Math.max(5, y), z);
    this.camera.lookAt(this.orbitTarget);
  }

  private updateFirstPerson(dt: number): void {
    const forward = new THREE.Vector3(
      -Math.sin(this.fpYaw) * Math.cos(this.fpPitch),
      Math.sin(this.fpPitch),
      -Math.cos(this.fpYaw) * Math.cos(this.fpPitch)
    );
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(forward);
    if (this.keys['KeyS']) move.sub(forward);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.MOVE_SPEED * dt);
      const testPos = this.fpCameraPos.clone();

      testPos.x += move.x;
      if (!this.checkCollision(testPos)) {
        this.fpCameraPos.x = testPos.x;
      }

      testPos.copy(this.fpCameraPos);
      testPos.z += move.z;
      if (!this.checkCollision(testPos)) {
        this.fpCameraPos.z = testPos.z;
      }
    }

    this.fpCameraPos.y = this.CAMERA_HEIGHT;
    this.fpCameraPos.x = Math.max(-240, Math.min(240, this.fpCameraPos.x));
    this.fpCameraPos.z = Math.max(-240, Math.min(240, this.fpCameraPos.z));

    this.camera.position.copy(this.fpCameraPos);
    const lookTarget = this.fpCameraPos.clone().add(
      new THREE.Vector3(
        -Math.sin(this.fpYaw) * Math.cos(this.fpPitch),
        Math.sin(this.fpPitch),
        -Math.cos(this.fpYaw) * Math.cos(this.fpPitch)
      )
    );
    this.camera.lookAt(lookTarget);
  }

  private checkCollision(pos: THREE.Vector3): boolean {
    for (const { box } of this.buildingBoxes) {
      const expanded = box.clone().expandByScalar(this.COLLISION_RADIUS);
      expanded.max.y = Infinity;
      if (expanded.containsPoint(new THREE.Vector3(pos.x, this.CAMERA_HEIGHT / 2, pos.z))) {
        return true;
      }
    }
    return false;
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    const baseFov = 55;
    const aspectFactor = Math.max(0.8, Math.min(1.1, w / h / 1.777));
    this.camera.fov = baseFov / aspectFactor;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.uiController.handleResize();
  }

  private animate = (now: number): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;

    if (this.firstPersonMode) {
      this.updateFirstPerson(dt);
    }

    this.buildingSystem.animate(now);
    this.uiController.animate(now);
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
