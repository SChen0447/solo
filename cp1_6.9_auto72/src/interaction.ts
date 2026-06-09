import * as THREE from 'three';
import { GravityManager, GravitySource, GRAVITY_SOURCE_RADIUS } from './gravityManager';

const MIN_CAMERA_DISTANCE = 5;
const MAX_CAMERA_DISTANCE = 50;
const MIN_POLAR_ANGLE = Math.PI / 2 - (60 * Math.PI) / 180;
const MAX_POLAR_ANGLE = Math.PI / 2 + (60 * Math.PI) / 180;
const ZOOM_DURATION = 300;

export interface InteractionCallbacks {
  onGravitySourceCreated?: (source: GravitySource) => void;
  onGravitySourceMoved?: (source: GravitySource) => void;
  onGravitySourceRemoved?: (source: GravitySource) => void;
}

export class InteractionManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private gravityManager: GravityManager;
  private callbacks: InteractionCallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private ndcMouse: THREE.Vector2;
  private clickPlane: THREE.Plane;
  private tempVector: THREE.Vector3;
  private tempVector2: THREE.Vector3;

  private isDraggingSource = false;
  private draggedSource: GravitySource | null = null;
  private dragOffset = new THREE.Vector3();
  private isOrbiting = false;
  private orbitStartX = 0;
  private orbitStartY = 0;
  private isZooming = false;
  private zoomStart = 0;
  private zoomTarget = 0;
  private zoomStartTime = 0;
  private clickStartX = 0;
  private clickStartY = 0;
  private clickStartTime = 0;
  private leftButtonPressed = false;
  private rightButtonPressed = false;

  private cameraDistance = 20;
  private theta = 0;
  private phi = Math.PI / 2;
  private cameraTarget = new THREE.Vector3(0, 0, 0);

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    gravityManager: GravityManager,
    callbacks: InteractionCallbacks = {}
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.gravityManager = gravityManager;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.ndcMouse = new THREE.Vector2();
    this.clickPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.tempVector = new THREE.Vector3();
    this.tempVector2 = new THREE.Vector3();

    this.updateCameraPosition();
    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('contextmenu', this.onContextMenu);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    window.addEventListener('resize', this.onResize);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.ndcMouse.x = (this.mouse.x / rect.width) * 2 - 1;
    this.ndcMouse.y = -(this.mouse.y / rect.height) * 2 + 1;
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.updateMousePosition(e);

    if (e.button === 0) {
      this.leftButtonPressed = true;
      this.clickStartX = e.clientX;
      this.clickStartY = e.clientY;
      this.clickStartTime = performance.now();

      const hitSource = this.raycastGravitySource();
      if (hitSource) {
        this.isDraggingSource = true;
        this.draggedSource = hitSource;

        const intersectPoint = new THREE.Vector3();
        this.getPlaneIntersection(
          this.draggedSource.position,
          intersectPoint
        );
        this.dragOffset.copy(this.draggedSource.position).sub(intersectPoint);
      }
    } else if (e.button === 2) {
      this.rightButtonPressed = true;

      const hitSource = this.raycastGravitySource();
      if (hitSource) {
        this.gravityManager.removeGravitySource(hitSource.id);
        this.callbacks.onGravitySourceRemoved?.(hitSource);
      } else {
        this.isOrbiting = true;
        this.orbitStartX = e.clientX;
        this.orbitStartY = e.clientY;
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMousePosition(e);

    if (this.isDraggingSource && this.draggedSource) {
      const intersectPoint = new THREE.Vector3();
      this.getPlaneIntersection(
        this.draggedSource.position,
        intersectPoint
      );
      const newPos = intersectPoint.add(this.dragOffset);

      const BOUND = 28;
      newPos.x = Math.max(-BOUND, Math.min(BOUND, newPos.x));
      newPos.y = Math.max(-BOUND, Math.min(BOUND, newPos.y));
      newPos.z = Math.max(-BOUND, Math.min(BOUND, newPos.z));

      this.draggedSource.position.copy(newPos);
      this.draggedSource.mesh.position.copy(newPos);
      this.callbacks.onGravitySourceMoved?.(this.draggedSource);
    }

    if (this.isOrbiting) {
      const dx = e.clientX - this.orbitStartX;
      const dy = e.clientY - this.orbitStartY;

      this.theta -= dx * 0.005;
      this.phi -= dy * 0.005;

      this.phi = Math.max(MIN_POLAR_ANGLE, Math.min(MAX_POLAR_ANGLE, this.phi));

      this.orbitStartX = e.clientX;
      this.orbitStartY = e.clientY;

      this.updateCameraPosition();
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      if (this.isDraggingSource) {
        this.isDraggingSource = false;
        this.draggedSource = null;
      } else {
        const dx = Math.abs(e.clientX - this.clickStartX);
        const dy = Math.abs(e.clientY - this.clickStartY);
        const dt = performance.now() - this.clickStartTime;

        if (dx < 5 && dy < 5 && dt < 300) {
          const hitSource = this.raycastGravitySource();
          if (!hitSource) {
            this.tryCreateGravitySource();
          }
        }
      }
      this.leftButtonPressed = false;
    } else if (e.button === 2) {
      this.isOrbiting = false;
      this.rightButtonPressed = false;
    }
  };

  private onMouseLeave = (): void => {
    this.isDraggingSource = false;
    this.draggedSource = null;
    this.isOrbiting = false;
    this.leftButtonPressed = false;
    this.rightButtonPressed = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = e.deltaY * 0.01;
    this.zoomTarget = this.cameraDistance + delta * 2;
    this.zoomTarget = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, this.zoomTarget));

    this.isZooming = true;
    this.zoomStart = this.cameraDistance;
    this.zoomStartTime = performance.now();
  };

  private onResize = (): void => {
    this.updateCameraAspect();
  };

  private raycastGravitySource(): GravitySource | null {
    this.raycaster.setFromCamera(this.ndcMouse, this.camera);

    const sources = this.gravityManager.getSources();
    const meshes = sources.map((s) => s.mesh);

    if (meshes.length === 0) return null;

    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const id = (hit.object as THREE.Mesh).userData.gravitySourceId;
      return this.gravityManager.getSourceById(id) ?? null;
    }
    return null;
  }

  private getPlaneIntersection(
    referencePoint: THREE.Vector3,
    target: THREE.Vector3
  ): boolean {
    this.raycaster.setFromCamera(this.ndcMouse, this.camera);

    this.clickPlane.setFromNormalAndCoplanarPoint(
      this.tempVector.set(0, 0, 1).applyQuaternion(this.camera.quaternion).normalize(),
      referencePoint
    );

    return this.raycaster.ray.intersectPlane(this.clickPlane, target) !== null;
  }

  private tryCreateGravitySource(): void {
    const intersectPoint = new THREE.Vector3();
    this.getPlaneIntersection(this.cameraTarget, intersectPoint);

    const BOUND = 28;
    intersectPoint.x = Math.max(-BOUND, Math.min(BOUND, intersectPoint.x));
    intersectPoint.y = Math.max(-BOUND, Math.min(BOUND, intersectPoint.y));
    intersectPoint.z = Math.max(-BOUND, Math.min(BOUND, intersectPoint.z));

    const source = this.gravityManager.createGravitySource(intersectPoint);
    if (source) {
      this.callbacks.onGravitySourceCreated?.(source);
    }
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.phi);

    this.tempVector.set(
      sinPhi * Math.sin(this.theta),
      Math.cos(this.phi),
      sinPhi * Math.cos(this.theta)
    );
    this.tempVector.multiplyScalar(this.cameraDistance);
    this.tempVector.add(this.cameraTarget);

    this.camera.position.copy(this.tempVector);
    this.camera.lookAt(this.cameraTarget);
  }

  private updateCameraAspect(): void {
    const canvas = this.renderer.domElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  update(delta: number): void {
    if (this.isZooming) {
      const elapsed = performance.now() - this.zoomStartTime;
      const t = Math.min(elapsed / ZOOM_DURATION, 1.0);
      const easeT = t * (2 - t);

      this.cameraDistance = this.zoomStart + (this.zoomTarget - this.zoomStart) * easeT;
      this.updateCameraPosition();

      if (t >= 1.0) {
        this.isZooming = false;
      }
    }
  }

  setCameraTarget(target: THREE.Vector3): void {
    this.cameraTarget.copy(target);
    this.updateCameraPosition();
  }

  dispose(): void {
    const canvas = this.renderer.domElement;

    canvas.removeEventListener('contextmenu', this.onContextMenu);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('mouseleave', this.onMouseLeave);
    canvas.removeEventListener('wheel', this.onWheel);

    window.removeEventListener('resize', this.onResize);
  }
}
