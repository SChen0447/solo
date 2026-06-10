import * as THREE from 'three';

export type ElementType = 'H' | 'C' | 'O' | 'N';
export type BondType = 'single' | 'double';

export interface AtomData {
  id: string;
  element: ElementType;
  position: [number, number, number];
}

export interface BondData {
  atom1: string;
  atom2: string;
  type: BondType;
}

export interface MoleculeData {
  name: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export interface AtomInfo {
  id: string;
  element: ElementType;
  elementName: string;
  position: THREE.Vector3;
  connectedAtoms: Array<{
    id: string;
    element: ElementType;
    elementName: string;
    bondType: BondType;
  }>;
}

export interface MoleculeGroup extends THREE.Group {
  userData: {
    moleculeName: string;
    atoms: Map<THREE.Mesh, AtomInfo>;
  };
}

const ELEMENT_COLORS: Record<ElementType, number> = {
  H: 0xffffff,
  C: 0x303030,
  O: 0xff3030,
  N: 0x3050ff,
};

const ELEMENT_NAMES: Record<ElementType, string> = {
  H: 'Hydrogen',
  C: 'Carbon',
  O: 'Oxygen',
  N: 'Nitrogen',
};

const ELEMENT_RADII: Record<ElementType, number> = {
  H: 0.3,
  C: 0.5,
  O: 0.45,
  N: 0.45,
};

const SINGLE_BOND_RADIUS = 0.1;
const DOUBLE_BOND_OFFSET = 0.15;

const METHANE: MoleculeData = {
  name: 'methane',
  atoms: [
    { id: 'C1', element: 'C', position: [0, 0, 0] },
    { id: 'H1', element: 'H', position: [1.2, 1.2, 1.2] },
    { id: 'H2', element: 'H', position: [-1.2, -1.2, 1.2] },
    { id: 'H3', element: 'H', position: [-1.2, 1.2, -1.2] },
    { id: 'H4', element: 'H', position: [1.2, -1.2, -1.2] },
  ],
  bonds: [
    { atom1: 'C1', atom2: 'H1', type: 'single' },
    { atom1: 'C1', atom2: 'H2', type: 'single' },
    { atom1: 'C1', atom2: 'H3', type: 'single' },
    { atom1: 'C1', atom2: 'H4', type: 'single' },
  ],
};

const ETHYLENE: MoleculeData = {
  name: 'ethylene',
  atoms: [
    { id: 'C1', element: 'C', position: [-0.67, 0, 0] },
    { id: 'C2', element: 'C', position: [0.67, 0, 0] },
    { id: 'H1', element: 'H', position: [-1.24, 0.93, 0] },
    { id: 'H2', element: 'H', position: [-1.24, -0.93, 0] },
    { id: 'H3', element: 'H', position: [1.24, 0.93, 0] },
    { id: 'H4', element: 'H', position: [1.24, -0.93, 0] },
  ],
  bonds: [
    { atom1: 'C1', atom2: 'C2', type: 'double' },
    { atom1: 'C1', atom2: 'H1', type: 'single' },
    { atom1: 'C1', atom2: 'H2', type: 'single' },
    { atom1: 'C2', atom2: 'H3', type: 'single' },
    { atom1: 'C2', atom2: 'H4', type: 'single' },
  ],
};

const BENZENE_RADIUS = 1.4;
const BENZENE: MoleculeData = (() => {
  const atoms: AtomData[] = [];
  const bonds: BondData[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    atoms.push({
      id: `C${i + 1}`,
      element: 'C',
      position: [
        Math.cos(angle) * BENZENE_RADIUS,
        Math.sin(angle) * BENZENE_RADIUS,
        0,
      ],
    });
    const hAngle = angle;
    atoms.push({
      id: `H${i + 1}`,
      element: 'H',
      position: [
        Math.cos(hAngle) * (BENZENE_RADIUS + 1.1),
        Math.sin(hAngle) * (BENZENE_RADIUS + 1.1),
        0,
      ],
    });
  }
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    bonds.push({
      atom1: `C${i + 1}`,
      atom2: `C${next + 1}`,
      type: i % 2 === 0 ? 'double' : 'single',
    });
    bonds.push({
      atom1: `C${i + 1}`,
      atom2: `H${i + 1}`,
      type: 'single',
    });
  }
  return { name: 'benzene', atoms, bonds };
})();

const ETHANOL: MoleculeData = {
  name: 'ethanol',
  atoms: [
    { id: 'C1', element: 'C', position: [-0.75, 0, 0] },
    { id: 'C2', element: 'C', position: [0.75, 0, 0] },
    { id: 'O1', element: 'O', position: [1.65, 1.1, 0] },
    { id: 'H1', element: 'H', position: [2.55, 0.9, 0] },
    { id: 'H2', element: 'H', position: [-1.15, -0.6, 0.9] },
    { id: 'H3', element: 'H', position: [-1.15, -0.6, -0.9] },
    { id: 'H4', element: 'H', position: [-1.15, 1.05, 0] },
    { id: 'H5', element: 'H', position: [0.75, -0.55, 0.95] },
    { id: 'H6', element: 'H', position: [0.75, -0.55, -0.95] },
  ],
  bonds: [
    { atom1: 'C1', atom2: 'C2', type: 'single' },
    { atom1: 'C2', atom2: 'O1', type: 'single' },
    { atom1: 'O1', atom2: 'H1', type: 'single' },
    { atom1: 'C1', atom2: 'H2', type: 'single' },
    { atom1: 'C1', atom2: 'H3', type: 'single' },
    { atom1: 'C1', atom2: 'H4', type: 'single' },
    { atom1: 'C2', atom2: 'H5', type: 'single' },
    { atom1: 'C2', atom2: 'H6', type: 'single' },
  ],
};

export const MOLECULES: Record<string, MoleculeData> = {
  methane: METHANE,
  ethylene: ETHYLENE,
  benzene: BENZENE,
  ethanol: ETHANOL,
};

export function getElementColor(element: ElementType): number {
  return ELEMENT_COLORS[element];
}

export function getElementName(element: ElementType): string {
  return ELEMENT_NAMES[element];
}

function createAtomMesh(atom: AtomData): THREE.Mesh {
  const radius = ELEMENT_RADII[atom.element];
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const color = ELEMENT_COLORS[atom.element];
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...atom.position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBondCylinder(
  start: THREE.Vector3,
  end: THREE.Vector3,
  type: BondType,
  offsetDir?: THREE.Vector3
): THREE.Group {
  const group = new THREE.Group();
  const color = 0x888888;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });

  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  if (type === 'single') {
    const geometry = new THREE.CylinderGeometry(
      SINGLE_BOND_RADIUS,
      SINGLE_BOND_RADIUS,
      length,
      16
    );
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(mid);
    cylinder.lookAt(end);
    cylinder.rotateX(Math.PI / 2);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    group.add(cylinder);
  } else {
    const perp = offsetDir
      ? offsetDir.clone().normalize().multiplyScalar(DOUBLE_BOND_OFFSET)
      : new THREE.Vector3(dir.z, 0, -dir.x).normalize().multiplyScalar(DOUBLE_BOND_OFFSET);

    for (const sign of [-1, 1]) {
      const offset = perp.clone().multiplyScalar(sign);
      const s = start.clone().add(offset);
      const e = end.clone().add(offset);
      const m = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
      const geometry = new THREE.CylinderGeometry(
        SINGLE_BOND_RADIUS,
        SINGLE_BOND_RADIUS,
        length,
        16
      );
      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.position.copy(m);
      cylinder.lookAt(e);
      cylinder.rotateX(Math.PI / 2);
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;
      group.add(cylinder);
    }
  }

  return group;
}

export function buildMolecule(moleculeKey: string): MoleculeGroup {
  const data = MOLECULES[moleculeKey];
  if (!data) {
    throw new Error(`Unknown molecule: ${moleculeKey}`);
  }

  const group = new THREE.Group() as MoleculeGroup;
  const atomMap = new Map<string, { mesh: THREE.Mesh; data: AtomData }>();
  const atomInfoMap = new Map<THREE.Mesh, AtomInfo>();

  for (const atomData of data.atoms) {
    const mesh = createAtomMesh(atomData);
    group.add(mesh);
    atomMap.set(atomData.id, { mesh, data: atomData });
  }

  for (const bond of data.bonds) {
    const a1 = atomMap.get(bond.atom1);
    const a2 = atomMap.get(bond.atom2);
    if (!a1 || !a2) continue;

    let offsetDir: THREE.Vector3 | undefined;
    if (bond.type === 'double') {
      const otherBonds = data.bonds.filter(
        (b) =>
          (b.atom1 === bond.atom1 || b.atom2 === bond.atom1) &&
          b !== bond
      );
      if (otherBonds.length > 0) {
        const otherAtomId =
          otherBonds[0].atom1 === bond.atom1
            ? otherBonds[0].atom2
            : otherBonds[0].atom1;
        const otherAtom = atomMap.get(otherAtomId);
        if (otherAtom) {
          const bondDir = new THREE.Vector3()
            .subVectors(a2.mesh.position, a1.mesh.position)
            .normalize();
          const otherDir = new THREE.Vector3()
            .subVectors(otherAtom.mesh.position, a1.mesh.position)
            .normalize();
          offsetDir = new THREE.Vector3()
            .crossVectors(bondDir, otherDir)
            .normalize();
        }
      }
    }

    const bondGroup = createBondCylinder(
      a1.mesh.position,
      a2.mesh.position,
      bond.type,
      offsetDir
    );
    group.add(bondGroup);
  }

  for (const atomData of data.atoms) {
    const entry = atomMap.get(atomData.id);
    if (!entry) continue;

    const connected: AtomInfo['connectedAtoms'] = [];
    for (const bond of data.bonds) {
      let otherId: string | null = null;
      if (bond.atom1 === atomData.id) {
        otherId = bond.atom2;
      } else if (bond.atom2 === atomData.id) {
        otherId = bond.atom1;
      }
      if (otherId) {
        const other = atomMap.get(otherId);
        if (other) {
          connected.push({
            id: other.data.id,
            element: other.data.element,
            elementName: ELEMENT_NAMES[other.data.element],
            bondType: bond.type,
          });
        }
      }
    }

    atomInfoMap.set(entry.mesh, {
      id: atomData.id,
      element: atomData.element,
      elementName: ELEMENT_NAMES[atomData.element],
      position: entry.mesh.position.clone(),
      connectedAtoms: connected,
    });
  }

  group.userData = {
    moleculeName: data.name,
    atoms: atomInfoMap,
  };

  return group;
}

export function disposeMolecule(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

export function getMoleculeBoundingSphere(
  group: THREE.Group
): THREE.Sphere {
  const box = new THREE.Box3().setFromObject(group);
  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  return sphere;
}
