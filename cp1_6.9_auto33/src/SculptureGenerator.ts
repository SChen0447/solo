import * as THREE from 'three';
import type { PartConfig, SculptureConfig, GeometryType } from './SculptureManager';

export interface SculpturePartData {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  originalScale: THREE.Vector3;
  scatterDirection: THREE.Vector3;
  scatterDistance: number;
  size: number;
  originalColor: THREE.Color;
}

export interface SculptureData {
  group: THREE.Group;
  parts: SculpturePartData[];
  halo: THREE.Mesh;
  config: SculptureConfig;
  isDisassembled: boolean;
  isAnimating: boolean;
}

export class SculptureGenerator {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    this.geometryCache.set('box-1-1-1', new THREE.BoxGeometry(1, 1, 1));
    this.geometryCache.set('sphere-1-32', new THREE.SphereGeometry(0.5, 32, 32));
    this.geometryCache.set('torus-0.4-0.1-48', new THREE.TorusGeometry(0.5, 0.2, 16, 48));
    this.geometryCache.set('cone-1-1-24', new THREE.ConeGeometry(0.5, 1, 24));
    this.geometryCache.set('cylinder-1-1-24', new THREE.CylinderGeometry(0.5, 0.5, 1, 24));
    this.geometryCache.set('octahedron-1', new THREE.OctahedronGeometry(0.6));
  }

  private getOrCreateMaterial(color: string): THREE.MeshStandardMaterial {
    if (!this.materialCache.has(color)) {
      this.materialCache.set(color, new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0.3,
        roughness: 0.5,
        transparent: true,
        opacity: 0.92,
      }));
    }
    return this.materialCache.get(color)!;
  }

  private getGeometry(type: GeometryType): THREE.BufferGeometry {
    switch (type) {
      case 'box':
        return this.geometryCache.get('box-1-1-1')!;
      case 'sphere':
        return this.geometryCache.get('sphere-1-32')!;
      case 'torus':
        return this.geometryCache.get('torus-0.4-0.1-48')!;
      case 'cone':
        return this.geometryCache.get('cone-1-1-24')!;
      case 'cylinder':
        return this.geometryCache.get('cylinder-1-1-24')!;
      case 'octahedron':
        return this.geometryCache.get('octahedron-1')!;
    }
  }

  private createPartMesh(part: PartConfig): THREE.Mesh {
    const geometry = this.getGeometry(part.type);
    const material = this.getOrCreateMaterial(part.color);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(part.position.x, part.position.y, part.position.z);
    mesh.rotation.set(part.rotation.x, part.rotation.y, part.rotation.z);
    mesh.scale.set(part.scale.x, part.scale.y, part.scale.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isSculpturePart = true;
    return mesh;
  }

  private createHalo(accentColor: string): THREE.Mesh {
    const haloGeometry = new THREE.TorusGeometry(3, 0.08, 16, 64);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.5;
    halo.visible = false;
    halo.userData.isHalo = true;
    return halo;
  }

  private getPartSize(part: PartConfig): number {
    const { x, y, z } = part.scale;
    return Math.max(x, y, z);
  }

  private getScatterDirection(position: THREE.Vector3): THREE.Vector3 {
    if (position.length() < 0.01) {
      return new THREE.Vector3(0, 1, 0);
    }
    return position.clone().normalize();
  }

  createSculpture(config: SculptureConfig, index: number, totalCount: number): SculptureData {
    const group = new THREE.Group();
    const parts: SculpturePartData[] = [];

    const angle = (index / totalCount) * Math.PI * 2;
    const radius = 12;
    group.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    group.rotation.y = -angle + Math.PI / 2;
    group.userData.sculptureIndex = index;
    group.userData.isSculptureGroup = true;

    for (const partConfig of config.parts) {
      const mesh = this.createPartMesh(partConfig);
      const size = this.getPartSize(partConfig);
      const scatterDir = this.getScatterDirection(mesh.position);

      const partData: SculpturePartData = {
        mesh,
        originalPosition: mesh.position.clone(),
        originalRotation: mesh.rotation.clone(),
        originalScale: mesh.scale.clone(),
        scatterDirection: scatterDir,
        scatterDistance: size * 2,
        size,
        originalColor: new THREE.Color(partConfig.color),
      };

      mesh.userData.partData = partData;
      group.add(mesh);
      parts.push(partData);
    }

    const halo = this.createHalo(config.accentColor);
    group.add(halo);

    return {
      group,
      parts,
      halo,
      config,
      isDisassembled: false,
      isAnimating: false,
    };
  }

  updatePartMaterialColor(partData: SculpturePartData, color: string): void {
    const material = this.getOrCreateMaterial(color);
    partData.mesh.material = material;
  }

  resetPartMaterial(partData: SculpturePartData): void {
    const material = this.getOrCreateMaterial('#' + partData.originalColor.getHexString());
    partData.mesh.material = material;
  }

  dispose(): void {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
    this.geometryCache.forEach((geo) => geo.dispose());
    this.geometryCache.clear();
  }
}
