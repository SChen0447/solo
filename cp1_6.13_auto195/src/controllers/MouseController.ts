import * as THREE from 'three';
import { CrystalCaveData } from '../data/CrystalCaveData';

export class MouseController {
  private domElement: HTMLElement;
  private data: CrystalCaveData;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private wallMesh: THREE.Mesh | null = null;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  public cameraAngleY: number = 0;
  public cameraAngleX: number = Math.PI * 0.2;
  public cameraDistance: number = 8;
  public minCameraDistance: number = 3;
  public maxCameraDistance: number = 10;

  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onWheelBound: (e: WheelEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;

  constructor(
    domElement: HTMLElement,
    data: CrystalCaveData,
    camera: THREE.PerspectiveCamera
  ) {
    this.domElement = domElement;
    this.data = data;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onContextMenuBound = this.onContextMenu.bind(this);

    this.domElement.addEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.domElement.addEventListener('mouseup', this.onMouseUpBound);
    this.domElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenuBound);
  }

  public setWallMesh(mesh: THREE.Mesh): void {
    this.wallMesh = mesh;
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private updateMouseCoords(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseMove(e: MouseEvent): void {
    const prevX = this.mouse.x;
    const prevY = this.mouse.y;

    this.updateMouseCoords(e);

    const dx = this.mouse.x - prevX;
    const dy = this.mouse.y - prevY;
    this.data.mouseVelocity.set(dx * 100, dy * 100);

    if (this.isDragging) {
      const rotationSpeed = 0.005;
      this.cameraAngleY -= (e.clientX - this.lastMouseX) * rotationSpeed;
      this.cameraAngleX -= (e.clientY - this.lastMouseY) * rotationSpeed;

      const minXAngle = -Math.PI * 0.3;
      const maxXAngle = Math.PI * 0.45;
      this.cameraAngleX = Math.max(minXAngle, Math.min(maxXAngle, this.cameraAngleX));
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.updateRayIntersection();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    if (e.button === 0) {
      this.data.isMouseDown = true;
      this.handleClick();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = false;
    }
    if (e.button === 0) {
      this.data.isMouseDown = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const zoomSpeed = 0.1;
    if (e.deltaY > 0) {
      this.cameraDistance += zoomSpeed;
    } else {
      this.cameraDistance -= zoomSpeed;
    }

    this.cameraDistance = Math.max(
      this.minCameraDistance,
      Math.min(this.maxCameraDistance, this.cameraDistance)
    );
  }

  private updateRayIntersection(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.wallMesh) {
      const intersects = this.raycaster.intersectObject(this.wallMesh);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        this.data.setMouseIntersection(point);
        return;
      }
    }

    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3();
    direction.copy(this.raycaster.ray.direction);

    const t = -origin.y / direction.y;
    if (t > 0 && t < 50) {
      const intersectionPoint = origin.clone().add(direction.multiplyScalar(t));
      const dist = intersectionPoint.length();
      if (dist < this.data.caveRadius * 1.2) {
        const clampedPoint = intersectionPoint.normalize().multiplyScalar(
          this.data.caveRadius * 0.9
        );
        this.data.setMouseIntersection(clampedPoint);
        return;
      }
    }

    this.data.setMouseIntersection(null);
  }

  private handleClick(): void {
    if (this.data.mouseIntersection) {
      this.data.triggerShatter(this.data.mouseIntersection);
    }
  }

  public updateCamera(): void {
    const center = new THREE.Vector3(0, 0, 0);

    const x = this.cameraDistance * Math.cos(this.cameraAngleX) * Math.sin(this.cameraAngleY);
    const y = this.cameraDistance * Math.sin(this.cameraAngleX);
    const z = this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(x, y + 1, z);
    this.camera.lookAt(center);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMoveBound);
    this.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    this.domElement.removeEventListener('mouseup', this.onMouseUpBound);
    this.domElement.removeEventListener('wheel', this.onWheelBound);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
  }
}
