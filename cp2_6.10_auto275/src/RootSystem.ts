import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';

export type RootSpeciesType = 'taproot' | 'fibrous' | 'lateral';

export interface RootSpeciesParams {
  name: string;
  color: number;
  type: RootSpeciesType;
  maxDepth: number;
  lateralSpread: number;
  lateralBranches: number;
  segmentCount: number;
  segmentLength: number;
  rootRadius: number;
  branchAngle: number;
  gravityStrength: number;
  noiseScale: number;
  noiseStrength: number;
}

export interface RootSegmentData {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  radius: number;
  depth: number;
}

export interface RootBranchData {
  id: string;
  segments: RootSegmentData[];
  meshes: THREE.Mesh[];
  isMain: boolean;
  currentLength: number;
  targetLength: number;
  growIndex: number;
}

export interface PlantRootData {
  id: string;
  species: RootSpeciesParams;
  seedPosition: THREE.Vector3;
  branches: RootBranchData[];
  totalLength: number;
  lateralCount: number;
  maxDepth: number;
  growStartTime: number;
  growEndTime: number;
  isComplete: boolean;
  rootGroup: THREE.Group;
  highlightGroup: THREE.Group;
  originalColors: number[];
}

export const SPECIES_PRESETS: Record<RootSpeciesType, RootSpeciesParams> = {
  taproot: {
    name: '深根橡树',
    color: 0x2e7d32,
    type: 'taproot',
    maxDepth: 4.2,
    lateralSpread: 1.5,
    lateralBranches: 5,
    segmentCount: 45,
    segmentLength: 0.1,
    rootRadius: 0.055,
    branchAngle: 0.6,
    gravityStrength: 0.95,
    noiseScale: 2.0,
    noiseStrength: 0.15
  },
  fibrous: {
    name: '须根小麦',
    color: 0xa5d6a7,
    type: 'fibrous',
    maxDepth: 2.5,
    lateralSpread: 2.8,
    lateralBranches: 18,
    segmentCount: 25,
    segmentLength: 0.08,
    rootRadius: 0.028,
    branchAngle: 1.3,
    gravityStrength: 0.55,
    noiseScale: 3.5,
    noiseStrength: 0.35
  },
  lateral: {
    name: '侧根藤蔓',
    color: 0x8d6e63,
    type: 'lateral',
    maxDepth: 2.0,
    lateralSpread: 3.5,
    lateralBranches: 10,
    segmentCount: 35,
    segmentLength: 0.09,
    rootRadius: 0.04,
    branchAngle: 1.1,
    gravityStrength: 0.35,
    noiseScale: 2.8,
    noiseStrength: 0.45
  }
};

export class RootSystem {
  public plants: PlantRootData[] = [];
  public allSegments: { position: THREE.Vector3; plantId: string; branchId: string }[] = [];

  private scene: THREE.Scene;
  private simplex: SimplexNoise;
  private _sharedCylinderGeometry: THREE.CylinderGeometry | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.simplex = new SimplexNoise();
  }

  private _getSharedGeometry(radiusTop: number, radiusBottom: number, height: number): THREE.CylinderGeometry {
    if (!this._sharedCylinderGeometry) {
      this._sharedCylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    }
    return this._sharedCylinderGeometry;
  }

  public generatePlants(count: number): PlantRootData[] {
    this.plants = [];
    this.allSegments = [];

    const types: RootSpeciesType[] = ['taproot', 'fibrous', 'lateral'];
    const usedPositions: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const typeIndex = i % types.length;
      const species = { ...SPECIES_PRESETS[types[typeIndex]] };
      const seedPos = this._findSeedPosition(usedPositions);
      usedPositions.push(seedPos);

      const plant = this._createPlant(species, seedPos);
      this.plants.push(plant);
      this.scene.add(plant.rootGroup);
      this.scene.add(plant.highlightGroup);
    }

    return this.plants;
  }

  private _findSeedPosition(used: THREE.Vector3[]): THREE.Vector3 {
    let attempts = 0;
    while (attempts < 100) {
      const x = (Math.random() - 0.5) * 6;
      const z = (Math.random() - 0.5) * 6;
      const pos = new THREE.Vector3(x, 0, z);

      let valid = true;
      for (const u of used) {
        if (pos.distanceTo(u) < 1.8) {
          valid = false;
          break;
        }
      }

      if (valid) return pos;
      attempts++;
    }
    return new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
  }

  private _createPlant(species: RootSpeciesParams, seedPos: THREE.Vector3): PlantRootData {
    const rootGroup = new THREE.Group();
    const highlightGroup = new THREE.Group();
    highlightGroup.visible = false;

    const plant: PlantRootData = {
      id: uuidv4(),
      species,
      seedPosition: seedPos.clone(),
      branches: [],
      totalLength: 0,
      lateralCount: 0,
      maxDepth: 0,
      growStartTime: 0,
      growEndTime: 0,
      isComplete: false,
      rootGroup,
      highlightGroup,
      originalColors: []
    };

    const mainBranch = this._createBranch(plant, seedPos.clone(), true, 0);
    plant.branches.push(mainBranch);
    plant.lateralCount = species.lateralBranches;

    return plant;
  }

  private _createBranch(
    plant: PlantRootData,
    startPos: THREE.Vector3,
    isMain: boolean,
    depthLevel: number
  ): RootBranchData {
    const species = plant.species;
    const id = uuidv4();

    let dir = new THREE.Vector3();
    if (isMain) {
      dir.set(0, -1, 0);
      const noise = this.simplex.noise3D(startPos.x * species.noiseScale, 0, startPos.z * species.noiseScale);
      dir.x += noise * 0.3;
      dir.z += this.simplex.noise3D(startPos.z * species.noiseScale, 1, startPos.x * species.noiseScale) * 0.3;
    } else {
      const angle = (Math.random() - 0.5) * species.branchAngle * 2;
      const azimuth = Math.random() * Math.PI * 2;
      const spread = Math.sin(angle);
      dir.set(
        Math.cos(azimuth) * spread,
        -Math.abs(Math.cos(angle)) * species.gravityStrength,
        Math.sin(azimuth) * spread
      );
    }
    dir.normalize();

    const segments: RootSegmentData[] = [];
    const meshes: THREE.Mesh[] = [];
    let pos = startPos.clone();
    let currentDir = dir.clone();
    const segCount = isMain ? species.segmentCount : Math.floor(species.segmentCount * 0.5);
    const segLen = species.segmentLength;

    for (let i = 0; i < segCount; i++) {
      const noiseX = this.simplex.noise3D(
        pos.x * species.noiseScale,
        pos.y * species.noiseScale,
        i * 0.1
      ) * species.noiseStrength;
      const noiseZ = this.simplex.noise3D(
        pos.z * species.noiseScale,
        pos.y * species.noiseScale + 100,
        i * 0.1 + 50
      ) * species.noiseStrength;

      currentDir.x += noiseX * 0.5;
      currentDir.z += noiseZ * 0.5;

      if (!isMain) {
        currentDir.y -= species.gravityStrength * 0.02;
      } else {
        currentDir.y = -Math.abs(currentDir.y) * species.gravityStrength + currentDir.y * (1 - species.gravityStrength);
        currentDir.y = Math.min(currentDir.y, -0.3);
      }
      currentDir.normalize();

      const nextPos = pos.clone().add(currentDir.clone().multiplyScalar(segLen));

      nextPos.x = Math.max(-3.8, Math.min(3.8, nextPos.x));
      nextPos.z = Math.max(-3.8, Math.min(3.8, nextPos.z));
      nextPos.y = Math.max(-4.8, Math.min(-0.05, nextPos.y));

      const radius = species.rootRadius * (1 - i / segCount * 0.5);
      const depth = -nextPos.y;

      segments.push({
        position: nextPos.clone(),
        direction: currentDir.clone(),
        radius,
        depth
      });

      pos = nextPos.clone();
    }

    return {
      id,
      segments,
      meshes,
      isMain,
      currentLength: 0,
      targetLength: segments.length,
      growIndex: 0
    };
  }

  public createLateralBranches(plant: PlantRootData): void {
    const mainBranch = plant.branches.find(b => b.isMain);
    if (!mainBranch) return;

    const count = plant.species.lateralBranches;
    for (let i = 0; i < count; i++) {
      const startIdx = Math.floor(mainBranch.segments.length * (0.15 + (i / count) * 0.7));
      const startSeg = mainBranch.segments[startIdx];
      if (!startSeg) continue;

      const branch = this._createBranch(plant, startSeg.position.clone(), false, 1);
      plant.branches.push(branch);
    }
  }

  public growStep(plant: PlantRootData, speed: number, allPlants: PlantRootData[]): boolean {
    let grew = false;
    const stepsPerFrame = Math.max(1, Math.round(speed * 1.5));

    for (let s = 0; s < stepsPerFrame; s++) {
      for (const branch of plant.branches) {
        if (branch.growIndex >= branch.targetLength) continue;

        const seg = branch.segments[branch.growIndex];
        if (!seg) continue;

        const avoidDir = this._checkCollision(plant, seg.position, allPlants);
        if (avoidDir) {
          seg.direction.lerp(avoidDir, 0.4).normalize();
          const prevPos = branch.growIndex > 0
            ? branch.segments[branch.growIndex - 1].position
            : plant.seedPosition;
          seg.position.copy(prevPos.clone().add(seg.direction.clone().multiplyScalar(plant.species.segmentLength)));
          seg.position.x = Math.max(-3.8, Math.min(3.8, seg.position.x));
          seg.position.z = Math.max(-3.8, Math.min(3.8, seg.position.z));
          seg.position.y = Math.max(-4.8, Math.min(-0.05, seg.position.y));
        }

        this._createSegmentMesh(plant, branch, branch.growIndex);
        this.allSegments.push({
          position: seg.position.clone(),
          plantId: plant.id,
          branchId: branch.id
        });

        branch.growIndex++;
        branch.currentLength++;
        plant.totalLength += plant.species.segmentLength;
        if (seg.depth > plant.maxDepth) plant.maxDepth = seg.depth;

        grew = true;

        if (branch.isMain && branch.growIndex >= Math.floor(branch.targetLength * 0.3) && plant.branches.length === 1) {
          this.createLateralBranches(plant);
        }
      }
    }

    plant.isComplete = plant.branches.every(b => b.growIndex >= b.targetLength);
    if (plant.isComplete && plant.growEndTime === 0) {
      plant.growEndTime = performance.now();
    }

    return grew;
  }

  private _checkCollision(
    currentPlant: PlantRootData,
    position: THREE.Vector3,
    allPlants: PlantRootData[]
  ): THREE.Vector3 | null {
    const minDist = 0.15;
    let avoidVec = new THREE.Vector3();
    let hit = false;

    for (const plant of allPlants) {
      if (plant.id === currentPlant.id) continue;

      for (const segData of this.allSegments.filter(s => s.plantId === plant.id)) {
        const dist = position.distanceTo(segData.position);
        if (dist < minDist && dist > 0.001) {
          const away = position.clone().sub(segData.position).normalize();
          away.multiplyScalar(1 - dist / minDist);
          avoidVec.add(away);
          hit = true;
        }
      }
    }

    if (hit) {
      avoidVec.y = Math.max(avoidVec.y, -0.1);
      return avoidVec.normalize();
    }
    return null;
  }

  public checkCompetition(allPlants: PlantRootData[]): { position: THREE.Vector3; type: 'competition' | 'symbiosis' }[] {
    const events: { position: THREE.Vector3; type: 'competition' | 'symbiosis' }[] = [];
    const minDist = 0.2;
    const checkedPairs = new Set<string>();

    for (let i = 0; i < allPlants.length; i++) {
      for (let j = i + 1; j < allPlants.length; j++) {
        const p1 = allPlants[i];
        const p2 = allPlants[j];
        const segs1 = this.allSegments.filter(s => s.plantId === p1.id);
        const segs2 = this.allSegments.filter(s => s.plantId === p2.id);

        for (const s1 of segs1) {
          for (const s2 of segs2) {
            const pairKey = [s1.position.x.toFixed(2), s1.position.y.toFixed(2), s1.position.z.toFixed(2),
              s2.position.x.toFixed(2), s2.position.y.toFixed(2), s2.position.z.toFixed(2)].join('_');
            if (checkedPairs.has(pairKey)) continue;

            if (s1.position.distanceTo(s2.position) < minDist) {
              checkedPairs.add(pairKey);
              const midPoint = s1.position.clone().add(s2.position).multiplyScalar(0.5);
              events.push({ position: midPoint, type: 'competition' });
            }
          }
        }
      }
    }

    const depthBuckets = new Map<string, { position: THREE.Vector3; count: number }>();
    for (const seg of this.allSegments) {
      const depthBucket = Math.floor(seg.position.y / 0.5);
      const xBucket = Math.floor(seg.position.x / 1.5);
      const zBucket = Math.floor(seg.position.z / 1.5);
      const key = `${depthBucket}_${xBucket}_${zBucket}`;

      if (!depthBuckets.has(key)) {
        depthBuckets.set(key, { position: seg.position.clone(), count: 0 });
      }
      const bucket = depthBuckets.get(key)!;
      bucket.count++;
      bucket.position.lerp(seg.position, 0.3);
    }

    for (const bucket of depthBuckets.values()) {
      if (bucket.count >= 8) {
        const plantSet = new Set(
          this.allSegments
            .filter(s => s.position.distanceTo(bucket.position) < 1.5)
            .map(s => s.plantId)
        );
        if (plantSet.size >= 3) {
          events.push({ position: bucket.position.clone(), type: 'symbiosis' });
        }
      }
    }

    return events;
  }

  private _createSegmentMesh(plant: PlantRootData, branch: RootBranchData, segIndex: number): void {
    const seg = branch.segments[segIndex];
    const prevPos = segIndex > 0
      ? branch.segments[segIndex - 1].position
      : (branch.isMain ? plant.seedPosition : plant.seedPosition);

    const dir = seg.position.clone().sub(prevPos);
    const len = dir.length() || 0.01;
    const midPoint = prevPos.clone().add(seg.position).multiplyScalar(0.5);

    const geometry = this._getSharedGeometry(seg.radius, seg.radius, len);
    const material = new THREE.MeshPhongMaterial({
      color: plant.species.color,
      shininess: 15,
      side: THREE.DoubleSide
    });
    plant.originalColors.push(plant.species.color);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(seg.radius, len, seg.radius);
    mesh.position.copy(midPoint);
    mesh.lookAt(seg.position);
    mesh.rotateX(Math.PI / 2);

    mesh.userData = {
      plantId: plant.id,
      branchId: branch.id,
      segIndex,
      depth: seg.depth,
      color: plant.species.color
    };

    plant.rootGroup.add(mesh);
    branch.meshes.push(mesh);
  }

  public highlightPlant(plantId: string, highlight: boolean): void {
    const plant = this.plants.find(p => p.id === plantId);
    if (!plant) return;

    plant.highlightGroup.visible = highlight;

    plant.branches.forEach(branch => {
      branch.meshes.forEach(mesh => {
        const mat = mesh.material as THREE.MeshPhongMaterial;
        if (highlight) {
          mat.emissive = new THREE.Color(0xffffff);
          mat.emissiveIntensity = 0.35;
        } else {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
        }
        mat.needsUpdate = true;
      });
    });
  }

  public toggleOtherPlantsVisibility(selectedId: string | null): void {
    for (const plant of this.plants) {
      const isSelected = selectedId === null || plant.id === selectedId;
      plant.rootGroup.visible = isSelected;
    }
  }

  public resetGrowth(): void {
    for (const plant of this.plants) {
      while (plant.rootGroup.children.length > 0) {
        const child = plant.rootGroup.children[0];
        plant.rootGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
      plant.highlightGroup.visible = false;
      plant.branches = [];
      plant.totalLength = 0;
      plant.maxDepth = 0;
      plant.growStartTime = 0;
      plant.growEndTime = 0;
      plant.isComplete = false;
      plant.originalColors = [];

      const species = plant.species;
      const mainBranch = this._createBranch(plant, plant.seedPosition.clone(), true, 0);
      plant.branches.push(mainBranch);
      plant.lateralCount = species.lateralBranches;
    }
    this.allSegments = [];
  }

  public getPlantInfo(plantId: string): {
    name: string;
    depth: number;
    totalLength: number;
    lateralCount: number;
    growTime: number;
  } | null {
    const plant = this.plants.find(p => p.id === plantId);
    if (!plant) return null;

    const growTime = plant.growStartTime > 0
      ? ((plant.growEndTime || performance.now()) - plant.growStartTime) / 1000
      : 0;

    return {
      name: plant.species.name,
      depth: plant.maxDepth,
      totalLength: plant.totalLength,
      lateralCount: plant.lateralCount,
      growTime
    };
  }
}
