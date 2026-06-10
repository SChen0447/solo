import * as THREE from 'three';
import { ParticleData, SceneConfig } from './types';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private config: SceneConfig;

  private mouseNDC: THREE.Vector2 = new THREE.Vector2();
  private mouseWorld: THREE.Vector3 = new THREE.Vector3();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private gravityPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private isRightDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private targetCameraDistance: number = 200;
  private targetRotationX: number = 0.3;
  private targetRotationY: number = 0;

  private cameraPivot: THREE.Object3D = new THREE.Object3D();
  private cameraHolder: THREE.Object3D = new THREE.Object3D();

  private hintPanel: HTMLElement | null = null;
  private hintTimeout: number | null = null;
  private lastActivityTime: number = Date.now();

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    config: SceneConfig
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.config = config;

    this.setupCameraRig();
    this.setupEventListeners();
    this.setupHintPanel();
  }

  private setupCameraRig(): void {
    this.cameraPivot.position.set(0, 0, 0);
    this.cameraHolder.position.set(0, 0, this.targetCameraDistance);
    this.cameraHolder.add(this.camera);
    this.cameraPivot.add(this.cameraHolder);
    this.cameraPivot.rotation.x = this.targetRotationX;
    this.cameraPivot.rotation.y = this.targetRotationY;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private setupHintPanel(): void {
    this.hintPanel = document.getElementById('hint-panel');
    this.resetHintTimer();

    const activityEvents = ['mousemove', 'mousedown', 'wheel', 'keydown'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, () => this.resetHintTimer());
    });
  }

  private resetHintTimer(): void {
    this.lastActivityTime = Date.now();
    if (this.hintPanel) {
      this.hintPanel.classList.remove('fade-out');
    }
    if (this.hintTimeout !== null) {
      window.clearTimeout(this.hintTimeout);
    }
    this.hintTimeout = window.setTimeout(() => {
      if (this.hintPanel) {
        this.hintPanel.classList.add('fade-out');
      }
    }, 5000);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    this.raycaster.ray.intersectPlane(this.gravityPlane, this.mouseWorld);

    if (this.isRightDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
      this.targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotationX));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      this.isRightDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2) {
      this.isRightDragging = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.targetCameraDistance += e.deltaY * zoomSpeed * this.targetCameraDistance;
    this.targetCameraDistance = Math.max(
      this.config.minZoom,
      Math.min(this.config.maxZoom, this.targetCameraDistance)
    );
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public getCameraPivot(): THREE.Object3D {
    return this.cameraPivot;
  }

  public updateCamera(deltaTime: number): void {
    const smoothing = this.config.cameraSmoothing;
    this.cameraPivot.rotation.x += (this.targetRotationX - this.cameraPivot.rotation.x) * smoothing;
    this.cameraPivot.rotation.y += (this.targetRotationY - this.cameraPivot.rotation.y) * smoothing;
    this.cameraHolder.position.z += (this.targetCameraDistance - this.cameraHolder.position.z) * smoothing;
  }

  public updateParticles(
    particles: ParticleData[],
    positions: Float32Array,
    colors: Float32Array,
    sizes: Float32Array,
    time: number,
    deltaTime: number
  ): void {
    const gravityRadiusSq = this.config.gravityRadius * this.config.gravityRadius;
    const gravityStrength = this.config.gravityStrength;
    const damping = this.config.damping;
    const elasticity = this.config.elasticity;

    const warmColor = new THREE.Color(0xffaa33);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const i3 = i * 3;

      const floatX = Math.sin(time * p.floatSpeed + p.phaseOffset) * p.floatAmplitude;
      const floatY = Math.cos(time * p.floatSpeed * 0.7 + p.phaseOffset * 1.3) * p.floatAmplitude;
      const floatZ = Math.sin(time * p.floatSpeed * 0.5 + p.phaseOffset * 0.7) * p.floatAmplitude;

      const targetX = p.originalPosition.x + floatX;
      const targetY = p.originalPosition.y + floatY;
      const targetZ = p.originalPosition.z + floatZ;

      const dx = this.mouseWorld.x - positions[i3];
      const dy = this.mouseWorld.y - positions[i3 + 1];
      const dz = this.mouseWorld.z - positions[i3 + 2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < gravityRadiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / this.config.gravityRadius;
        const force = gravityStrength * falloff * falloff;
        const invDist = 1 / dist;
        p.velocity.x += dx * invDist * force * deltaTime;
        p.velocity.y += dy * invDist * force * deltaTime;
        p.velocity.z += dz * invDist * force * deltaTime;
        p.warmColorMix = Math.min(1, p.warmColorMix + falloff * 0.15);
      }

      p.velocity.x += (targetX - positions[i3]) * elasticity;
      p.velocity.y += (targetY - positions[i3 + 1]) * elasticity;
      p.velocity.z += (targetZ - positions[i3 + 2]) * elasticity;

      p.velocity.x *= damping;
      p.velocity.y *= damping;
      p.velocity.z *= damping;

      positions[i3] += p.velocity.x;
      positions[i3 + 1] += p.velocity.y;
      positions[i3 + 2] += p.velocity.z;

      p.warmColorMix *= 0.96;

      const r = p.baseColor.r + (warmColor.r - p.baseColor.r) * p.warmColorMix;
      const g = p.baseColor.g + (warmColor.g - p.baseColor.g) * p.warmColorMix;
      const b = p.baseColor.b + (warmColor.b - p.baseColor.b) * p.warmColorMix;

      const brightnessBoost = 1 + p.warmColorMix * 0.5;
      colors[i3] = Math.min(1, r * brightnessBoost);
      colors[i3 + 1] = Math.min(1, g * brightnessBoost);
      colors[i3 + 2] = Math.min(1, b * brightnessBoost);

      sizes[i] = p.baseSize * (1 + p.warmColorMix * 0.8);
    }
  }
}
