import * as THREE from 'three';

export interface InteractionState {
  rotationVelocity: number;
  currentRotation: number;
  zoom: number;
  isDragging: boolean;
}

export type ClickCallback = (point: THREE.Vector3) => void;

export class InteractionHandler {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private islandGroup: THREE.Group;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private rotationVelocity: number = 0;
  private currentRotation: number = 0;
  private targetRotation: number = 0;

  private zoom: number = 1;
  private minZoom: number = 0.5;
  private maxZoom: number = 3;

  private terrainMesh: THREE.Mesh | null = null;
  private clickCallbacks: ClickCallback[] = [];

  private inertiaDecay: number = 0.92;
  private inertiaDuration: number = 0.3;

  constructor(
    domElement: HTMLElement,
    camera: THREE.PerspectiveCamera,
    islandGroup: THREE.Group
  ) {
    this.domElement = domElement;
    this.camera = camera;
    this.islandGroup = islandGroup;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  public setTerrainMesh(mesh: THREE.Mesh): void {
    this.terrainMesh = mesh;
  }

  public onClick(callback: ClickCallback): void {
    this.clickCallbacks.push(callback);
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('click', this.onClickHandler.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.rotationVelocity = 0;
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      const decayPerFrame = 0.92;
      const frames = (this.inertiaDuration * 60);
      this.rotationVelocity = this.rotationVelocity * Math.pow(decayPerFrame, -frames * 0.3);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = event.clientX - this.lastMouseX;
      this.lastMouseX = event.clientX;

      const sensitivity = 0.005;
      this.rotationVelocity = deltaX * sensitivity;
      this.targetRotation += this.rotationVelocity;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const zoomSpeed = 0.001;
    this.zoom -= event.deltaY * zoomSpeed;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
  }

  private onClickHandler(event: MouseEvent): void {
    if (!this.terrainMesh) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.terrainMesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.clickCallbacks.forEach(cb => cb(point.clone()));
    }
  }

  public update(deltaTime: number): void {
    if (!this.isDragging && Math.abs(this.rotationVelocity) > 0.0001) {
      this.targetRotation += this.rotationVelocity;
      this.rotationVelocity *= this.inertiaDecay;
    }

    this.currentRotation += (this.targetRotation - this.currentRotation) * 0.15;
    this.islandGroup.rotation.y = this.currentRotation;

    const baseDistance = 500;
    const targetZ = baseDistance / this.zoom;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
  }

  public getState(): InteractionState {
    return {
      rotationVelocity: this.rotationVelocity,
      currentRotation: this.currentRotation,
      zoom: this.zoom,
      isDragging: this.isDragging
    };
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
    this.domElement.removeEventListener('click', this.onClickHandler.bind(this));
  }
}
