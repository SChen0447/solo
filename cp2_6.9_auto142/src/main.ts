import * as THREE from 'three';
import { SolarSystem } from './SolarSystem';
import { EffectController } from './EffectController';
import { UIController } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private solarSystem: SolarSystem;
  private effectController: EffectController;
  private uiController: UIController;

  private clock: THREE.Clock;

  private cameraDistance: number = 25;
  private cameraMinDistance: number = 5;
  private cameraMaxDistance: number = 50;
  private cameraYaw: number = 0;
  private cameraPitch: number = THREE.MathUtils.degToRad(45);
  private targetYaw: number = 0;
  private targetPitch: number = THREE.MathUtils.degToRad(45);
  private cameraDamping: number = 0.15;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private movedDuringDrag: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0B1A);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.solarSystem = new SolarSystem(this.scene);
    this.effectController = new EffectController(this.scene, this.solarSystem);
    this.uiController = new UIController(this.solarSystem, this.effectController);

    this.updateCameraPosition();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.movedDuringDrag = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.movedDuringDrag = true;
    }

    this.targetYaw -= dx * 0.005;
    this.targetPitch -= dy * 0.005;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch,
      THREE.MathUtils.degToRad(5),
      THREE.MathUtils.degToRad(85)
    );

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging && !this.movedDuringDrag) {
      this.handleClick(e.clientX, e.clientY);
    }
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = Math.exp(e.deltaY * 0.001);
    this.cameraDistance = THREE.MathUtils.clamp(
      this.cameraDistance * zoomFactor,
      this.cameraMinDistance,
      this.cameraMaxDistance
    );
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.movedDuringDrag = false;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - this.lastMouseX;
    const dy = e.touches[0].clientY - this.lastMouseY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.movedDuringDrag = true;
    }

    this.targetYaw -= dx * 0.005;
    this.targetPitch -= dy * 0.005;
    this.targetPitch = THREE.MathUtils.clamp(
      this.targetPitch,
      THREE.MathUtils.degToRad(5),
      THREE.MathUtils.degToRad(85)
    );

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging && !this.movedDuringDrag && e.changedTouches.length > 0) {
      this.handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    this.isDragging = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const body = this.solarSystem.pickBody(ndc, this.camera);
    if (body) {
      this.uiController.showInfoCard(body, clientX, clientY);
    } else {
      this.uiController.hideInfoCard();
    }
  }

  private updateCameraPosition(): void {
    this.cameraYaw += (this.targetYaw - this.cameraYaw) * this.cameraDamping;
    this.cameraPitch += (this.targetPitch - this.cameraPitch) * this.cameraDamping;

    const sliderPitch = THREE.MathUtils.degToRad(this.uiController.state.pitchAngle);
    const finalPitch = THREE.MathUtils.lerp(this.cameraPitch, sliderPitch, 0.02);

    const x = this.cameraDistance * Math.sin(this.cameraYaw) * Math.cos(finalPitch);
    const y = this.cameraDistance * Math.sin(finalPitch);
    const z = this.cameraDistance * Math.cos(this.cameraYaw) * Math.cos(finalPitch);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.solarSystem.update(delta, this.uiController.state.timeSpeed);
    this.effectController.update(delta);
    this.updateCameraPosition();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
