import * as THREE from 'three';
import type { GeneScatterBuilder, GeneMesh } from './GeneScatterBuilder';
import type { GeneNode } from './geneData';

export interface InteractionOptions {
  canvas: HTMLCanvasElement;
  labelContainer: HTMLElement;
  camera: THREE.PerspectiveCamera;
  builder: GeneScatterBuilder;
}

export class InteractionManager {
  private options: InteractionOptions;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private hoveredId: string | null = null;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 15;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private minDistance: number = 7.5;
  private maxDistance: number = 75;
  private labelElements: Map<string, HTMLDivElement> = new Map();
  private onGeneClickCallback: ((gene: GeneNode) => void) | null = null;

  private initialCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(options: InteractionOptions) {
    this.options = options;
    this.initLabels();
    this.bindEvents();
    this.updateCameraPosition();
  }

  private initLabels(): void {
    const meshes = this.options.builder.getMeshes();
    for (const [id, mesh] of meshes) {
      const label = document.createElement('div');
      label.className = 'gene-label';
      label.style.display = 'none';
      label.innerHTML = `
        <div class="gene-label-name">${mesh.userData.gene.name}</div>
        <div class="gene-label-expr">表达: ${mesh.userData.gene.expression.toFixed(1)}</div>
      `;
      this.options.labelContainer.appendChild(label);
      this.labelElements.set(id, label);
    }
  }

  private bindEvents(): void {
    const { canvas } = this.options;

    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('mouseleave', this.onMouseLeave);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
  }

  public setOnGeneClick(callback: (gene: GeneNode) => void): void {
    this.onGeneClickCallback = callback;
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMousePosition(e.clientX, e.clientY);

    if (this.isDragging) {
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - dy * 0.005));
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
    } else {
      this.checkHover();
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.options.canvas.style.cursor = 'grabbing';
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.options.canvas.style.cursor = 'grab';
  };

  private onMouseLeave = (): void => {
    this.isDragging = false;
    this.clearHover();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance * factor));
    this.updateCameraPosition();
  };

  private onClick = (): void => {
    if (this.hoveredId) {
      const gene = this.options.builder.getGeneById(this.hoveredId);
      if (gene && this.onGeneClickCallback) {
        this.onGeneClickCallback(gene);
      }
    }
  };

  private touchStartPos: { x: number; y: number } | null = null;
  private touchMoved: boolean = false;

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.touchMoved = false;
      this.updateMousePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1 && this.touchStartPos) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.touchMoved = true;
      }
      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi - dy * 0.005));
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCameraPosition();
    }
  };

  private onTouchEnd = (): void => {
    if (!this.touchMoved) {
      this.checkHover();
      if (this.hoveredId) {
        const gene = this.options.builder.getGeneById(this.hoveredId);
        if (gene && this.onGeneClickCallback) {
          this.onGeneClickCallback(gene);
        }
      }
    }
    this.touchStartPos = null;
    this.touchMoved = false;
  };

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.options.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.options.camera);
    const meshes = Array.from(this.options.builder.getMeshes().values())
      .filter(m => m.visible && !m.userData.isFiltered);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as GeneMesh;
      const id = mesh.userData.gene.id;
      if (this.hoveredId !== id) {
        this.clearHover();
        this.hoveredId = id;
        this.options.builder.highlightGene(id);
        this.showLabel(id);
        this.options.canvas.style.cursor = 'pointer';
      }
    } else {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredId) {
      this.hideLabel(this.hoveredId);
      this.options.builder.highlightGene(null);
      this.hoveredId = null;
      this.options.canvas.style.cursor = 'grab';
    }
  }

  private showLabel(id: string): void {
    const label = this.labelElements.get(id);
    if (label) {
      label.style.display = 'block';
    }
  }

  private hideLabel(id: string): void {
    const label = this.labelElements.get(id);
    if (label) {
      label.style.display = 'none';
    }
  }

  public updateLabels(): void {
    const { camera } = this.options;
    const canvasRect = this.options.canvas.getBoundingClientRect();
    const meshes = this.options.builder.getMeshes();

    for (const [id, label] of this.labelElements) {
      if (label.style.display === 'none') continue;
      const mesh = meshes.get(id);
      if (!mesh) continue;

      const vector = mesh.position.clone().project(camera);
      const x = (vector.x * 0.5 + 0.5) * canvasRect.width;
      const y = (-vector.y * 0.5 + 0.5) * canvasRect.height;

      label.style.transform = `translate(-50%, calc(-100% - 12px)) translate(${x}px, ${y}px)`;

      const distance = mesh.position.distanceTo(camera.position);
      const scale = Math.max(0.5, Math.min(1.5, 15 / distance));
      label.style.fontSize = `${12 * scale}px`;
    }
  }

  private updateCameraPosition(): void {
    const { camera } = this.options;
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    camera.position.set(x, y, z);
    camera.lookAt(this.initialCameraTarget);
    camera.updateProjectionMatrix();
  }

  public resetView(): void {
    this.cameraDistance = 15;
    this.cameraTheta = 0;
    this.cameraPhi = Math.PI / 3;
    this.updateCameraPosition();
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public dispose(): void {
    const { canvas } = this.options;
    canvas.removeEventListener('mousemove', this.onMouseMove);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('click', this.onClick);
    canvas.removeEventListener('mouseleave', this.onMouseLeave);
    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    canvas.removeEventListener('touchend', this.onTouchEnd);

    for (const label of this.labelElements.values()) {
      label.remove();
    }
    this.labelElements.clear();
  }
}
