import * as THREE from 'three';
import { CloudParticleSystem } from './CloudParticleSystem';
import { ControlPanel } from './ControlPanel';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cloudSystem: CloudParticleSystem;
  private controlPanel: ControlPanel;

  private isRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraRadius: number = 25;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 10, 0);

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private container: HTMLElement;

  private minTheta: number = 0;
  private maxTheta: number = Math.PI * 2;
  private minPhi: number = (60 * Math.PI) / 180;
  private maxPhi: number = (120 * Math.PI) / 180;
  private minRadius: number = 5;
  private maxRadius: number = 50;

  private frameCount: number = 0;
  private lastFpsUpdate: number = performance.now();

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      throw new Error('Container element #app not found');
    }

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer = this.createRenderer();
    this.scene = this.createScene();
    this.camera = this.createCamera();

    this.cloudSystem = new CloudParticleSystem(this.scene);

    this.controlPanel = new ControlPanel({
      onDensityChange: (v) => this.cloudSystem.setDensity(v),
      onHeightChange: (v) => this.cloudSystem.setHeight(v),
      onColorChange: (hex) => this.cloudSystem.setColor(hex),
      onFlowSpeedChange: (v) => this.cloudSystem.setFlowSpeed(v),
      onResetCamera: () => this.resetCamera()
    });

    this.setupEventListeners();
    this.animate();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87ceeb, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(0.5, '#a8d8f0');
    gradient.addColorStop(1, '#cce5ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    return this.camera;
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private resetCamera(): void {
    this.cameraRadius = 25;
    this.cameraTheta = Math.PI / 4;
    this.cameraPhi = Math.PI / 3;
    this.cameraTarget.set(0, 10, 0);
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isRotating = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    document.addEventListener('mouseup', () => {
      this.isRotating = false;
      canvas.style.cursor = 'grab';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isRotating) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.cameraTheta -= deltaX * 0.005;
        this.cameraTheta = Math.max(this.minTheta, Math.min(this.maxTheta, this.cameraTheta));

        this.cameraPhi -= deltaY * 0.005;
        this.cameraPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.cameraPhi));

        this.updateCameraPosition();
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    canvas.style.cursor = 'grab';

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      this.cameraRadius += delta;
      this.cameraRadius = Math.max(this.minRadius, Math.min(this.maxRadius, this.cameraRadius));
      this.updateCameraPosition();
    }, { passive: false });

    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.cloudSystem.getParticles());

      if (intersects.length > 0 && intersects[0].index !== undefined) {
        this.cloudSystem.selectParticle(intersects[0].index);
        this.controlPanel.updateParticleInfo(this.cloudSystem.getSelectedParticleInfo());
      } else {
        this.cloudSystem.deselectParticle();
        this.controlPanel.updateParticleInfo(null);
      }
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.cloudSystem.update();

    const info = this.cloudSystem.getSelectedParticleInfo();
    if (info) {
      this.controlPanel.updateParticleInfo(info);
    }

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate));
      if (fps < 40) {
        console.warn(`FPS below target: ${fps}`);
      }
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  };
}

const app = new App();
