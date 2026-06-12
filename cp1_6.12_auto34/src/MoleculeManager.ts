import * as THREE from 'three';
import { MoleculeData, AtomData, BondData, elementColors, elementRadii, getMoleculeById, OrbitalData } from './moleculeData';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    atomIndex: number;
    element: string;
    originalColor: THREE.Color;
    isSelected: boolean;
  };
}

export interface BondMesh extends THREE.Mesh {
  userData: {
    bondIndex: number;
    atom1: number;
    atom2: number;
  };
}

export type ViewMode = 'standard' | 'fragment';

export class MoleculeManager {
  private scene: THREE.Scene;
  private moleculeGroup: THREE.Group;
  private currentMolecule: MoleculeData | null = null;
  private atomMeshes: AtomMesh[] = [];
  private bondMeshes: BondMesh[] = [];
  private orbitalMeshes: THREE.Mesh[] = [];
  private selectedAtomIndices: Set<number> = new Set();
  private viewMode: ViewMode = 'standard';
  private animationTime: number = 0;
  private isAnimating: boolean = false;
  private animationType: 'entry' | 'fadeOut' | 'fadeIn' | null = null;
  private animationProgress: number = 0;
  private pendingMoleculeId: string | null = null;
  private showOrbitals: boolean = true;

  private atomGeometry: THREE.SphereGeometry;
  private bondMaterial: THREE.MeshStandardMaterial;
  private orbitalMaterial: THREE.MeshStandardMaterial;

  private onMoleculeLoadedCallback: ((molecule: MoleculeData) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.atomGeometry = new THREE.SphereGeometry(1, 32, 32);
    this.bondMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.3,
      transparent: true,
      opacity: 0.9
    });
    this.orbitalMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1
    });
  }

  public setOnMoleculeLoaded(callback: (molecule: MoleculeData) => void) {
    this.onMoleculeLoadedCallback = callback;
  }

  public getCurrentMolecule(): MoleculeData | null {
    return this.currentMolecule;
  }

  public getAtomMeshes(): AtomMesh[] {
    return this.atomMeshes;
  }

  public getMoleculeGroup(): THREE.Group {
    return this.moleculeGroup;
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.updateFragmentMode();
  }

  public setShowOrbitals(show: boolean) {
    this.showOrbitals = show;
    this.orbitalMeshes.forEach(mesh => {
      mesh.visible = show;
    });
  }

  public getShowOrbitals(): boolean {
    return this.showOrbitals;
  }

  public async load(moleculeId: string): Promise<void> {
    const molecule = getMoleculeById(moleculeId);
    if (!molecule) {
      console.warn(`Molecule not found: ${moleculeId}`);
      return;
    }

    if (this.currentMolecule && this.currentMolecule.id !== moleculeId) {
      this.pendingMoleculeId = moleculeId;
      this.startFadeOutAnimation();
      return;
    }

    if (!this.currentMolecule) {
      this.createMolecule(molecule);
      this.startEntryAnimation();
    }
  }

  public clear() {
    this.atomMeshes.forEach(mesh => {
      this.moleculeGroup.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    });
    this.bondMeshes.forEach(mesh => {
      this.moleculeGroup.remove(mesh);
    });
    this.orbitalMeshes.forEach(mesh => {
      this.moleculeGroup.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
    });

    this.atomMeshes = [];
    this.bondMeshes = [];
    this.orbitalMeshes = [];
    this.selectedAtomIndices.clear();
    this.currentMolecule = null;
  }

  private createMolecule(molecule: MoleculeData) {
    this.clear();
    this.currentMolecule = molecule;

    molecule.atoms.forEach((atom, index) => {
      this.createAtom(atom, index);
    });

    molecule.bonds.forEach((bond, index) => {
      this.createBond(bond, index, molecule.atoms);
    });

    if (this.showOrbitals) {
      molecule.orbitals.forEach((orbital) => {
        this.createOrbital(orbital, molecule.atoms);
      });
    }

    if (this.onMoleculeLoadedCallback) {
      this.onMoleculeLoadedCallback(molecule);
    }
  }

  private createAtom(atom: AtomData, index: number) {
    const color = elementColors[atom.element] || 0xffffff;
    const radius = elementRadii[atom.element] || 0.4;

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
      emissive: color,
      emissiveIntensity: 0.1
    });

    const mesh = new THREE.Mesh(this.atomGeometry, material) as AtomMesh;
    mesh.scale.setScalar(radius);
    mesh.position.set(atom.x, atom.y, atom.z);
    mesh.userData = {
      atomIndex: index,
      element: atom.element,
      originalColor: new THREE.Color(color),
      isSelected: false
    };
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.atomMeshes.push(mesh);
    this.moleculeGroup.add(mesh);
  }

  private createBond(bond: BondData, index: number, atoms: AtomData[]) {
    const atom1 = atoms[bond.atom1];
    const atom2 = atoms[bond.atom2];

    const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
    const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
    const distance = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5);

    const bondRadius = 0.1 * (bond.order > 1 ? 1 + (bond.order - 1) * 0.3 : 1);
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, distance, 16);

    const material = this.bondMaterial.clone();
    if (bond.order >= 2) {
      material.color.setHex(0xaaaaaa);
    }

    const mesh = new THREE.Mesh(geometry, material) as BondMesh;
    mesh.position.copy(mid);
    mesh.lookAt(end);
    mesh.rotateX(Math.PI / 2);

    mesh.userData = {
      bondIndex: index,
      atom1: bond.atom1,
      atom2: bond.atom2
    };

    this.bondMeshes.push(mesh);
    this.moleculeGroup.add(mesh);
  }

  private createOrbital(orbital: OrbitalData, atoms: AtomData[]) {
    const atom = atoms[orbital.atomIndex];
    const atomRadius = elementRadii[atom.element] || 0.4;

    let size = atomRadius * 2.5;
    let color = 0x00ffff;

    switch (orbital.type) {
      case 's':
        size = atomRadius * 1.8;
        color = 0xffff00;
        break;
      case 'p':
        size = atomRadius * 2.5;
        color = 0x00ff00;
        break;
      case 'sp':
        size = atomRadius * 2.2;
        color = 0xff00ff;
        break;
      case 'sp2':
        size = atomRadius * 2.3;
        color = 0x00ffff;
        break;
      case 'sp3':
        size = atomRadius * 2.4;
        color = 0xff8800;
        break;
    }

    const geometry = new THREE.SphereGeometry(size, 24, 24);
    geometry.scale(1, 0.6, 1);

    const material = this.orbitalMaterial.clone();
    material.color.setHex(color);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(atom.x, atom.y, atom.z);
    mesh.visible = this.showOrbitals;

    if (orbital.orientation) {
      const dir = new THREE.Vector3(
        orbital.orientation.x,
        orbital.orientation.y,
        orbital.orientation.z
      ).normalize();
      mesh.lookAt(atom.x + dir.x, atom.y + dir.y, atom.z + dir.z);
    }

    this.orbitalMeshes.push(mesh);
    this.moleculeGroup.add(mesh);
  }

  private startEntryAnimation() {
    this.isAnimating = true;
    this.animationType = 'entry';
    this.animationProgress = 0;

    this.atomMeshes.forEach((mesh, i) => {
      const atom = this.currentMolecule?.atoms[i];
      if (atom) {
        mesh.userData.originalPosition = new THREE.Vector3(atom.x, atom.y, atom.z);
        mesh.position.set(0, 0, 0);
        mesh.scale.setScalar(0);
      }
    });

    this.bondMeshes.forEach(mesh => {
      mesh.visible = false;
    });
  }

  private startFadeOutAnimation() {
    this.isAnimating = true;
    this.animationType = 'fadeOut';
    this.animationProgress = 0;
  }

  private startFadeInAnimation() {
    this.isAnimating = true;
    this.animationType = 'fadeIn';
    this.animationProgress = 0;

    this.moleculeGroup.scale.setScalar(0.1);
    this.atomMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
    });
    this.bondMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0;
    });
  }

  public update(deltaTime: number) {
    this.animationTime += deltaTime;

    this.orbitalMeshes.forEach((mesh, i) => {
      const pulse = 1 + Math.sin(this.animationTime * 2 + i * 0.5) * 0.08;
      mesh.scale.setScalar(pulse);
    });

    if (!this.isAnimating || !this.animationType) return;

    const animationSpeeds = {
      entry: 1.0,
      fadeOut: 1 / 0.3,
      fadeIn: 1 / 0.5
    };

    this.animationProgress += deltaTime * animationSpeeds[this.animationType];

    if (this.animationProgress >= 1) {
      this.animationProgress = 1;
      this.completeAnimation();
    }

    switch (this.animationType) {
      case 'entry':
        this.updateEntryAnimation(this.animationProgress);
        break;
      case 'fadeOut':
        this.updateFadeOutAnimation(this.animationProgress);
        break;
      case 'fadeIn':
        this.updateFadeInAnimation(this.animationProgress);
        break;
    }
  }

  private updateEntryAnimation(progress: number) {
    const eased = this.easeOutBack(progress);

    this.atomMeshes.forEach((mesh, i) => {
      const originalPos = mesh.userData.originalPosition as THREE.Vector3;
      if (originalPos) {
        mesh.position.lerpVectors(new THREE.Vector3(0, 0, 0), originalPos, eased);
        const atom = this.currentMolecule?.atoms[i];
        const radius = atom ? elementRadii[atom.element] || 0.4 : 0.4;
        mesh.scale.setScalar(radius * eased);
      }
    });

    if (progress > 0.5) {
      const bondProgress = (progress - 0.5) * 2;
      this.bondMeshes.forEach(mesh => {
        mesh.visible = true;
        (mesh.material as THREE.MeshStandardMaterial).opacity = 0.9 * bondProgress;
      });
    }
  }

  private updateFadeOutAnimation(progress: number) {
    const eased = this.easeInQuad(progress);
    const scale = 1 - eased * 0.8;
    this.moleculeGroup.scale.setScalar(scale);

    this.atomMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.85 * (1 - eased);
    });
    this.bondMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.9 * (1 - eased);
    });
  }

  private updateFadeInAnimation(progress: number) {
    const eased = this.easeOutBack(progress);
    const scale = 0.1 + eased * 0.9;
    this.moleculeGroup.scale.setScalar(scale);

    this.atomMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.85 * eased;
    });
    this.bondMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.9 * eased;
    });
  }

  private completeAnimation() {
    this.isAnimating = false;

    if (this.animationType === 'fadeOut' && this.pendingMoleculeId) {
      const nextId = this.pendingMoleculeId;
      this.pendingMoleculeId = null;
      const molecule = getMoleculeById(nextId);
      if (molecule) {
        this.createMolecule(molecule);
        this.moleculeGroup.scale.setScalar(1);
        this.startFadeInAnimation();
      }
      return;
    }

    if (this.animationType === 'entry' || this.animationType === 'fadeIn') {
      this.atomMeshes.forEach((mesh, i) => {
        const atom = this.currentMolecule?.atoms[i];
        if (atom) {
          const radius = elementRadii[atom.element] || 0.4;
          mesh.scale.setScalar(radius);
          (mesh.material as THREE.MeshStandardMaterial).opacity = 0.85;
        }
      });
      this.bondMeshes.forEach(mesh => {
        mesh.visible = true;
        (mesh.material as THREE.MeshStandardMaterial).opacity = 0.9;
      });
    }

    this.animationType = null;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  public selectAtom(atomIndex: number, multiSelect: boolean = false) {
    if (!multiSelect) {
      this.selectedAtomIndices.clear();
    }

    if (this.selectedAtomIndices.has(atomIndex)) {
      this.selectedAtomIndices.delete(atomIndex);
    } else {
      this.selectedAtomIndices.add(atomIndex);
    }

    this.updateFragmentMode();
  }

  public resetSelection() {
    this.selectedAtomIndices.clear();
    this.updateFragmentMode();
  }

  public getSelectedAtomIndices(): Set<number> {
    return this.selectedAtomIndices;
  }

  private updateFragmentMode() {
    if (this.viewMode === 'standard') {
      this.setFullOpacity();
      return;
    }

    if (this.selectedAtomIndices.size === 0) {
      this.setFullOpacity();
      return;
    }

    const connectedAtoms = new Set<number>(this.selectedAtomIndices);
    const connectedBonds = new Set<number>();

    this.bondMeshes.forEach((bondMesh) => {
      const { atom1, atom2 } = bondMesh.userData;
      if (this.selectedAtomIndices.has(atom1) || this.selectedAtomIndices.has(atom2)) {
        connectedBonds.add(bondMesh.userData.bondIndex);
        if (this.selectedAtomIndices.has(atom1)) connectedAtoms.add(atom2);
        if (this.selectedAtomIndices.has(atom2)) connectedAtoms.add(atom1);
      }
    });

    this.atomMeshes.forEach((mesh) => {
      const { atomIndex } = mesh.userData;
      const isHighlighted = connectedAtoms.has(atomIndex);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = isHighlighted ? 0.95 : 0.2;
      material.emissiveIntensity = isHighlighted ? 0.3 : 0.05;
    });

    this.bondMeshes.forEach((mesh) => {
      const { bondIndex } = mesh.userData;
      const isHighlighted = connectedBonds.has(bondIndex);
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = isHighlighted ? 0.95 : 0.15;
    });
  }

  private setFullOpacity() {
    this.atomMeshes.forEach(mesh => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.opacity = 0.85;
      material.emissiveIntensity = 0.1;
    });
    this.bondMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshStandardMaterial).opacity = 0.9;
    });
  }

  public focusOnMolecule(): { center: THREE.Vector3; radius: number } {
    const center = new THREE.Vector3();
    let maxRadius = 0;

    if (this.atomMeshes.length > 0) {
      this.atomMeshes.forEach(mesh => {
        center.add(mesh.position);
        const dist = mesh.position.length();
        const atomRadius = elementRadii[mesh.userData.element] || 0.4;
        if (dist + atomRadius > maxRadius) {
          maxRadius = dist + atomRadius;
        }
      });
      center.divideScalar(this.atomMeshes.length);
    }

    return { center, radius: maxRadius };
  }

  public isTransitioning(): boolean {
    return this.isAnimating;
  }
}
