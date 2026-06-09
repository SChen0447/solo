import * as THREE from 'three';

export interface ElementInfo {
  symbol: string;
  name: string;
  atomicNumber: number;
  mass: number;
  electronegativity: number;
  color: string;
}

export const ELEMENTS: Record<string, ElementInfo> = {
  C: {
    symbol: 'C',
    name: '碳',
    atomicNumber: 6,
    mass: 12.011,
    electronegativity: 2.55,
    color: '#404040',
  },
  O: {
    symbol: 'O',
    name: '氧',
    atomicNumber: 8,
    mass: 15.999,
    electronegativity: 3.44,
    color: '#FF0000',
  },
  N: {
    symbol: 'N',
    name: '氮',
    atomicNumber: 7,
    mass: 14.007,
    electronegativity: 3.04,
    color: '#3050F8',
  },
  H: {
    symbol: 'H',
    name: '氢',
    atomicNumber: 1,
    mass: 1.008,
    electronegativity: 2.20,
    color: '#FFFFFF',
  },
};

export interface AtomData {
  element: string;
  position: [number, number, number];
}

export interface BondData {
  from: number;
  to: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const CAFFEINE: MoleculeData = {
  name: '咖啡因',
  formula: 'C8H10N4O2',
  atoms: [
    { element: 'N', position: [0.00, 0.00, 0.00] },
    { element: 'C', position: [0.77, 0.00, 0.50] },
    { element: 'N', position: [1.54, 0.00, 0.00] },
    { element: 'C', position: [1.54, 0.00, -1.35] },
    { element: 'C', position: [0.77, 0.00, -1.85] },
    { element: 'C', position: [0.00, 0.00, -1.35] },
    { element: 'N', position: [0.77, 0.00, 1.85] },
    { element: 'C', position: [1.54, 0.00, 2.35] },
    { element: 'O', position: [2.31, 0.00, -2.00] },
    { element: 'O', position: [0.00, 0.00, 1.85] },
    { element: 'C', position: [-0.77, 0.00, 0.50] },
    { element: 'H', position: [-0.77, 0.85, 1.10] },
    { element: 'H', position: [-0.77, -0.85, 1.10] },
    { element: 'H', position: [-1.35, 0.00, 0.00] },
    { element: 'C', position: [2.31, 0.00, 0.50] },
    { element: 'H', position: [2.31, 0.85, 1.10] },
    { element: 'H', position: [2.31, -0.85, 1.10] },
    { element: 'H', position: [2.89, 0.00, 0.00] },
    { element: 'C', position: [0.77, 0.00, -2.85] },
    { element: 'H', position: [0.77, 0.85, -3.40] },
    { element: 'H', position: [0.77, -0.85, -3.40] },
    { element: 'H', position: [1.35, 0.00, -2.85] },
    { element: 'C', position: [1.54, 0.00, 3.70] },
    { element: 'H', position: [1.54, 0.85, 4.25] },
    { element: 'H', position: [1.54, -0.85, 4.25] },
    { element: 'H', position: [2.12, 0.00, 3.70] },
  ],
  bonds: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
    { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 0 },
    { from: 1, to: 6 }, { from: 6, to: 9 }, { from: 6, to: 7 },
    { from: 3, to: 8 }, { from: 4, to: 18 }, { from: 0, to: 10 },
    { from: 10, to: 11 }, { from: 10, to: 12 }, { from: 10, to: 13 },
    { from: 2, to: 14 }, { from: 14, to: 15 }, { from: 14, to: 16 },
    { from: 14, to: 17 }, { from: 18, to: 19 }, { from: 18, to: 20 },
    { from: 18, to: 21 }, { from: 7, to: 22 }, { from: 22, to: 23 },
    { from: 22, to: 24 }, { from: 22, to: 25 },
  ],
};

export const ASPIRIN: MoleculeData = {
  name: '阿司匹林',
  formula: 'C9H8O4',
  atoms: [
    { element: 'C', position: [0.00, 0.00, 0.00] },
    { element: 'C', position: [1.40, 0.00, 0.00] },
    { element: 'C', position: [2.10, 1.21, 0.00] },
    { element: 'C', position: [1.40, 2.42, 0.00] },
    { element: 'C', position: [0.00, 2.42, 0.00] },
    { element: 'C', position: [-0.70, 1.21, 0.00] },
    { element: 'C', position: [-0.70, -1.40, 0.00] },
    { element: 'O', position: [0.00, -2.40, 0.00] },
    { element: 'O', position: [-2.00, -1.40, 0.00] },
    { element: 'C', position: [-2.70, 1.21, 0.00] },
    { element: 'O', position: [-3.40, 0.00, 0.00] },
    { element: 'O', position: [-3.40, 2.42, 0.00] },
    { element: 'C', position: [-4.80, 0.00, 0.00] },
    { element: 'H', position: [2.80, 1.21, 0.00] },
    { element: 'H', position: [1.95, 3.37, 0.00] },
    { element: 'H', position: [-0.55, 3.37, 0.00] },
    { element: 'H', position: [-4.80, -0.55, 0.85] },
    { element: 'H', position: [-4.80, -0.55, -0.85] },
    { element: 'H', position: [-5.40, 0.95, 0.00] },
    { element: 'H', position: [-2.70, 3.30, 0.00] },
  ],
  bonds: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
    { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 0 },
    { from: 0, to: 6 }, { from: 6, to: 7 }, { from: 6, to: 8 },
    { from: 5, to: 9 }, { from: 9, to: 10 }, { from: 9, to: 11 },
    { from: 10, to: 12 }, { from: 2, to: 13 }, { from: 3, to: 14 },
    { from: 4, to: 15 }, { from: 12, to: 16 }, { from: 12, to: 17 },
    { from: 12, to: 18 }, { from: 11, to: 19 },
  ],
};

export const GLUCOSE: MoleculeData = {
  name: '葡萄糖',
  formula: 'C6H12O6',
  atoms: [
    { element: 'C', position: [0.00, 0.00, 0.00] },
    { element: 'C', position: [1.50, 0.00, 0.00] },
    { element: 'C', position: [2.25, 1.30, 0.00] },
    { element: 'C', position: [1.50, 2.60, 0.00] },
    { element: 'C', position: [0.00, 2.60, 0.00] },
    { element: 'O', position: [-0.50, 1.30, 0.00] },
    { element: 'C', position: [-0.75, -1.30, 0.00] },
    { element: 'O', position: [-0.75, 0.75, 1.30] },
    { element: 'O', position: [2.25, -0.75, 0.00] },
    { element: 'O', position: [3.60, 1.30, 0.00] },
    { element: 'O', position: [2.25, 3.85, 0.00] },
    { element: 'O', position: [-0.75, 3.85, 0.00] },
    { element: 'O', position: [-2.10, -1.30, 0.00] },
    { element: 'H', position: [-0.30, -0.55, -0.85] },
    { element: 'H', position: [0.30, 0.55, 0.85] },
    { element: 'H', position: [1.80, -0.55, 0.85] },
    { element: 'H', position: [1.20, 0.55, -0.85] },
    { element: 'H', position: [2.55, 0.75, 0.85] },
    { element: 'H', position: [1.95, 1.85, -0.85] },
    { element: 'H', position: [1.80, 3.15, 0.85] },
    { element: 'H', position: [1.20, 2.05, -0.85] },
    { element: 'H', position: [0.30, 3.15, -0.85] },
    { element: 'H', position: [-0.30, 2.05, 0.85] },
    { element: 'H', position: [-0.45, -1.85, 0.85] },
    { element: 'H', position: [-0.45, -0.75, -0.85] },
    { element: 'H', position: [-0.75, 1.30, 2.15] },
    { element: 'H', position: [2.25, -1.30, 0.85] },
    { element: 'H', position: [3.80, 1.85, 0.85] },
    { element: 'H', position: [2.25, 4.40, 0.85] },
    { element: 'H', position: [-0.75, 4.40, 0.85] },
    { element: 'H', position: [-2.50, -1.85, 0.00] },
  ],
  bonds: [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
    { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 0 },
    { from: 0, to: 6 }, { from: 0, to: 7 }, { from: 1, to: 8 },
    { from: 2, to: 9 }, { from: 3, to: 10 }, { from: 4, to: 11 },
    { from: 6, to: 12 }, { from: 0, to: 13 }, { from: 0, to: 14 },
    { from: 1, to: 15 }, { from: 1, to: 16 }, { from: 2, to: 17 },
    { from: 2, to: 18 }, { from: 3, to: 19 }, { from: 3, to: 20 },
    { from: 4, to: 21 }, { from: 4, to: 22 }, { from: 6, to: 23 },
    { from: 6, to: 24 }, { from: 7, to: 25 }, { from: 8, to: 26 },
    { from: 9, to: 27 }, { from: 10, to: 28 }, { from: 11, to: 29 },
    { from: 12, to: 30 },
  ],
};

export const MOLECULES: Record<string, MoleculeData> = {
  caffeine: CAFFEINE,
  aspirin: ASPIRIN,
  glucose: GLUCOSE,
};

function getAtomRadius(atomicNumber: number): number {
  const minR = 0.3;
  const maxR = 0.8;
  const minZ = 1;
  const maxZ = 8;
  const t = (atomicNumber - minZ) / (maxZ - minZ);
  return minR + t * (maxR - minR);
}

export interface MoleculeGroup {
  group: THREE.Group;
  atomMeshes: THREE.Mesh[];
  data: MoleculeData;
}

export function createMolecule(key: string): MoleculeGroup {
  const data = MOLECULES[key];
  const group = new THREE.Group();
  const atomMeshes: THREE.Mesh[] = [];

  data.atoms.forEach((atom, index) => {
    const element = ELEMENTS[atom.element];
    const radius = getAtomRadius(element.atomicNumber);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(element.color),
      shininess: 30,
      specular: new THREE.Color('#444444'),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
    mesh.userData = { atomIndex: index, element: atom.element };
    group.add(mesh);
    atomMeshes.push(mesh);
  });

  data.bonds.forEach((bond) => {
    const from = data.atoms[bond.from].position;
    const to = data.atoms[bond.to].position;
    const start = new THREE.Vector3(from[0], from[1], from[2]);
    const end = new THREE.Vector3(to[0], to[1], to[2]);
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 16);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color('#888888'),
      transparent: true,
      opacity: 0.6,
      shininess: 20,
    });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(start).add(end).multiplyScalar(0.5);
    cylinder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    group.add(cylinder);
  });

  return { group, atomMeshes, data };
}
