import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WaterSim, type RiverShape } from './waterSim';
import { ObstacleManager } from './obstacleManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private waterSim: WaterSim;
  private obstacleManager: ObstacleManager;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private riverBed!: THREE.Mesh;
  private riverBanks!: THREE.Group;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe0f2fe);
    this.scene.fog = new THREE.Fog(0xe0f2fe, 80, 160);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 35, 45);
    this.camera.lookAt(0, 0, -10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 120;
    this.controls.target.set(0, 0, -10);

    this.setupLights();
    this.setupRiverEnvironment();

    const riverBounds = {
      minX: -12,
      maxX: 12,
      minZ: -48,
      maxZ: 48
    };

    this.waterSim = new WaterSim({
      width: 30,
      length: 100,
      segmentsWidth: 60,
      segmentsLength: 200
    });
    this.scene.add(this.waterSim.mesh);

    this.obstacleManager = new ObstacleManager(
      this.scene,
      this.camera,
      this.renderer,
      riverBounds
    );

    this.obstacleManager.setOnObstaclesChange(() => {
      this.waterSim.setObstacles(this.obstacleManager.getObstaclesInfo());
    });

    this.setupUI();
    this.setupEventListeners();

    this.animate();
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(20, 40, 30);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 150;
    this.directionalLight.shadow.camera.left = -60;
    this.directionalLight.shadow.camera.right = 60;
    this.directionalLight.shadow.camera.top = 60;
    this.directionalLight.shadow.camera.bottom = -60;
    this.scene.add(this.directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.4);
    this.scene.add(hemisphereLight);
  }

  private setupRiverEnvironment(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x90a955,
      roughness: 0.9,
      metalness: 0.1
    });

    const groundPositions = groundGeometry.attributes.position;
    for (let i = 0; i < groundPositions.count; i++) {
      const x = groundPositions.getX(i);
      const y = groundPositions.getY(i);
      const distFromCenter = Math.sqrt(x * x + y * y);
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 1.5;
      groundPositions.setZ(i, noise + distFromCenter * 0.02);
    }
    groundGeometry.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const riverBedGeo = new THREE.PlaneGeometry(28, 98, 1, 1);
    const riverBedMat = new THREE.MeshStandardMaterial({
      color: 0x7c9a6e,
      roughness: 0.8,
      metalness: 0.1
    });
    this.riverBed = new THREE.Mesh(riverBedGeo, riverBedMat);
    this.riverBed.rotation.x = -Math.PI / 2;
    this.riverBed.position.y = -0.8;
    this.riverBed.receiveShadow = true;
    this.scene.add(this.riverBed);

    this.riverBanks = new THREE.Group();

    const bankGeometry = new THREE.BoxGeometry(3, 2, 100);
    const bankMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b8e4e,
      roughness: 0.9
    });

    const leftBank = new THREE.Mesh(bankGeometry, bankMaterial);
    leftBank.position.set(-15, -0.5, 0);
    leftBank.castShadow = true;
    leftBank.receiveShadow = true;
    this.riverBanks.add(leftBank);

    const rightBank = new THREE.Mesh(bankGeometry, bankMaterial);
    rightBank.position.set(15, -0.5, 0);
    rightBank.castShadow = true;
    rightBank.receiveShadow = true;
    this.riverBanks.add(rightBank);

    this.scene.add(this.riverBanks);

    this.addTrees();
  }

  private addTrees(): void {
    const treePositions = [
      [-25, -40], [-28, -30], [-22, -20], [-30, -10],
      [-26, 0], [-23, 10], [-29, 20], [-24, 30], [-27, 40],
      [25, -42], [28, -32], [22, -22], [30, -12],
      [26, -2], [23, 8], [29, 18], [24, 28], [27, 38]
    ];

    for (const [x, z] of treePositions) {
      this.createTree(x, -1, z);
    }
  }

  private createTree(x: number, y: number, z: number): void {
    const treeGroup = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const foliageGeo = new THREE.ConeGeometry(2, 5, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 5;
    foliage.castShadow = true;
    treeGroup.add(foliage);

    const scale = 0.7 + Math.random() * 0.6;
    treeGroup.scale.setScalar(scale);
    treeGroup.position.set(x, y, z);
    treeGroup.rotation.y = Math.random() * Math.PI * 2;

    this.scene.add(treeGroup);
  }

  private setupUI(): void {
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value') as HTMLElement;

    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      this.waterSim.setFlowSpeed(speed);
      speedValue.textContent = speed.toFixed(1) + 'x';
    });

    const btnCircle = document.getElementById('btn-circle') as HTMLButtonElement;
    const btnSquare = document.getElementById('btn-square') as HTMLButtonElement;

    btnCircle.addEventListener('click', () => {
      const mode = this.obstacleManager.getPlaceMode();
      if (mode === 'circle') {
        this.obstacleManager.setPlaceMode('none');
        btnCircle.classList.remove('active');
      } else {
        this.obstacleManager.setPlaceMode('circle');
        btnCircle.classList.add('active');
        btnSquare.classList.remove('active');
      }
    });

    btnSquare.addEventListener('click', () => {
      const mode = this.obstacleManager.getPlaceMode();
      if (mode === 'square') {
        this.obstacleManager.setPlaceMode('none');
        btnSquare.classList.remove('active');
      } else {
        this.obstacleManager.setPlaceMode('square');
        btnSquare.classList.add('active');
        btnCircle.classList.remove('active');
      }
    });

    const shapeSelect = document.getElementById('shape-select') as HTMLSelectElement;
    shapeSelect.addEventListener('change', () => {
      const shape = shapeSelect.value as RiverShape;
      this.waterSim.setRiverShape(shape);
    });

    const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
    const controlPanel = document.getElementById('control-panel') as HTMLElement;

    panelToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('panel-collapsed');
    });

    if (window.innerWidth <= 768) {
      controlPanel.classList.add('panel-collapsed');
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        this.obstacleManager.deleteSelected();
      }
      if (e.key === 'Escape') {
        this.obstacleManager.setPlaceMode('none');
        this.obstacleManager.selectObstacle(null);
        this.updatePlaceButtons();
      }
    });
  }

  private updatePlaceButtons(): void {
    const btnCircle = document.getElementById('btn-circle') as HTMLButtonElement;
    const btnSquare = document.getElementById('btn-square') as HTMLButtonElement;
    const mode = this.obstacleManager.getPlaceMode();

    btnCircle.classList.toggle('active', mode === 'circle');
    btnSquare.classList.toggle('active', mode === 'square');
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.waterSim.update(deltaTime);
    this.obstacleManager.update(deltaTime);
    this.controls.update();

    this.updateWaterLevelGauge();

    this.renderer.render(this.scene, this.camera);
  }

  private updateWaterLevelGauge(): void {
    const gaugeWater = document.getElementById('gauge-water') as HTMLElement;
    const waterLevelValue = document.getElementById('water-level-value') as HTMLElement;

    if (gaugeWater && waterLevelValue) {
      const level = Math.round(this.waterSim.getWaterLevel() * 100);
      gaugeWater.style.height = level + '%';
      waterLevelValue.textContent = level + '%';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
