import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SnowflakeManager } from './snowflakeManager';
import { UIController } from './uiController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private snowflakeManager: SnowflakeManager;
  private uiController: UIController;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private animationId: number | null = null;

  constructor() {
    this.clock = new THREE.Clock();

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    this.container = container;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.snowflakeManager = new SnowflakeManager(this.scene, {
      initialComplexity: 3,
      initialColorT: 0
    });

    this.uiController = new UIController(this.snowflakeManager);

    this.setupEventListeners();
    this.onWindowResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(1, 1, 0, 1, 1, 1.4);
    gradient.addColorStop(0, '#1a1c3a');
    gradient.addColorStop(1, '#0a0b1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);
    const bgTexture = new THREE.CanvasTexture(canvas);
    bgTexture.needsUpdate = true;
    scene.background = bgTexture;

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x8899ff, 1, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions: number[] = [];
    const starColors: number[] = [];
    const starColor = new THREE.Color();

    for (let i = 0; i < 1000; i++) {
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );

      const brightness = 0.3 + Math.random() * 0.7;
      const tint = Math.random();
      starColor.setRGB(
        brightness * (0.7 + tint * 0.3),
        brightness * (0.75 + tint * 0.25),
        brightness
      );
      starColors.push(starColor.r, starColor.g, starColor.b);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 6, 12);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0b1a, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.snowflakeManager.update(dt);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.snowflakeManager.dispose();
    this.uiController.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

const app = new App();
app.start();
