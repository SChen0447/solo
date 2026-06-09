import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Loom } from './loom';
import { ParticleSystem } from './particles';

class DreamWeaverApp {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;

  private loom!: Loom;
  private particles!: ParticleSystem;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();
  private platformPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private clock: THREE.Clock = new THREE.Clock();
  private isMouseDown = false;

  private modeTextEl: HTMLElement | null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.modeTextEl = document.getElementById('modeText');

    this.init();
    this.bindEvents();
    this.animate();
  }

  private init(): void {
    this.scene = new THREE.Scene();

    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 4.5, 6.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.setupPostProcessing();
    this.setupLights();

    this.particles = new ParticleSystem(this.scene);
    this.loom = new Loom(this.scene, this.particles);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
    gradient.addColorStop(0, '#1a0a2a');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.08);
  }

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,
      0.5,
      0.15
    );
    this.composer.addPass(bloomPass);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x443366, 0.6);
    this.scene.add(ambient);

    const pointLight = new THREE.PointLight(0xaa88ff, 0.8, 20);
    pointLight.position.set(0, 3, 0);
    this.scene.add(pointLight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private updatePointer(event: PointerEvent): void {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private getPlatformIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.platformPlane, intersectPoint);

    const dist = Math.sqrt(intersectPoint.x ** 2 + intersectPoint.z ** 2);
    if (dist <= 3) {
      intersectPoint.y = 0.01;
      return intersectPoint;
    }
    return null;
  }

  private checkColorRingHit(event: PointerEvent): number {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.loom.colorRings.map(r => r.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      return this.loom.colorRings.findIndex(r => r.mesh === hitMesh);
    }
    return -1;
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    this.updatePointer(event);

    const ringIndex = this.checkColorRingHit(event);
    if (ringIndex >= 0) {
      this.loom.handleColorRingClick(ringIndex);
      return;
    }

    const pos = this.getPlatformIntersection();
    if (pos) {
      this.isMouseDown = true;
      this.loom.handlePointerDown(pos);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    this.updatePointer(event);
    if (!this.isMouseDown) return;

    const pos = this.getPlatformIntersection();
    if (pos) {
      this.loom.handlePointerMove(pos);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;

    this.updatePointer(event);
    const pos = this.getPlatformIntersection() || new THREE.Vector3(0, 0.01, 0);
    this.loom.handlePointerUp(pos);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      const mode = this.loom.toggleWeaveMode();
      if (this.modeTextEl) {
        this.modeTextEl.textContent = this.loom.getModeDisplayName();
      }
      void mode;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.loom.update(delta, time);
    this.particles.update(delta);

    this.camera.position.x = Math.sin(time * 0.15) * 0.3;
    this.camera.lookAt(0, 0, 0);

    this.composer.render();
  }

  public dispose(): void {
    this.loom.dispose();
    this.particles.dispose();
    this.renderer.dispose();
  }
}

new DreamWeaverApp();
