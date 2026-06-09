import * as THREE from 'three';
import { Garden, FlowerType } from './garden.js';
import { ButterflyManager, ButterflySpecies, BUTTERFLY_SPECIES } from './butterfly.js';
import { UIController } from './ui.js';

class ButterflyGame {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  clock: THREE.Clock;

  garden: Garden;
  butterflyManager: ButterflyManager;
  ui: UIController;

  cameraDistance: number = Math.sqrt(10 * 10 + 12 * 12 + 10 * 10);
  minDistance: number = 5;
  maxDistance: number = 20;
  cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 30, 60);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById('canvas-container');
    if (container) container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.setupLights();

    this.garden = new Garden(this.scene);
    this.butterflyManager = new ButterflyManager(this.scene, this.garden);
    this.ui = new UIController(this);

    this.setupEventListeners();

    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    this.scene.add(sun);
  }

  updateCameraPosition() {
    const dir = new THREE.Vector3(10, 12, 10).normalize();
    const pos = dir.multiplyScalar(this.cameraDistance);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.cameraTarget);
  }

  setupEventListeners() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.handleClick(e.clientX, e.clientY);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + delta * 0.8, this.minDistance, this.maxDistance);
      this.updateCameraPosition();
    }, { passive: false });
  }

  handleClick(clientX: number, clientY: number) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const caught = this.butterflyManager.tryCatch(this.raycaster);
    if (caught) {
      this.ui.onButterflyCaught(caught);
      return;
    }

    const bedHit = this.garden.intersectFlowerBed(this.raycaster);
    if (bedHit !== null) {
      this.ui.openShopForBed(bedHit, clientX, clientY);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start() {
    const animate = () => {
      requestAnimationFrame(animate);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const elapsed = this.clock.elapsedTime;

      this.garden.update(dt, elapsed);
      this.butterflyManager.update(dt, elapsed);

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}

(window as any).game = new ButterflyGame();
(window as any).game.start();

export { ButterflyGame, FlowerType, ButterflySpecies, BUTTERFLY_SPECIES };
