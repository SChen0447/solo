import * as THREE from 'three';
import { Galaxy } from './galaxy';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private galaxy: Galaxy;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private isShiftDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;

  private targetDistance: number = 18;
  private currentDistance: number = 18;
  private minDistance: number = 5;
  private maxDistance: number = 30;

  private dampingFactor: number = 0.1;
  private initialCameraAngle: number = 0;

  private gravityWellActive: boolean = false;
  private gravityWellPosition: THREE.Vector3 = new THREE.Vector3();
  private gravityWellStartTime: number = 0;
  private gravityWellDuration: number = 2.0;
  private gravityWellPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  private clock: THREE.Clock;

  constructor(
    camera: THREE.PerspectiveCamera,
    galaxy: Galaxy,
    domElement: HTMLElement,
    clock: THREE.Clock
  ) {
    this.camera = camera;
    this.galaxy = galaxy;
    this.domElement = domElement;
    this.clock = clock;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initialCameraAngle = Math.atan2(camera.position.y, camera.position.z);
    this.currentRotationX = this.initialCameraAngle;
    this.targetRotationX = this.initialCameraAngle;
    this.currentDistance = camera.position.length();
    this.targetDistance = this.currentDistance;

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.isDragging = true;
    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;

    if (event.shiftKey) {
      this.isShiftDragging = true;
      this.updateMouse(event);
      this.updateGravityWellPosition();
      this.activateGravityWell();
    }

    this.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    if (this.isShiftDragging) {
      this.updateMouse(event);
      this.updateGravityWellPosition();
    } else {
      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX -= deltaY * 0.005;
      this.targetRotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.targetRotationX));
    }

    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.isShiftDragging) {
      this.deactivateGravityWell();
      this.isShiftDragging = false;
    } else if (this.isDragging) {
      const deltaX = Math.abs(event.clientX - this.previousMouse.x);
      const deltaY = Math.abs(event.clientY - this.previousMouse.y);
      if (deltaX < 3 && deltaY < 3) {
        this.handleClick(event);
      }
    }

    this.isDragging = false;

    try {
      this.domElement.releasePointerCapture(event.pointerId);
    } catch (_) {
      // ignore
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    this.targetDistance += delta;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  };

  private updateMouse(event: PointerEvent | MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(event: PointerEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const positions = this.galaxy.getCurrentPositions();
    const count = this.galaxy.getCount();

    let closestIndex = -1;
    let closestDist = Infinity;
    const threshold = 0.25;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      const dx = px - this.raycaster.ray.origin.x;
      const dy = py - this.raycaster.ray.origin.y;
      const dz = pz - this.raycaster.ray.origin.z;
      const dirX = this.raycaster.ray.direction.x;
      const dirY = this.raycaster.ray.direction.y;
      const dirZ = this.raycaster.ray.direction.z;

      const dot = dx * dirX + dy * dirY + dz * dirZ;
      if (dot < 0) continue;

      const projX = this.raycaster.ray.origin.x + dirX * dot;
      const projY = this.raycaster.ray.origin.y + dirY * dot;
      const projZ = this.raycaster.ray.origin.z + dirZ * dot;

      const perpDistSq = (px - projX) ** 2 + (py - projY) ** 2 + (pz - projZ) ** 2;

      if (perpDistSq < closestDist && perpDistSq < threshold * threshold) {
        closestDist = perpDistSq;
        closestIndex = i;
      }
    }

    if (closestIndex >= 0) {
      const currentTime = this.clock.getElapsedTime();
      this.galaxy.triggerExplosion(closestIndex, currentTime);
    }
  }

  private updateGravityWellPosition(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.gravityWellPlane, this.gravityWellPosition);
  }

  private activateGravityWell(): void {
    this.gravityWellActive = true;
    this.gravityWellStartTime = this.clock.getElapsedTime();
    this.galaxy.setGravityWell(this.gravityWellPosition, this.gravityWellStartTime, this.gravityWellDuration);
  }

  private deactivateGravityWell(): void {
    if (this.gravityWellActive) {
      this.gravityWellActive = false;
      const currentTime = this.clock.getElapsedTime();
      this.galaxy.deactivateGravityWell(currentTime);
    }
  }

  private updateCameraPosition(): void {
    const x = Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentDistance;
    const y = Math.sin(this.currentRotationX) * this.currentDistance;
    const z = Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentDistance;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  public update(): void {
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.dampingFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.dampingFactor;
    this.currentDistance += (this.targetDistance - this.currentDistance) * this.dampingFactor;

    if (this.isShiftDragging && this.gravityWellActive) {
      this.galaxy.setGravityWell(this.gravityWellPosition, this.gravityWellStartTime, this.gravityWellDuration);
    }

    this.updateCameraPosition();
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}
