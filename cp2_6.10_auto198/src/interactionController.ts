import * as THREE from 'three';
import { debounce } from 'lodash';
import { SceneManager, RoomData } from './sceneManager';

export type InteractionMode = 'view' | 'annotate' | 'measure';

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private sceneManager: SceneManager;

  private mode: InteractionMode = 'view';

  private spherical = {
    radius: 25,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };

  private targetSpherical = {
    radius: 25,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };

  private target: THREE.Vector3 = new THREE.Vector3(0, 3.5, 0);
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 3.5, 0);

  private isLeftDragging = false;
  private isRightDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  private static readonly MIN_DISTANCE = 5;
  private static readonly MAX_DISTANCE = 50;
  private static readonly MIN_PHI = 0.1;
  private static readonly MAX_PHI = Math.PI / 2 - 0.05;
  private static readonly ROTATE_SPEED = 0.008;
  private static readonly PAN_SPEED = 0.015;
  private static readonly ZOOM_SPEED = 0.001;
  private static readonly LERP_FACTOR = 0.12;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private measurementStartPoint: THREE.Vector3 | null = null;

  private roomSelectCallback: ((room: RoomData | null) => void) | null = null;
  private annotationRequestCallback: ((position: THREE.Vector3, screenX: number, screenY: number) => void) | null = null;
  private measurementCompleteCallback: ((start: THREE.Vector3, end: THREE.Vector3) => void) | null = null;
  private measurementFirstPointCallback: ((point: THREE.Vector3) => void) | null = null;
  private modeChangeCallback: ((mode: InteractionMode) => void) | null = null;

  private handleClickDebounced: (event: MouseEvent) => void;

  private mouseDownX = 0;
  private mouseDownY = 0;
  private hasDragged = false;
  private static readonly DRAG_THRESHOLD = 5;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    sceneManager: SceneManager
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.sceneManager = sceneManager;

    this.handleClickDebounced = debounce(this.handleClick.bind(this), 80, {
      leading: true,
      trailing: false
    });

    this.target.copy(sceneManager.getSceneCenter());
    this.targetLookAt.copy(this.target);

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      this.isLeftDragging = true;
      this.hasDragged = false;
    } else if (event.button === 2) {
      this.isRightDragging = true;
      this.hasDragged = false;
    }
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
    this.mouseDownX = event.clientX;
    this.mouseDownY = event.clientY;
  }

  private onMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - this.previousMouseX;
    const deltaY = event.clientY - this.previousMouseY;

    const totalDeltaX = Math.abs(event.clientX - this.mouseDownX);
    const totalDeltaY = Math.abs(event.clientY - this.mouseDownY);
    if (totalDeltaX > InteractionController.DRAG_THRESHOLD || totalDeltaY > InteractionController.DRAG_THRESHOLD) {
      this.hasDragged = true;
    }

    if (this.isLeftDragging && this.mode === 'view') {
      this.targetSpherical.theta -= deltaX * InteractionController.ROTATE_SPEED;
      this.targetSpherical.phi -= deltaY * InteractionController.ROTATE_SPEED;
      this.targetSpherical.phi = Math.max(
        InteractionController.MIN_PHI,
        Math.min(InteractionController.MAX_PHI, this.targetSpherical.phi)
      );
    }

    if (this.isRightDragging) {
      const panX = -deltaX * InteractionController.PAN_SPEED * (this.spherical.radius / 20);
      const panY = deltaY * InteractionController.PAN_SPEED * (this.spherical.radius / 20);

      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();

      this.targetLookAt.addScaledVector(right, panX);
      this.targetLookAt.y += panY;
    }

    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isLeftDragging = false;
      if (!this.hasDragged) {
        this.handleClickDebounced(event);
      }
    } else if (event.button === 2) {
      this.isRightDragging = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = 1 + event.deltaY * InteractionController.ZOOM_SPEED;
    this.targetSpherical.radius = Math.max(
      InteractionController.MIN_DISTANCE,
      Math.min(InteractionController.MAX_DISTANCE, this.targetSpherical.radius * zoomFactor)
    );
  }

  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.mode === 'measure' || this.mode === 'annotate') {
        this.measurementStartPoint = null;
        this.setMode('view');
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.isLeftDragging = true;
      this.hasDragged = false;
      this.previousMouseX = event.touches[0].clientX;
      this.previousMouseY = event.touches[0].clientY;
      this.mouseDownX = event.touches[0].clientX;
      this.mouseDownY = event.touches[0].clientY;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1 && this.isLeftDragging && this.mode === 'view') {
      const deltaX = event.touches[0].clientX - this.previousMouseX;
      const deltaY = event.touches[0].clientY - this.previousMouseY;

      const totalDeltaX = Math.abs(event.touches[0].clientX - this.mouseDownX);
      const totalDeltaY = Math.abs(event.touches[0].clientY - this.mouseDownY);
      if (totalDeltaX > InteractionController.DRAG_THRESHOLD || totalDeltaY > InteractionController.DRAG_THRESHOLD) {
        this.hasDragged = true;
      }

      this.targetSpherical.theta -= deltaX * InteractionController.ROTATE_SPEED;
      this.targetSpherical.phi -= deltaY * InteractionController.ROTATE_SPEED;
      this.targetSpherical.phi = Math.max(
        InteractionController.MIN_PHI,
        Math.min(InteractionController.MAX_PHI, this.targetSpherical.phi)
      );

      this.previousMouseX = event.touches[0].clientX;
      this.previousMouseY = event.touches[0].clientY;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (event.touches.length === 0) {
      if (this.isLeftDragging && !this.hasDragged && event.changedTouches.length > 0) {
        const touch = event.changedTouches[0];
        const simulatedEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        } as MouseEvent;
        this.handleClickDebounced(simulatedEvent);
      }
      this.isLeftDragging = false;
    }
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersectables = this.sceneManager.getIntersectables();
    const intersects = this.raycaster.intersectObjects(intersectables, false);

    if (intersects.length === 0) {
      if (this.mode === 'view') {
        this.sceneManager.highlightRoom(null);
        if (this.roomSelectCallback) {
          this.roomSelectCallback(null);
        }
      }
      return;
    }

    const hitPoint = intersects[0].point;
    const hitObject = intersects[0].object;

    switch (this.mode) {
      case 'view':
        this.handleViewClick(hitObject);
        break;
      case 'annotate':
        this.handleAnnotateClick(hitPoint, event.clientX, event.clientY);
        break;
      case 'measure':
        this.handleMeasureClick(hitPoint);
        break;
    }
  }

  private handleViewClick(hitObject: THREE.Object3D): void {
    const userData = hitObject.userData;
    let roomId: string | null = null;

    if (userData.type === 'wall' || userData.type === 'room_floor') {
      roomId = userData.roomId;
    }

    if (roomId) {
      this.sceneManager.highlightRoom(roomId);
      const roomData = this.sceneManager.getRoomById(roomId);
      if (this.roomSelectCallback && roomData) {
        this.roomSelectCallback(roomData);
      }
    } else {
      this.sceneManager.highlightRoom(null);
      if (this.roomSelectCallback) {
        this.roomSelectCallback(null);
      }
    }
  }

  private handleAnnotateClick(position: THREE.Vector3, screenX: number, screenY: number): void {
    if (this.annotationRequestCallback) {
      this.annotationRequestCallback(position.clone(), screenX, screenY);
    }
  }

  private handleMeasureClick(position: THREE.Vector3): void {
    if (!this.measurementStartPoint) {
      this.measurementStartPoint = position.clone();
      if (this.measurementFirstPointCallback) {
        this.measurementFirstPointCallback(position.clone());
      }
    } else {
      const start = this.measurementStartPoint;
      const end = position.clone();
      this.measurementStartPoint = null;
      if (this.measurementCompleteCallback) {
        this.measurementCompleteCallback(start, end);
      }
    }
  }

  private updateCameraPosition(): void {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi);
    const x = this.target.x + sinPhiRadius * Math.sin(this.spherical.theta);
    const y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.target.z + sinPhiRadius * Math.cos(this.spherical.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.measurementStartPoint = null;
    if (this.modeChangeCallback) {
      this.modeChangeCallback(mode);
    }
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  resetCamera(): void {
    const center = this.sceneManager.getSceneCenter();
    this.targetSpherical = {
      radius: 25,
      theta: Math.PI / 4,
      phi: Math.PI / 3
    };
    this.targetLookAt.copy(center);
  }

  resetMeasurement(): void {
    this.measurementStartPoint = null;
  }

  update(): void {
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * InteractionController.LERP_FACTOR;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * InteractionController.LERP_FACTOR;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * InteractionController.LERP_FACTOR;

    this.target.lerp(this.targetLookAt, InteractionController.LERP_FACTOR);

    this.updateCameraPosition();
  }

  onRoomSelect(callback: (room: RoomData | null) => void): void {
    this.roomSelectCallback = callback;
  }

  onAnnotationRequest(callback: (position: THREE.Vector3, screenX: number, screenY: number) => void): void {
    this.annotationRequestCallback = callback;
  }

  onMeasurementComplete(callback: (start: THREE.Vector3, end: THREE.Vector3) => void): void {
    this.measurementCompleteCallback = callback;
  }

  onMeasurementFirstPoint(callback: (point: THREE.Vector3) => void): void {
    this.measurementFirstPointCallback = callback;
  }

  onModeChange(callback: (mode: InteractionMode) => void): void {
    this.modeChangeCallback = callback;
  }

  getMeasurementStartPoint(): THREE.Vector3 | null {
    return this.measurementStartPoint;
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}
