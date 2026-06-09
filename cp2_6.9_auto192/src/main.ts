import * as THREE from 'three';
import { NetworkGraph } from './NetworkGraph';
import { Controls } from './controls';

const DEFAULT_DISTANCE = 15;
const DEFAULT_ROTATION_Y = 0;
const DEFAULT_PITCH = 30;
const MIN_DISTANCE = 5;
const MAX_DISTANCE = 30;
const MIN_ROTATION_X = -45;
const MAX_ROTATION_X = 45;
const MIN_ROTATION_Y = -180;
const MAX_ROTATION_Y = 180;
const AUTO_ROTATE_SPEED = 0.5;
const IDLE_RESUME_DELAY = 10000;

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private graph!: NetworkGraph;

  private distance = DEFAULT_DISTANCE;
  private rotationY = DEFAULT_ROTATION_Y;
  private rotationX = DEFAULT_PITCH;

  private targetDistance = DEFAULT_DISTANCE;
  private targetRotationY = DEFAULT_ROTATION_Y;
  private targetRotationX = DEFAULT_PITCH;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private autoRotate = true;
  private idleTimer: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    if (!this.container) {
      throw new Error('Canvas container not found');
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGraph();
    this.setupControls();
    this.setupCameraEvents();
    this.setupWindowEvents();
    this.updateCameraPosition();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4ecdc4, 0.6, 50);
    pointLight1.position.set(-15, 10, -15);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.4, 50);
    pointLight2.position.set(15, -10, 15);
    this.scene.add(pointLight2);
  }

  private setupGraph(): void {
    this.graph = new NetworkGraph(this.container, this.scene, this.camera);

    this.graph.onNodeHover((_node, x, y) => {
      this.graph.updateTooltipPosition(x, y);
    });
  }

  private setupControls(): void {
    new Controls({
      onRelayout: () => {
        this.graph.relayout();
        this.markInteraction();
      },
      onDensityChange: (density: number) => {
        this.graph.setLineDensity(density);
        this.markInteraction();
      },
      onCategoryFilter: (category) => {
        this.graph.filterNodes(category);
        this.markInteraction();
      },
    });
  }

  private setupCameraEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('dblclick', this.onDoubleClick.bind(this));

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private setupWindowEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.markInteraction();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.targetRotationY += deltaX * 0.3;
    this.targetRotationX += deltaY * 0.3;

    this.targetRotationY = Math.max(MIN_ROTATION_Y, Math.min(MAX_ROTATION_Y, this.targetRotationY));
    this.targetRotationX = Math.max(MIN_ROTATION_X, Math.min(MAX_ROTATION_X, this.targetRotationX));

    this.markInteraction();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetDistance += e.deltaY * 0.02;
    this.targetDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.targetDistance));
    this.markInteraction();
  }

  private onDoubleClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    this.targetDistance = DEFAULT_DISTANCE;
    this.targetRotationY = DEFAULT_ROTATION_Y;
    this.targetRotationX = DEFAULT_PITCH;
    this.markInteraction();
  }

  private onTouchStart(e: TouchEvent): void {
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.markInteraction();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;
    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;

    this.targetRotationY += deltaX * 0.3;
    this.targetRotationX += deltaY * 0.3;

    this.targetRotationY = Math.max(MIN_ROTATION_Y, Math.min(MAX_ROTATION_Y, this.targetRotationY));
    this.targetRotationX = Math.max(MIN_ROTATION_X, Math.min(MAX_ROTATION_X, this.targetRotationX));

    this.markInteraction();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private markInteraction(): void {
    this.autoRotate = false;

    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
    }

    this.idleTimer = window.setTimeout(() => {
      this.autoRotate = true;
    }, IDLE_RESUME_DELAY);
  }

  private updateCameraPosition(): void {
    const radX = THREE.MathUtils.degToRad(this.rotationX);
    const radY = THREE.MathUtils.degToRad(this.rotationY);

    this.camera.position.x = this.distance * Math.cos(radX) * Math.sin(radY);
    this.camera.position.y = this.distance * Math.sin(radX);
    this.camera.position.z = this.distance * Math.cos(radX) * Math.cos(radY);

    this.camera.lookAt(0, 0, 0);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    if (this.autoRotate && !this.isDragging) {
      this.targetRotationY += AUTO_ROTATE_SPEED * delta;
      if (this.targetRotationY > MAX_ROTATION_Y) {
        this.targetRotationY = MIN_ROTATION_Y;
      }
    }

    const smoothFactor = 1 - Math.pow(0.001, delta);
    this.distance += (this.targetDistance - this.distance) * smoothFactor;
    this.rotationY += (this.targetRotationY - this.rotationY) * smoothFactor;
    this.rotationX += (this.targetRotationX - this.rotationX) * smoothFactor;

    this.updateCameraPosition();

    this.graph.update(delta);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
