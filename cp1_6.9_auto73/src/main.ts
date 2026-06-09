import * as THREE from 'three';
import { FishController } from './FishController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private fishController: FishController;

  private cameraAngleTheta: number = 0;
  private cameraAnglePhi: number = Math.PI / 3;
  private cameraDistance: number = 8;
  private cameraTargetDistance: number = 8;
  private minDistance: number = 3;
  private maxDistance: number = 15;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private keys: { [key: string]: boolean } = {};
  private moveDirection: THREE.Vector3 = new THREE.Vector3();

  private clock: THREE.Clock;
  private animFrameId: number = 0;

  private infoCoord: HTMLElement;
  private infoAiCount: HTMLElement;
  private infoFlashCount: HTMLElement;

  private targetAspect: number = 16 / 9;

  constructor() {
    this.canvas = document.getElementById('app') as HTMLCanvasElement;
    this.infoCoord = document.getElementById('coord') as HTMLElement;
    this.infoAiCount = document.getElementById('ai-count') as HTMLElement;
    this.infoFlashCount = document.getElementById('flash-count') as HTMLElement;

    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupLights();
    this.setupGround();

    this.fishController = new FishController(this.scene);

    this.camera = new THREE.PerspectiveCamera(60, this.targetAspect, 0.1, 200);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.onResize();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a1a3a');
    gradient.addColorStop(1, '#000510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x000a20, 0.035);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x0a1a3a, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x88aaff, 0.15);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const fillLight = new THREE.HemisphereLight(0x0a2a4a, 0x001520, 0.3);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    const size = 2;
    const segments = 64;
    const geometry = new THREE.PlaneGeometry(size * 10, size * 10, segments, segments);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = Math.sin(x * 2) * 0.1 + Math.cos(y * 3) * 0.08 + (Math.random() - 0.5) * 0.05;
      posAttr.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6.5;
    this.scene.add(ground);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraAngleTheta -= dx * 0.005;
      this.cameraAnglePhi -= dy * 0.005;
      this.cameraAnglePhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraAnglePhi));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraTargetDistance += e.deltaY * 0.01;
      this.cameraTargetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraTargetDistance));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.fishController.triggerPlayerFlash();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const windowAspect = w / h;

    let renderW: number, renderH: number;
    if (windowAspect > this.targetAspect) {
      renderH = h;
      renderW = h * this.targetAspect;
    } else {
      renderW = w;
      renderH = w / this.targetAspect;
    }

    this.renderer.setSize(w, h, false);
    this.renderer.setViewport(
      (w - renderW) / 2,
      (h - renderH) / 2,
      renderW,
      renderH
    );

    this.camera.aspect = this.targetAspect;
    this.camera.updateProjectionMatrix();
  }

  private updateCameraPosition(): void {
    const playerPos = this.fishController.playerFish.position;
    const sinPhi = Math.sin(this.cameraAnglePhi);
    const cosPhi = Math.cos(this.cameraAnglePhi);
    const sinTheta = Math.sin(this.cameraAngleTheta);
    const cosTheta = Math.cos(this.cameraAngleTheta);

    const offset = new THREE.Vector3(
      this.cameraDistance * sinPhi * sinTheta,
      this.cameraDistance * cosPhi,
      this.cameraDistance * sinPhi * cosTheta
    );

    this.camera.position.copy(playerPos).add(offset);
    this.camera.lookAt(playerPos);
  }

  private updateMoveDirection(): void {
    this.moveDirection.set(0, 0, 0);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys['KeyW']) this.moveDirection.add(forward);
    if (this.keys['KeyS']) this.moveDirection.sub(forward);
    if (this.keys['KeyA']) this.moveDirection.sub(right);
    if (this.keys['KeyD']) this.moveDirection.add(right);

    if (this.moveDirection.lengthSq() > 0) {
      this.moveDirection.normalize();
    }
  }

  private updateUI(): void {
    const state = this.fishController.getState();
    const p = state.playerFish.position;
    this.infoCoord.textContent = `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`;
    this.infoAiCount.textContent = `${state.aiFishes.length}`;
    this.infoFlashCount.textContent = `${state.flashCount}`;
  }

  private animate(): void {
    this.animFrameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.updateMoveDirection();

    const lerpT = 1 - Math.pow(0.001, dt);
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, this.cameraTargetDistance, lerpT);

    this.fishController.update(dt, this.moveDirection, this.camera.position);

    this.updateCameraPosition();

    this.renderer.render(this.scene, this.camera);

    this.updateUI();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.fishController.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
