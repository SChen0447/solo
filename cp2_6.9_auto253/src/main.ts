import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particleSystem';
import { ControlPanel } from './controlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private controlPanel: ControlPanel;
  private sculptCursor: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private intersectPlane: THREE.Plane;
  private isSculptMode: boolean = false;
  private isMouseDown: boolean = false;
  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private container: HTMLElement;
  private intersectPoint: THREE.Vector3;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.intersectPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.intersectPoint = new THREE.Vector3();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.particleSystem = new ParticleSystem(this.scene);
    this.sculptCursor = this.createSculptCursor();
    this.controlPanel = this.createControlPanel();

    this.container.appendChild(this.renderer.domElement);
    this.scene.add(this.sculptCursor);

    this.bindEvents();
    this.onWindowResize();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controls.enablePan = false;
    return controls;
  }

  private createSculptCursor(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cursor = new THREE.Mesh(geometry, material);
    cursor.visible = false;
    return cursor;
  }

  private createControlPanel(): ControlPanel {
    return new ControlPanel(document.getElementById('app')!, this.particleSystem.getParticleCount(), {
      onSculptModeChange: (enabled: boolean) => {
        this.isSculptMode = enabled;
        this.sculptCursor.visible = enabled;
        this.controls.enabled = !enabled;
      },
      onExplode: () => {
        this.particleSystem.explode();
      },
      onGravity: () => {
        const center = this.sculptCursor.visible
          ? this.sculptCursor.position.clone()
          : new THREE.Vector3(0, 0, 0);
        this.particleSystem.triggerGravity(center);
      },
      onReset: () => {
        this.particleSystem.reset();
      },
      onParticleSizeChange: (size: number) => {
        this.particleSystem.setBaseSize(size);
      },
      onLinkDistanceChange: (distance: number) => {
        this.particleSystem.setLinkDistance(distance);
      },
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCursorPosition(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const cameraDistance = this.camera.position.length();
    this.intersectPlane.setFromNormalAndCoplanarPoint(
      this.camera.getWorldDirection(new THREE.Vector3()).negate(),
      new THREE.Vector3(0, 0, 0)
    );

    if (this.raycaster.ray.intersectPlane(this.intersectPlane, this.intersectPoint)) {
      this.sculptCursor.position.copy(this.intersectPoint);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    if (this.isSculptMode) {
      this.updateCursorPosition();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isMouseDown = true;
      if (this.isSculptMode) {
        this.particleSystem.setSculpting(true);
        this.particleSystem.setSculptCenter(this.sculptCursor.position);
      }
    }
  }

  private onMouseUp(): void {
    this.isMouseDown = false;
    this.particleSystem.setSculpting(false);
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      this.isMouseDown = true;
      if (this.isSculptMode) {
        this.updateCursorPosition();
        this.particleSystem.setSculpting(true);
        this.particleSystem.setSculptCenter(this.sculptCursor.position);
      }
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.updateMouse(touch.clientX, touch.clientY);
      if (this.isSculptMode) {
        this.updateCursorPosition();
        if (this.isMouseDown) {
          this.particleSystem.setSculptCenter(this.sculptCursor.position);
        }
      }
    }
  }

  private onTouchEnd(): void {
    this.isMouseDown = false;
    this.particleSystem.setSculpting(false);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      const fps = this.fpsFrames / this.fpsTime;
      this.controlPanel.updateFPS(fps);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    if (this.isSculptMode && this.isMouseDown) {
      this.particleSystem.setSculptCenter(this.sculptCursor.position);
    }

    this.particleSystem.update(deltaTime);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.controlPanel.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    (this.sculptCursor.material as THREE.Material).dispose();
    this.sculptCursor.geometry.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
