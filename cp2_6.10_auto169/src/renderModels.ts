import * as THREE from 'three';
import type { AtomData, MoleculeData } from './parseMolecule';

export type RenderMode = 'wireframe' | 'ballstick';

export interface AtomMeshUserData {
  atomIndex: number;
  atomData: AtomData;
}

export interface RenderedMolecule {
  group: THREE.Group;
  atomMeshes: THREE.Mesh[];
  bondObjects: THREE.Object3D[];
  targetAtomScales: number[];
}

const WIRE_ATOM_RADIUS = 0.1;
const WIRE_BOND_LINEWIDTH = 2;
const BOND_CYLINDER_RADIUS = 0.08;

const sharedGeometries = new Map<string, THREE.BufferGeometry>();

function getSharedSphereGeometry(radius: number): THREE.SphereGeometry {
  const key = `sphere_${radius}`;
  if (!sharedGeometries.has(key)) {
    sharedGeometries.set(key, new THREE.SphereGeometry(radius, 24, 16));
  }
  return sharedGeometries.get(key) as THREE.SphereGeometry;
}

function getSharedCylinderGeometry(radius: number): THREE.CylinderGeometry {
  const key = `cylinder_${radius}`;
  if (!sharedGeometries.has(key)) {
    sharedGeometries.set(key, new THREE.CylinderGeometry(radius, radius, 1, 12));
  }
  return sharedGeometries.get(key) as THREE.CylinderGeometry;
}

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function createAtomMaterial(color: THREE.Color): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color,
    shininess: 30,
    specular: new THREE.Color(0x333333),
  });
}

function createAtomMesh(
  atomData: AtomData,
  atomIndex: number,
  mode: RenderMode
): THREE.Mesh {
  const radius = mode === 'ballstick' ? atomData.radius : WIRE_ATOM_RADIUS;
  const geometry = getSharedSphereGeometry(radius);
  const color = hexToColor(atomData.color);
  const material = createAtomMaterial(color);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(atomData.position[0], atomData.position[1], atomData.position[2]);

  const userData: AtomMeshUserData = {
    atomIndex,
    atomData,
  };
  mesh.userData = userData;

  return mesh;
}

function createBondCylinder(
  atom1: AtomData,
  atom2: AtomData,
  order: number
): THREE.Mesh {
  const geometry = getSharedCylinderGeometry(BOND_CYLINDER_RADIUS);
  const opacity = order === 2 ? 1.0 : 0.7;
  const material = new THREE.MeshPhongMaterial({
    color: 0x888888,
    transparent: true,
    opacity,
    shininess: 20,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const start = new THREE.Vector3(atom1.position[0], atom1.position[1], atom1.position[2]);
  const end = new THREE.Vector3(atom2.position[0], atom2.position[1], atom2.position[2]);
  positionBondMesh(mesh, start, end);

  return mesh;
}

function createBondLine(
  atom1: AtomData,
  atom2: AtomData
): THREE.Line {
  const points = [
    new THREE.Vector3(atom1.position[0], atom1.position[1], atom1.position[2]),
    new THREE.Vector3(atom2.position[0], atom2.position[1], atom2.position[2]),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x8b949e,
    linewidth: WIRE_BOND_LINEWIDTH,
  });
  return new THREE.Line(geometry, material);
}

function positionBondMesh(mesh: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3): void {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();

  mesh.scale.set(1, length, 1);

  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(mid);

  const up = new THREE.Vector3(0, 1, 0);
  if (!direction.clone().normalize().equals(up) && !direction.clone().normalize().equals(up.clone().negate())) {
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize());
    mesh.quaternion.copy(quaternion);
  } else if (direction.y < 0) {
    mesh.rotation.z = Math.PI;
  }
}

export function createMoleculeModel(
  moleculeData: MoleculeData,
  mode: RenderMode
): RenderedMolecule {
  const group = new THREE.Group();
  const atomMeshes: THREE.Mesh[] = [];
  const bondObjects: THREE.Object3D[] = [];
  const targetAtomScales: number[] = [];

  moleculeData.atoms.forEach((atomData, index) => {
    const mesh = createAtomMesh(atomData, index, mode);
    atomMeshes.push(mesh);
    targetAtomScales.push(1);
    group.add(mesh);
  });

  moleculeData.bonds.forEach((bond) => {
    const atom1 = moleculeData.atoms[bond.atomIndex1];
    const atom2 = moleculeData.atoms[bond.atomIndex2];

    let bondObj: THREE.Object3D;
    if (mode === 'ballstick') {
      bondObj = createBondCylinder(atom1, atom2, bond.order);
    } else {
      bondObj = createBondLine(atom1, atom2);
    }
    bondObjects.push(bondObj);
    group.add(bondObj);
  });

  return { group, atomMeshes, bondObjects, targetAtomScales };
}

export function switchRenderMode(
  rendered: RenderedMolecule,
  moleculeData: MoleculeData,
  newMode: RenderMode,
  animationProgress: number
): void {
  rendered.atomMeshes.forEach((mesh, index) => {
    const atomData = moleculeData.atoms[index];
    const targetRadius = newMode === 'ballstick' ? atomData.radius : WIRE_ATOM_RADIUS;
    const currentRadius = newMode === 'ballstick' ? WIRE_ATOM_RADIUS : atomData.radius;
    const interpolatedRadius = currentRadius + (targetRadius - currentRadius) * animationProgress;
    const scale = interpolatedRadius / (newMode === 'ballstick' ? atomData.radius : WIRE_ATOM_RADIUS);
    mesh.scale.setScalar(scale);
  });
}

export function disposeMoleculeModel(rendered: RenderedMolecule): void {
  rendered.atomMeshes.forEach((mesh) => {
    const material = mesh.material as THREE.Material;
    material.dispose();
  });
  rendered.bondObjects.forEach((obj) => {
    const anyObj = obj as THREE.Mesh | THREE.Line;
    if (anyObj.geometry) {
      if (!(obj instanceof THREE.Line)) {
        anyObj.geometry.dispose = anyObj.geometry.dispose || (() => {});
      }
    }
    if (anyObj.material) {
      if (Array.isArray(anyObj.material)) {
        anyObj.material.forEach((m) => m.dispose());
      } else {
        (anyObj.material as THREE.Material).dispose();
      }
    }
  });
}
