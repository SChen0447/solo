import * as THREE from 'three';
import gsap from 'gsap';
import { Loom } from './loom';

export interface CameraState {
  theta: number;
  phi: number;
  distance: number;
  targetTheta: number;
  targetPhi: number;
  targetDistance: number;
}

export class InteractionManager {
  private loom: Loom;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private isDrawing: boolean = false;
  private lastMousePos: THREE.Vector2 = new THREE.Vector2();
  private dragStartPos: THREE.Vector2 = new THREE.Vector2();
  private cameraState: CameraState;
  private velocityTheta: number = 0;
  private velocityPhi: number = 0;
  private isInertiaActive: boolean = false;
  private lastTrailTime: number = 0;
  private readonly TRAIL_INTERVAL: number = 0.03;
  private readonly MIN_DISTANCE: number = 150;
  private readonly MAX_DISTANCE: number = 500;
  private readonly PHI_MIN: number = -30 * Math.PI / 180;
  private readonly PHI_MAX: number = 30 * Math.PI / 180;
  private onViewChange: (state: { theta: number; phi: number }) => void;

  constructor(
    loom: Loom,
    camera: THREE.PerspectiveCamera,
    container: HTMLElement,
    onViewChange: (state: { theta: number; phi: number }) => void
  ) {
    this.loom = loom;
    this.camera = camera;
    this.container = container;
    this.onViewChange = onViewChange;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.cameraState = {
      theta: 0,
      phi: 0,
      distance: 300,
      targetTheta: 0,
      targetPhi: 0,
      targetDistance: 300
    };

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    this.isDragging = true;
    this.dragStartPos.set(e.clientX, e.clientY);
    this.lastMousePos.set(e.clientX, e.clientY);
    this.isInertiaActive = false;

    this.updateMouseCoordinates(e);
    const hitPoint = this.raycastToLoom();

    if (hitPoint) {
      this.isDrawing = true;
      const time = performance.now() / 1000;
      this.loom.createPulseWave(hitPoint, time);
      this.lastTrailTime = time;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const currentPos = new THREE.Vector2(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = currentPos.x - this.lastMousePos.x;
      const deltaY = currentPos.y - this.lastMousePos.y;

      this.velocityTheta = deltaX * 0.005;
      this.velocityPhi = deltaY * 0.005;

      this.cameraState.targetTheta += this.velocityTheta;
      this.cameraState.targetPhi += this.velocityPhi;

      this.cameraState.targetPhi = Math.max(
        this.PHI_MIN,
        Math.min(this.PHI_MAX, this.cameraState.targetPhi)
      );

      this.lastMousePos.copy(currentPos);

      if (this.isDrawing) {
        const time = performance.now() / 1000;
        if (time - this.lastTrailTime > this.TRAIL_INTERVAL) {
          this.updateMouseCoordinates(e);
          const hitPoint = this.raycastToLoom();
          if (hitPoint) {
            const direction = new THREE.Vector2(deltaX, -deltaY);
            this.loom.createTrailPoint(hitPoint, direction, time);
            this.lastTrailTime = time;
          }
        }
      }
    }

    this.lastMousePos.copy(currentPos);
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    if (this.isDragging) {
      this.isDragging = false;
      this.isDrawing = false;

      if (Math.abs(this.velocityTheta) > 0.001 || Math.abs(this.velocityPhi) > 0.001) {
        this.startInertia();
      }
    }
  }

  private onMouseLeave(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.isDrawing = false;

      if (Math.abs(this.velocityTheta) > 0.001 || Math.abs(this.velocityPhi) > 0.001) {
        this.startInertia();
      }
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? 1 : -1;

    this.cameraState.targetDistance += delta * zoomSpeed * this.cameraState.distance;
    this.cameraState.targetDistance = Math.max(
      this.MIN_DISTANCE,
      Math.min(this.MAX_DISTANCE, this.cameraState.targetDistance)
    );

    gsap.to(this.cameraState, {
      distance: this.cameraState.targetDistance,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  private startInertia(): void {
    this.isInertiaActive = true;

    const inertiaDuration = 0.5;
    const startTheta = this.cameraState.theta;
    const startPhi = this.cameraState.phi;
    const targetTheta = startTheta + this.velocityTheta * 50;
    const targetPhi = startPhi + this.velocityPhi * 50;

    const clampedTargetPhi = Math.max(
      this.PHI_MIN,
      Math.min(this.PHI_MAX, targetPhi)
    );

    gsap.to(this.cameraState, {
      theta: targetTheta,
      phi: clampedTargetPhi,
      duration: inertiaDuration,
      ease: 'power2.out',
      onUpdate: () => {
        this.cameraState.targetTheta = this.cameraState.theta;
        this.cameraState.targetPhi = this.cameraState.phi;
      },
      onComplete: () => {
        this.isInertiaActive = false;
        this.velocityTheta = 0;
        this.velocityPhi = 0;
      }
    });
  }

  private updateMouseCoordinates(e: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastToLoom(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      const halfWidth = this.loom.width / 2;
      const halfHeight = this.loom.height / 2;

      if (
        intersection.x >= -halfWidth &&
        intersection.x <= halfWidth &&
        intersection.y >= -halfHeight &&
        intersection.y <= halfHeight
      ) {
        return intersection;
      }
    }

    return null;
  }

  private updateCameraPosition(): void {
    const x = this.cameraState.distance *
      Math.sin(this.cameraState.theta) *
      Math.cos(this.cameraState.phi);
    const y = this.cameraState.distance * Math.sin(this.cameraState.phi);
    const z = this.cameraState.distance *
      Math.cos(this.cameraState.theta) *
      Math.cos(this.cameraState.phi);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  public update(_time: number, _delta: number): void {
    if (!this.isInertiaActive) {
      this.cameraState.theta += (this.cameraState.targetTheta - this.cameraState.theta) * 0.1;
      this.cameraState.phi += (this.cameraState.targetPhi - this.cameraState.phi) * 0.1;
    }

    this.updateCameraPosition();
    this.onViewChange({
      theta: this.cameraState.theta,
      phi: this.cameraState.phi
    });
  }

  public getViewAngle(): { theta: number; phi: number } {
    return {
      theta: this.cameraState.theta,
      phi: this.cameraState.phi
    };
  }

  public resize(): void {
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.container.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
