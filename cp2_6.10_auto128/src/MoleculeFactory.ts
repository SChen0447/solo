import * as THREE from 'three';

export type ElementType = 'H' | 'C' | 'O';

export interface AtomData {
  element: ElementType;
  position: [number, number, number];
  index: number;
}

export interface BondData {
  atom1Index: number;
  atom2Index: number;
  order: 1 | 2;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_COLORS: Record<ElementType, number> = {
  H: 0xffffff,
  C: 0x555555,
  O: 0xff3333
};

export const ELEMENT_SYMBOLS: Record<ElementType, string> = {
  H: 'H',
  C: 'C',
  O: 'O'
};

export const ATOM_RADIUS: Record<ElementType, number> = {
  H: 0.25,
  C: 0.35,
  O: 0.32
};

export const BOND_RADIUS = 0.08;
export const DOUBLE_BOND_OFFSET = 0.12;

export const MOLECULE_PRESETS: Record<string, MoleculeData> = {
  water: {
    name: '水',
    formula: 'H₂O',
    atoms: [
      { element: 'O', position: [0, 0, 0], index: 0 },
      { element: 'H', position: [0.76, 0.59, 0], index: 1 },
      { element: 'H', position: [-0.76, 0.59, 0], index: 2 }
    ],
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 1 },
      { atom1Index: 0, atom2Index: 2, order: 1 }
    ]
  },
  co2: {
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      { element: 'C', position: [0, 0, 0], index: 0 },
      { element: 'O', position: [1.16, 0, 0], index: 1 },
      { element: 'O', position: [-1.16, 0, 0], index: 2 }
    ],
    bonds: [
      { atom1Index: 0, atom2Index: 1, order: 2 },
      { atom1Index: 0, atom2Index: 2, order: 2 }
    ]
  },
  benzene: {
    name: '苯环',
    formula: 'C₆H₆',
    atoms: (() => {
      const atoms: AtomData[] = [];
      const radiusC = 1.4;
      const radiusH = 2.5;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const cx = radiusC * Math.cos(angle);
        const cy = radiusC * Math.sin(angle);
        const hx = radiusH * Math.cos(angle);
        const hy = radiusH * Math.sin(angle);
        atoms.push({ element: 'C', position: [cx, cy, 0], index: i });
        atoms.push({ element: 'H', position: [hx, hy, 0], index: i + 6 });
      }
      return atoms;
    })(),
    bonds: (() => {
      const bonds: BondData[] = [];
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const order: 1 | 2 = i % 2 === 0 ? 2 : 1;
        bonds.push({ atom1Index: i * 2, atom2Index: next * 2, order });
        bonds.push({ atom1Index: i * 2, atom2Index: i * 2 + 1, order: 1 });
      }
      return bonds;
    })()
  }
};

export interface BondMeshGroup {
  meshes: THREE.Mesh[];
  atom1: THREE.Mesh;
  atom2: THREE.Mesh;
  originalLength: number;
  direction: THREE.Vector3;
  midpoint: THREE.Vector3;
  isAnimating: boolean;
  animationStartTime: number;
}

export interface AtomMeshInfo {
  mesh: THREE.Mesh;
  element: ElementType;
  index: number;
  originalScale: number;
}

export class MoleculeFactory {
  private atomGeometry: THREE.SphereGeometry;
  private bondMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.atomGeometry = new THREE.SphereGeometry(1, 32, 32);
    this.bondMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.3
    });
  }

  createAtom(atom: AtomData): THREE.Mesh {
    const color = ELEMENT_COLORS[atom.element];
    const radius = ATOM_RADIUS[atom.element];
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.05
    });
    const mesh = new THREE.Mesh(this.atomGeometry, material);
    mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
    mesh.scale.setScalar(radius);
    mesh.userData = {
      type: 'atom',
      element: atom.element,
      index: atom.index,
      originalScale: radius,
      originalEmissiveIntensity: 0.05
    };
    return mesh;
  }

  createBondCylinder(
    start: THREE.Vector3,
    end: THREE.Vector3,
    offsetPerpendicular: THREE.Vector3 = new THREE.Vector3()
  ): THREE.Mesh {
    const startWithOffset = start.clone().add(offsetPerpendicular);
    const endWithOffset = end.clone().add(offsetPerpendicular);
    const direction = new THREE.Vector3().subVectors(endWithOffset, startWithOffset);
    const length = direction.length();

    const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 16);
    const mesh = new THREE.Mesh(geometry, this.bondMaterial.clone());

    const midpoint = new THREE.Vector3().addVectors(startWithOffset, endWithOffset).multiplyScalar(0.5);
    mesh.position.copy(midpoint);

    const up = new THREE.Vector3(0, 1, 0);
    const normal = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    mesh.quaternion.copy(quaternion);

    mesh.userData = {
      type: 'bond',
      originalLength: length,
      direction: normal,
      start: startWithOffset.clone(),
      end: endWithOffset.clone(),
      isAnimating: false,
      animationStartTime: 0,
      originalScaleY: 1,
      originalPosition: mesh.position.clone()
    };

    return mesh;
  }

  createBond(
    bond: BondData,
    atomMeshes: THREE.Mesh[]
  ): THREE.Mesh[] {
    const atom1 = atomMeshes[bond.atom1Index];
    const atom2 = atomMeshes[bond.atom2Index];

    if (!atom1 || !atom2) return [];

    const start = atom1.position.clone();
    const end = atom2.position.clone();
    const bondDirection = new THREE.Vector3().subVectors(end, start).normalize();

    const result: THREE.Mesh[] = [];

    if (bond.order === 1) {
      const cylinder = this.createBondCylinder(start, end);
      result.push(cylinder);
    } else {
      const up = Math.abs(bondDirection.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const perp1 = new THREE.Vector3().crossVectors(bondDirection, up).normalize();
      perp1.multiplyScalar(DOUBLE_BOND_OFFSET);
      const perp2 = perp1.clone().negate();

      result.push(this.createBondCylinder(start, end, perp1));
      result.push(this.createBondCylinder(start, end, perp2));
    }

    result.forEach((mesh) => {
      mesh.userData.bondOrder = bond.order;
      mesh.userData.atom1Index = bond.atom1Index;
      mesh.userData.atom2Index = bond.atom2Index;
    });

    return result;
  }

  buildMolecule(key: string): {
    group: THREE.Group;
    atoms: AtomMeshInfo[];
    bonds: BondMeshGroup[];
  } | null {
    const data = MOLECULE_PRESETS[key];
    if (!data) return null;

    const group = new THREE.Group();
    group.name = data.name;

    const atomMeshes: THREE.Mesh[] = [];
    const atomInfos: AtomMeshInfo[] = [];

    data.atoms.forEach((atom) => {
      const mesh = this.createAtom(atom);
      atomMeshes.push(mesh);
      atomInfos.push({
        mesh,
        element: atom.element,
        index: atom.index,
        originalScale: ATOM_RADIUS[atom.element]
      });
      group.add(mesh);
    });

    const bondGroups: BondMeshGroup[] = [];

    data.bonds.forEach((bond) => {
      const bondMeshes = this.createBond(bond, atomMeshes);
      bondMeshes.forEach((m) => group.add(m));

      if (bondMeshes.length > 0) {
        const a1 = atomMeshes[bond.atom1Index];
        const a2 = atomMeshes[bond.atom2Index];
        const dir = new THREE.Vector3().subVectors(a2.position, a1.position).normalize();
        const len = a1.position.distanceTo(a2.position);
        const mid = new THREE.Vector3().addVectors(a1.position, a2.position).multiplyScalar(0.5);

        bondGroups.push({
          meshes: bondMeshes,
          atom1: a1,
          atom2: a2,
          originalLength: len,
          direction: dir,
          midpoint: mid,
          isAnimating: false,
          animationStartTime: 0
        });
      }
    });

    return { group, atoms: atomInfos, bonds: bondGroups };
  }

  dispose(): void {
    this.atomGeometry.dispose();
    this.bondMaterial.dispose();
  }
}
