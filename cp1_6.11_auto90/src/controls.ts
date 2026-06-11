import * as THREE from 'three';

export interface CameraState {
  theta: number;
  phi: number;
  distance: number;
  targetTheta: number;
  targetPhi: number;
  targetDistance: number;
}

export class NebulaControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private state: CameraState;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private readonly inertia: number = 0.5;
  private readonly rotationSpeedX: number = 0.003;
  private readonly rotationSpeedY: number = 0.002;
  private readonly minPhi: number = (5 * Math.PI) / 180;
  private readonly maxPhi: number = (175 * Math.PI) / 180;
  private readonly minDistance: number = 1;
  private readonly maxDistance: number = 25;
  private readonly baseDistance: number = 5;

  public onCameraChange?: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.state = {
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      distance: this.baseDistance,
      targetTheta: Math.PI / 4,
      targetPhi: Math.PI / 3,
      targetDistance: this.baseDistance
    };

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.state.targetTheta -= deltaX * this.rotationSpeedX;
    this.state.targetPhi -= deltaY * this.rotationSpeedY;

    this.state.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.state.targetPhi));

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const zoomDelta = event.deltaY > 0 ? 1 : -1;
    this.state.targetDistance += zoomDelta;

    this.state.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.state.targetDistance)
    );
  }

  public update(): void {
    this.state.theta += (this.state.targetTheta - this.state.theta) * this.inertia;
    this.state.phi += (this.state.targetPhi - this.state.phi) * this.inertia;
    this.state.distance += (this.state.targetDistance - this.state.distance) * this.inertia;

    this.updateCameraPosition();

    if (this.onCameraChange) {
      this.onCameraChange();
    }
  }

  private updateCameraPosition(): void {
    const { theta, phi, distance } = this.state;

    this.camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = distance * Math.cos(phi);
    this.camera.position.z = distance * Math.sin(phi) * Math.sin(theta);

    this.camera.lookAt(0, 0, 0);
  }

  public getDistance(): number {
    return this.state.distance;
  }

  public getSizeCompensation(): number {
    return Math.sqrt(1 / this.state.distance);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
