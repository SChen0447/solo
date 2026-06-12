import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private defaultCameraPosition: THREE.Vector3;
  private defaultTarget: THREE.Vector3;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.defaultCameraPosition = new THREE.Vector3(0, 0, 12);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);
    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupLighting();
    this.setupBackground();
    this.handleResize();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupRenderer(): void {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.sortObjects = true;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.lookAt(this.defaultTarget);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    this.controls.enablePan = false;
    this.controls.target.copy(this.defaultTarget);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-5, -3, -5);
    this.scene.add(fillLight);
  }

  private setupBackground(): void {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;

    const gradient = bgCtx.createRadialGradient(256, 256, 0, 256, 256, 300);
    gradient.addColorStop(0, '#1A2333');
    gradient.addColorStop(1, '#0D1118');

    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 512, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  public removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  public resetCamera(): void {
    this.lerpVector(this.camera.position, this.defaultCameraPosition, 0.5);
    this.lerpVector(this.controls.target, this.defaultTarget, 0.5);
  }

  private lerpVector(current: THREE.Vector3, target: THREE.Vector3, duration: number): void {
    const start = current.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(elapsed / duration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);

      current.lerpVectors(start, target, easeT);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  public onWindowResize(): void {
    this.handleResize();
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public update(deltaTime: number): void {
    this.controls.update();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', () => this.onWindowResize());
    this.renderer.dispose();
    this.controls.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
