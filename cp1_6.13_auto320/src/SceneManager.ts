import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;

  private container: HTMLElement;
  private animationFrameId: number = 0;
  private resizeObserver: ResizeObserver;
  private customUpdateCallbacks: (() => void)[] = [];

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.setupLights();
    this.setupResizeObserver();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(45, 55, 65);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 30;
    controls.maxDistance = 180;
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minPolarAngle = Math.PI * 0.12;
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffa060, 0.8);
    directionalLight1.position.set(50, 80, 30);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x6080ff, 0.5);
    directionalLight2.position.set(-40, 60, -50);
    this.scene.add(directionalLight2);

    const pointLight1 = new THREE.PointLight(0x00d2d3, 1.5, 150, 2);
    pointLight1.position.set(0, 40, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xd35400, 1.0, 120, 2);
    pointLight2.position.set(-30, 10, 30);
    this.scene.add(pointLight2);
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  public onUpdate(callback: () => void): void {
    this.customUpdateCallbacks.push(callback);
  }

  public startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.controls.update();
      for (const cb of this.customUpdateCallbacks) {
        cb();
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public dispose(): void {
    this.stopRenderLoop();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).geometry) {
        (obj as THREE.Mesh).geometry.dispose();
      }
      const material = (obj as THREE.Mesh).material;
      if (material) {
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
