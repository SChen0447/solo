import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MagnetSystem } from './MagnetSystem';
import { FieldSystem } from './FieldSystem';
import { UIControls } from './uiControls';

class App {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private magnetSystem: MagnetSystem;
  private fieldSystem: FieldSystem;
  private uiControls: UIControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();
  private resizeObserver?: ResizeObserver;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initLights();
    this.initSystems();
    this.initUI();
    this.initEvents();
    this.animate();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.setupGradientBackground();
  }

  private setupGradientBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0e1a');
    gradient.addColorStop(1, '#12172e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 4, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.enablePan = false;
  }

  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff3b3b, 0.4);
    dirLight1.position.set(-5, 3, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b6bff, 0.4);
    dirLight2.position.set(5, 3, -5);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x6a8aff, 0.8, 30);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  private initSystems(): void {
    this.magnetSystem = new MagnetSystem();
    this.scene.add(this.magnetSystem.group);

    this.fieldSystem = new FieldSystem(this.magnetSystem);
    this.scene.add(this.fieldSystem.points);
  }

  private initUI(): void {
    this.uiControls = new UIControls();
    this.uiControls.mount(document.body);

    this.uiControls.on('flipPolarity', () => {
      this.flipPolarity();
    });

    this.uiControls.on('particleCountChange', (count: number) => {
      this.fieldSystem.setParticleCount(count);
    });
  }

  private initEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
      this.resizeObserver.observe(this.container);
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.isDragging = false;
    this.mouseDownPos.set(event.clientX, event.clientY);
  }

  private onPointerMove(event: PointerEvent): void {
    if (this.mouseDownPos.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) {
      this.isDragging = true;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (this.magnetSystem.checkClick(intersects)) {
      this.flipPolarity();
    }
  }

  private flipPolarity(): void {
    this.magnetSystem.flipPolarity();
    this.fieldSystem.flipField();
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.magnetSystem.update(delta);
    this.fieldSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.fieldSystem.dispose();
    this.renderer.dispose();
    this.uiControls.unmount();
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
