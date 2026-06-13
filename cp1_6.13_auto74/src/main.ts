import * as THREE from 'three';
import { Loom } from './loom';
import { StellarThreadManager, ThreadData } from './stellarThread';
import { StarCoreManager } from './starCore';
import { setupControls } from './controls';

export class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private container: HTMLElement;

  private loom: Loom;
  private threadManager: StellarThreadManager;
  private starCoreManager: StarCoreManager;

  private galaxyStars: THREE.Points;
  private galaxyRotation: number = 0;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private _draggedSpool: THREE.Mesh | null = null;
  private currentThread: ThreadData | null = null;

  private animationId: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.scene = new THREE.Scene();
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
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.loom = new Loom();
    this.threadManager = new StellarThreadManager(this.scene);
    this.starCoreManager = new StarCoreManager(this.scene, this.raycaster, this.camera);

    this.galaxyStars = this.createGalaxyStars();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupBackground();
    this.setupLoom();
    this.setupEventListeners();
    setupControls(this.reset.bind(this), this.exportSVG.bind(this));

    this.threadManager.setStarCoreManager(this.starCoreManager);
    this.starCoreManager.setThreadManager(this.threadManager);

    this.animate();

    setTimeout(() => {
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
      }
    }, 800);
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x403060, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    mainLight.position.set(5, 8, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-5, 3, 5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaadd, 0.4);
    rimLight.position.set(0, -5, -8);
    this.scene.add(rimLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a0a3a');
    gradient.addColorStop(0.5, '#2d1055');
    gradient.addColorStop(1, '#0d001a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    this.scene.add(this.galaxyStars);
  }

  private createGalaxyStars(): THREE.Points {
    const starCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 15;
      const y = (Math.random() - 0.5) * 8;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius - 5;

      const colorT = Math.random();
      colors[i * 3] = 0.9 + colorT * 0.1;
      colors[i * 3 + 1] = 0.85 + colorT * 0.15;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 1 + Math.random() * 3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    return points;
  }

  private setupLoom(): void {
    const loomGroup = this.loom.getGroup();
    this.scene.add(loomGroup);
    this.resizeLoom();
  }

  private resizeLoom(): void {
    const fov = this.camera.fov * (Math.PI / 180);
    const distance = Math.abs(this.camera.position.z);
    const viewportHeight = 2 * Math.tan(fov / 2) * distance;

    const loomHeight = viewportHeight * 0.7;
    const baseLoomHeight = 5.6;
    const scale = loomHeight / baseLoomHeight;

    this.loom.setScale(scale);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.resizeLoom();
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    this.loom.handleHover(this.raycaster);

    if (this.isDragging && this.currentThread) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, point);
      if (point) {
        this.threadManager.updateThreadEnd(this.currentThread, point);
      }
    }

    this.starCoreManager.handleMouseMove(this.mouse, event);
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const starCoreResult = this.starCoreManager.handleMouseDown(this.mouse, event);
    if (starCoreResult) {
      this.isDragging = true;
      return;
    }

    const spool = this.loom.getHoveredSpool();
    if (spool) {
      this.isDragging = true;
      this.draggedSpool = spool;

      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, point);

      const spoolPos = new THREE.Vector3();
      spool.getWorldPosition(spoolPos);

      this.currentThread = this.threadManager.createThread(spoolPos, point || spoolPos, spool);
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;

    if (this.currentThread) {
      this.threadManager.setThreadPulsating(this.currentThread, true);
      this.threadManager.checkIntersections();
      this.currentThread = null;
    }

    this.starCoreManager.handleMouseUp();

    this.isDragging = false;
    this.draggedSpool = null;
  }

  private reset(): void {
    this.threadManager.reset();
    this.starCoreManager.reset();
  }

  private exportSVG(): void {
    const svgContent = this.threadManager.exportSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'constellation-' + Date.now() + '.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.galaxyRotation += 0.1 * delta;
    this.galaxyStars.rotation.y = this.galaxyRotation;

    this.loom.update(delta, elapsed);
    this.threadManager.update(delta, elapsed);
    this.starCoreManager.update(delta, elapsed);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.dispose();
  }
}

new App('canvas-container');
