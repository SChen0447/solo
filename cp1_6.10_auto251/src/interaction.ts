import * as THREE from 'three';
import { BlockMesh, ShapeType, createBlock, createDragGhostMaterial } from './shapes';

export interface InteractionEvents {
  onBlockPlace?: (block: BlockMesh) => void;
  onBlockSelect?: (block: BlockMesh | null) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private groundPlane: THREE.Mesh;
  private blocks: BlockMesh[] = [];
  private isMobile: boolean = false;
  private events: InteractionEvents = {};

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointer: THREE.Vector2 = new THREE.Vector2();

  private isDragging: boolean = false;
  private dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private ghostBlock: BlockMesh | null = null;
  private currentShape: ShapeType = 'cube';
  private currentColor: string = '#e74c3c';

  private pendingPlacement: boolean = false;
  private tapTimeout: number | null = null;
  private lastTapTime: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    groundPlane: THREE.Mesh,
    isMobile: boolean = false
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.groundPlane = groundPlane;
    this.isMobile = isMobile;
    this.bindEvents();
  }

  public on(events: InteractionEvents): void {
    this.events = { ...this.events, ...events };
  }

  public setBlocks(blocks: BlockMesh[]): void {
    this.blocks = blocks;
  }

  public setCurrentTool(shape: ShapeType, color: string): void {
    this.currentShape = shape;
    this.currentColor = color;
    if (this.pendingPlacement && this.ghostBlock) {
      this.updateGhostMaterial();
    }
  }

  public setMobile(isMobile: boolean): void {
    this.isMobile = isMobile;
  }

  public activatePlacementMode(): void {
    this.pendingPlacement = true;
    this.createGhostBlock();
  }

  public deactivatePlacementMode(): void {
    this.pendingPlacement = false;
    this.removeGhostBlock();
  }

  public startDragFromToolbar(shape: ShapeType, color: string): void {
    this.currentShape = shape;
    this.currentColor = color;
    this.isDragging = true;
    this.pendingPlacement = true;
    this.createGhostBlock();
    this.events.onDragStart?.();
  }

  public update(): void {
    if (this.ghostBlock && (this.isDragging || this.pendingPlacement)) {
      this.updateGhostPosition();
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', () => this.onPointerCancel());
    canvas.addEventListener('pointerleave', () => this.onPointerCancel());
  }

  private onPointerDown(e: PointerEvent): void {
    const pos = this.getPointerPos(e);
    this.pointer.set(pos.x, pos.y);

    if (this.pendingPlacement && this.isMobile) {
      return;
    }

    this.dragStartPos = { x: e.clientX, y: e.clientY };

    if (this.isDragging) {
      return;
    }

    const hitBlock = this.raycastBlock();
    if (hitBlock) {
      if (this.isMobile) {
        if (this.tapTimeout) {
          clearTimeout(this.tapTimeout);
          this.tapTimeout = null;
        }
        const now = performance.now();
        if (now - this.lastTapTime < 300) {
          this.events.onBlockSelect?.(hitBlock);
          this.lastTapTime = 0;
        } else {
          this.events.onBlockSelect?.(hitBlock);
          this.lastTapTime = now;
        }
      } else {
        this.events.onBlockSelect?.(hitBlock);
      }
    } else {
      this.events.onBlockSelect?.(null);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const pos = this.getPointerPos(e);
    this.pointer.set(pos.x, pos.y);

    if (this.isDragging) {
      e.preventDefault();
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const pos = this.getPointerPos(e);
    this.pointer.set(pos.x, pos.y);

    if (this.isDragging) {
      if (this.ghostBlock) {
        this.placeGhostBlock();
      }
      this.isDragging = false;
      this.pendingPlacement = false;
      this.removeGhostBlock();
      this.events.onDragEnd?.();
      return;
    }

    if (this.pendingPlacement && this.isMobile) {
      if (this.ghostBlock) {
        this.placeGhostBlock();
      }
      this.pendingPlacement = false;
      this.removeGhostBlock();
    }
  }

  private onPointerCancel(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.pendingPlacement = false;
      this.removeGhostBlock();
      this.events.onDragEnd?.();
    }
  }

  private getPointerPos(e: PointerEvent): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  private raycastGround(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);
    if (intersects.length > 0) {
      return intersects[0].point.clone();
    }
    return null;
  }

  private raycastBlock(): BlockMesh | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.blocks, false);
    if (intersects.length > 0) {
      return intersects[0].object as BlockMesh;
    }
    return null;
  }

  private createGhostBlock(): void {
    if (this.ghostBlock) return;
    this.ghostBlock = createBlock(this.currentShape, this.currentColor, false);
    const mat = createDragGhostMaterial(this.currentColor);
    const oldMat = this.ghostBlock.material as THREE.Material;
    this.ghostBlock.material = mat;
    oldMat.dispose();
    this.scene.add(this.ghostBlock);
    this.updateGhostPosition();
  }

  private removeGhostBlock(): void {
    if (this.ghostBlock) {
      this.scene.remove(this.ghostBlock);
      (this.ghostBlock.geometry as THREE.BufferGeometry).dispose();
      (this.ghostBlock.material as THREE.Material).dispose();
      this.ghostBlock = null;
    }
  }

  private updateGhostMaterial(): void {
    if (!this.ghostBlock) return;
    const mat = createDragGhostMaterial(this.currentColor);
    const oldMat = this.ghostBlock.material as THREE.Material;
    this.ghostBlock.material = mat;
    oldMat.dispose();
  }

  private updateGhostPosition(): void {
    if (!this.ghostBlock) return;
    const point = this.raycastGround();
    if (point) {
      const snap = (v: number) => Math.round(v);
      this.ghostBlock.position.set(snap(point.x), 0.5, snap(point.z));
    }
  }

  private placeGhostBlock(): void {
    if (!this.ghostBlock) return;
    const position = this.ghostBlock.position.clone();
    const block = createBlock(this.currentShape, this.currentColor, false);
    block.position.copy(position);
    this.events.onBlockPlace?.(block);
  }
}
