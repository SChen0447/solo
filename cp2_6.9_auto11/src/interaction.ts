import * as THREE from 'three';
import { FrameObject, GalleryObjects } from './gallery';
import { ArtworkData } from './artwork';

export interface InteractionCallbacks {
  onArtworkClick: (artwork: ArtworkData) => void;
  onCloseModal: () => void;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private gallery: GalleryObjects;
  private domElement: HTMLElement;
  private callbacks: InteractionCallbacks;

  private keys: Set<string> = new Set();
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private yaw: number = 0;
  private pitch: number = 0;
  private moveSpeed: number = 2.5;
  private lookSpeed: number = 0.0025;

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private targetVelocity: THREE.Vector3 = new THREE.Vector3();

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private nearestFrame: FrameObject | null = null;
  private isModalOpen: boolean = false;
  private isAnimatingView: boolean = false;

  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(
    camera: THREE.PerspectiveCamera,
    gallery: GalleryObjects,
    domElement: HTMLElement,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.gallery = gallery;
    this.domElement = domElement;
    this.callbacks = callbacks;

    this.setupInitialOrientation();
    this.bindEvents();
  }

  private setupInitialOrientation(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.euler.set(0, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    this.domElement.addEventListener('click', this.onClick);

    this.domElement.addEventListener('contextmenu', this.preventDefault);
    window.addEventListener('wheel', this.preventDefault, { passive: false });
  }

  private preventDefault = (e: Event): void => {
    e.preventDefault();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);

    if (e.code === 'Escape') {
      if (this.isModalOpen) {
        this.callbacks.onCloseModal();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (this.isModalOpen) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isAnimatingView) return;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      this.yaw -= dx * this.lookSpeed;
      this.pitch -= dy * this.lookSpeed;

      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(this.euler);

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onClick = (e: MouseEvent): void => {
    if (this.isModalOpen) return;
    if (this.isAnimatingView) return;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const frameCanvases = this.gallery.frames.map(f => f.canvasMesh);
    const intersects = this.raycaster.intersectObjects(frameCanvases, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      for (const frame of this.gallery.frames) {
        if (frame.canvasMesh === hit) {
          const dist = this.camera.position.distanceTo(frame.group.position);
          if (dist < 6) {
            this.callbacks.onArtworkClick(frame.artwork);
          }
          break;
        }
      }
    }
  };

  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  public setModalOpen(open: boolean): void {
    this.isModalOpen = open;
  }

  public setAnimatingView(animating: boolean): void {
    this.isAnimatingView = animating;
    if (animating) {
      this.isDragging = false;
    }
  }

  public setCameraOrientation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.euler.set(pitch, yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }

  public getYaw(): number {
    return this.yaw;
  }

  public update(delta: number): void {
    if (this.isAnimatingView) return;

    this.targetVelocity.set(0, 0, 0);

    if (!this.isModalOpen) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const speed = this.moveSpeed;

      if (this.keys.has('KeyW')) {
        this.targetVelocity.addScaledVector(forward, speed);
      }
      if (this.keys.has('KeyS')) {
        this.targetVelocity.addScaledVector(forward, -speed);
      }
      if (this.keys.has('KeyD')) {
        this.targetVelocity.addScaledVector(right, speed);
      }
      if (this.keys.has('KeyA')) {
        this.targetVelocity.addScaledVector(right, -speed);
      }
    }

    this.velocity.lerp(this.targetVelocity, Math.min(delta * 10, 1));

    const dx = this.velocity.x * delta;
    const dz = this.velocity.z * delta;

    const bounds = this.gallery.bounds;
    const newX = THREE.MathUtils.clamp(
      this.camera.position.x + dx,
      bounds.minX,
      bounds.maxX
    );
    const newZ = THREE.MathUtils.clamp(
      this.camera.position.z + dz,
      bounds.minZ,
      bounds.maxZ
    );

    this.camera.position.x = newX;
    this.camera.position.z = newZ;
    this.camera.position.y = 1.7;

    this.updateNearbyFrameGlow();
  }

  private updateNearbyFrameGlow(): void {
    let nearest: FrameObject | null = null;
    let nearestDist = Infinity;
    const distThreshold = 2.0;

    for (const frame of this.gallery.frames) {
      const dist = this.camera.position.distanceTo(frame.group.position);
      if (dist < distThreshold && dist < nearestDist) {
        nearest = frame;
        nearestDist = dist;
      }
    }

    if (this.nearestFrame !== nearest) {
      if (this.nearestFrame) {
        const glowMat = this.nearestFrame.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = 0;
      }
      this.nearestFrame = nearest;
    }

    if (this.nearestFrame) {
      const glowMat = this.nearestFrame.glowMesh.material as THREE.MeshBasicMaterial;
      const targetOpacity = 1.0 - Math.min(nearestDist / distThreshold, 1) * 0.6;
      glowMat.opacity += (targetOpacity - glowMat.opacity) * 0.1;
    }
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('contextmenu', this.preventDefault);
    window.removeEventListener('wheel', this.preventDefault);
  }
}
