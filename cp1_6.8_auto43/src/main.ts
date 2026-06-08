import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BuildingManager } from './BuildingManager';
import type { BuildingStyle, BuildingStats } from './BuildingManager';
import { UIPanel } from './UIPanel';

class CityBuilderApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private buildingManager: BuildingManager;
  private uiPanel: UIPanel;
  private groundPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private mouse = new THREE.Vector2();
  private clock = new THREE.Clock();
  private frameCount = 0;
  private lastFrameTime = 0;
  private fps = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.groundPlane = this.createGroundPlane();
    this.gridHelper = this.createGridHelper();
    this.buildingManager = new BuildingManager(this.scene, this.groundPlane);
    this.uiPanel = new UIPanel();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupScene();
    this.setupControls();
    this.setupEventListeners();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }
  }

  private setupCamera(): void {
    this.camera.position.set(25, 20, 25);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(20, 30, 15);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 80;
    dirLight1.shadow.camera.left = -35;
    dirLight1.shadow.camera.right = 35;
    dirLight1.shadow.camera.top = 35;
    dirLight1.shadow.camera.bottom = -35;
    dirLight1.shadow.bias = -0.0005;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8899cc, 0.4);
    dirLight2.position.set(-15, 20, -20);
    this.scene.add(dirLight2);

    const hemiLight = new THREE.HemisphereLight(0x8899cc, 0x334455, 0.3);
    this.scene.add(hemiLight);
  }

  private setupScene(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    this.scene.fog = new THREE.Fog(0x16213e, 40, 80);

    this.scene.add(this.groundPlane);
    this.scene.add(this.gridHelper);
  }

  private createGroundPlane(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(80, 80);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a2540,
      roughness: 0.9,
      metalness: 0.1
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    return plane;
  }

  private createGridHelper(): THREE.GridHelper {
    const grid = new THREE.GridHelper(60, 60, 0x3a4a6a, 0x2a3a5a);
    grid.position.y = 0.01;
    return grid;
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0, 0);
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    this.uiPanel.addEventListener('styleChange', ((e: CustomEvent) => {
      const style = e.detail.style as BuildingStyle;
      this.buildingManager.setStyle(style);
    }) as EventListener);

    this.uiPanel.addEventListener('heightChange', ((e: CustomEvent) => {
      const { min, max } = e.detail;
      this.buildingManager.setHeightRange(min, max);
    }) as EventListener);

    this.uiPanel.addEventListener('clearAll', (() => {
      this.buildingManager.clearAll();
    }) as EventListener);

    this.buildingManager.addEventListener('statsChange', ((e: CustomEvent) => {
      this.uiPanel.updateStats(e.detail as BuildingStats);
    }) as EventListener);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(event: MouseEvent): void {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('.city-toolbar') || target.closest('.fps-counter') || target.closest('.instructions')) {
      return;
    }

    this.buildingManager.placeBuilding(this.mouse, this.camera);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.buildingManager.update(delta, elapsedTime, this.camera);
    this.buildingManager.updatePreview(this.mouse, this.camera);

    this.updateFPS(delta);

    this.renderer.render(this.scene, this.camera);
  }

  private updateFPS(delta: number): void {
    this.frameCount++;
    this.lastFrameTime += delta;

    if (this.lastFrameTime >= 0.5) {
      this.fps = this.frameCount / this.lastFrameTime;
      this.frameCount = 0;
      this.lastFrameTime = 0;
      this.uiPanel.updateFPS(this.fps);
    }
  }
}

new CityBuilderApp();
