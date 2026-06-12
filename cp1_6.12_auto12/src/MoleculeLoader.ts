import * as THREE from 'three';

export type Element = 'C' | 'H' | 'N' | 'O';

export interface AtomData {
  id: number;
  element: Element;
  position: [number, number, number];
}

export interface BondData {
  atom1: number;
  atom2: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export type DisplayMode = 'ballstick' | 'spacefill';

export interface AtomUserData {
  isAtom: true;
  atomId: number;
  element: Element;
  baseColor: THREE.Color;
  baseRadius: number;
}

export interface BondUserData {
  isBond: true;
}

export const ELEMENT_COLORS: Record<Element, number> = {
  C: 0x8c8c8c,
  H: 0xf5f5f5,
  N: 0x3050f8,
  O: 0xff0d0d,
};

export const ELEMENT_NAMES: Record<Element, string> = {
  C: 'Carbon · 碳',
  H: 'Hydrogen · 氢',
  N: 'Nitrogen · 氮',
  O: 'Oxygen · 氧',
};

export const ELEMENT_RADII: Record<Element, { ballstick: number; spacefill: number }> = {
  C: { ballstick: 0.35, spacefill: 0.92 },
  H: { ballstick: 0.22, spacefill: 0.53 },
  N: { ballstick: 0.32, spacefill: 0.75 },
  O: { ballstick: 0.30, spacefill: 0.68 },
};

export class MoleculeLoader {
  static loadCaffeine(): MoleculeData {
    return {
      name: 'Caffeine · 咖啡因',
      formula: 'C₈H₁₀N₄O₂',
      atoms: [
        { id: 0,  element: 'N', position: [ 0.5100,  0.7100,  0.0000] },
        { id: 1,  element: 'C', position: [ 1.8950,  0.6580,  0.0000] },
        { id: 2,  element: 'N', position: [ 2.6030, -0.5370,  0.0000] },
        { id: 3,  element: 'C', position: [ 1.7200, -1.5290,  0.0000] },
        { id: 4,  element: 'C', position: [ 0.3630, -1.1250,  0.0000] },
        { id: 5,  element: 'N', position: [-0.2120,  0.0650,  0.0000] },
        { id: 6,  element: 'C', position: [-1.6130,  0.3140,  0.0000] },
        { id: 7,  element: 'C', position: [-2.3320, -0.8560,  0.0000] },
        { id: 8,  element: 'N', position: [-1.2650, -1.6840,  0.0000] },
        { id: 9,  element: 'C', position: [ 2.6380,  1.8620,  0.0000] },
        { id: 10, element: 'O', position: [ 2.1920, -2.6850,  0.0000] },
        { id: 11, element: 'O', position: [-3.5170, -1.0190,  0.0000] },
        { id: 12, element: 'H', position: [ 2.1090,  2.7560,  0.0000] },
        { id: 13, element: 'H', position: [ 3.7280,  1.8020,  0.0000] },
        { id: 14, element: 'H', position: [ 2.4660,  1.9100,  1.0200] },
        { id: 15, element: 'H', position: [-1.9270,  1.3050,  0.0000] },
        { id: 16, element: 'H', position: [-1.7840,  0.2020, -1.0200] },
        { id: 17, element: 'H', position: [-1.4660, -2.6770,  0.0000] },
        { id: 18, element: 'H', position: [ 3.6530, -0.6810,  0.0000] },
        { id: 19, element: 'H', position: [ 2.5210, -0.7050, -0.9300] },
        { id: 20, element: 'H', position: [ 0.5990, -1.9760, -0.5600] },
        { id: 21, element: 'H', position: [ 0.5990, -1.9760,  0.5600] },
      ],
      bonds: [
        { atom1: 0, atom2: 1 },
        { atom1: 0, atom2: 5 },
        { atom1: 1, atom2: 2 },
        { atom1: 1, atom2: 9 },
        { atom1: 2, atom2: 3 },
        { atom1: 2, atom2: 18 },
        { atom1: 3, atom2: 4 },
        { atom1: 3, atom2: 10 },
        { atom1: 4, atom2: 5 },
        { atom1: 4, atom2: 8 },
        { atom1: 5, atom2: 6 },
        { atom1: 6, atom2: 7 },
        { atom1: 6, atom2: 15 },
        { atom1: 7, atom2: 8 },
        { atom1: 7, atom2: 11 },
        { atom1: 8, atom2: 17 },
        { atom1: 9, atom2: 12 },
        { atom1: 9, atom2: 13 },
        { atom1: 9, atom2: 14 },
        { atom1: 4, atom2: 20 },
        { atom1: 4, atom2: 21 },
        { atom1: 2, atom2: 19 },
        { atom1: 6, atom2: 16 },
      ],
    };
  }

  private static createBond(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    color: number = 0x6a6a78
  ): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 14, 1, false);
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.18,
      roughness: 0.55,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    const userData: BondUserData = { isBond: true };
    mesh.userData = userData;

    return mesh;
  }

  static buildGroup(data: MoleculeData, mode: DisplayMode = 'ballstick'): THREE.Group {
    const root = new THREE.Group();
    root.name = data.name;

    const atomGroup = new THREE.Group();
    atomGroup.name = 'Atoms';

    const bondGroup = new THREE.Group();
    bondGroup.name = 'Bonds';

    const atomMeshes: Map<number, THREE.Mesh> = new Map();
    const radiiCfg = {
      ballstick: ELEMENT_RADII,
      spacefill: ELEMENT_RADII,
    }[mode];

    const geometryCache: Map<number, THREE.SphereGeometry> = new Map();

    data.atoms.forEach((atom) => {
      const baseRadius = radiiCfg[atom.element][mode];
      const colorHex = ELEMENT_COLORS[atom.element];

      if (!geometryCache.has(atom.element.charCodeAt(0))) {
        const geo = new THREE.SphereGeometry(baseRadius, 36, 24);
        geometryCache.set(atom.element.charCodeAt(0), geo);
      }
      const geometry = geometryCache.get(atom.element.charCodeAt(0))!;

      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.22,
        roughness: 0.38,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        flatShading: false,
      });

      const mesh = new THREE.Mesh(geometry.clone(), material);
      mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);

      const userData: AtomUserData = {
        isAtom: true,
        atomId: atom.id,
        element: atom.element,
        baseColor: new THREE.Color(colorHex),
        baseRadius: baseRadius,
      };
      mesh.userData = userData;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      atomGroup.add(mesh);
      atomMeshes.set(atom.id, mesh);
    });

    const bondRadius = 0.11;
    data.bonds.forEach((bond) => {
      const m1 = atomMeshes.get(bond.atom1);
      const m2 = atomMeshes.get(bond.atom2);
      if (!m1 || !m2) return;
      const bondMesh = this.createBond(
        m1.position.clone(),
        m2.position.clone(),
        bondRadius
      );
      bondGroup.add(bondMesh);
    });

    if (mode === 'spacefill') {
      bondGroup.visible = false;
    }

    root.userData = {
      moleculeData: data,
      displayMode: mode,
      bondRadius,
    };

    root.add(atomGroup);
    root.add(bondGroup);

    const box = new THREE.Box3().setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.sub(center);

    return root;
  }

  static updateDisplayMode(
    group: THREE.Group,
    mode: DisplayMode,
    transitionMs: number = 300
  ): Promise<void> {
    const atomGroup = group.getObjectByName('Atoms') as THREE.Group | undefined;
    const bondGroup = group.getObjectByName('Bonds') as THREE.Group | undefined;
    if (!atomGroup) return Promise.resolve();

    const startTime = performance.now();
    const initialScales: Map<THREE.Mesh, number> = new Map();
    const targetScales: Map<THREE.Mesh, number> = new Map();

    atomGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const ud = mesh.userData as AtomUserData | undefined;
      if (!ud || !ud.isAtom) return;
      const targetRadius = ELEMENT_RADII[ud.element][mode];
      const currentScale = (mesh.scale.x + mesh.scale.y + mesh.scale.z) / 3;
      const base = ud.baseRadius;
      const currentEffective = base * currentScale;
      const targetScale = targetRadius / base;
      initialScales.set(mesh, currentScale);
      targetScales.set(mesh, targetScale);
      ud.baseRadius = targetRadius;
    });

    if (mode === 'spacefill' && bondGroup) {
      bondGroup.visible = false;
    }

    return new Promise((resolve) => {
      const tick = () => {
        const t = Math.min(1, (performance.now() - startTime) / transitionMs);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        initialScales.forEach((start, mesh) => {
          const target = targetScales.get(mesh)!;
          const s = start + (target - start) * ease;
          mesh.scale.setScalar(s);
        });

        if (mode === 'ballstick' && bondGroup) {
          (bondGroup as THREE.Group).visible = true;
          bondGroup.traverse((obj) => {
            const m = obj as THREE.Mesh;
            if (m.material) {
              const mat = m.material as THREE.MeshStandardMaterial;
              mat.opacity = ease;
              mat.transparent = true;
              if (ease >= 1) {
                mat.opacity = 1;
                mat.transparent = false;
              }
            }
          });
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          group.userData.displayMode = mode;
          resolve();
        }
      };
      tick();
    });
  }

  static getAtomMeshes(group: THREE.Group): THREE.Mesh[] {
    const atomGroup = group.getObjectByName('Atoms') as THREE.Group | undefined;
    if (!atomGroup) return [];
    const result: THREE.Mesh[] = [];
    atomGroup.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.userData && (mesh.userData as AtomUserData).isAtom) {
        result.push(mesh);
      }
    });
    return result;
  }
}
