import * as THREE from 'three';
import { ForceField, ForceFieldType } from './ForceField';
import { ParticleEmitter, ParticleData } from './ParticleEmitter';

export interface InteractionCallbacks {
  onAddForceField: (position: THREE.Vector3, type: ForceFieldType) => void;
  onUpdateGravityStrength: (value: number) => void;
  onRemoveForceField?: (ff: ForceField) => void;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private emitter: ParticleEmitter;
  private forceFields: ForceField[];
  private callbacks: InteractionCallbacks;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private mouseWorld: THREE.Vector3;

  private isDragging: boolean = false;
  private draggedField: ForceField | null = null;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private dragPlane: THREE.Plane = new THREE.Plane();

  private isSpacePressed: boolean = false;
  private isRecordTrail: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2();

  public onForceFieldSelected?: (ff: ForceField | null) => void;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    emitter: ParticleEmitter,
    forceFields: ForceField[],
    callbacks: InteractionCallbacks
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.emitter = emitter;
    this.forceFields = forceFields;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mouseWorld = new THREE.Vector3();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => this.onWheel(e));

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    window.addEventListener('resize', () => this.onResize());
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectYPlane(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, target);
    return hit ? target : null;
  }

  private getFieldAtMouse(): ForceField | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    for (const ff of this.forceFields) {
      const meshes = [ff.innerSphere, ff.sphere, ff.glow];
      const intersects = this.raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        return ff;
      }
      if (this.raycaster.ray.distanceToPoint(ff.position) < ff.radius * 0.5) {
        return ff;
      }
    }
    return null;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.isDragging && this.draggedField) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const target = new THREE.Vector3();
      const hit = this.raycaster.ray.intersectPlane(this.dragPlane, target);
      if (hit) {
        target.add(this.dragOffset);
        const boundaryR = 13;
        if (target.length() > boundaryR) {
          target.normalize().multiplyScalar(boundaryR);
        }
        this.draggedField.setPosition(target);
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.updateMouse(e);
    this.mouseDownTime = performance.now();
    this.mouseDownPos.copy(this.mouse);

    const hitField = this.getFieldAtMouse();

    if (hitField) {
      this.isDragging = true;
      this.draggedField = hitField;
      this.dragPlane.setFromNormalAndCoplanarPoint(
        this.camera.getWorldDirection(new THREE.Vector3()).negate(),
        hitField.position
      );
      const planeHit = new THREE.Vector3();
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, planeHit)) {
        this.dragOffset.copy(hitField.position).sub(planeHit);
      }
      if (this.onForceFieldSelected) {
        this.onForceFieldSelected(hitField);
      }
      return;
    }

    if (e.button === 0 || e.button === 2) {
      const hitPoint = this.intersectYPlane();
      if (hitPoint) {
        const boundaryR = 14;
        if (hitPoint.length() > boundaryR) {
          hitPoint.normalize().multiplyScalar(boundaryR);
        }
        const type: ForceFieldType = e.button === 0 ? 'attract' : 'repel';
        this.callbacks.onAddForceField(hitPoint, type);
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.isDragging = false;
    this.draggedField = null;
  }

  private onWheel(e: WheelEvent): void {
    const hitField = this.getFieldAtMouse();
    if (hitField) {
      e.preventDefault();
      if (e.shiftKey) {
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        hitField.setRadius(hitField.radius + delta);
      } else {
        const delta = e.deltaY > 0 ? -1 : 1;
        hitField.setStrength(
          Math.max(-10, Math.min(10, hitField.strength + delta))
        );
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        this.isSpacePressed = true;
        break;
      case 'KeyT':
        this.isRecordTrail = !this.isRecordTrail;
        const trailToggle = document.getElementById('show-trails') as HTMLInputElement;
        if (trailToggle) trailToggle.checked = this.isRecordTrail;
        break;
      case 'KeyC':
        this.emitter.clearTrails();
        break;
      case 'KeyR':
        if (this.draggedField) {
          this.draggedField.setStrength(5);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.draggedField && this.callbacks.onRemoveForceField) {
          this.callbacks.onRemoveForceField(this.draggedField);
          this.draggedField = null;
        }
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'Space':
        this.isSpacePressed = false;
        break;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public isConnectionsMode(): boolean {
    return this.isSpacePressed;
  }

  public isTrailMode(): boolean {
    return this.isRecordTrail;
  }

  public setTrailMode(v: boolean): void {
    this.isRecordTrail = v;
  }

  public getMouseWorld(): THREE.Vector3 {
    return this.mouseWorld;
  }

  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }

  public getMouseNDC(): THREE.Vector2 {
    return this.mouse;
  }
}
