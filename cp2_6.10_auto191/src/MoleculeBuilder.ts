import * as THREE from 'three';

export interface AtomData {
  element: string;
  position: [number, number, number];
}

export interface BondData {
  atomIndex1: number;
  atomIndex2: number;
  bondOrder: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export interface BuiltMolecule {
  group: THREE.Group;
  atoms: THREE.Mesh[];
  bonds: THREE.Mesh[];
  atomUserData: Array<{ element: string; index: number }>;
  bondUserData: Array<{ atom1: string; atom2: string; index1: number; index2: number; bondLength: number; bondOrder: number }>;
  uniqueElements: string[];
}

const CPK_COLORS: Record<string, number> = {
  H: 0xffffff,
  C: 0x909090,
  N: 0x3050f8,
  O: 0xff0d0d,
  F: 0x90e050,
  Cl: 0x1ff01f,
  Br: 0xa62929,
  I: 0x940094,
  S: 0xffff30,
  P: 0xff8000
};

const ATOM_RADII: Record<string, number> = {
  H: 0.3,
  C: 0.7,
  N: 0.65,
  O: 0.8,
  F: 0.6,
  Cl: 1.0,
  Br: 1.1,
  I: 1.3,
  S: 1.0,
  P: 1.0
};

const BOND_RADIUS = 0.15;
const BOND_COLOR = 0x888888;

const H2O_MOLECULE: MoleculeData = {
  name: 'Water',
  formula: 'H2O',
  atoms: [
    { element: 'O', position: [0, 0, 0] },
    { element: 'H', position: [0.757, 0.586, 0] },
    { element: 'H', position: [-0.757, 0.586, 0] }
  ],
  bonds: [
    { atomIndex1: 0, atomIndex2: 1, bondOrder: 1 },
    { atomIndex1: 0, atomIndex2: 2, bondOrder: 1 }
  ]
};

const CO2_MOLECULE: MoleculeData = {
  name: 'Carbon Dioxide',
  formula: 'CO2',
  atoms: [
    { element: 'C', position: [0, 0, 0] },
    { element: 'O', position: [1.16, 0, 0] },
    { element: 'O', position: [-1.16, 0, 0] }
  ],
  bonds: [
    { atomIndex1: 0, atomIndex2: 1, bondOrder: 2 },
    { atomIndex1: 0, atomIndex2: 2, bondOrder: 2 }
  ]
};

const C6H6_MOLECULE: MoleculeData = (() => {
  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];
  const radiusC = 1.39;
  const radiusH = 2.48;

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    atoms.push({
      element: 'C',
      position: [radiusC * Math.cos(angle), radiusC * Math.sin(angle), 0]
    });
  }

  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    atoms.push({
      element: 'H',
      position: [radiusH * Math.cos(angle), radiusH * Math.sin(angle), 0]
    });
  }

  for (let i = 0; i < 6; i++) {
    bonds.push({
      atomIndex1: i,
      atomIndex2: (i + 1) % 6,
      bondOrder: i % 2 === 0 ? 2 : 1
    });
  }

  for (let i = 0; i < 6; i++) {
    bonds.push({
      atomIndex1: i,
      atomIndex2: 6 + i,
      bondOrder: 1
    });
  }

  return { name: 'Benzene', formula: 'C6H6', atoms, bonds };
})();

export const MOLECULES: Record<string, MoleculeData> = {
  H2O: H2O_MOLECULE,
  CO2: CO2_MOLECULE,
  C6H6: C6H6_MOLECULE
};

export class MoleculeBuilder {
  private atomGeometry: THREE.SphereGeometry;
  private singleBondGeometry: THREE.CylinderGeometry;

  constructor() {
    this.atomGeometry = new THREE.SphereGeometry(1, 32, 32);
    this.singleBondGeometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 16);
    this.singleBondGeometry.translate(0, 0.5, 0);
  }

  public getCPKColor(element: string): number {
    return CPK_COLORS[element] ?? 0x888888;
  }

  public getAtomRadius(element: string): number {
    return ATOM_RADII[element] ?? 0.5;
  }

  public buildMolecule(data: MoleculeData): BuiltMolecule {
    const group = new THREE.Group();
    const atoms: THREE.Mesh[] = [];
    const bonds: THREE.Mesh[] = [];
    const atomUserData: Array<{ element: string; index: number }> = [];
    const bondUserData: Array<{ atom1: string; atom2: string; index1: number; index2: number; bondLength: number; bondOrder: number }> = [];

    const elementCounts: Record<string, number> = {};

    data.atoms.forEach((atom, index) => {
      const element = atom.element;
      if (!elementCounts[element]) elementCounts[element] = 0;
      elementCounts[element]++;

      const radius = this.getAtomRadius(element);
      const color = this.getCPKColor(element);

      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: 100,
        specular: 0x444444
      });

      const mesh = new THREE.Mesh(this.atomGeometry, material);
      mesh.scale.setScalar(radius);
      mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
      mesh.userData = { type: 'atom', element, index, elementIndex: elementCounts[element] };

      atoms.push(mesh);
      atomUserData.push({ element, index });
      group.add(mesh);
    });

    data.bonds.forEach((bond, index) => {
      const atom1 = data.atoms[bond.atomIndex1];
      const atom2 = data.atoms[bond.atomIndex2];
      const p1 = new THREE.Vector3(atom1.position[0], atom1.position[1], atom1.position[2]);
      const p2 = new THREE.Vector3(atom2.position[0], atom2.position[1], atom2.position[2]);
      const direction = new THREE.Vector3().subVectors(p2, p1);
      const length = direction.length();

      const bondOrder = bond.bondOrder;

      for (let b = 0; b < bondOrder; b++) {
        const material = new THREE.MeshPhongMaterial({
          color: BOND_COLOR,
          shininess: 80,
          specular: 0x333333
        });

        const mesh = new THREE.Mesh(this.singleBondGeometry, material);

        const offset = this.getBondOffset(b, bondOrder, direction);
        const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5).add(offset);

        mesh.position.copy(midPoint);
        mesh.scale.set(1, length, 1);
        mesh.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        );

        mesh.userData = {
          type: 'bond',
          atom1: atom1.element,
          atom2: atom2.element,
          index1: bond.atomIndex1,
          index2: bond.atomIndex2,
          bondIndex: index,
          bondLength: length,
          bondOrder
        };

        bonds.push(mesh);
        group.add(mesh);
      }

      bondUserData.push({
        atom1: atom1.element,
        atom2: atom2.element,
        index1: bond.atomIndex1,
        index2: bond.atomIndex2,
        bondLength: length,
        bondOrder
      });
    });

    const uniqueElements = Array.from(new Set(data.atoms.map(a => a.element)));

    return { group, atoms, bonds, atomUserData, bondUserData, uniqueElements };
  }

  private getBondOffset(bondIdx: number, bondOrder: number, direction: THREE.Vector3): THREE.Vector3 {
    if (bondOrder === 1) return new THREE.Vector3(0, 0, 0);

    const offsetDist = 0.18;
    const up = new THREE.Vector3(0, 0, 1);
    const perp = new THREE.Vector3().crossVectors(direction.clone().normalize(), up);

    if (perp.lengthSq() < 0.001) {
      perp.set(1, 0, 0);
    } else {
      perp.normalize();
    }

    if (bondOrder === 2) {
      const sign = bondIdx === 0 ? -1 : 1;
      return perp.multiplyScalar(sign * offsetDist);
    } else if (bondOrder === 3) {
      if (bondIdx === 0) return perp.clone().multiplyScalar(-offsetDist);
      if (bondIdx === 1) return new THREE.Vector3(0, 0, 0);
      return perp.clone().multiplyScalar(offsetDist);
    }

    return new THREE.Vector3(0, 0, 0);
  }

  public disposeMolecule(molecule: BuiltMolecule): void {
    molecule.atoms.forEach(mesh => {
      (mesh.material as THREE.Material).dispose();
    });
    molecule.bonds.forEach(mesh => {
      (mesh.material as THREE.Material).dispose();
    });
    molecule.group.clear();
  }
}
