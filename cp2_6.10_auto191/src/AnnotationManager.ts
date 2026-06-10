import * as THREE from 'three';
import type { BuiltMolecule } from './MoleculeBuilder';

interface AnnotationRecord {
  id: string;
  target: THREE.Object3D;
  element: HTMLElement;
  offset: THREE.Vector3;
}

interface HighlightState {
  originalEmissive: number;
  originalEmissiveIntensity: number;
}

export class CSS2DRenderer {
  private domElement: HTMLDivElement;
  private camera: THREE.Camera;
  private size: THREE.Vector2;

  constructor(container: HTMLElement, camera: THREE.Camera) {
    this.camera = camera;
    this.size = new THREE.Vector2();

    this.domElement = document.createElement('div');
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0';
    this.domElement.style.left = '0';
    this.domElement.style.width = '100%';
    this.domElement.style.height = '100%';
    this.domElement.style.pointerEvents = 'none';
    this.domElement.style.overflow = 'hidden';
    container.appendChild(this.domElement);
  }

  public getDomElement(): HTMLDivElement {
    return this.domElement;
  }

  public setSize(width: number, height: number): void {
    this.size.set(width, height);
    this.domElement.style.width = width + 'px';
    this.domElement.style.height = height + 'px';
  }

  public updateLabelPosition(
    element: HTMLElement,
    object: THREE.Object3D,
    offset: THREE.Vector3
  ): void {
    const vector = new THREE.Vector3();
    const viewProjectionMatrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );

    object.updateMatrixWorld(true);
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.add(offset);
    vector.applyMatrix4(viewProjectionMatrix);

    const x = (vector.x * 0.5 + 0.5) * this.size.width;
    const y = (-vector.y * 0.5 + 0.5) * this.size.height;

    element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    element.style.left = '0';
    element.style.top = '0';

    if (vector.z > 1 || vector.z < -1) {
      element.style.display = 'none';
    } else {
      element.style.display = 'block';
    }
  }

  public addLabel(element: HTMLElement): void {
    element.style.position = 'absolute';
    this.domElement.appendChild(element);
  }

  public removeLabel(element: HTMLElement): void {
    if (element.parentNode === this.domElement) {
      this.domElement.removeChild(element);
    }
  }

  public dispose(): void {
    if (this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
  }
}

export class AnnotationManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private css2dRenderer: CSS2DRenderer;
  private annotations: AnnotationRecord[];
  private hoveredObject: THREE.Object3D | null;
  private highlightStates: Map<THREE.Object3D, HighlightState>;
  private onObjectClick: ((obj: THREE.Object3D | null) => void) | null;
  private onObjectHover: ((obj: THREE.Object3D | null) => void) | null;
  private isSelectable: (obj: THREE.Object3D) => boolean;
  private maxAnnotations: number;

  constructor(
    camera: THREE.Camera,
    domElement: HTMLElement,
    canvasContainer: HTMLElement
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.css2dRenderer = new CSS2DRenderer(canvasContainer, camera);
    this.annotations = [];
    this.hoveredObject = null;
    this.highlightStates = new Map();
    this.onObjectClick = null;
    this.onObjectHover = null;
    this.isSelectable = () => true;
    this.maxAnnotations = 5;

    this.setupEventListeners();
  }

  public setSelectableCheck(fn: (obj: THREE.Object3D) => boolean): void {
    this.isSelectable = fn;
  }

  public setOnObjectClick(fn: (obj: THREE.Object3D | null) => void): void {
    this.onObjectClick = fn;
  }

  public setOnObjectHover(fn: (obj: THREE.Object3D | null) => void): void {
    this.onObjectHover = fn;
  }

  public getCSS2DRenderer(): CSS2DRenderer {
    return this.css2dRenderer;
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerMove = (event: PointerEvent): void => {
    this.updateMouse(event);
    const obj = this.pickObject();
    this.handleHover(obj);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.updateMouse(event);
    const obj = this.pickObject();
    this.handleClick(obj);
  };

  private updateMouse(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickObject(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const scene = this.camera.parent;
    if (!scene) return null;

    const intersects = this.raycaster.intersectObjects(scene.children, true);

    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        if (obj.userData && (obj.userData.type === 'atom' || obj.userData.type === 'bond')) {
          if (this.isSelectable(obj)) {
            return obj;
          }
          return null;
        }
        obj = obj.parent;
      }
    }

    return null;
  }

  private handleHover(obj: THREE.Object3D | null): void {
    if (obj !== this.hoveredObject) {
      if (this.hoveredObject) {
        this.removeHoverHighlight(this.hoveredObject);
      }
      this.hoveredObject = obj;
      if (obj) {
        this.applyHoverHighlight(obj);
      }
      if (this.onObjectHover) {
        this.onObjectHover(obj);
      }
    }
  }

  private applyHoverHighlight(obj: THREE.Object3D): void {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshPhongMaterial;
    if (!mat || !mat.isMeshPhongMaterial) return;

    if (!this.highlightStates.has(obj)) {
      this.highlightStates.set(obj, {
        originalEmissive: mat.emissive.getHex(),
        originalEmissiveIntensity: mat.emissiveIntensity
      });
    }

    mat.emissive.set(0x00ffff);
    mat.emissiveIntensity = 0.5;
  }

  private removeHoverHighlight(obj: THREE.Object3D): void {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshPhongMaterial;
    if (!mat || !mat.isMeshPhongMaterial) return;

    const state = this.highlightStates.get(obj);
    if (state) {
      mat.emissive.setHex(state.originalEmissive);
      mat.emissiveIntensity = state.originalEmissiveIntensity;
      this.highlightStates.delete(obj);
    }
  }

  public getHoveredObject(): THREE.Object3D | null {
    return this.hoveredObject;
  }

  private handleClick(obj: THREE.Object3D | null): void {
    if (this.onObjectClick) {
      this.onObjectClick(obj);
    }
  }

  public hasAnnotation(obj: THREE.Object3D): boolean {
    return this.annotations.some(a => a.target === obj);
  }

  public toggleAnnotation(obj: THREE.Object3D): boolean {
    const existing = this.annotations.find(a => a.target === obj);
    if (existing) {
      this.removeAnnotation(obj);
      return false;
    } else {
      this.addAnnotation(obj);
      return true;
    }
  }

  private getObjectId(obj: THREE.Object3D): string {
    const ud = obj.userData;
    if (ud.type === 'atom') {
      return `atom_${ud.index}`;
    } else if (ud.type === 'bond') {
      return `bond_${ud.bondIndex}`;
    }
    return `obj_${obj.id}`;
  }

  private getLabelText(obj: THREE.Object3D): string {
    const ud = obj.userData;
    if (ud.type === 'atom') {
      return `${ud.element}${ud.elementIndex}`;
    } else if (ud.type === 'bond') {
      const len = ud.bondLength.toFixed(2);
      const orderStr = ud.bondOrder === 1 ? '单键' : ud.bondOrder === 2 ? '双键' : '三键';
      return `${ud.atom1}-${ud.atom2} ${orderStr} ${len}Å`;
    }
    return '';
  }

  public addAnnotation(obj: THREE.Object3D): void {
    if (this.hasAnnotation(obj)) return;

    while (this.annotations.length >= this.maxAnnotations) {
      const oldest = this.annotations.shift();
      if (oldest) {
        this.css2dRenderer.removeLabel(oldest.element);
      }
    }

    const element = document.createElement('div');
    element.className = 'annotation-label';
    element.textContent = this.getLabelText(obj);
    element.style.position = 'absolute';

    const offset = new THREE.Vector3(0, 0.5, 0);

    this.css2dRenderer.addLabel(element);

    this.annotations.push({
      id: this.getObjectId(obj),
      target: obj,
      element,
      offset
    });

    this.update();
  }

  public removeAnnotation(obj: THREE.Object3D): void {
    const idx = this.annotations.findIndex(a => a.target === obj);
    if (idx >= 0) {
      const record = this.annotations[idx];
      this.css2dRenderer.removeLabel(record.element);
      this.annotations.splice(idx, 1);
    }
  }

  public clearAllAnnotations(): void {
    for (const record of this.annotations) {
      this.css2dRenderer.removeLabel(record.element);
    }
    this.annotations = [];
  }

  public update(): void {
    for (const record of this.annotations) {
      this.css2dRenderer.updateLabelPosition(
        record.element,
        record.target,
        record.offset
      );
    }
  }

  public setSize(width: number, height: number): void {
    this.css2dRenderer.setSize(width, height);
  }

  public reset(_molecule: BuiltMolecule | null): void {
    this.clearAllAnnotations();
    if (this.hoveredObject) {
      this.removeHoverHighlight(this.hoveredObject);
      this.hoveredObject = null;
    }
    this.highlightStates.clear();
  }

  public dispose(): void {
    this.clearAllAnnotations();
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.css2dRenderer.dispose();
  }
}
