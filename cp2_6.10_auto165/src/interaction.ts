import * as THREE from 'three';
import { RubiksCube, RotationMove } from './cube';

const STEP = 1.05;

export interface RotationCallback {
  (axis: 'x' | 'y' | 'z', layer: number, direction: number): void;
}

export class CubeInteraction {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private cube: RubiksCube;
  private onRotate: RotationCallback;
  private isDragging = false;
  private dragStart: THREE.Vector2 | null = null;
  private dragThreshold = 5;

  constructor(
    camera: THREE.PerspectiveCamera,
    cube: RubiksCube,
    onRotate: RotationCallback
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.cube = cube;
    this.onRotate = onRotate;
  }

  public handlePointerDown(event: PointerEvent, container: HTMLElement) {
    if (this.cube.isAnimating) return;
    this.isDragging = true;
    this.dragStart = new THREE.Vector2(event.clientX, event.clientY);
    this.updateMouse(event, container);
  }

  public handlePointerUp(event: PointerEvent, container: HTMLElement) {
    if (!this.isDragging || !this.dragStart) return;

    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.isDragging = false;

    if (this.cube.isAnimating) return;

    if (distance < this.dragThreshold) {
      this.handleClick(event, container);
    } else {
      this.handleDrag(event, container, dx, dy);
    }

    this.dragStart = null;
  }

  private updateMouse(event: PointerEvent, container: HTMLElement) {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(event: PointerEvent, container: HTMLElement) {
    this.updateMouse(event, container);
    const intersect = this.getIntersection();
    if (!intersect) return;

    const { faceNormal, cubiePosition } = intersect;
    const { axis, layer, direction } = this.computeRotationFromClick(
      faceNormal,
      cubiePosition,
      event,
      container
    );

    if (axis) {
      this.onRotate(axis, layer, direction);
    }
  }

  private handleDrag(
    event: PointerEvent,
    container: HTMLElement,
    dx: number,
    dy: number
  ) {
    if (!this.dragStart) return;

    const startEvent = new PointerEvent('pointerdown', {
      clientX: this.dragStart.x,
      clientY: this.dragStart.y,
    });
    this.updateMouse(startEvent, container);
    const intersect = this.getIntersection();
    if (!intersect) return;

    const { faceNormal, cubiePosition } = intersect;
    const { axis, layer, direction } = this.computeRotationFromDrag(
      faceNormal,
      cubiePosition,
      dx,
      dy
    );

    if (axis) {
      this.onRotate(axis, layer, direction);
    }
  }

  private getIntersection(): {
    faceNormal: THREE.Vector3;
    cubiePosition: THREE.Vector3;
  } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const targets: THREE.Object3D[] = [];
    this.cube.cubies.forEach((c) => targets.push(c.mesh));

    const intersects = this.raycaster.intersectObjects(targets, true);
    if (intersects.length === 0) return null;

    const hit = intersects[0];
    if (!hit.face) return null;

    const normal = hit.face.normal.clone();
    normal.transformDirection(hit.object.matrixWorld).normalize();

    let cubieObj: THREE.Object3D | null = hit.object;
    while (cubieObj && cubieObj.parent !== this.cube.group) {
      cubieObj = cubieObj.parent;
    }
    if (!cubieObj) return null;

    const worldPos = new THREE.Vector3();
    cubieObj.getWorldPosition(worldPos);
    const localPos = this.cube.group.worldToLocal(worldPos.clone());

    return {
      faceNormal: normal,
      cubiePosition: localPos,
    };
  }

  private computeRotationFromClick(
    faceNormal: THREE.Vector3,
    cubiePosition: THREE.Vector3,
    event: PointerEvent,
    container: HTMLElement
  ): { axis: 'x' | 'y' | 'z' | null; layer: number; direction: number } {
    const absX = Math.abs(faceNormal.x);
    const absY = Math.abs(faceNormal.y);
    const absZ = Math.abs(faceNormal.z);

    let normalAxis: 'x' | 'y' | 'z';
    if (absX > absY && absX > absZ) normalAxis = 'x';
    else if (absY > absX && absY > absZ) normalAxis = 'y';
    else normalAxis = 'z';

    const rect = container.getBoundingClientRect();
    const localX = event.clientX - rect.left - rect.width / 2;
    const localY = event.clientY - rect.top - rect.height / 2;

    let rotAxis: 'x' | 'y' | 'z';
    let direction = 1;

    if (normalAxis === 'x') {
      rotAxis = Math.abs(localY) > Math.abs(localX) ? 'z' : 'y';
      direction = (rotAxis === 'z' ? localY : localX) > 0 ? -1 : 1;
      if (faceNormal.x < 0) direction *= -1;
    } else if (normalAxis === 'y') {
      rotAxis = Math.abs(localX) > Math.abs(localY) ? 'x' : 'z';
      direction = (rotAxis === 'x' ? localX : localY) > 0 ? 1 : -1;
      if (faceNormal.y < 0) direction *= -1;
    } else {
      rotAxis = Math.abs(localY) > Math.abs(localX) ? 'y' : 'x';
      direction = (rotAxis === 'y' ? localY : localX) > 0 ? -1 : 1;
      if (faceNormal.z < 0) direction *= -1;
    }

    const layer = Math.round(
      rotAxis === 'x'
        ? cubiePosition.x / STEP
        : rotAxis === 'y'
        ? cubiePosition.y / STEP
        : cubiePosition.z / STEP
    );

    return { axis: rotAxis, layer, direction };
  }

  private computeRotationFromDrag(
    faceNormal: THREE.Vector3,
    cubiePosition: THREE.Vector3,
    dx: number,
    dy: number
  ): { axis: 'x' | 'y' | 'z' | null; layer: number; direction: number } {
    const absX = Math.abs(faceNormal.x);
    const absY = Math.abs(faceNormal.y);
    const absZ = Math.abs(faceNormal.z);

    let normalAxis: 'x' | 'y' | 'z';
    if (absX > absY && absX > absZ) normalAxis = 'x';
    else if (absY > absX && absY > absZ) normalAxis = 'y';
    else normalAxis = 'z';

    let rotAxis: 'x' | 'y' | 'z';
    let direction = 1;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (normalAxis === 'y') rotAxis = 'x';
      else if (normalAxis === 'x') rotAxis = 'y';
      else rotAxis = 'x';
      direction = dx > 0 ? 1 : -1;
    } else {
      if (normalAxis === 'x') rotAxis = 'z';
      else if (normalAxis === 'z') rotAxis = 'y';
      else rotAxis = 'z';
      direction = dy > 0 ? -1 : 1;
    }

    const normalSign =
      normalAxis === 'x'
        ? Math.sign(faceNormal.x)
        : normalAxis === 'y'
        ? Math.sign(faceNormal.y)
        : Math.sign(faceNormal.z);

    if (normalSign < 0) direction *= -1;

    const layer = Math.round(
      rotAxis === 'x'
        ? cubiePosition.x / STEP
        : rotAxis === 'y'
        ? cubiePosition.y / STEP
        : cubiePosition.z / STEP
    );

    return { axis: rotAxis, layer, direction };
  }
}
