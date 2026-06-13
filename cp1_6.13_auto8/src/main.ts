import * as THREE from 'three';
import { Terrain } from './terrain';
import { Heatmap } from './heatmap';
import { InfoPanel } from './panel';

class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private spherical: { radius: number; theta: number; phi: number };
  private velocity: { theta: number; phi: number; radius: number };

  private minDistance: number = 50;
  private maxDistance: number = 500;
  private minPolarAngle: number = Math.PI / 12;
  private maxPolarAngle: number = Math.PI / 2.1;

  private damping: number = 0.92;
  private rotationSpeed: number = 0.005;
  private zoomSpeed: number = 0.001;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, -30, 0);

    this.spherical = {
      radius: 200,
      theta: Math.PI / 4,
      phi: Math.PI / 3
    };

    this.velocity = { theta: 0, phi: 0, radius: 0 };

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
    this.velocity.theta = 0;
    this.velocity.phi = 0;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.velocity.theta = -deltaX * this.rotationSpeed;
    this.velocity.phi = -deltaY * this.rotationSpeed;

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.velocity.radius = event.deltaY * this.zoomSpeed;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    this.isDragging = true;
    const touch = event.touches[0];
    this.previousMouse = { x: touch.clientX, y: touch.clientY };
    this.velocity.theta = 0;
    this.velocity.phi = 0;
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];

    const deltaX = touch.clientX - this.previousMouse.x;
    const deltaY = touch.clientY - this.previousMouse.y;

    this.velocity.theta = -deltaX * this.rotationSpeed;
    this.velocity.phi = -deltaY * this.rotationSpeed;

    this.previousMouse = { x: touch.clientX, y: touch.clientY };
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.1);

    this.spherical.theta += this.velocity.theta * dt * 60;
    this.spherical.phi += this.velocity.phi * dt * 60;
    this.spherical.radius += this.velocity.radius * this.spherical.radius * dt * 60;

    this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.velocity.theta *= this.damping;
    this.velocity.phi *= this.damping;
    this.velocity.radius *= this.damping;

    if (Math.abs(this.velocity.theta) < 0.00001) this.velocity.theta = 0;
    if (Math.abs(this.velocity.phi) < 0.00001) this.velocity.phi = 0;
    if (Math.abs(this.velocity.radius) < 0.00001) this.velocity.radius = 0;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const { radius, theta, phi } = this.spherical;

    const x = this.target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = this.target.y + radius * Math.cos(phi);
    const z = this.target.z + radius * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }
}

class SonarApplication {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrain: Terrain;
  private heatmap: Heatmap;
  private infoPanel: InfoPanel;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private lastTime: number;
  private animationId: number | null = null;
  private isMouseInCanvas: boolean = false;
  private terrainPlane: THREE.Mesh;
  private loadingEl: HTMLElement;

  constructor() {
    const container = document.getElementById('canvas-container');
    const loadingEl = document.getElementById('loading');

    if (!container || !loadingEl) {
      throw new Error('Container elements not found');
    }

    this.container = container;
    this.loadingEl = loadingEl;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.lastTime = performance.now();

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.terrain = new Terrain({
      width: 200,
      depth: 200,
      segmentsX: 99,
      segmentsZ: 99,
      maxHeight: 0,
      minHeight: -100,
      noiseScale: 0.025,
      noiseOctaves: 5
    });
    this.scene.add(this.terrain.getMesh());

    this.heatmap = new Heatmap(this.terrain, {
      radius: 45,
      intensity: 1.0,
      heightOffset: 0.5
    });
    this.scene.add(this.heatmap.getMesh());

    this.terrainPlane = this.terrain.getMesh();

    this.infoPanel = new InfoPanel();

    this.addAmbientEffects();

    this.bindEvents();

    this.onResize();
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(1, '#000510');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private addAmbientEffects(): void {
    const ambientLight = new THREE.AmbientLight(0x335577, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00aaff, 0.8, 300);
    pointLight.position.set(50, 50, 50);
    this.scene.add(pointLight);

    const fog = new THREE.FogExp2(0x001122, 0.004);
    this.scene.fog = fog;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseenter', () => {
      this.isMouseInCanvas = true;
    });
    this.renderer.domElement.addEventListener('mouseleave', () => {
      this.isMouseInCanvas = false;
    });

    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.isMouseInCanvas = true;
  }

  private onTouchMove(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    this.isMouseInCanvas = true;
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateHeatmapFromMouse(): void {
    if (!this.isMouseInCanvas) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrainPlane, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.heatmap.setMousePosition(point.x, point.z);
      this.updatePanelInfo(point.x, point.z);
    }
  }

  private updatePanelInfo(x: number, z: number): void {
    const terrainOpts = this.terrain.getOptions();
    const altitude = this.terrain.getHeightAt(x, z);

    const halfW = terrainOpts.width / 2;
    const halfD = terrainOpts.depth / 2;

    const longitude = ((x + halfW) / terrainOpts.width) * 360 - 180;
    const latitude = 90 - ((z + halfD) / terrainOpts.depth) * 180;

    const depthPercent = ((0 - altitude) / (0 - terrainOpts.minHeight)) * 100;

    this.infoPanel.setData({
      altitude: altitude * 10,
      longitude,
      latitude,
      depthPercent
    });
  }

  private animate(): void {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.controls.update(deltaTime);
    this.terrain.update(deltaTime);
    this.heatmap.update(deltaTime);
    this.infoPanel.update(deltaTime);

    this.updateHeatmapFromMouse();

    this.renderer.render(this.scene, this.camera);

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  start(): void {
    this.loadingEl.classList.add('hidden');

    setTimeout(() => {
      this.infoPanel.expand();
    }, 600);

    this.animate();
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.terrain.dispose();
    this.heatmap.dispose();
    this.renderer.dispose();

    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

function init(): void {
  try {
    const app = new SonarApplication();
    app.start();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.querySelector('.text')!.textContent = '初始化失败';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
