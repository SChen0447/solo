import * as THREE from 'three';
import type { AtomData, BondData, MoleculeData } from './moleculeData';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    isAtom: true;
    originalPosition: THREE.Vector3;
    atomData: AtomData;
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface BondInfo {
  mesh: THREE.Mesh;
  startAtomIdx: number;
  endAtomIdx: number;
}

export class MoleculeRenderer {
  private atomGeometries: Map<number, THREE.SphereGeometry> = new Map();
  private bondGeometry: THREE.CylinderGeometry;
  private atomMeshes: AtomMesh[] = [];
  private bondInfos: BondInfo[] = [];
  public group: THREE.Group;
  private isExploded = false;
  private animationId: number | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.bondGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1, 12);
    this.bondGeometry.translate(0, 0.5, 0);
  }

  private getAtomGeometry(radius: number): THREE.SphereGeometry {
    if (!this.atomGeometries.has(radius)) {
      this.atomGeometries.set(radius, new THREE.SphereGeometry(radius, 32, 32));
    }
    return this.atomGeometries.get(radius)!;
  }

  public build(data: MoleculeData): THREE.Group {
    this.clear();

    data.atoms.forEach((atomData) => {
      const geometry = this.getAtomGeometry(atomData.radius);
      const material = new THREE.MeshStandardMaterial({
        color: atomData.color,
        metalness: 0.2,
        roughness: 0.3
      });

      const mesh = new THREE.Mesh(geometry, material) as AtomMesh;
      mesh.position.copy(atomData.position);
      mesh.userData = {
        isAtom: true,
        originalPosition: atomData.position.clone(),
        atomData
      };
      this.atomMeshes.push(mesh);
      this.group.add(mesh);
    });

    data.bonds.forEach((bondData) => {
      const startIdx = data.atoms.findIndex((a) => a.position === bondData.start);
      const endIdx = data.atoms.findIndex((a) => a.position === bondData.end);
      this.createBond(startIdx, endIdx);
    });

    return this.group;
  }

  private createBond(startAtomIdx: number, endAtomIdx: number): void {
    const startMesh = this.atomMeshes[startAtomIdx];
    const endMesh = this.atomMeshes[endAtomIdx];
    if (!startMesh || !endMesh) return;

    const start = startMesh.position;
    const end = endMesh.position;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.3,
      roughness: 0.5,
      transparent: true,
      opacity: 0.6
    });

    const mesh = new THREE.Mesh(this.bondGeometry, material);
    mesh.position.copy(start);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    this.bondInfos.push({ mesh, startAtomIdx, endAtomIdx });
    this.group.add(mesh);
  }

  public getAtomMeshes(): AtomMesh[] {
    return this.atomMeshes;
  }

  public explode(): void {
    if (this.isExploded) return;
    this.isExploded = true;
    this.animateExplosion(true);
  }

  public implode(): void {
    if (!this.isExploded) return;
    this.isExploded = false;
    this.animateExplosion(false);
  }

  public toggleExplode(): boolean {
    if (this.isExploded) {
      this.implode();
    } else {
      this.explode();
    }
    return this.isExploded;
  }

  public getIsExploded(): boolean {
    return this.isExploded;
  }

  private animateExplosion(outward: boolean): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const duration = 800;
    const startTime = performance.now();
    const explodeDistance = 1.5;

    const originalPositions = this.atomMeshes.map((m) =>
      m.userData.originalPosition.clone()
    );

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const factor = outward ? eased : 1 - eased;

      this.atomMeshes.forEach((mesh, i) => {
        const original = originalPositions[i];
        const direction = original.clone().normalize();
        if (direction.lengthSq() < 0.001) {
          mesh.position.copy(original);
        } else {
          mesh.position.copy(original).add(direction.multiplyScalar(explodeDistance * factor));
        }
      });

      this.updateBondPositions();

      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private updateBondPositions(): void {
    if (this.bondInfos.length === 0 || this.atomMeshes.length < 2) return;

    for (const info of this.bondInfos) {
      const startMesh = this.atomMeshes[info.startAtomIdx];
      const endMesh = this.atomMeshes[info.endAtomIdx];
      if (!startMesh || !endMesh) continue;

      const start = startMesh.position;
      const end = endMesh.position;
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();

      info.mesh.position.copy(start);
      info.mesh.scale.set(1, length, 1);
      info.mesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
    }
  }

  public fadeOut(): Promise<void> {
    return this.fadeTo(0, 500);
  }

  public fadeIn(): Promise<void> {
    return this.fadeTo(1, 500);
  }

  private fadeTo(targetOpacity: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const startOpacity = (this.atomMeshes[0]?.material as THREE.MeshStandardMaterial)?.opacity ?? 1;

      const setOpacity = (op: number) => {
        this.atomMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = op;
        });
        this.bondInfos.forEach((info) => {
          const mat = info.mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = 0.6 * op;
        });
      };

      if (startOpacity === targetOpacity) {
        resolve();
        return;
      }

      const animate = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const current = startOpacity + (targetOpacity - startOpacity) * progress;
        setOpacity(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          if (targetOpacity === 1) {
            this.atomMeshes.forEach((mesh) => {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.transparent = false;
            });
          }
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  public clear(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.atomMeshes.forEach((mesh) => {
      this.group.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    });
    this.bondInfos.forEach((info) => {
      this.group.remove(info.mesh);
      (info.mesh.material as THREE.Material).dispose();
    });

    this.atomMeshes = [];
    this.bondInfos = [];
    this.isExploded = false;
  }

  public dispose(): void {
    this.clear();
    this.atomGeometries.forEach((geo) => geo.dispose());
    this.atomGeometries.clear();
    this.bondGeometry.dispose();
  }
}
