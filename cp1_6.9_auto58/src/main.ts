import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PlateSimulator } from './plateSimulator';
import { TerrainEngine } from './terrainEngine';
import { UIController } from './uiController';

class GeologicalSimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private plateSimulator: PlateSimulator;
  private terrainEngine: TerrainEngine;
  private uiController: UIController;

  private currentTime: number = 0;
  private simulationSpeed: number = 1.0;
  private isPlaying: boolean = false;
  private autoTimeStep: number = 10;

  private lastFrameTime: number = 0;
  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFPS: number = 60;

  private groundPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private hemisphereLight: THREE.HemisphereLight;

  private lastTerrainTime: number = -1;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 500, 1500);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / (this.container.clientHeight - 36),
      0.1,
      5000
    );
    this.camera.position.set(0, 300, 400);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight - 36);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 1000;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);

    this.setupLighting();
    this.setupGroundAndGrid();

    this.plateSimulator = new PlateSimulator(this.scene);
    this.terrainEngine = new TerrainEngine(this.scene);
    this.uiController = new UIController(this.scene, this.camera, this.renderer, this.plateSimulator);

    this.setupEventCallbacks();
    this.setupCollisionHandler();
    this.setupResizeHandler();

    this.lastFrameTime = performance.now();
    this.fpsLastTime = performance.now();
    this.animate();
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3d2817, 0.4);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(200, 400, 200);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 1500;
    this.directionalLight.shadow.camera.left = -500;
    this.directionalLight.shadow.camera.right = 500;
    this.directionalLight.shadow.camera.top = 500;
    this.directionalLight.shadow.camera.bottom = -500;
    this.scene.add(this.directionalLight);
  }

  private setupGroundAndGrid(): void {
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.8
    });
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    this.gridHelper = new THREE.GridHelper(2000, 100, 0x2a2a4e, 0x1f1f3f);
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.4;
    this.scene.add(this.gridHelper);
  }

  private setupEventCallbacks(): void {
    this.uiController.setOnTimeChange((time: number) => {
      this.currentTime = time;
      this.updateTerrainForTime(time);
    });

    this.uiController.setOnSpeedChange((speed: number) => {
      this.simulationSpeed = speed;
    });

    this.uiController.setOnPlayChange((playing: boolean) => {
      this.isPlaying = playing;
    });

    this.uiController.setOnReset(() => {
      this.currentTime = 0;
      this.uiController.setTime(0);
      this.terrainEngine.clearAll();
      this.lastTerrainTime = -1;
    });

    this.uiController.setOnTriggerMagma((position: THREE.Vector3) => {
      this.terrainEngine.triggerMagmaEruption(position);
    });

    this.uiController.setOnResetView(() => {
      this.camera.position.set(0, 300, 400);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    });
  }

  private setupCollisionHandler(): void {
    this.plateSimulator.setCollisionCallback((plate1: string, plate2: string, point: THREE.Vector3) => {
      this.terrainEngine.createCollisionMountains(point, 20);
      this.terrainEngine.createCollisionParticles(point);
      this.plateSimulator.triggerShake();
    });
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight - 36;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private updateTerrainForTime(time: number): void {
    const timeBucket = Math.floor(time / 20);
    if (timeBucket === this.lastTerrainTime) return;
    this.lastTerrainTime = timeBucket;

    const plateIds = this.plateSimulator.getAllPlateIds();
    plateIds.forEach(plateId => {
      const state = this.plateSimulator.getPlateState(plateId);
      if (state) {
        this.terrainEngine.generateTerrainAroundPlate(state.position, time);
      }
    });
  }

  private updateAutoPlay(deltaTime: number): void {
    if (!this.isPlaying) return;

    const increment = this.autoTimeStep * this.simulationSpeed * deltaTime;
    this.currentTime = Math.min(this.currentTime + increment, 200);

    if (this.currentTime >= 200) {
      this.currentTime = 200;
      this.isPlaying = false;
      this.uiController.setOnPlayChange?.(false);
    }

    this.uiController.setTime(this.currentTime);
    this.updateTerrainForTime(this.currentTime);
  }

  private updateFPS(deltaTime: number): void {
    this.fpsFrames++;
    if (deltaTime > 0) {
      const elapsed = performance.now() - this.fpsLastTime;
      if (elapsed >= 1000) {
        this.currentFPS = (this.fpsFrames * 1000) / elapsed;
        this.uiController.updateFPS(this.currentFPS);
        this.fpsFrames = 0;
        this.fpsLastTime = performance.now();
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.updateAutoPlay(deltaTime);

    this.plateSimulator.update(this.currentTime, deltaTime, this.simulationSpeed);
    this.terrainEngine.update(deltaTime);

    this.controls.update();
    this.updateFPS(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GeologicalSimulator();
});
