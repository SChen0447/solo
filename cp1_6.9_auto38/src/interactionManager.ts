import * as THREE from 'three';
import { ARController } from './arController';
import { FurnitureManager, PlacedFurniture } from './furnitureManager';

type InteractionMode = 'none' | 'drag' | 'rotate' | 'pinch';

export class InteractionManager {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private arController: ARController;
  private furnitureManager: FurnitureManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private mode: InteractionMode = 'none';
  private activeFurniture: PlacedFurniture | null = null;

  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private pointerStartX: number = 0;
  private pointerStartY: number = 0;
  private dragStartPosition: THREE.Vector3 | null = null;

  private touchStartDistance: number = 0;
  private touchStartScale: number = 1;
  private touchStartMidpoint: { x: number; y: number } = { x: 0, y: 0 };

  private lastTapTime: number = 0;
  private lastTapX: number = 0;
  private lastTapY: number = 0;
  private readonly DOUBLE_TAP_DELAY: number = 300;
  private readonly DOUBLE_TAP_DISTANCE: number = 30;
  private readonly ROTATION_THRESHOLD: number = 30;

  private readonly MIN_SCALE: number = 0.5;
  private readonly MAX_SCALE: number = 2.0;

  private pointerId: number | null = null;
  private pinchPointerIds: number[] = [];

  private onCanvasClick?: () => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    arController: ARController,
    furnitureManager: FurnitureManager
  ) {
    this.renderer = renderer;
    this.camera = camera;
    this.scene = scene;
    this.arController = arController;
    this.furnitureManager = furnitureManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  setCanvasClickCallback(callback: () => void): void {
    this.onCanvasClick = callback;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickFurniture(clientX: number, clientY: number): PlacedFurniture | null {
    this.updateMouse(clientX, clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Mesh[] = [];
    this.furnitureManager.getAllFurniture().forEach(placed => {
      placed.group.traverse((child) => {
        if (child instanceof THREE.Mesh && child !== placed.boundingBox) {
          meshes.push(child);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj) {
        if (obj.userData && obj.userData.parentFurnitureId) {
          return this.furnitureManager.getFurnitureById(obj.userData.parentFurnitureId);
        }
        if (obj.userData && obj.userData.furnitureId) {
          return this.furnitureManager.getFurnitureById(obj.userData.furnitureId);
        }
        obj = obj.parent;
      }
    }

    return null;
  }

  private onPointerDown(e: PointerEvent): void {
    (e.target as Element).setPointerCapture(e.pointerId);

    if (e.pointerType === 'touch' && this.pinchPointerIds.length === 1) {
      this.pinchPointerIds.push(e.pointerId);
      this.mode = 'pinch';
      this.initPinch(e);
      return;
    }

    if (this.pointerId !== null) return;

    this.pointerId = e.pointerId;
    if (e.pointerType === 'touch') {
      this.pinchPointerIds.push(e.pointerId);
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerStartX = e.clientX;
    this.pointerStartY = e.clientY;

    const picked = this.pickFurniture(e.clientX, e.clientY);

    if (picked) {
      this.activeFurniture = picked;
      this.furnitureManager.selectFurniture(picked.id);
      this.dragStartPosition = picked.group.position.clone();
      this.mode = 'drag';
    } else {
      this.furnitureManager.selectFurniture(null);
      this.activeFurniture = null;
      this.mode = 'none';
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.mode === 'pinch' && this.pinchPointerIds.length === 2) {
      this.updatePinch(e);
      return;
    }

    if (e.pointerId !== this.pointerId) return;

    const dx = e.clientX - this.pointerStartX;
    const dy = e.clientY - this.pointerStartY;
    const totalDistance = Math.sqrt(dx * dx + dy * dy);

    if (this.mode === 'drag' && this.activeFurniture) {
      if (totalDistance > 5) {
        this.handleDrag(e.clientX, e.clientY);
      }
    } else if (this.mode === 'none' && this.activeFurniture) {
      if (Math.abs(dx) > this.ROTATION_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        this.mode = 'rotate';
        this.rotateFurniture(dx > 0 ? 1 : -1);
        this.pointerStartX = e.clientX;
      }
    } else if (this.mode === 'rotate') {
      const newDx = e.clientX - this.pointerStartX;
      if (Math.abs(newDx) > this.ROTATION_THRESHOLD) {
        this.rotateFurniture(newDx > 0 ? 1 : -1);
        this.pointerStartX = e.clientX;
      }
    }

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.mode === 'pinch') {
      const idx = this.pinchPointerIds.indexOf(e.pointerId);
      if (idx >= 0) {
        this.pinchPointerIds.splice(idx, 1);
      }
      if (this.pinchPointerIds.length < 2) {
        this.mode = 'none';
        this.activeFurniture = null;
      }
      return;
    }

    if (e.pointerId !== this.pointerId) return;

    const dx = e.clientX - this.pointerStartX;
    const dy = e.clientY - this.pointerStartY;
    const totalDistance = Math.sqrt(dx * dx + dy * dy);

    if (this.mode === 'drag' && totalDistance < 8 && this.activeFurniture) {
      this.handleTap(e.clientX, e.clientY);
    } else if (this.mode === 'none' && totalDistance < 8) {
      this.handleTap(e.clientX, e.clientY);
      if (!this.activeFurniture && this.onCanvasClick) {
        this.onCanvasClick();
      }
    }

    this.pointerId = null;
    const touchIdx = this.pinchPointerIds.indexOf(e.pointerId);
    if (touchIdx >= 0) {
      this.pinchPointerIds.splice(touchIdx, 1);
    }
    this.mode = 'none';
    this.activeFurniture = null;
    this.dragStartPosition = null;
  }

  private handleTap(clientX: number, clientY: number): void {
    const now = performance.now();
    const dx = clientX - this.lastTapX;
    const dy = clientY - this.lastTapY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (
      now - this.lastTapTime < this.DOUBLE_TAP_DELAY &&
      distance < this.DOUBLE_TAP_DISTANCE
    ) {
      const picked = this.pickFurniture(clientX, clientY);
      if (picked) {
        this.furnitureManager.removeFurniture(picked.id, true);
      }
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapX = clientX;
      this.lastTapY = clientY;
    }
  }

  private handleDrag(clientX: number, clientY: number): void {
    if (!this.activeFurniture) return;

    const worldPos = this.arController.screenToWorld(clientX, clientY);
    this.activeFurniture.group.position.x = worldPos.x;
    this.activeFurniture.group.position.y = worldPos.y;
    this.activeFurniture.group.position.z = 0;

    this.updateOutlineAndBox();
  }

  private initPinch(e: PointerEvent): void {
    if (this.pinchPointerIds.length !== 2) return;
    const selected = this.furnitureManager.getSelectedFurniture();
    if (!selected) {
      const picked = this.pickFurniture(e.clientX, e.clientY);
      if (picked) {
        this.activeFurniture = picked;
        this.furnitureManager.selectFurniture(picked.id);
      } else {
        this.activeFurniture = null;
        return;
      }
    } else {
      this.activeFurniture = selected;
    }
  }

  private updatePinch(e: PointerEvent): void {
    if (!this.activeFurniture) return;
  }

  public handleTwoFingerTouch(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    isStart: boolean
  ): void {
    if (!this.activeFurniture) {
      const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const picked = this.pickFurniture(midpoint.x, midpoint.y);
      if (picked) {
        this.activeFurniture = picked;
        this.furnitureManager.selectFurniture(picked.id);
      } else {
        return;
      }
    }

    const distance = Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
    );

    if (isStart) {
      this.touchStartDistance = distance;
      this.touchStartScale = this.activeFurniture.group.scale.x;
    } else {
      if (this.touchStartDistance === 0) return;
      const scaleFactor = distance / this.touchStartDistance;
      let newScale = this.touchStartScale * scaleFactor;
      newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

      this.activeFurniture.group.scale.set(newScale, newScale, newScale);
      this.updateOutlineAndBox();
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const selected = this.furnitureManager.getSelectedFurniture();
    if (!selected) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = selected.group.scale.x * delta;
    newScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, newScale));

    selected.group.scale.set(newScale, newScale, newScale);
    this.updateOutlineAndBox();
  }

  private rotateFurniture(direction: number): void {
    if (!this.activeFurniture) return;

    const targetRotation = this.activeFurniture.group.rotation.y + (Math.PI / 4) * direction;
    this.animateRotation(this.activeFurniture, targetRotation);
  }

  private animateRotation(placed: PlacedFurniture, targetY: number): void {
    const startY = placed.group.rotation.y;
    const duration = 200;
    const startTime = performance.now();

    const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOut(progress);
      placed.group.rotation.y = startY + (targetY - startY) * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.updateOutlineAndBox();
      }
    };
    animate();
  }

  private updateOutlineAndBox(): void {
    if (!this.activeFurniture) return;

    const box = new THREE.Box3().setFromObject(this.activeFurniture.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const localCenter = this.activeFurniture.group.worldToLocal(center.clone());

    this.activeFurniture.outline.geometry.dispose();
    this.activeFurniture.outline.geometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(size.x, size.y, size.z)
    );
    this.activeFurniture.outline.position.copy(localCenter);

    this.activeFurniture.boundingBox.geometry.dispose();
    this.activeFurniture.boundingBox.geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    this.activeFurniture.boundingBox.position.copy(localCenter);
  }

  dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.removeEventListener('pointercancel', this.onPointerUp.bind(this));
  }
}
