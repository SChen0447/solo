import * as THREE from 'three';
import { createScene } from './sceneSetup';
import { BeaconSystem, Beacon } from './beaconSystem';
import { CurveRenderer } from './curveRenderer';
import { UIManager } from './uiManager';

class VoidTheodoliteApp {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private pickPlane!: THREE.Mesh;
  private sceneUpdate!: (delta: number) => void;
  private beaconSystem!: BeaconSystem;
  private curveRenderer!: CurveRenderer;
  private uiManager!: UIManager;
  private clock: THREE.Clock;
  private isDragging: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private cameraAngle: THREE.Vector2 = new THREE.Vector2(0, 0);
  private cameraDistance: number = 12;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.clock = new THREE.Clock();
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Container element #canvas-container not found');
    }
    this.container = container;
    this.init();
  }

  private init(): void {
    const sceneResult = createScene(this.container);
    this.scene = sceneResult.scene;
    this.camera = sceneResult.camera;
    this.renderer = sceneResult.renderer;
    this.pickPlane = sceneResult.pickPlane;
    this.sceneUpdate = sceneResult.update;

    this.beaconSystem = new BeaconSystem(
      this.scene,
      this.camera,
      this.renderer,
      this.pickPlane
    );

    this.curveRenderer = new CurveRenderer(this.scene);

    this.uiManager = new UIManager();
    this.uiManager.setResetCallback(() => this.handleReset());

    this.beaconSystem.setChangeCallback((beacons: Beacon[]) => {
      this.curveRenderer.update(beacons);
      this.uiManager.updateBeaconCount(this.beaconSystem.getBeaconCount());
      this.uiManager.updateCurveLength(this.curveRenderer.getCurveLength());
    });

    this.setupCameraControls();
    this.uiManager.updateBeaconCount(0);
    this.uiManager.updateCurveLength(0);

    this.animate();
  }

  private setupCameraControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isDragging = true;
        this.previousMouse.set(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;
        this.previousMouse.set(e.clientX, e.clientY);

        this.cameraAngle.x -= deltaX * 0.005;
        this.cameraAngle.y += deltaY * 0.005;
        this.cameraAngle.y = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.y));

        this.updateCameraPosition();
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.01;
      this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance));
      this.updateCameraPosition();
    }, { passive: false });

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle.x) * Math.cos(this.cameraAngle.y);
    const y = this.cameraDistance * Math.sin(this.cameraAngle.y);
    const z = this.cameraDistance * Math.cos(this.cameraAngle.x) * Math.cos(this.cameraAngle.y);
    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private handleReset(): void {
    this.beaconSystem.clear();
    this.curveRenderer.update([]);
    this.uiManager.updateBeaconCount(0);
    this.uiManager.updateCurveLength(0);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.sceneUpdate(delta);
    this.curveRenderer.animate(delta, time);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoidTheodoliteApp();
});
