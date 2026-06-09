import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MagneticFieldSystem, Magnet } from './magneticField';
import { UIHandler } from './ui';

class App {
  private container!: HTMLDivElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private fieldSystem!: MagneticFieldSystem;
  private uiHandler!: UIHandler;
  private clock!: THREE.Clock;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hoveredMagnet: Magnet | null = null;
  private draggedMagnet: Magnet | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private isDragging: boolean = false;

  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.init();
    this.setupLights();
    this.setupBackground();
    this.setupFieldSystem();
    this.setupUI();
    this.setupEventListeners();
    this.animate();
  }

  private init() {
    this.container = document.getElementById('canvas-container') as HTMLDivElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const { clientWidth, clientHeight } = this.container;
    this.camera = new THREE.PerspectiveCamera(55, clientWidth / clientHeight, 0.1, 1000);
    this.camera.position.set(8, 6, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.15;
    this.controls.enablePan = true;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, 0, 0);
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(8, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x4fc3f7, 0.4);
    rimLight.position.set(-6, 4, -6);
    this.scene.add(rimLight);
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#0A0E27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;
  }

  private setupFieldSystem() {
    this.fieldSystem = new MagneticFieldSystem(this.scene);
    this.fieldSystem.addMagnet({
      type: 'bar',
      position: new THREE.Vector3(0, 0, 0),
      length: 4,
      strength: 1.0
    });
  }

  private setupUI() {
    this.uiHandler = new UIHandler();
    this.uiHandler.onChange((controls) => {
      if (this.fieldSystem.lineCount !== controls.lineCount) {
        this.fieldSystem.setLineCount(controls.lineCount);
      }
      if (Math.abs(this.fieldSystem.fieldStrength - controls.fieldStrength) > 0.01) {
        this.fieldSystem.setFieldStrength(controls.fieldStrength);
      }
      if (this.fieldSystem.displayMode !== controls.displayMode) {
        this.fieldSystem.setDisplayMode(controls.displayMode);
      }
    });
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
  }

  private onResize() {
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  private updateMouse(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectionPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, point)) {
      return point;
    }
    return null;
  }

  private snapToGrid(v: THREE.Vector3, gridSize: number = 0.5): THREE.Vector3 {
    return new THREE.Vector3(
      Math.round(v.x / gridSize) * gridSize,
      0,
      Math.round(v.z / gridSize) * gridSize
    );
  }

  private pickMagnet(): Magnet | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.fieldSystem.getMagnets().forEach(m => meshes.push(m.mesh));
    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !this.fieldSystem.getMagnets().find(m => m.mesh === obj)) {
        obj = obj.parent;
      }
      return this.fieldSystem.getMagnets().find(m => m.mesh === obj) || null;
    }
    return null;
  }

  private onPointerMove(e: PointerEvent) {
    this.updateMouse(e);

    if (this.isDragging && this.draggedMagnet) {
      const point = this.getIntersectionPoint();
      if (point) {
        const snapped = this.snapToGrid(point.sub(this.dragOffset));
        this.draggedMagnet.mesh.position.copy(snapped);
        this.fieldSystem.regenerateLines(false);
        this.fieldSystem.checkPolarityInteraction();
      }
      return;
    }

    const magnet = this.pickMagnet();
    if (magnet !== this.hoveredMagnet) {
      if (this.hoveredMagnet) {
        this.hoveredMagnet.setHighlight(false);
      }
      this.hoveredMagnet = magnet;
      if (this.hoveredMagnet) {
        this.hoveredMagnet.setHighlight(true);
      }
      this.renderer.domElement.style.cursor = magnet ? 'grab' : (this.uiHandler.controls.placingMagnet ? 'crosshair' : 'default');
    }
  }

  private onPointerDown(e: PointerEvent) {
    this.updateMouse(e);
    const magnet = this.pickMagnet();

    if (magnet) {
      this.isDragging = true;
      this.draggedMagnet = magnet;
      this.controls.enabled = false;
      this.renderer.domElement.style.cursor = 'grabbing';

      const point = this.getIntersectionPoint();
      if (point) {
        this.dragOffset.copy(point).sub(magnet.mesh.position);
      }
      return;
    }

    if (this.uiHandler.controls.placingMagnet) {
      const point = this.getIntersectionPoint();
      if (point) {
        const snapped = this.snapToGrid(point);
        this.fieldSystem.addMagnet({
          type: this.uiHandler.controls.magnetType,
          position: snapped,
          length: 4,
          strength: 1.0
        });
        this.uiHandler.resetPlacingMagnet();
      }
    }
  }

  private onPointerUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.draggedMagnet = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = this.hoveredMagnet ? 'grab' : 'default';
    }
  }

  private calculateFps(deltaTime: number) {
    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.fieldSystem.updateAnimation(elapsedTime, deltaTime);

    this.calculateFps(deltaTime);
    this.uiHandler.updateStatus(this.fieldSystem.getLineCount(), this.currentFps);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
