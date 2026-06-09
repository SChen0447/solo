import * as THREE from 'three';
import gsap from 'gsap';
import { PaintingObject } from './galleryBuilder';
import { GALLERY_CONFIG } from './galleryData';

type PaintingClickCallback = (artwork: PaintingObject['artwork']) => void;

export class ControlsManager {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private paintings: PaintingObject[];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onPaintingClick: PaintingClickCallback;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private yaw: number = 0;
  private pitch: number = 0;
  private targetYaw: number = 0;
  private targetPitch: number = 0;

  private moveForward: number = 0;
  private targetMoveForward: number = 0;
  private moveRight: number = 0;
  private targetMoveRight: number = 0;

  private hoveredPainting: PaintingObject | null = null;

  private lastInteractionTime: number = 0;
  private autoTourActive: boolean = false;
  private autoTourStartTime: number = 0;
  private readonly AUTO_TOUR_DELAY: number = 10000;
  private readonly AUTO_TOUR_PERIOD: number = 30000;

  private initialPosition: THREE.Vector3;
  private initialYaw: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    paintings: PaintingObject[],
    onPaintingClick: PaintingClickCallback
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.paintings = paintings;
    this.onPaintingClick = onPaintingClick;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initialPosition = camera.position.clone();

    this.setupEventListeners();
    this.updateInteractionTime();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('click', this.onClick);
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.updateInteractionTime();
    this.stopAutoTour();
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateInteractionTime();

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      this.lastMouseX = e.clientX;
      this.targetYaw -= deltaX * 0.005;
      this.stopAutoTour();
    }

    this.checkHover();
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.updateInteractionTime();
    this.stopAutoTour();

    const delta = e.deltaY > 0 ? -1 : 1;
    this.targetMoveForward += delta * 0.8;
  };

  private onClick = (): void => {
    this.updateInteractionTime();
    if (this.hoveredPainting) {
      this.onPaintingClick(this.hoveredPainting.artwork);
    }
  };

  private updateInteractionTime(): void {
    this.lastInteractionTime = performance.now();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.paintings.map((p) => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const painting = this.paintings.find((p) => p.mesh === hitMesh);

      if (painting && painting !== this.hoveredPainting) {
        this.setHoveredPainting(painting);
      } else if (!painting && this.hoveredPainting) {
        this.clearHoveredPainting();
      }
    } else if (this.hoveredPainting) {
      this.clearHoveredPainting();
    }

    this.domElement.style.cursor = this.hoveredPainting ? 'pointer' : 'default';
  }

  private setHoveredPainting(painting: PaintingObject): void {
    if (this.hoveredPainting) {
      this.clearHoveredPainting();
    }

    this.hoveredPainting = painting;

    const frameMaterial = painting.frame.material as THREE.LineBasicMaterial;
    gsap.to(frameMaterial.color, {
      r: 0xD4 / 255,
      g: 0xAF / 255,
      b: 0x37 / 255,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(painting.mesh.scale, {
      x: painting.originalScale.x * 1.05,
      y: painting.originalScale.y * 1.05,
      z: painting.originalScale.z * 1.05,
      duration: 0.25,
      ease: 'power2.out'
    });

    gsap.to(painting.frame.scale, {
      x: 1.05,
      y: 1.05,
      z: 1.05,
      duration: 0.25,
      ease: 'power2.out'
    });
  }

  private clearHoveredPainting(): void {
    if (!this.hoveredPainting) return;

    const painting = this.hoveredPainting;
    const frameMaterial = painting.frame.material as THREE.LineBasicMaterial;

    gsap.to(frameMaterial.color, {
      r: 0,
      g: 0,
      b: 0,
      duration: 0.2,
      ease: 'power2.out'
    });

    gsap.to(painting.mesh.scale, {
      x: painting.originalScale.x,
      y: painting.originalScale.y,
      z: painting.originalScale.z,
      duration: 0.25,
      ease: 'power2.out'
    });

    gsap.to(painting.frame.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.25,
      ease: 'power2.out'
    });

    this.hoveredPainting = null;
  }

  private startAutoTour(): void {
    if (this.autoTourActive) return;
    this.autoTourActive = true;
    this.autoTourStartTime = performance.now();
  }

  private stopAutoTour(): void {
    if (!this.autoTourActive) return;
    this.autoTourActive = false;
    this.initialPosition = this.camera.position.clone();
    this.initialYaw = this.targetYaw;
  }

  private updateAutoTour(deltaTime: number): void {
    if (!this.autoTourActive) return;

    const elapsed = performance.now() - this.autoTourStartTime;
    const t = (elapsed % this.AUTO_TOUR_PERIOD) / this.AUTO_TOUR_PERIOD;
    const angle = t * Math.PI * 2;

    const { width, depth } = GALLERY_CONFIG;
    const radiusX = width * 0.35;
    const radiusZ = depth * 0.35;
    const centerX = 0;
    const centerZ = 0;

    const targetX = centerX + Math.cos(angle) * radiusX;
    const targetZ = centerZ + Math.sin(angle) * radiusZ;
    const targetY = this.initialPosition.y + Math.sin(angle * 2) * 0.2;

    this.camera.position.x += (targetX - this.camera.position.x) * 0.005;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.005;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.01;

    const lookAheadAngle = angle + Math.PI * 0.1;
    const lookX = centerX + Math.cos(lookAheadAngle) * radiusX * 0.5;
    const lookZ = centerZ + Math.sin(lookAheadAngle) * radiusZ * 0.5;

    const dx = lookX - this.camera.position.x;
    const dz = lookZ - this.camera.position.z;
    const targetLookYaw = -Math.atan2(dx, dz) - Math.PI;

    this.targetYaw = targetLookYaw;
  }

  public update(deltaTime: number): void {
    const now = performance.now();
    if (!this.autoTourActive && now - this.lastInteractionTime > this.AUTO_TOUR_DELAY) {
      this.startAutoTour();
    }

    if (this.autoTourActive) {
      this.updateAutoTour(deltaTime);
    }

    this.yaw += (this.targetYaw - this.yaw) * 0.1;
    this.pitch += (this.targetPitch - this.pitch) * 0.1;
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

    this.moveForward += (this.targetMoveForward - this.moveForward) * 0.08;
    this.moveRight += (this.targetMoveRight - this.moveRight) * 0.08;
    this.targetMoveForward *= 0.92;
    this.targetMoveRight *= 0.92;

    if (!this.autoTourActive) {
      const forward = new THREE.Vector3(
        -Math.sin(this.yaw),
        0,
        -Math.cos(this.yaw)
      );
      const right = new THREE.Vector3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw)
      );

      this.camera.position.add(forward.multiplyScalar(this.moveForward * deltaTime * 2));
      this.camera.position.add(right.multiplyScalar(this.moveRight * deltaTime * 2));

      const { width, depth } = GALLERY_CONFIG;
      const margin = 1;
      this.camera.position.x = Math.max(-width / 2 + margin, Math.min(width / 2 - margin, this.camera.position.x));
      this.camera.position.z = Math.max(-depth / 2 + margin, Math.min(depth / 2 - margin, this.camera.position.z));
    }

    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('click', this.onClick);
  }
}
