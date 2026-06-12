import * as THREE from 'three';
import {
  MoleculeLoader,
  type AtomUserData,
  type Element,
  ELEMENT_NAMES,
  ELEMENT_COLORS,
} from './MoleculeLoader';

export interface AtomInfo {
  id: number;
  element: Element;
  elementName: string;
  position: { x: number; y: number; z: number };
}

type InfoCallback = (info: AtomInfo | null) => void;

export class AtomInteraction {
  private camera: THREE.PerspectiveCamera;
  private moleculeGroup: THREE.Group;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private hoveredMesh: THREE.Mesh | null = null;
  private clickedMesh: THREE.Mesh | null = null;

  private onClickCb: InfoCallback | null = null;
  private onHoverCb: InfoCallback | null = null;

  private highlightTweenActive = false;
  private pulseTime = 0;

  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private rafScheduled = false;
  private pendingPointer: { x: number; y: number } | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    moleculeGroup: THREE.Group,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.moleculeGroup = moleculeGroup;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh = { threshold: 0.1 };
    this.pointer = new THREE.Vector2();

    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);

    domElement.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    domElement.addEventListener('pointerdown', this.boundPointerDown);
  }

  onClick(callback: InfoCallback) {
    this.onClickCb = callback;
  }

  onHover(callback: InfoCallback) {
    this.onHoverCb = callback;
  }

  private toNDC(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    return { x, y };
  }

  private handlePointerMove(e: PointerEvent) {
    if (e.button !== undefined && e.button !== -1 && e.button !== 0) return;
    const ndc = this.toNDC(e.clientX, e.clientY);
    this.pendingPointer = ndc;
    if (!this.rafScheduled) {
      this.rafScheduled = true;
      requestAnimationFrame(() => {
        this.rafScheduled = false;
        if (this.pendingPointer) {
          this.performHover(this.pendingPointer.x, this.pendingPointer.y);
        }
      });
    }
  }

  private handlePointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    const ndc = this.toNDC(e.clientX, e.clientY);
    this.pointer.set(ndc.x, ndc.y);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const atoms = MoleculeLoader.getAtomMeshes(this.moleculeGroup);
    const hits = this.raycaster.intersectObjects(atoms, false);

    if (hits.length > 0) {
      const mesh = hits[0].object as THREE.Mesh;
      this.setClickedAtom(mesh);
    } else {
      this.clearClicked();
    }
  }

  private performHover(x: number, y: number) {
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const atoms = MoleculeLoader.getAtomMeshes(this.moleculeGroup);
    const hits = this.raycaster.intersectObjects(atoms, false);

    if (hits.length > 0) {
      const mesh = hits[0].object as THREE.Mesh;
      if (this.hoveredMesh !== mesh) {
        this.setHoveredAtom(mesh);
      }
    } else if (this.hoveredMesh) {
      this.setHoveredAtom(null);
    }
  }

  setHoveredAtom(mesh: THREE.Mesh | null) {
    const prev = this.hoveredMesh;
    this.hoveredMesh = mesh;

    if (prev && prev !== this.clickedMesh) {
      this.dimAtom(prev);
    }

    if (mesh) {
      this.highlightAtom(mesh, 0.55);
      if (this.onHoverCb) {
        this.onHoverCb(this.extractInfo(mesh));
      }
    } else if (this.onHoverCb && !this.clickedMesh) {
      this.onHoverCb(null);
    }

    this.domElement.style.cursor = mesh ? 'pointer' : 'grab';
  }

  setClickedAtom(mesh: THREE.Mesh) {
    if (this.clickedMesh && this.clickedMesh !== this.hoveredMesh) {
      this.dimAtom(this.clickedMesh);
    }
    this.clickedMesh = mesh;
    this.highlightAtom(mesh, 0.8);

    if (this.onClickCb) {
      this.onClickCb(this.extractInfo(mesh));
    }
  }

  clearClicked() {
    if (this.clickedMesh) {
      if (this.clickedMesh !== this.hoveredMesh) {
        this.dimAtom(this.clickedMesh);
      }
      this.clickedMesh = null;
      if (this.onClickCb) this.onClickCb(null);
    }
  }

  private extractInfo(mesh: THREE.Mesh): AtomInfo | null {
    const ud = mesh.userData as AtomUserData | undefined;
    if (!ud) return null;
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    return {
      id: ud.atomId,
      element: ud.element,
      elementName: ELEMENT_NAMES[ud.element],
      position: {
        x: Number(worldPos.x.toFixed(3)),
        y: Number(worldPos.y.toFixed(3)),
        z: Number(worldPos.z.toFixed(3)),
      },
    };
  }

  private highlightAtom(mesh: THREE.Mesh, intensity: number) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const ud = mesh.userData as AtomUserData;
    if (!mat || !ud) return;

    const color = ELEMENT_COLORS[ud.element];
    const r = ((color >> 16) & 0xff) / 255;
    const g = ((color >> 8) & 0xff) / 255;
    const b = (color & 0xff) / 255;
    const lr = Math.min(1, r + (1 - r) * 0.6);
    const lg = Math.min(1, g + (1 - g) * 0.6);
    const lb = Math.min(1, b + (1 - b) * 0.6);

    mat.color.setRGB(lr, lg, lb);
    mat.emissive.setRGB(r * intensity, g * intensity, b * intensity);
    mat.emissiveIntensity = intensity;
  }

  private dimAtom(mesh: THREE.Mesh) {
    const mat = mesh.material as THREE.MeshStandardMaterial;
    const ud = mesh.userData as AtomUserData;
    if (!mat || !ud) return;
    mat.color.copy(ud.baseColor);
    mat.emissive.setRGB(0, 0, 0);
    mat.emissiveIntensity = 0;
  }

  animate(delta: number) {
    if (!this.highlightTweenActive) return;
    this.pulseTime += delta;
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', this.boundPointerMove);
    this.domElement.removeEventListener('pointerdown', this.boundPointerDown);
    this.hoveredMesh = null;
    this.clickedMesh = null;
  }
}
