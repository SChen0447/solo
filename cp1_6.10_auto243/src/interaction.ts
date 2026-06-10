import * as THREE from 'three';
import { Prism } from './prism';

export interface InteractionCallbacks {
  onPrismRotated?: () => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private prisms: Prism[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedPrism: Prism | null = null;
  private hoveredPrism: Prism | null = null;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private rotationPerPixel: number = 0.01;
  private callbacks: InteractionCallbacks;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    callbacks: InteractionCallbacks = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.callbacks = callbacks;

    this.bindEvents();
  }

  public setPrisms(prisms: Prism[]): void {
    this.prisms = prisms;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickPrism(): Prism | null {
    const meshes: THREE.Object3D[] = [];
    for (const prism of this.prisms) {
      meshes.push(prism.mesh);
      meshes.push(prism.edges);
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      if (obj.userData && obj.userData.prism) {
        return obj.userData.prism as Prism;
      }
    }
    return null;
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);

    if (this.isDragging && this.selectedPrism) {
      const deltaX = event.clientX - this.lastMouseX;
      this.selectedPrism.rotateY(deltaX * this.rotationPerPixel);
      this.lastMouseX = event.clientX;

      if (this.callbacks.onPrismRotated) {
        this.callbacks.onPrismRotated();
      }
      return;
    }

    const picked = this.pickPrism();
    if (picked !== this.hoveredPrism) {
      if (this.hoveredPrism) {
        this.hoveredPrism.setHovered(false);
      }
      this.hoveredPrism = picked;
      if (this.hoveredPrism) {
        this.hoveredPrism.setHovered(true);
        this.renderer.domElement.style.cursor = 'grab';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.updateMouse(event);

    const picked = this.pickPrism();
    if (picked) {
      this.selectedPrism = picked;
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.renderer.domElement.style.cursor = 'grabbing';
      this.renderer.domElement.setPointerCapture(event.pointerId);
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.selectedPrism = null;
      this.renderer.domElement.releasePointerCapture(event.pointerId);
      if (this.hoveredPrism) {
        this.renderer.domElement.style.cursor = 'grab';
      } else {
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private onPointerLeave(): void {
    if (this.hoveredPrism) {
      this.hoveredPrism.setHovered(false);
      this.hoveredPrism = null;
    }
    this.renderer.domElement.style.cursor = 'default';
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.removeEventListener('pointerleave', this.onPointerLeave.bind(this));
  }
}
