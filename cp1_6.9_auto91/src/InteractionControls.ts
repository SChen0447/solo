import * as THREE from 'three';
import type { CurrentPath } from './CurrentPath';
import type { PlanktonSystem } from './PlanktonSystem';

export class InteractionControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private currentPath: CurrentPath;
  private planktonSystem: PlanktonSystem;

  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private spherical = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 18 };
  private target = new THREE.Vector3(0, 0, 0);

  private keys: Record<string, boolean> = {};
  private readonly MOVE_SPEED = 2;
  private readonly MIN_ZOOM = 5;
  private readonly MAX_ZOOM = 30;
  private readonly MIN_PHI = 0.1;
  private readonly MAX_PHI = Math.PI / 2 - 0.1;

  private mousePosition = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private lastDataUpdate = 0;
  private readonly DATA_UPDATE_INTERVAL = 1;

  private speedEl: HTMLElement | null;
  private angleEl: HTMLElement | null;
  private densityEl: HTMLElement | null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    currentPath: CurrentPath,
    planktonSystem: PlanktonSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.currentPath = currentPath;
    this.planktonSystem = planktonSystem;

    this.speedEl = document.getElementById('current-speed');
    this.angleEl = document.getElementById('current-angle');
    this.densityEl = document.getElementById('plankton-density');

    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * 0.005;
    this.spherical.phi -= deltaY * 0.005;

    this.spherical.phi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.spherical.phi));

    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;

    this.updateCamera();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.spherical.radius += event.deltaY * zoomSpeed * this.spherical.radius;
    this.spherical.radius = Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.spherical.radius));
    this.updateCamera();
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(): void {
    const sinPhi = Math.sin(this.spherical.phi);
    const cosPhi = Math.cos(this.spherical.phi);
    const sinTheta = Math.sin(this.spherical.theta);
    const cosTheta = Math.cos(this.spherical.theta);

    this.camera.position.x = this.target.x + this.spherical.radius * sinPhi * sinTheta;
    this.camera.position.y = this.target.y + this.spherical.radius * cosPhi;
    this.camera.position.z = this.target.z + this.spherical.radius * sinPhi * cosTheta;

    this.camera.lookAt(this.target);
  }

  public getMouseWorldPosition(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mousePosition, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    const success = this.raycaster.ray.intersectPlane(plane, intersect);
    return success ? intersect : null;
  }

  public update(deltaTime: number, time: number): void {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveAmount = this.MOVE_SPEED * deltaTime;

    if (this.keys['w']) {
      this.target.add(forward.clone().multiplyScalar(moveAmount));
    }
    if (this.keys['s']) {
      this.target.add(forward.clone().multiplyScalar(-moveAmount));
    }
    if (this.keys['a']) {
      this.target.add(right.clone().multiplyScalar(-moveAmount));
    }
    if (this.keys['d']) {
      this.target.add(right.clone().multiplyScalar(moveAmount));
    }

    this.target.x = Math.max(-20, Math.min(20, this.target.x));
    this.target.y = Math.max(-15, Math.min(15, this.target.y));
    this.target.z = Math.max(-20, Math.min(20, this.target.z));

    this.updateCamera();

    if (time - this.lastDataUpdate >= this.DATA_UPDATE_INTERVAL) {
      this.lastDataUpdate = time;
      this.updateDataPanel();
    }
  }

  private updateDataPanel(): void {
    const worldPos = this.getMouseWorldPosition();

    if (worldPos && this.speedEl && this.angleEl && this.densityEl) {
      const flowData = this.currentPath.getFlowDataAtPosition(worldPos);
      const density = this.planktonSystem.getDensityAtPosition(worldPos, 2);

      if (flowData) {
        this.speedEl.textContent = `${flowData.speed.toFixed(2)} u/s`;
        this.angleEl.textContent = `${flowData.angle.toFixed(1)}°`;
      } else {
        this.speedEl.textContent = 'N/A';
        this.angleEl.textContent = 'N/A';
      }
      this.densityEl.textContent = `${density.toFixed(1)} /u³`;
    }
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
