import * as THREE from 'three';

export type CoralSpecies = 'staghorn' | 'brain';

export interface CoralConfig {
  species: CoralSpecies;
  baseColor: number;
  tipColor: number;
  maxSize: number;
}

const SPECIES_CONFIGS: Record<CoralSpecies, CoralConfig> = {
  staghorn: {
    species: 'staghorn',
    baseColor: 0xff7f50,
    tipColor: 0xffd4a3,
    maxSize: 1.8
  },
  brain: {
    species: 'brain',
    baseColor: 0x9370db,
    tipColor: 0xe6e6fa,
    maxSize: 1.3
  }
};

const SPECIES_LIST: CoralSpecies[] = ['staghorn', 'brain'];

export const GROWTH_DURATION = 10;

export interface Coral {
  id: number;
  mesh: THREE.Group;
  config: CoralConfig;
  position: THREE.Vector3;
  growthProgress: number;
  stage: number;
  health: number;
  isSelected: boolean;
  bloomMesh?: THREE.Mesh;
  stageMeshes: THREE.Mesh[][];
}

export class CoralManager {
  private corals: Map<number, Coral> = new Map();
  private nextId = 1;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private tankBounds: { minX: number; maxX: number; minZ: number; maxZ: number };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.tankBounds = { minX: -7, maxX: 7, minZ: -4, maxZ: 4 };
  }

  private randomSpecies(): CoralSpecies {
    return SPECIES_LIST[Math.floor(Math.random() * SPECIES_LIST.length)];
  }

  public getCoralPositions(): THREE.Vector3[] {
    return Array.from(this.corals.values()).map((c) => c.position.clone());
  }

  private createStaghornMesh(config: CoralConfig, stage: number, scale: number): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const mat = new THREE.MeshStandardMaterial({
      color: config.baseColor,
      roughness: 0.75,
      metalness: 0.05,
      emissive: config.baseColor,
      emissiveIntensity: 0.05
    });

    const tipMat = new THREE.MeshStandardMaterial({
      color: config.tipColor,
      roughness: 0.65,
      metalness: 0.1,
      emissive: config.tipColor,
      emissiveIntensity: 0.15
    });

    if (stage >= 0) {
      const baseGeo = new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, 0.4 * scale, 8);
      const base = new THREE.Mesh(baseGeo, mat);
      base.position.y = 0.2 * scale;
      meshes.push(base);
    }

    if (stage >= 1) {
      const branches = 5;
      for (let i = 0; i < branches; i++) {
        const angle = (i / branches) * Math.PI * 2 + 0.3;
        const height = 0.9 * scale;
        const radius = 0.12 * scale;
        const branchGeo = new THREE.CylinderGeometry(radius * 0.6, radius, height, 6);
        const branch = new THREE.Mesh(branchGeo, mat);
        branch.position.set(
          Math.cos(angle) * 0.25 * scale,
          0.5 * scale + height * 0.35,
          Math.sin(angle) * 0.25 * scale
        );
        branch.rotation.z = Math.cos(angle) * 0.35;
        branch.rotation.x = Math.sin(angle) * 0.35;
        meshes.push(branch);

        const tipGeo = new THREE.SphereGeometry(radius * 0.8, 8, 6);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.copy(branch.position);
        tip.position.y += height * 0.5;
        tip.rotation.copy(branch.rotation);
        meshes.push(tip);
      }
    }

    if (stage >= 2) {
      const subBranches = 8;
      for (let i = 0; i < subBranches; i++) {
        const angle = (i / subBranches) * Math.PI * 2;
        const height = 1.2 * scale;
        const radius = 0.08 * scale;
        const branchGeo = new THREE.CylinderGeometry(radius * 0.5, radius, height, 5);
        const branch = new THREE.Mesh(branchGeo, mat);
        const r = 0.55 * scale;
        branch.position.set(
          Math.cos(angle) * r,
          0.5 * scale + height * 0.3,
          Math.sin(angle) * r
        );
        branch.rotation.z = Math.cos(angle) * 0.55;
        branch.rotation.x = Math.sin(angle) * 0.55;
        meshes.push(branch);

        const tipGeo = new THREE.SphereGeometry(radius * 0.9, 6, 5);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.copy(branch.position);
        tip.position.y += height * 0.5;
        tip.rotation.copy(branch.rotation);
        meshes.push(tip);
      }
    }

    return meshes;
  }

  private createBrainMesh(config: CoralConfig, stage: number, scale: number): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    const mat = new THREE.MeshStandardMaterial({
      color: config.baseColor,
      roughness: 0.85,
      metalness: 0.03,
      emissive: config.baseColor,
      emissiveIntensity: 0.04
    });

    const tipMat = new THREE.MeshStandardMaterial({
      color: config.tipColor,
      roughness: 0.7,
      metalness: 0.05,
      emissive: config.tipColor,
      emissiveIntensity: 0.1
    });

    if (stage >= 0) {
      const baseGeo = new THREE.SphereGeometry(0.35 * scale, 12, 8);
      baseGeo.scale(1, 0.55, 1);
      const base = new THREE.Mesh(baseGeo, mat);
      base.position.y = 0.18 * scale;
      meshes.push(base);
    }

    if (stage >= 1) {
      const midGeo = new THREE.SphereGeometry(0.55 * scale, 16, 12);
      midGeo.scale(1, 0.6, 1);
      const mid = new THREE.Mesh(midGeo, mat);
      mid.position.y = 0.35 * scale;
      meshes.push(mid);

      for (let i = 0; i < 3; i++) {
        const ridgeGeo = new THREE.TorusGeometry(0.45 * scale, 0.04 * scale, 4, 20);
        const ridge = new THREE.Mesh(ridgeGeo, tipMat);
        ridge.rotation.x = Math.PI / 2;
        ridge.rotation.z = (i - 1) * 0.35;
        ridge.position.y = 0.42 * scale;
        ridge.scale.y = 0.6;
        meshes.push(ridge);
      }
    }

    if (stage >= 2) {
      const topGeo = new THREE.SphereGeometry(0.85 * scale, 20, 14);
      topGeo.scale(1, 0.65, 1);
      const top = new THREE.Mesh(topGeo, mat);
      top.position.y = 0.55 * scale;
      meshes.push(top);

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const ridgeGeo = new THREE.TorusGeometry(0.7 * scale, 0.05 * scale, 5, 24);
        const ridge = new THREE.Mesh(ridgeGeo, tipMat);
        ridge.rotation.x = Math.PI / 2;
        ridge.rotation.z = angle * 0.5;
        ridge.position.y = 0.65 * scale;
        ridge.scale.y = 0.55;
        meshes.push(ridge);
      }

      const capGeo = new THREE.SphereGeometry(0.15 * scale, 10, 8);
      const cap = new THREE.Mesh(capGeo, tipMat);
      cap.position.y = 1.05 * scale;
      meshes.push(cap);
    }

    return meshes;
  }

  private createStageMeshes(config: CoralConfig): THREE.Mesh[][] {
    const scale = config.maxSize;
    if (config.species === 'staghorn') {
      return [
        this.createStaghornMesh(config, 0, scale),
        this.createStaghornMesh(config, 1, scale),
        this.createStaghornMesh(config, 2, scale)
      ];
    } else {
      return [
        this.createBrainMesh(config, 0, scale),
        this.createBrainMesh(config, 1, scale),
        this.createBrainMesh(config, 2, scale)
      ];
    }
  }

  public spawnCoral(position: THREE.Vector3, startAsAdult = false): Coral | null {
    if (this.corals.size >= 20) return null;

    const species = this.randomSpecies();
    const config = { ...SPECIES_CONFIGS[species] };
    config.maxSize *= 0.8 + Math.random() * 0.4;

    const group = new THREE.Group();
    const stageMeshes = this.createStageMeshes(config);

    stageMeshes.forEach((stage, idx) => {
      stage.forEach((m) => {
        m.visible = false;
        group.add(m);
      });
    });

    const x = THREE.MathUtils.clamp(position.x, this.tankBounds.minX, this.tankBounds.maxX);
    const z = THREE.MathUtils.clamp(position.z, this.tankBounds.minZ, this.tankBounds.maxZ);
    group.position.set(x, -3.5, z);

    this.scene.add(group);

    const coral: Coral = {
      id: this.nextId++,
      mesh: group,
      config,
      position: new THREE.Vector3(x, -3.5, z),
      growthProgress: startAsAdult ? 1 : 0,
      stage: startAsAdult ? 2 : 0,
      health: 0.85 + Math.random() * 0.15,
      isSelected: false,
      stageMeshes
    };

    this.updateStageVisibility(coral);
    this.applyGrowthScale(coral);
    this.corals.set(coral.id, coral);
    return coral;
  }

  public getCoralCount(): number {
    return this.corals.size;
  }

  public getAllCorals(): Coral[] {
    return Array.from(this.corals.values());
  }

  public selectCoral(id: number): Coral | null {
    const coral = this.corals.get(id);
    if (!coral) return null;

    this.corals.forEach((c) => {
      if (c.id !== id && c.isSelected) {
        c.isSelected = false;
        this.removeBloom(c);
      }
    });

    coral.isSelected = !coral.isSelected;
    if (coral.isSelected) {
      this.applyBloom(coral);
    } else {
      this.removeBloom(coral);
    }
    return coral;
  }

  public deselectAll(): void {
    this.corals.forEach((c) => {
      if (c.isSelected) {
        c.isSelected = false;
        this.removeBloom(c);
      }
    });
  }

  private applyBloom(coral: Coral): void {
    const bbox = new THREE.Box3().setFromObject(coral.mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const bloomGeo = new THREE.SphereGeometry(maxDim * 0.8, 16, 12);
    const bloomMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const bloom = new THREE.Mesh(bloomGeo, bloomMat);
    bloom.position.y = maxDim * 0.3;
    coral.mesh.add(bloom);
    coral.bloomMesh = bloom;
  }

  private removeBloom(coral: Coral): void {
    if (coral.bloomMesh) {
      coral.mesh.remove(coral.bloomMesh);
      coral.bloomMesh.geometry.dispose();
      (coral.bloomMesh.material as THREE.Material).dispose();
      coral.bloomMesh = undefined;
    }
  }

  public raycastCorals(pointer: THREE.Vector2, camera: THREE.Camera): Coral | null {
    this.raycaster.setFromCamera(pointer, camera);
    const meshes: THREE.Object3D[] = [];
    const meshToCoral = new Map<THREE.Object3D, Coral>();

    this.corals.forEach((coral) => {
      coral.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && child.visible) {
          meshes.push(child);
          meshToCoral.set(child, coral);
        }
      });
    });

    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !meshToCoral.has(obj)) obj = obj.parent;
      return obj ? meshToCoral.get(obj) || null : null;
    }
    return null;
  }

  public clearAll(): void {
    const ids = Array.from(this.corals.keys());
    ids.forEach((id) => this.removeCoral(id));
  }

  private removeCoral(id: number): void {
    const coral = this.corals.get(id);
    if (coral) {
      this.scene.remove(coral.mesh);
      coral.mesh.traverse((child) => {
        if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
        const mat = (child as THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) (mat as THREE.Material).dispose();
      });
      this.corals.delete(id);
    }
  }

  private updateStageVisibility(coral: Coral): void {
    coral.stageMeshes.forEach((stage, idx) => {
      const visible = idx <= coral.stage;
      stage.forEach((m) => {
        m.visible = visible;
      });
    });
  }

  private applyGrowthScale(coral: Coral): void {
    const baseScale = 0.15 + coral.growthProgress * 0.85;
    coral.stageMeshes.forEach((stage, idx) => {
      let stageScale = baseScale;
      if (idx === 0) {
        stageScale = baseScale;
      } else if (idx === 1) {
        stageScale = Math.max(0, (coral.growthProgress - 0.3) / 0.7);
      } else if (idx === 2) {
        stageScale = Math.max(0, (coral.growthProgress - 0.65) / 0.35);
      }
      const s = Math.max(0.01, stageScale);
      stage.forEach((m) => {
        m.scale.setScalar(s);
      });
    });

    const colorMix = coral.growthProgress;
    coral.stageMeshes.forEach((stage) => {
      stage.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissiveIntensity = 0.03 + colorMix * 0.12;
        }
      });
    });
  }

  public update(deltaTime: number): void {
    this.corals.forEach((coral) => {
      if (coral.growthProgress < 1) {
        coral.growthProgress = Math.min(1, coral.growthProgress + deltaTime / GROWTH_DURATION);

        let newStage = 0;
        if (coral.growthProgress >= 0.65) newStage = 2;
        else if (coral.growthProgress >= 0.3) newStage = 1;

        if (newStage !== coral.stage) {
          coral.stage = newStage;
          this.updateStageVisibility(coral);
        }

        this.applyGrowthScale(coral);
      }

      if (coral.bloomMesh) {
        const pulse = 0.15 + Math.sin(Date.now() * 0.003) * 0.08;
        (coral.bloomMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
      }
    });
  }
}
