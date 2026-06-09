import * as THREE from 'three';
import { NebulaSystem, type NebulaParams } from './nebulaSystem';
import { UIControls } from './controls';

class NebulaApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private nebulaSystem: NebulaSystem;
  private controls: UIControls;

  private cameraDistance: number = 60;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 2;

  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 2;
  private targetDistance: number = 60;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private autoRotate: boolean = false;
  private userInteracting: boolean = false;
  private interactionTimeout: number | null = null;

  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  private readonly MIN_DISTANCE = 10;
  private readonly MAX_DISTANCE = 200;
  private readonly MIN_PHI = (10 * Math.PI) / 180;
  private readonly MAX_PHI = (170 * Math.PI) / 180;
  private readonly AUTO_ROTATE_SPEED = (0.5 * Math.PI) / 180;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.nebulaSystem = new NebulaSystem(this.scene);

    this.controls = new UIControls({
      onParamChange: (params: Partial<NebulaParams>) => {
        this.nebulaSystem.setParams(params);
      },
      onReset: () => {
        this.nebulaSystem.reset();
      }
    });

    this.bindEvents();
    this.animate();
  }

  private updateCameraPosition(): void {
    this.camera.position.x =
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.y = this.cameraDistance * Math.cos(this.cameraPhi);
    this.camera.position.z =
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.markUserInteraction();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.targetTheta -= deltaX * 0.005;
    this.targetPhi -= deltaY * 0.005;
    this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.markUserInteraction();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;

    this.targetTheta -= deltaX * 0.005;
    this.targetPhi -= deltaY * 0.005;
    this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.markUserInteraction();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetDistance *= zoomFactor;
    this.targetDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetDistance));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.autoRotate = !this.autoRotate;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private markUserInteraction(): void {
    this.userInteracting = true;
    if (this.interactionTimeout !== null) {
      window.clearTimeout(this.interactionTimeout);
    }
    this.interactionTimeout = window.setTimeout(() => {
      this.userInteracting = false;
    }, 1500);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const lerpFactor = 1 - Math.pow(0.001, delta);

    if (this.autoRotate && !this.userInteracting) {
      this.targetTheta += this.AUTO_ROTATE_SPEED * delta * 60;
    }

    this.cameraTheta += (this.targetTheta - this.cameraTheta) * lerpFactor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * lerpFactor;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * lerpFactor;

    this.updateCameraPosition();

    this.nebulaSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.interactionTimeout !== null) {
      window.clearTimeout(this.interactionTimeout);
    }

    this.controls.dispose();
    this.nebulaSystem.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: NebulaApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new NebulaApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
