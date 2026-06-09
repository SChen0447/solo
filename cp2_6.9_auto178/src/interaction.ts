import * as THREE from 'three';
import { ELEMENTS, ElementInfo, MoleculeGroup } from './molecules';

export interface HighlightState {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  startTime: number;
  element: ElementInfo;
}

export type OnAtomSelectCallback = (info: ElementInfo | null) => void;

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private rendererDom: HTMLElement;
  private scene: THREE.Scene;
  private molecule: MoleculeGroup | null = null;
  private highlightState: HighlightState | null = null;
  private onAtomSelect: OnAtomSelectCallback | null = null;
  private clock: THREE.Clock;

  constructor(
    camera: THREE.PerspectiveCamera,
    rendererDom: HTMLElement,
    scene: THREE.Scene
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.rendererDom = rendererDom;
    this.scene = scene;
    this.clock = new THREE.Clock();
    this.bindEvents();
  }

  setMolecule(molecule: MoleculeGroup): void {
    this.clearHighlight();
    this.molecule = molecule;
  }

  setOnAtomSelect(callback: OnAtomSelectCallback): void {
    this.onAtomSelect = callback;
  }

  private bindEvents(): void {
    this.rendererDom.addEventListener('click', (event: MouseEvent) => {
      this.handleClick(event);
    });
  }

  private handleClick(event: MouseEvent): void {
    if (!this.molecule) return;

    const rect = this.rendererDom.getBoundingClientRect();
    this.mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height * 2 - 1);

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.molecule.atomMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.toggleHighlight(mesh);
    } else {
      this.clearHighlight();
    }
  }

  private toggleHighlight(mesh: THREE.Mesh): void {
    if (this.highlightState && this.highlightState.mesh === mesh) {
      this.clearHighlight();
      return;
    } else {
      this.setHighlight(mesh);
    }
  }

  private setHighlight(mesh: THREE.Mesh): void {
    this.clearHighlight();

    const element = ELEMENTS[mesh.userData.element];
    if (!element) return;

    const haloGeometry = new THREE.RingGeometry(0.5, 0.6, 32);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00FFFF'),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(mesh.position);
    halo.lookAt(this.camera.position);
    this.molecule?.group.add(halo);

    this.highlightState = {
      mesh,
      halo,
      startTime: this.clock.getElapsedTime(),
      element,
    };

    if (this.onAtomSelect) {
      this.onAtomSelect(element);
    }
  }

  clearHighlight(): void {
    if (this.highlightState) {
      this.highlightState.halo.geometry.dispose();
      (this.highlightState.halo.material as THREE.Material).dispose();
      this.molecule?.group.remove(this.highlightState.halo);
      this.highlightState = null;
      if (this.onAtomSelect) {
        this.onAtomSelect(null);
      }
    }
  }

  update(): void {
    if (!this.highlightState) return;

    const elapsed = this.clock.getElapsedTime() - this.highlightState.startTime;

    if (elapsed > 2) {
      this.clearHighlight();
      return;
    }

    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 8);
    const haloMaterial = this.highlightState.halo.material as THREE.MeshBasicMaterial;
    haloMaterial.opacity = 0.3 + 0.5 * pulse;
    const scale = 1 + 0.15 * pulse;
    this.highlightState.halo.scale.set(scale, scale, scale);
    this.highlightState.halo.lookAt(this.camera.position);
  }
}
