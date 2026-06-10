import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export interface GrowthParams {
  coolingRate: number;
  concentration: number;
}

export type CrystalShape = '立方体' | '八面体' | '针状';

export interface CrystalInfo {
  id: number;
  volume: number;
  shape: CrystalShape;
}

interface Crystal {
  id: number;
  seedPosition: THREE.Vector3;
  growthDirection: THREE.Vector3;
  growthProgress: number;
  maxSize: number;
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  edges: THREE.LineSegments;
  baseGeometry: THREE.BufferGeometry;
  originalPositions: Float32Array;
  highlighted: boolean;
  seed: number;
}

export class CrystalGrowthSystem {
  private scene: THREE.Scene;
  private crystals: Crystal[] = [];
  private hostRock!: THREE.Mesh;
  private params: GrowthParams;
  private noise3D: ReturnType<typeof createNoise3D>;
  private time: number = 0;
  private crystalIdCounter: number = 0;
  private history: { progress: number; params: GrowthParams }[] = [];
  private isReplaying: boolean = false;
  private replayTime: number = 0;
  private replayDuration: number = 10;
  private replayStartProgress: number[] = [];
  private maxHistoryLength: number = 600;

  constructor(scene: THREE.Scene, params: GrowthParams) {
    this.scene = scene;
    this.params = { ...params };
    this.noise3D = createNoise3D();
    this.createHostRock();
    this.generateSeeds();
  }

  private createHostRock(): void {
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const positions = geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = this.noise3D(x * 2, y * 2, z * 2) * 0.15;
      const len = Math.sqrt(x * x + y * y + z * z);
      const scale = (2 + noise) / len;
      positions.setXYZ(i, x * scale, y * scale, z * scale);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x555566,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });

    this.hostRock = new THREE.Mesh(geometry, material);
    this.hostRock.castShadow = true;
    this.hostRock.receiveShadow = true;
    this.scene.add(this.hostRock);
  }

  private generateSeeds(): void {
    const seedCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < seedCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const seedPos = new THREE.Vector3(x, y, z);
      const growthDir = seedPos.clone().normalize();

      const noiseX = this.noise3D(x * 5, y * 5, z * 5) * 0.3;
      const noiseY = this.noise3D(x * 5 + 100, y * 5 + 100, z * 5 + 100) * 0.3;
      const noiseZ = this.noise3D(x * 5 + 200, y * 5 + 200, z * 5 + 200) * 0.3;
      growthDir.add(new THREE.Vector3(noiseX, noiseY, noiseZ)).normalize();

      this.createCrystal(seedPos, growthDir);
    }
  }

  private createCrystal(seedPos: THREE.Vector3, growthDir: THREE.Vector3): void {
    const id = this.crystalIdCounter++;
    const seed = Math.random() * 1000;

    const group = new THREE.Group();
    group.position.copy(seedPos);

    const baseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1, 2, 2, 2);
    const originalPositions = new Float32Array(baseGeometry.attributes.position.array);

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.55, 1, 0.5),
      transparent: true,
      opacity: 0.8,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.3,
      thickness: 0.5,
      side: THREE.DoubleSide
    });

    const bodyMesh = new THREE.Mesh(baseGeometry, material);
    group.add(bodyMesh);

    const edgesGeometry = new THREE.EdgesGeometry(baseGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      linewidth: 2
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    group.add(edges);

    this.scene.add(group);

    const crystal: Crystal = {
      id,
      seedPosition: seedPos.clone(),
      growthDirection: growthDir.clone(),
      growthProgress: 0,
      maxSize: 1.0 + Math.random() * 0.8,
      mesh: group,
      bodyMesh,
      edges,
      baseGeometry,
      originalPositions,
      highlighted: false,
      seed
    };

    this.crystals.push(crystal);
    this.replayStartProgress.push(0);
  }

  updateParams(params: Partial<GrowthParams>): void {
    if (params.coolingRate !== undefined) {
      this.params.coolingRate = Math.max(0.1, Math.min(1.0, params.coolingRate));
    }
    if (params.concentration !== undefined) {
      this.params.concentration = Math.max(0.02, Math.min(0.1, params.concentration));
    }
  }

  getParams(): GrowthParams {
    return { ...this.params };
  }

  grow(deltaTime: number): void {
    this.time += deltaTime;

    if (this.isReplaying) {
      this.replayTime += deltaTime;
      const t = Math.min(this.replayTime / this.replayDuration, 1);
      const easedT = this.easeInOutCubic(t);

      this.crystals.forEach((crystal, idx) => {
        crystal.growthProgress = this.replayStartProgress[idx] * easedT;
        this.updateCrystalGeometry(crystal);
      });

      if (t >= 1) {
        this.isReplaying = false;
      }
      return;
    }

    if (this.history.length >= this.maxHistoryLength) {
      this.history.shift();
    }
    this.history.push({
      progress: this.crystals.map(c => c.growthProgress).reduce((a, b) => a + b, 0) / Math.max(this.crystals.length, 1),
      params: { ...this.params }
    });

    const growthSpeed = 0.05 + this.params.concentration * 1.5;

    this.crystals.forEach((crystal) => {
      if (crystal.growthProgress < 1.0) {
        crystal.growthProgress = Math.min(
          1.0,
          crystal.growthProgress + growthSpeed * deltaTime
        );
        this.updateCrystalGeometry(crystal);
      }
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateCrystalGeometry(crystal: Crystal): void {
    const progress = crystal.growthProgress;
    const coolingRate = this.params.coolingRate;
    const shapePhase = progress * (1 + coolingRate * 0.5);
    const size = 0.1 + progress * crystal.maxSize;

    const positions = this.baseGeometry.attributes.position as THREE.BufferAttribute;
    const origPos = crystal.originalPositions;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const ox = origPos[i * 3];
      const oy = origPos[i * 3 + 1];
      const oz = origPos[i * 3 + 2];

      let x = ox * size;
      let y = oy * size;
      let z = oz * size;

      if (shapePhase > 0.3) {
        const octahedronStrength = Math.min((shapePhase - 0.3) / 0.4, 1);
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 0.0001) {
          const nx = x / dist;
          const ny = y / dist;
          const nz = z / dist;
          const octaDist = size * 0.8 / (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
          const targetDist = size * 0.6 + octahedronStrength * (octaDist - size * 0.6);
          x = nx * targetDist;
          y = ny * targetDist;
          z = nz * targetDist;
        }
      }

      if (shapePhase >= 0.7) {
        const needleStrength = (shapePhase - 0.7) / 0.3;
        const dir = crystal.growthDirection;
        const proj = x * dir.x + y * dir.y + z * dir.z;
        const perpX = x - proj * dir.x;
        const perpY = y - proj * dir.y;
        const perpZ = z - proj * dir.z;
        const perpScale = 1 - needleStrength * 0.65;
        const projScale = 1 + needleStrength * 1.5;
        x = perpX * perpScale + proj * dir.x * projScale;
        y = perpY * perpScale + proj * dir.y * projScale;
        z = perpZ * perpScale + proj * dir.z * projScale;
      }

      const noiseFreq = 8 + crystal.seed;
      const noiseAmp = 0.03 * progress;
      const nt = this.time * 0.5;
      x += this.noise3D(ox * noiseFreq + crystal.seed, nt, 0) * noiseAmp;
      y += this.noise3D(oy * noiseFreq + crystal.seed + 100, nt + 50, 0) * noiseAmp;
      z += this.noise3D(oz * noiseFreq + crystal.seed + 200, nt + 100, 0) * noiseAmp;

      positions.setXYZ(i, x, y, z);
    }

    positions.needsUpdate = true;
    crystal.baseGeometry.computeVertexNormals();

    crystal.edges.geometry.dispose();
    crystal.edges.geometry = new THREE.EdgesGeometry(crystal.baseGeometry);

    const opacity = 0.8 - 0.6 * progress * coolingRate;
    (crystal.bodyMesh.material as THREE.MeshPhysicalMaterial).opacity = Math.max(0.2, opacity);

    const hue = 0.55 - progress * 0.08;
    const lightness = 0.6 - progress * 0.3;
    (crystal.bodyMesh.material as THREE.MeshPhysicalMaterial).color.setHSL(hue, 1, Math.max(0.2, lightness));

    const offset = crystal.growthDirection.clone().multiplyScalar(progress * crystal.maxSize * 0.5);
    crystal.mesh.position.copy(crystal.seedPosition).add(offset);

    const direction = crystal.growthDirection;
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    crystal.mesh.quaternion.copy(quaternion);
  }

  highlightCrystal(id: number | null): void {
    this.crystals.forEach(crystal => {
      const shouldHighlight = id !== null && crystal.id === id;
      crystal.highlighted = shouldHighlight;
      (crystal.edges.material as THREE.LineBasicMaterial).opacity = shouldHighlight ? 1 : 0;
    });
  }

  getCrystalByMesh(mesh: THREE.Object3D): CrystalInfo | null {
    for (const crystal of this.crystals) {
      if (mesh === crystal.bodyMesh || mesh === crystal.edges || crystal.mesh === mesh) {
        return {
          id: crystal.id,
          volume: this.calculateVolume(crystal),
          shape: this.getShapeType(crystal)
        };
      }
    }
    return null;
  }

  private calculateVolume(crystal: Crystal): number {
    const progress = crystal.growthProgress;
    const size = 0.1 + progress * crystal.maxSize;
    const coolingRate = this.params.coolingRate;
    const shapePhase = progress * (1 + coolingRate * 0.5);

    if (shapePhase < 0.3) {
      return size * size * size;
    } else if (shapePhase < 0.7) {
      const t = (shapePhase - 0.3) / 0.4;
      const cubeVol = size * size * size;
      const octVol = (Math.sqrt(2) / 3) * Math.pow(size * 0.9, 3);
      return cubeVol * (1 - t) + octVol * t;
    } else {
      const needleStrength = (shapePhase - 0.7) / 0.3;
      const radius = size * 0.2 * (1 - needleStrength * 0.5);
      const height = size * 1.5 * (1 + needleStrength);
      return Math.PI * radius * radius * height;
    }
  }

  private getShapeType(crystal: Crystal): CrystalShape {
    const progress = crystal.growthProgress;
    const coolingRate = this.params.coolingRate;
    const shapePhase = progress * (1 + coolingRate * 0.5);

    if (shapePhase < 0.3) return '立方体';
    if (shapePhase < 0.7) return '八面体';
    return '针状';
  }

  getPickableMeshes(): THREE.Object3D[] {
    return this.crystals.flatMap(c => [c.bodyMesh, c.edges]);
  }

  replay(): void {
    this.replayStartProgress = this.crystals.map(c => c.growthProgress);
    this.crystals.forEach(crystal => {
      crystal.growthProgress = 0;
      this.updateCrystalGeometry(crystal);
    });
    this.isReplaying = true;
    this.replayTime = 0;
  }

  reset(): void {
    this.crystals.forEach(crystal => {
      this.scene.remove(crystal.mesh);
      crystal.baseGeometry.dispose();
      crystal.edges.geometry.dispose();
      (crystal.bodyMesh.material as THREE.Material).dispose();
      (crystal.edges.material as THREE.Material).dispose();
    });
    this.crystals = [];
    this.replayStartProgress = [];
    this.history = [];
    this.time = 0;
    this.isReplaying = false;
    this.generateSeeds();
  }

  dispose(): void {
    this.crystals.forEach(crystal => {
      crystal.baseGeometry.dispose();
      crystal.edges.geometry.dispose();
      (crystal.bodyMesh.material as THREE.Material).dispose();
      (crystal.edges.material as THREE.Material).dispose();
    });
    if (this.hostRock) {
      (this.hostRock.geometry as THREE.BufferGeometry).dispose();
      (this.hostRock.material as THREE.Material).dispose();
    }
  }
}
