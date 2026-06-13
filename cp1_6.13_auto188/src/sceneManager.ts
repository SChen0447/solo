import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface MouseState {
  x: number;
  y: number;
  ndcX: number;
  ndcY: number;
  clicking: boolean;
}

export type MouseMoveCallback = (mouse: MouseState) => void;
export type MouseClickCallback = (mouse: MouseState) => void;
export type KeyPressCallback = (key: string) => void;

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  raycaster: THREE.Raycaster;
  mouse: MouseState;
  private mouseMoveCallbacks: MouseMoveCallback[] = [];
  private mouseClickCallbacks: MouseClickCallback[] = [];
  private keyPressCallbacks: KeyPressCallback[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x222222, 200, 600);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    this.camera.position.set(0, 100, 600);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 200;
    this.controls.maxDistance = 1200;

    this.raycaster = new THREE.Raycaster();
    this.mouse = { x: 0, y: 0, ndcX: 0, ndcY: 0, clicking: false };

    this.addLights();
    this.bindEvents();
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0x333344, 0.6);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir1.position.set(200, 300, 200);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x4466aa, 0.3);
    dir2.position.set(-200, -100, -200);
    this.scene.add(dir2);

    const point = new THREE.PointLight(0xffffff, 0.5, 800);
    point.position.set(0, 200, 0);
    this.scene.add(point);
  }

  private bindEvents(): void {
    window.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseMoveCallbacks.forEach((cb) => cb({ ...this.mouse }));
    });

    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouse.clicking = true;
        this.mouse.ndcX = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
        this.mouseClickCallbacks.forEach((cb) => cb({ ...this.mouse }));
      }
    });

    window.addEventListener('mouseup', () => {
      this.mouse.clicking = false;
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keyPressCallbacks.forEach((cb) => cb(e.key));
    });

    window.addEventListener('resize', () => this.onResize());
  }

  onMouseMove(cb: MouseMoveCallback): void {
    this.mouseMoveCallbacks.push(cb);
  }

  onMouseClick(cb: MouseClickCallback): void {
    this.mouseClickCallbacks.push(cb);
  }

  onKeyPress(cb: KeyPressCallback): void {
    this.keyPressCallbacks.push(cb);
  }

  getRayFromMouse(): THREE.Ray {
    const vec = new THREE.Vector2(this.mouse.ndcX, this.mouse.ndcY);
    this.raycaster.setFromCamera(vec, this.camera);
    return this.raycaster.ray;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
    this.controls.dispose();
  }
}
