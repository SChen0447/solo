import * as THREE from 'three';
import { Ocean } from './ocean';
import { Iceberg } from './iceberg';
import { FloeManager } from './floe';
import { EffectsManager } from './effects';

class App {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;

  public ocean!: Ocean;
  public iceberg!: Iceberg;
  public floeManager!: FloeManager;
  public effects!: EffectsManager;

  private isRightDown = false;
  private isLeftDown = false;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private spherical = { theta: Math.PI * 0.25, phi: Math.PI * 0.35, radius: 8 };
  private target = new THREE.Vector3(0, 0.5, 0);
  private clock: THREE.Clock;
  private dragPositions: THREE.Vector3[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initLights();
    this.initCamera();
    this.initModules();
    this.initEvents();
    this.animate();
  }

  private initRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x4466aa, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -15;
    sun.shadow.camera.right = 15;
    sun.shadow.camera.top = 15;
    sun.shadow.camera.bottom = -15;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x66ccff, 0.4);
    rim.position.set(-5, 3, -5);
    this.scene.add(rim);
  }

  private initCamera(): void {
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.target.x + this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    const y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.target.z + this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  private initModules(): void {
    this.effects = new EffectsManager(this.scene);
    this.ocean = new Ocean(this.scene, this.effects);
    this.iceberg = new Iceberg(this.scene, this.effects);
    this.floeManager = new FloeManager(this.scene, this.effects, this.iceberg);

    this.iceberg.setFloeManager(this.floeManager);
  }

  private initEvents(): void {
    const canvas = this.renderer.domElement;

    window.addEventListener('resize', () => this.onResize());
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', () => this.onPointerUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(e: PointerEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private onPointerDown(e: PointerEvent): void {
    this.updateMouse(e);
    if (e.button === 2) {
      this.isRightDown = true;
    } else if (e.button === 0) {
      this.isLeftDown = true;
      this.dragPositions = [];

      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const icebergIntersects = this.raycaster.intersectObjects(this.iceberg.getClickableObjects(), false);
      if (icebergIntersects.length > 0) {
        const hit = icebergIntersects[0];
        this.iceberg.handleClick(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0));
        return;
      }

      const floeIntersects = this.raycaster.intersectObjects(this.floeManager.getClickableObjects(), false);
      if (floeIntersects.length > 0) {
        const obj = floeIntersects[0].object;
        this.floeManager.flipFloe(obj);
        return;
      }

      const oceanPos = this.ocean.intersectRay(this.raycaster);
      if (oceanPos) {
        this.dragPositions.push(oceanPos.clone());
      }
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onPointerMove(e: PointerEvent): void {
    this.updateMouse(e);

    if (this.isRightDown) {
      const dx = (e.clientX - this.lastMouseX) * 0.005;
      const dy = (e.clientY - this.lastMouseY) * 0.005;
      this.spherical.theta += dx;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI * 0.48, this.spherical.phi + dy));
      this.updateCameraPosition();
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    if (this.isLeftDown && this.dragPositions.length > 0) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const oceanPos = this.ocean.intersectRay(this.raycaster);
      if (oceanPos) {
        const last = this.dragPositions[this.dragPositions.length - 1];
        if (last.distanceTo(oceanPos) > 0.15) {
          this.dragPositions.push(oceanPos.clone());
          this.isDragging = true;
        }
      }
    }

    if (!this.isLeftDown && !this.isRightDown) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.iceberg.getClickableObjects(), false);
      if (intersects.length > 0) {
        this.effects.showHoverHighlight(intersects[0].point);
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        const floeHit = this.raycaster.intersectObjects(this.floeManager.getClickableObjects(), false);
        if (floeHit.length > 0) {
          this.renderer.domElement.style.cursor = 'pointer';
        } else {
          this.effects.hideHoverHighlight();
          this.renderer.domElement.style.cursor = 'default';
        }
      }
    }
  }

  private onPointerUp(_e?: PointerEvent): void {
    if (this.isLeftDown && this.dragPositions.length > 1) {
      this.ocean.addCurrentTrajectory(this.dragPositions);
      this.floeManager.applyCurrentAcceleration(this.dragPositions);
    }
    this.isLeftDown = false;
    this.isRightDown = false;
    this.isDragging = false;
    this.dragPositions = [];
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY * 0.01;
    this.spherical.radius = Math.max(2, Math.min(15, this.spherical.radius + delta));
    this.updateCameraPosition();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.ocean.update(dt, elapsed);
    this.iceberg.update(dt, elapsed);
    this.floeManager.update(dt, elapsed, this.ocean);
    this.effects.update(dt, elapsed);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
