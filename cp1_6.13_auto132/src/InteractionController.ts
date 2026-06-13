import * as THREE from 'three';
import { CrystalManager } from './CrystalManager';
import { Crystal } from './Crystal';

export interface InteractionConfig {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  crystalManager: CrystalManager;
  onCrystalHover?: (crystal: Crystal | null) => void;
  onCrystalClick?: (crystal: Crystal) => void;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private crystalManager: CrystalManager;
  private onCrystalHover?: (crystal: Crystal | null) => void;
  private onCrystalClick?: (crystal: Crystal) => void;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private normalizedMouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngle: { theta: number; phi: number } = { theta: 0, phi: Math.PI / 4 };
  private targetCameraAngle: { theta: number; phi: number } = { theta: 0, phi: Math.PI / 4 };
  private cameraDistance: number = 30;
  private targetCameraDistance: number = 30;
  private cameraCenter: THREE.Vector3 = new THREE.Vector3(0, 3, 0);

  private hoveredCrystal: Crystal | null = null;
  private clickedCrystal: Crystal | null = null;
  private clickThreshold: number = 5;
  private dragStartPosition: { x: number; y: number } = { x: 0, y: 0 };

  private isTouchDevice: boolean;
  private touchStartTime: number = 0;

  private minPhi: number = 0.1;
  private maxPhi: number = Math.PI / 2 - 0.1;
  private minDistance: number = 10;
  private maxDistance: number = 60;

  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: (e: MouseEvent) => void;
  private boundOnMouseLeave: () => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;

  constructor(config: InteractionConfig) {
    this.camera = config.camera;
    this.renderer = config.renderer;
    this.crystalManager = config.crystalManager;
    this.onCrystalHover = config.onCrystalHover;
    this.onCrystalClick = config.onCrystalClick;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.normalizedMouse = new THREE.Vector2();

    this.isTouchDevice = 'ontouchstart' in window;

    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.boundOnMouseDown);
    canvas.addEventListener('mousemove', this.boundOnMouseMove);
    canvas.addEventListener('mouseup', this.boundOnMouseUp);
    canvas.addEventListener('mouseleave', this.boundOnMouseLeave);
    canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });

    if (this.isTouchDevice) {
      canvas.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
      canvas.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
      canvas.addEventListener('touchend', this.boundOnTouchEnd, { passive: false });
    }
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = clientX - rect.left;
    this.mouse.y = clientY - rect.top;
    
    this.normalizedMouse.x = (this.mouse.x / rect.width) * 2 - 1;
    this.normalizedMouse.y = -(this.mouse.y / rect.height) * 2 + 1;
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.dragStartPosition = { x: e.clientX, y: e.clientY };
    this.updateMousePosition(e.clientX, e.clientY);
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e.clientX, e.clientY);

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      this.targetCameraAngle.theta -= deltaX * 0.005;
      this.targetCameraAngle.phi -= deltaY * 0.005;
      this.targetCameraAngle.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetCameraAngle.phi));

      this.previousMouse = { x: e.clientX, y: e.clientY };
    } else {
      this.checkHover();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - this.dragStartPosition.x, 2) +
      Math.pow(e.clientY - this.dragStartPosition.y, 2)
    );

    if (dragDistance < this.clickThreshold) {
      this.checkClick();
    }

    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.setHoveredCrystal(null);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.01;
    this.targetCameraDistance += e.deltaY * zoomSpeed;
    this.targetCameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetCameraDistance));
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.previousMouse = { x: touch.clientX, y: touch.clientY };
      this.dragStartPosition = { x: touch.clientX, y: touch.clientY };
      this.touchStartTime = Date.now();
      this.updateMousePosition(touch.clientX, touch.clientY);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.updateMousePosition(touch.clientX, touch.clientY);

      if (this.isDragging) {
        const deltaX = touch.clientX - this.previousMouse.x;
        const deltaY = touch.clientY - this.previousMouse.y;

        this.targetCameraAngle.theta -= deltaX * 0.005;
        this.targetCameraAngle.phi -= deltaY * 0.005;
        this.targetCameraAngle.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetCameraAngle.phi));

        this.previousMouse = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length === 1) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const dragDistance = Math.sqrt(
        Math.pow(touch.clientX - this.dragStartPosition.x, 2) +
        Math.pow(touch.clientY - this.dragStartPosition.y, 2)
      );

      const touchDuration = Date.now() - this.touchStartTime;

      if (dragDistance < this.clickThreshold && touchDuration < 300) {
        this.updateMousePosition(touch.clientX, touch.clientY);
        this.checkClick();
      }

      this.isDragging = false;
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    
    const meshes = this.crystalManager.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const crystal = this.crystalManager.findCrystalByMesh(intersects[0].object);
      if (crystal && !crystal.isFragment) {
        this.setHoveredCrystal(crystal);
        this.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }

    this.setHoveredCrystal(null);
    this.renderer.domElement.style.cursor = 'grab';
  }

  private checkClick(): void {
    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    
    const meshes = this.crystalManager.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const crystal = this.crystalManager.findCrystalByMesh(intersects[0].object);
      if (crystal && !crystal.isFragment && !crystal.isDendrite) {
        this.clickedCrystal = crystal;
        if (this.onCrystalClick) {
          this.onCrystalClick(crystal);
        }
      }
    }
  }

  private setHoveredCrystal(crystal: Crystal | null): void {
    if (this.hoveredCrystal === crystal) return;

    if (this.hoveredCrystal) {
      this.hoveredCrystal.setHover(false);
    }

    this.hoveredCrystal = crystal;

    if (this.hoveredCrystal) {
      this.hoveredCrystal.setHover(true);
    }

    if (this.onCrystalHover) {
      this.onCrystalHover(crystal);
    }
  }

  public update(delta: number): void {
    const angleLerpSpeed = 8 * delta;
    const distanceLerpSpeed = 5 * delta;

    this.cameraAngle.theta += (this.targetCameraAngle.theta - this.cameraAngle.theta) * angleLerpSpeed;
    this.cameraAngle.phi += (this.targetCameraAngle.phi - this.cameraAngle.phi) * angleLerpSpeed;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * distanceLerpSpeed;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
    const y = this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z = this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);

    this.camera.position.set(
      this.cameraCenter.x + x,
      this.cameraCenter.y + y,
      this.cameraCenter.z + z
    );

    this.camera.lookAt(this.cameraCenter);
  }

  public setCameraCenter(center: THREE.Vector3): void {
    this.cameraCenter.copy(center);
  }

  public getHoveredCrystal(): Crystal | null {
    return this.hoveredCrystal;
  }

  public getClickedCrystal(): Crystal | null {
    return this.clickedCrystal;
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;

    canvas.removeEventListener('mousedown', this.boundOnMouseDown);
    canvas.removeEventListener('mousemove', this.boundOnMouseMove);
    canvas.removeEventListener('mouseup', this.boundOnMouseUp);
    canvas.removeEventListener('mouseleave', this.boundOnMouseLeave);
    canvas.removeEventListener('wheel', this.boundOnWheel);

    if (this.isTouchDevice) {
      canvas.removeEventListener('touchstart', this.boundOnTouchStart);
      canvas.removeEventListener('touchmove', this.boundOnTouchMove);
      canvas.removeEventListener('touchend', this.boundOnTouchEnd);
    }
  }
}
