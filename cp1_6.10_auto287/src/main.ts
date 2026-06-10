import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Terrain } from './terrain';
import { Water } from './water';
import { Particles } from './particles';
import { UIController } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: Terrain;
  private water: Water;
  private particles: Particles;
  private ui: UIController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private lastInteractionTime: number = 0;
  private autoRotateEnabled: boolean = true;
  private autoAngle: number = 0;
  private autoRadius: number = 18;
  private autoHeight: number = 18;
  private targetAutoAngle: number = 0;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f19);
    this.scene.fog = new THREE.FogExp2(0x0b0f19, 0.015);

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
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.terrain = new Terrain(this.scene);
    this.water = new Water(this.scene);
    this.particles = new Particles(this.scene, this.terrain);
    this.ui = new UIController(this.terrain, this.water, this.particles);

    this.ui.setRandomizeCallback(async () => {
      await Promise.all([
        this.terrain.randomize(),
        this.particles.regenerate()
      ]);
    });

    this.setupLights();
    this.setupInitialCamera();
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(-20, 25, -20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -40;
    directionalLight.shadow.camera.right = 40;
    directionalLight.shadow.camera.top = 40;
    directionalLight.shadow.camera.bottom = -40;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.2);
    fillLight.position.set(15, 10, 15);
    this.scene.add(fillLight);
  }

  private setupInitialCamera(): void {
    this.autoAngle = -Math.PI / 4;
    this.targetAutoAngle = this.autoAngle;
    this.updateCameraPosition();
    this.camera.lookAt(0, 0, 0);
  }

  private updateCameraPosition(): void {
    const x = Math.sin(this.autoAngle) * this.autoRadius;
    const z = Math.cos(this.autoAngle) * this.autoRadius;
    this.camera.position.set(x, this.autoHeight, z);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointermove', (e) => {
      this.onPointerMove(e);
      this.recordInteraction();
    });

    canvas.addEventListener('pointerdown', () => {
      this.recordInteraction();
    });

    canvas.addEventListener('wheel', () => {
      this.recordInteraction();
    });

    canvas.addEventListener('click', (e) => {
      this.onClick(e);
      this.recordInteraction();
    });
  }

  private recordInteraction(): void {
    this.lastInteractionTime = performance.now();
    this.autoRotateEnabled = false;
  }

  private onPointerMove(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.terrain.updateCursor(point.x, point.z, true);
    } else {
      this.terrain.updateCursor(0, 0, false);
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.terrain.addPulse(point.x, point.z);
      this.water.addSplash(point.x, point.z);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);
    const now = performance.now();

    if (!this.autoRotateEnabled && now - this.lastInteractionTime > 5000) {
      this.autoRotateEnabled = true;
      const dx = this.camera.position.x;
      const dz = this.camera.position.z;
      this.autoAngle = Math.atan2(dx, dz);
      this.autoRadius = Math.sqrt(dx * dx + dz * dz);
      this.autoHeight = this.camera.position.y;
    }

    if (this.autoRotateEnabled) {
      this.autoAngle += (Math.PI * 2 / 30) * dt;
      this.updateCameraPosition();
    }

    this.controls.update();
    this.terrain.update(dt);
    this.water.update(dt);
    this.particles.update(dt);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
