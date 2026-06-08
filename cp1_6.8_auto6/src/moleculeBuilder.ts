import * as THREE from 'three';
import { Atom, Bond, MoleculeData, ATOM_COLORS, ATOM_RADII, BOND_RADIUS, BOND_COLOR } from './molecule.types';

export function buildMolecule(data: MoleculeData): THREE.Group {
  const group = new THREE.Group();
  group.name = data.name;

  const atomMap = new Map<string, THREE.Mesh>();

  for (const atom of data.atoms) {
    const sphere = createAtom(atom);
    sphere.userData.atom = atom;
    sphere.userData.isAtom = true;
    group.add(sphere);
    atomMap.set(atom.id, sphere);
  }

  for (const bond of data.bonds) {
    const fromAtom = atomMap.get(bond.from);
    const toAtom = atomMap.get(bond.to);
    if (!fromAtom || !toAtom) continue;

    const bondMeshes = createBond(fromAtom.position, toAtom.position, bond.order);
    for (const mesh of bondMeshes) {
      mesh.userData.bond = bond;
      mesh.userData.isBond = true;
      group.add(mesh);
    }
  }

  return group;
}

function createAtom(atom: Atom): THREE.Mesh {
  const radius = ATOM_RADII[atom.element] || 0.3;
  const color = ATOM_COLORS[atom.element] || 0xcccccc;

  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.1,
    roughness: 0.4
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(atom.position.x, atom.position.y, atom.position.z);

  return sphere;
}

function createBond(from: THREE.Vector3, to: THREE.Vector3, order: number): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

  if (order === 1) {
    const cylinder = createCylinder(length, BOND_RADIUS);
    positionCylinder(cylinder, mid, direction);
    meshes.push(cylinder);
  } else if (order >= 2) {
    const perp = calculatePerpendicular(direction);

    for (let i = 0; i < order && i < 2; i++) {
      const sign = i === 0 ? 1 : -1;
      const offsetFrom = from.clone().add(perp.clone().multiplyScalar(sign * BOND_RADIUS * 1.5));
      const offsetTo = to.clone().add(perp.clone().multiplyScalar(sign * BOND_RADIUS * 1.5));
      const offsetMid = new THREE.Vector3().addVectors(offsetFrom, offsetTo).multiplyScalar(0.5);
      const offsetDir = new THREE.Vector3().subVectors(offsetTo, offsetFrom);

      const cylinder = createCylinder(length, BOND_RADIUS * 0.6);
      positionCylinder(cylinder, offsetMid, offsetDir);
      meshes.push(cylinder);
    }
  }

  return meshes;
}

function createCylinder(length: number, radius: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 16);
  const material = new THREE.MeshStandardMaterial({
    color: BOND_COLOR,
    metalness: 0.2,
    roughness: 0.6
  });
  return new THREE.Mesh(geometry, material);
}

function positionCylinder(
  cylinder: THREE.Mesh,
  mid: THREE.Vector3,
  direction: THREE.Vector3
): void {
  cylinder.position.copy(mid);
  cylinder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
}

function calculatePerpendicular(direction: THREE.Vector3): THREE.Vector3 {
  const dir = direction.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3().crossVectors(dir, up);
  if (perp.lengthSq() < 0.001) {
    perp.crossVectors(dir, new THREE.Vector3(1, 0, 0));
  }
  return perp.normalize();
}

export function setMoleculeOpacity(group: THREE.Group, opacity: number): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.transparent = opacity < 1;
      child.material.opacity = opacity;
    }
  });
}

export function setWireframeMode(group: THREE.Group, wireframe: boolean): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.wireframe = wireframe;
      child.material.transparent = wireframe;
      child.material.opacity = wireframe ? 0.5 : 1;
    }
  });
}
