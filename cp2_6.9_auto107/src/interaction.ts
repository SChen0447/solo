import * as THREE from 'three';
import { BrickManager } from './brickManager';
import { PanelManager } from './panel';
import { BRICK_DIMENSIONS, GRID_SIZE } from './types';

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private brickManager: BrickManager;
  private panelManager: PanelManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private previewMesh: THREE.Mesh | null = null;
  private basePlane: THREE.Mesh;
  private hoveredBrickId: string | null = null;
  private selectedBrickId: string | null = null;
  private hoverAnimations: Map<string, { startTime: number; targetOpacity: number }> = new Map();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    brickManager: BrickManager,
    panelManager: PanelManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.brickManager = brickManager;
    this.panelManager = panelManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const planeGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const planeMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.basePlane = new THREE.Mesh(planeGeometry, planeMaterial);
    this.basePlane.rotation.x = -Math.PI / 2;
    this.basePlane.position.y = 0;
    this.basePlane.userData.isBasePlane = true;
    this.scene.add(this.basePlane);

    this.setupEventListeners();
    this.setupPanelCallbacks();
    this.animate();
  }

  private setupEventListeners(): void {
    const container = this.renderer.domElement.parentElement!;

    container.addEventListener('mousemove', this.onMouseMove.bind(this));
    container.addEventListener('click', this.onClick.bind(this));
    container.addEventListener('mousedown', this.onMouseDown.bind(this));

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.handleUndo();
      }
      if (e.key === 'Escape') {
        this.clearSelection();
        this.panelManager.hideMiniPanel();
      }
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mini-panel')) {
        setTimeout(() => {
          if (!this.selectedBrickId) {
            this.panelManager.hideMiniPanel();
          }
        }, 10);
      }
    });
  }

  private setupPanelCallbacks(): void {
    this.panelManager.setOnUndo(() => this.handleUndo());
    this.panelManager.setOnDelete((id) => this.handleDelete(id));
    this.panelManager.setOnDuplicate((id) => this.handleDuplicate(id));
    this.panelManager.setOnRotate((id) => this.handleRotate(id));
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);

    if (this.panelManager.isPointerOnPanel(event.clientX, event.clientY)) {
      this.hidePreview();
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes = [this.basePlane, ...this.brickManager.getAllMeshes()];
    const intersects = this.raycaster.intersectObjects(allMeshes);

    this.updateHover(intersects);
    this.updatePreview(intersects);
  }

  private updateHover(intersects: THREE.Intersection[]): void {
    let newHoveredId: string | null = null;

    for (const intersect of intersects) {
      const mesh = intersect.object as THREE.Mesh;
      if (mesh.userData.brickId) {
        newHoveredId = mesh.userData.brickId;
        break;
      }
    }

    if (this.hoveredBrickId !== newHoveredId) {
      if (this.hoveredBrickId) {
        this.startGlowAnimation(this.hoveredBrickId, 0);
      }
      if (newHoveredId) {
        this.startGlowAnimation(newHoveredId, 0.6);
      }
      this.hoveredBrickId = newHoveredId;
    }
  }

  private startGlowAnimation(brickId: string, targetOpacity: number): void {
    this.hoverAnimations.set(brickId, {
      startTime: performance.now(),
      targetOpacity
    });
  }

  private updatePreview(intersects: THREE.Intersection[]): void {
    if (intersects.length === 0) {
      this.hidePreview();
      return;
    }

    const point = intersects[0].point;
    const currentType = this.brickManager.getCurrentBrick();
    const currentColor = this.brickManager.getCurrentColor();

    if (!this.previewMesh) {
      this.previewMesh = this.brickManager.createPreviewMesh(currentType, currentColor);
    } else {
      const currentGeometry = (this.previewMesh.geometry as THREE.BufferGeometry);
      const newGeometry = this.brickManager['getGeometry'](currentType);
      if (currentGeometry !== newGeometry) {
        this.scene.remove(this.previewMesh);
        this.previewMesh = this.brickManager.createPreviewMesh(currentType, currentColor);
      } else {
        const material = this.previewMesh.material as THREE.MeshStandardMaterial;
        material.color.set(currentColor);
      }
    }

    const snapped = this.brickManager.snapPosition(
      point.x,
      point.y,
      point.z,
      currentType,
      0
    );

    const stackY = this.brickManager.findStackingY(snapped.x, snapped.z, currentType, 0);
    const dims = BRICK_DIMENSIONS[currentType];

    this.previewMesh.position.set(
      snapped.x,
      stackY + dims.height / 2,
      snapped.z
    );
    this.previewMesh.rotation.y = 0;
    this.previewMesh.visible = true;

    this.panelManager.setDraggingCursor(true);
  }

  private hidePreview(): void {
    if (this.previewMesh) {
      this.previewMesh.visible = false;
    }
    this.panelManager.setDraggingCursor(false);
  }

  private onMouseDown(_event: MouseEvent): void {
  }

  private onClick(event: MouseEvent): void {
    if (this.panelManager.isPointerOnPanel(event.clientX, event.clientY)) {
      return;
    }

    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes = this.brickManager.getAllMeshes();
    const brickIntersects = this.raycaster.intersectObjects(allMeshes);

    if (brickIntersects.length > 0) {
      const mesh = brickIntersects[0].object as THREE.Mesh;
      const brickId = mesh.userData.brickId;
      if (brickId) {
        this.selectBrick(brickId, event.clientX, event.clientY);
        return;
      }
    }

    const planeIntersects = this.raycaster.intersectObject(this.basePlane);
    if (planeIntersects.length > 0 || allMeshes.length > 0) {
      this.placeBrick();
    }

    this.clearSelection();
    this.panelManager.hideMiniPanel();
  }

  private selectBrick(brickId: string, screenX: number, screenY: number): void {
    this.selectedBrickId = brickId;
    this.panelManager.showMiniPanel(brickId, screenX, screenY);

    const brick = this.brickManager.getBrickById(brickId);
    if (brick) {
      const mesh = this.brickManager.getMeshById(brickId);
      if (mesh) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        worldPos.y += BRICK_DIMENSIONS[brick.type].height + 2;

        const projected = worldPos.project(this.camera);
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = (projected.x * 0.5 + 0.5) * rect.width + rect.left;
        const y = (-projected.y * 0.5 + 0.5) * rect.height + rect.top;
        this.panelManager.showMiniPanel(brickId, x, y);
      }
    }
  }

  private clearSelection(): void {
    this.selectedBrickId = null;
  }

  private placeBrick(): void {
    if (!this.previewMesh || !this.previewMesh.visible) return;

    const currentType = this.brickManager.getCurrentBrick();
    const currentColor = this.brickManager.getCurrentColor();
    const dims = BRICK_DIMENSIONS[currentType];

    this.brickManager.addBrick(
      currentType,
      currentColor,
      {
        x: this.previewMesh.position.x,
        y: this.previewMesh.position.y - dims.height / 2,
        z: this.previewMesh.position.z
      },
      0
    );
  }

  private handleUndo(): void {
    this.brickManager.undo();
    this.clearSelection();
    this.panelManager.hideMiniPanel();
  }

  private handleDelete(id: string): void {
    this.brickManager.removeBrick(id);
    if (this.selectedBrickId === id) {
      this.clearSelection();
    }
    if (this.hoveredBrickId === id) {
      this.hoveredBrickId = null;
    }
  }

  private handleDuplicate(id: string): void {
    this.brickManager.duplicateBrick(id);
  }

  private handleRotate(id: string): void {
    this.brickManager.rotateBrick(id, 90);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const duration = 300;

    for (const [brickId, anim] of this.hoverAnimations) {
      const glowMesh = this.brickManager.getGlowMeshById(brickId);
      if (!glowMesh) {
        this.hoverAnimations.delete(brickId);
        continue;
      }

      const material = glowMesh.material as THREE.MeshBasicMaterial;
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentOpacity = material.opacity;
      const newOpacity = currentOpacity + (anim.targetOpacity - currentOpacity) * progress * 0.15;
      material.opacity = newOpacity;

      if (progress >= 1 && Math.abs(newOpacity - anim.targetOpacity) < 0.01) {
        material.opacity = anim.targetOpacity;
        this.hoverAnimations.delete(brickId);
      }
    }
  }
}
