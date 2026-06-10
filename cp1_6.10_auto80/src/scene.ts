import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PlateManager } from './plateManager';
import type { EffectsSystem } from './effects';

export type SimulationMode = 'idle' | 'collision' | 'separation' | 'subduction';

export interface SceneState {
  mode: SimulationMode;
  frameCount: number;
  collisionCount: number;
  transitionProgress: number;
  targetMode: SimulationMode;
}

export interface PlateClickEvent {
  plateId: number;
  name: string;
  speed: number;
  boundaryType: string;
  screenX: number;
  screenY: number;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public earth: THREE.Mesh;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;

  private container: HTMLElement;
  private clock: THREE.Clock;
  private plateManager: PlateManager | null = null;
  private effectsSystem: EffectsSystem | null = null;
  private animationFrameId: number | null = null;
  private onPlateClickCallback: ((event: PlateClickEvent) => void) | null = null;
  private onFrameCallback: ((state: SceneState) => void) | null = null;

  public state: SceneState = {
    mode: 'idle',
    frameCount: 0,
    collisionCount: 0,
    transitionProgress: 1,
    targetMode: 'idle',
  };

  private transitionDuration = 60;
  private transitionStartMode: SimulationMode = 'idle';

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.earth = this.createEarth();
    this.scene.add(this.earth);

    this.setupLights();
    this.setupEventListeners();
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(5, 96, 96);
    const texture = this.createEarthTexture();
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.05,
      shininess: 15,
      specular: new THREE.Color(0x333333),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createEarthTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.5, '#0d2840');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2d5a3d';
    this.drawContinent(ctx, canvas.width * 0.15, canvas.height * 0.4, 0.18, 0.25);
    this.drawContinent(ctx, canvas.width * 0.45, canvas.height * 0.35, 0.12, 0.18);
    this.drawContinent(ctx, canvas.width * 0.5, canvas.height * 0.6, 0.15, 0.2);
    this.drawContinent(ctx, canvas.width * 0.75, canvas.height * 0.35, 0.2, 0.3);
    this.drawContinent(ctx, canvas.width * 0.85, canvas.height * 0.7, 0.08, 0.12);
    this.drawContinent(ctx, canvas.width * 0.25, canvas.height * 0.75, 0.1, 0.08);

    ctx.fillStyle = '#3d6e4d';
    this.drawContinent(ctx, canvas.width * 0.18, canvas.height * 0.42, 0.12, 0.15);
    this.drawContinent(ctx, canvas.width * 0.78, canvas.height * 0.4, 0.14, 0.2);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let lon = 0; lon <= 360; lon += 15) {
      const x = (lon / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let lat = 0; lat <= 180; lat += 15) {
      const y = (lat / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  private drawContinent(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    wRatio: number,
    hRatio: number
  ) {
    const w = 2048 * wRatio;
    const h = 1024 * hRatio;
    ctx.beginPath();
    const points = 20;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = 0.6 + Math.sin(i * 2.3) * 0.2 + Math.cos(i * 3.7) * 0.2;
      const x = cx + Math.cos(angle) * w * noise;
      const y = cy + Math.sin(angle) * h * noise;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    pointLight.position.set(10, 10, 10);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 2048;
    pointLight.shadow.mapSize.height = 2048;
    this.scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    rimLight.position.set(-10, -5, -10);
    this.scene.add(rimLight);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = r * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.plateManager) {
      const plateMeshes = this.plateManager.getPlateMeshes();
      const intersects = this.raycaster.intersectObjects(plateMeshes, false);

      if (intersects.length > 0 && this.onPlateClickCallback) {
        const plateId = (intersects[0].object as any).userData.plateId as number;
        const info = this.plateManager.getPlateInfo(plateId);
        this.onPlateClickCallback({
          plateId,
          name: info.name,
          speed: info.speed,
          boundaryType: info.boundaryType,
          screenX: event.clientX,
          screenY: event.clientY,
        });
      }
    }
  }

  public setPlateManager(manager: PlateManager): void {
    this.plateManager = manager;
  }

  public setEffectsSystem(system: EffectsSystem): void {
    this.effectsSystem = system;
  }

  public onPlateClick(callback: (event: PlateClickEvent) => void): void {
    this.onPlateClickCallback = callback;
  }

  public onFrame(callback: (state: SceneState) => void): void {
    this.onFrameCallback = callback;
  }

  public setMode(mode: SimulationMode): void {
    if (this.state.targetMode === mode) return;
    this.transitionStartMode = this.state.mode;
    this.state.targetMode = mode;
    this.state.transitionProgress = 0;
  }

  public resetSimulation(): void {
    this.state.mode = 'idle';
    this.state.targetMode = 'idle';
    this.state.frameCount = 0;
    this.state.collisionCount = 0;
    this.state.transitionProgress = 1;
    if (this.plateManager) this.plateManager.reset();
    if (this.effectsSystem) this.effectsSystem.clearAll();
  }

  public incrementCollisionCount(): void {
    this.state.collisionCount++;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public start(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const deltaTime = this.clock.getDelta();
      this.update(deltaTime);
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private update(deltaTime: number): void {
    this.state.frameCount++;
    this.controls.update();

    this.earth.rotation.y += 0.001;

    if (this.state.transitionProgress < 1) {
      this.state.transitionProgress += 1 / this.transitionDuration;
      if (this.state.transitionProgress >= 1) {
        this.state.transitionProgress = 1;
        this.state.mode = this.state.targetMode;
      }
    }

    const transitionT = this.easeInOutCubic(this.state.transitionProgress);

    if (this.plateManager) {
      this.plateManager.update(deltaTime, this.state.mode, this.state.targetMode, transitionT, this);
    }

    if (this.effectsSystem) {
      this.effectsSystem.update(deltaTime);
    }

    if (this.onFrameCallback) {
      this.onFrameCallback(this.state);
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
