import * as THREE from 'three';

export type PlantType = 'fern' | 'succulent' | 'moss';

export interface PlantState {
  name: string;
  height: number;
  leafCount: number;
  health: number;
}

interface LeafData {
  mesh: THREE.Mesh;
  baseRotation: THREE.Euler;
  basePosition: THREE.Vector3;
  nodeIndex: number;
  unfoldProgress: number;
  windPhase: number;
}

interface StemPoint {
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

const PLANT_CONFIG = {
  fern: {
    name: '蕨类',
    maxHeight: 3.5,
    leafCount: 12,
    stemSegments: 20,
    leafSize: 0.8,
    stemRadius: 0.06,
    sinFrequency: 2,
    sinAmplitude: 0.3,
    leafColor: 0x2d6a4f,
    stemColor: 0x40916c
  },
  succulent: {
    name: '多肉',
    maxHeight: 1.5,
    leafCount: 8,
    stemSegments: 8,
    leafSize: 0.6,
    stemRadius: 0.15,
    sinFrequency: 1,
    sinAmplitude: 0.1,
    leafColor: 0x74c69d,
    stemColor: 0x52b788
  },
  moss: {
    name: '苔藓',
    maxHeight: 0.6,
    leafCount: 20,
    stemSegments: 5,
    leafSize: 0.2,
    stemRadius: 0.04,
    sinFrequency: 3,
    sinAmplitude: 0.05,
    leafColor: 0x95d5b2,
    stemColor: 0x74c69d
  }
};

export class Plant {
  public type: PlantType;
  public group: THREE.Group;
  public state: PlantState;
  public growthProgress: number = 0;
  public isGrowing: boolean = false;

  private seedMesh: THREE.Mesh | null = null;
  private stemMesh: THREE.Mesh | null = null;
  private leaves: LeafData[] = [];
  private stemPoints: StemPoint[] = [];
  private config: typeof PLANT_CONFIG.fern;
  
  private seedPhase: 'idle' | 'swelling' | 'cracking' | 'done' = 'idle';
  private seedTimer: number = 0;
  private growthTimer: number = 0;
  private leafUnfoldTimers: number[] = [];
  
  private readonly SEED_SWELL_TIME = 0.25;
  private readonly SEED_CRACK_TIME = 0.25;
  private readonly GROWTH_DURATION = 4;
  private readonly LEAF_UNFOLD_TIME = 0.3;
  private readonly PHI = (Math.sqrt(5) - 1) / 2;

  constructor(type: PlantType) {
    this.type = type;
    this.config = PLANT_CONFIG[type];
    this.group = new THREE.Group();
    this.state = {
      name: this.config.name,
      height: 0,
      leafCount: 0,
      health: 100
    };
  }

  public seed(scene: THREE.Scene, position: THREE.Vector3): void {
    this.clear();
    
    this.group.position.copy(position);
    this.group.position.y += 0.1;
    
    const seedGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.8,
      metalness: 0.1
    });
    this.seedMesh = new THREE.Mesh(seedGeometry, seedMaterial);
    this.seedMesh.castShadow = true;
    this.group.add(this.seedMesh);
    
    this.seedPhase = 'idle';
    this.seedTimer = 0;
    this.growthTimer = 0;
    this.growthProgress = 0;
    this.isGrowing = false;
    this.state.height = 0;
    this.state.leafCount = 0;
    
    scene.add(this.group);
  }

  public startGrowth(): void {
    if (this.seedPhase === 'idle') {
      this.seedPhase = 'swelling';
      this.seedTimer = 0;
      this.isGrowing = true;
    }
  }

  private createStem(): void {
    if (this.stemMesh) {
      this.group.remove(this.stemMesh);
    }

    this.stemPoints = [];
    for (let i = 0; i <= this.config.stemSegments; i++) {
      const t = i / this.config.stemSegments;
      const y = t * this.config.maxHeight;
      const x = Math.sin(t * this.config.sinFrequency * Math.PI) * this.config.sinAmplitude * t;
      const z = Math.cos(t * this.config.sinFrequency * Math.PI * 0.7) * this.config.sinAmplitude * 0.5 * t;
      
      this.stemPoints.push({
        position: new THREE.Vector3(x, y, z),
        direction: new THREE.Vector3(0, 1, 0)
      });
    }

    const curve = new THREE.CatmullRomCurve3(
      this.stemPoints.map(p => p.position)
    );
    
    const geometry = new THREE.TubeGeometry(
      curve,
      this.config.stemSegments * 4,
      this.config.stemRadius,
      8,
      false
    );
    
    const material = new THREE.MeshStandardMaterial({
      color: this.config.stemColor,
      roughness: 0.7,
      metalness: 0.1
    });
    
    this.stemMesh = new THREE.Mesh(geometry, material);
    this.stemMesh.castShadow = true;
    this.stemMesh.receiveShadow = true;
    this.group.add(this.stemMesh);
  }

  private createLeaf(nodeIndex: number, index: number): LeafData {
    const t = nodeIndex / this.config.stemSegments;
    const stemPoint = this.stemPoints[nodeIndex];
    
    const angle = index * this.PHI * Math.PI * 2;
    const radius = 0.1 + t * 0.3;
    const height = stemPoint.position.y;
    
    let leafGeometry: THREE.BufferGeometry;
    let leafShape: THREE.Shape;
    
    if (this.type === 'fern') {
      leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      for (let i = 0; i <= 10; i++) {
        const s = i / 10;
        const w = Math.sin(s * Math.PI) * 0.15;
        leafShape.lineTo(w, s * this.config.leafSize);
      }
      for (let i = 10; i >= 0; i--) {
        const s = i / 10;
        const w = Math.sin(s * Math.PI) * 0.15;
        leafShape.lineTo(-w, s * this.config.leafSize);
      }
      leafShape.lineTo(0, 0);
      
      const pinnules = [];
      for (let i = 2; i < 10; i += 2) {
        const s = i / 10;
        const y = s * this.config.leafSize;
        const w = Math.sin(s * Math.PI) * 0.15;
        
        for (let j = -1; j <= 1; j += 2) {
          const pinnule = new THREE.Shape();
          pinnule.moveTo(j * w, y);
          pinnule.quadraticCurveTo(j * (w + 0.08), y + 0.05, j * w, y + 0.1);
          pinnule.quadraticCurveTo(j * (w - 0.02), y + 0.05, j * w, y);
          pinnules.push(pinnule);
        }
      }
      
      leafGeometry = new THREE.ExtrudeGeometry(leafShape, {
        depth: 0.01,
        bevelEnabled: false
      });
      
      pinnules.forEach(p => {
        const g = new THREE.ExtrudeGeometry(p, { depth: 0.005, bevelEnabled: false });
        leafGeometry.merge(g);
      });
    } else if (this.type === 'succulent') {
      leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(this.config.leafSize * 0.5, this.config.leafSize * 0.3, this.config.leafSize * 0.2, this.config.leafSize);
      leafShape.quadraticCurveTo(0, this.config.leafSize * 1.1, -this.config.leafSize * 0.2, this.config.leafSize);
      leafShape.quadraticCurveTo(-this.config.leafSize * 0.5, this.config.leafSize * 0.3, 0, 0);
      
      leafGeometry = new THREE.ExtrudeGeometry(leafShape, {
        depth: 0.12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 3
      });
    } else {
      leafGeometry = new THREE.SphereGeometry(this.config.leafSize, 8, 6);
      leafGeometry.scale(1, 0.4, 1);
    }
    
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: this.config.leafColor,
      roughness: 0.6,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);
    leafMesh.castShadow = true;
    
    const basePosition = new THREE.Vector3(
      stemPoint.position.x + Math.cos(angle) * radius,
      height,
      stemPoint.position.z + Math.sin(angle) * radius
    );
    
    const baseRotation = new THREE.Euler(
      (Math.random() - 0.5) * 0.3,
      angle + Math.PI / 2,
      (Math.random() - 0.5) * 0.3
    );
    
    leafMesh.position.copy(basePosition);
    leafMesh.rotation.copy(baseRotation);
    leafMesh.scale.setScalar(0);
    
    this.group.add(leafMesh);
    
    return {
      mesh: leafMesh,
      baseRotation: baseRotation.clone(),
      basePosition: basePosition.clone(),
      nodeIndex,
      unfoldProgress: 0,
      windPhase: Math.random() * Math.PI * 2
    };
  }

  private updateStemGrowth(): void {
    if (!this.stemMesh || this.growthProgress >= 1) return;

    const progress = Math.min(1, this.growthProgress);
    const visibleSegments = Math.floor(this.config.stemSegments * progress);
    
    const positions = this.stemMesh.geometry.attributes.position;
    const originalPositions = (this.stemMesh.geometry as any)._originalPositions;
    
    if (!originalPositions) {
      (this.stemMesh.geometry as any)._originalPositions = positions.array.slice();
      return;
    }
    
    const totalPoints = positions.count;
    const visiblePoints = Math.floor(totalPoints * progress);
    
    for (let i = 0; i < totalPoints; i++) {
      if (i < visiblePoints) {
        positions.setXYZ(
          i,
          originalPositions[i * 3],
          originalPositions[i * 3 + 1],
          originalPositions[i * 3 + 2]
        );
      } else {
        const firstPointY = originalPositions[1];
        positions.setXYZ(
          i,
          originalPositions[i * 3] * 0.1,
          firstPointY,
          originalPositions[i * 3 + 2] * 0.1
        );
      }
    }
    
    positions.needsUpdate = true;
    this.stemMesh.geometry.computeBoundingSphere();
  }

  public update(deltaTime: number, growthFactor: { light: number; water: number }, lightIntensity: number): void {
    const combinedFactor = Math.min(growthFactor.light, growthFactor.water);
    
    if (this.seedPhase === 'swelling' && this.seedMesh) {
      this.seedTimer += deltaTime;
      const progress = this.seedTimer / this.SEED_SWELL_TIME;
      const scale = 1 + progress * 0.5;
      this.seedMesh.scale.setScalar(scale);
      
      if (this.seedTimer >= this.SEED_SWELL_TIME) {
        this.seedPhase = 'cracking';
        this.seedTimer = 0;
      }
    } else if (this.seedPhase === 'cracking' && this.seedMesh) {
      this.seedTimer += deltaTime;
      const progress = this.seedTimer / this.SEED_CRACK_TIME;
      this.seedMesh.material.opacity = 1 - progress;
      (this.seedMesh.material as THREE.MeshStandardMaterial).transparent = true;
      this.seedMesh.scale.setScalar(1.5 + progress * 0.3);
      
      if (this.seedTimer >= this.SEED_CRACK_TIME) {
        this.seedPhase = 'done';
        this.group.remove(this.seedMesh);
        this.seedMesh = null;
        this.createStem();
        this.growthTimer = 0;
      }
    } else if (this.seedPhase === 'done' && this.growthProgress < 1) {
      this.growthTimer += deltaTime * combinedFactor;
      this.growthProgress = Math.min(1, this.growthTimer / this.GROWTH_DURATION);
      
      this.updateStemGrowth();
      this.state.height = this.growthProgress * this.config.maxHeight * 10;
      
      const expectedLeaves = Math.floor(this.growthProgress * this.config.leafCount);
      while (this.leaves.length < expectedLeaves) {
        const leafIndex = this.leaves.length;
        const nodeIndex = Math.floor((leafIndex / this.config.leafCount) * this.config.stemSegments) + 2;
        const clampedNodeIndex = Math.min(nodeIndex, this.config.stemSegments - 1);
        
        const leaf = this.createLeaf(clampedNodeIndex, leafIndex);
        this.leaves.push(leaf);
        this.leafUnfoldTimers.push(0);
      }
      
      this.leaves.forEach((leaf, index) => {
        if (leaf.unfoldProgress < 1) {
          this.leafUnfoldTimers[index] += deltaTime;
          leaf.unfoldProgress = Math.min(1, this.leafUnfoldTimers[index] / this.LEAF_UNFOLD_TIME);
          
          const scale = this.easeOutBack(leaf.unfoldProgress);
          leaf.mesh.scale.setScalar(scale);
        }
      });
      
      this.state.leafCount = this.leaves.filter(l => l.unfoldProgress >= 1).length;
      
      if (this.growthProgress >= 1) {
        this.isGrowing = false;
      }
    }
    
    const time = performance.now() * 0.001;
    this.leaves.forEach(leaf => {
      const windSwing = Math.sin(time * Math.PI + leaf.windPhase) * 0.035;
      leaf.mesh.rotation.x = leaf.baseRotation.x + windSwing;
      leaf.mesh.rotation.z = leaf.baseRotation.z + windSwing * 0.5;
    });
    
    if (lightIntensity > 80) {
      const yellowAmount = Math.min(1, (lightIntensity - 80) / 20);
      this.leaves.forEach(leaf => {
        const material = leaf.mesh.material as THREE.MeshStandardMaterial;
        material.color.setRGB(
          (1 - yellowAmount) * ((this.config.leafColor >> 16) & 255) / 255 + yellowAmount * 1,
          (1 - yellowAmount) * ((this.config.leafColor >> 8) & 255) / 255 + yellowAmount * 0.9,
          (1 - yellowAmount) * (this.config.leafColor & 255) / 255 + yellowAmount * 0.2
        );
      });
    } else {
      this.leaves.forEach(leaf => {
        const material = leaf.mesh.material as THREE.MeshStandardMaterial;
        material.color.setHex(this.config.leafColor);
      });
    }
    
    this.state.health = Math.round(combinedFactor * 100);
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  public getState(): PlantState {
    return { ...this.state };
  }

  public getTopPosition(): THREE.Vector3 {
    if (this.stemPoints.length > 0 && this.stemMesh) {
      const topIndex = Math.min(
        Math.floor(this.growthProgress * (this.stemPoints.length - 1)),
        this.stemPoints.length - 1
      );
      const topPoint = this.stemPoints[topIndex];
      return new THREE.Vector3(
        this.group.position.x + topPoint.position.x,
        this.group.position.y + topPoint.position.y,
        this.group.position.z + topPoint.position.z
      );
    }
    return this.group.position.clone();
  }

  public isMature(): boolean {
    return this.growthProgress >= 1;
  }

  public clear(): void {
    if (this.seedMesh) {
      this.group.remove(this.seedMesh);
      this.seedMesh = null;
    }
    if (this.stemMesh) {
      this.group.remove(this.stemMesh);
      this.stemMesh.geometry.dispose();
      (this.stemMesh.material as THREE.Material).dispose();
      this.stemMesh = null;
    }
    this.leaves.forEach(leaf => {
      this.group.remove(leaf.mesh);
      leaf.mesh.geometry.dispose();
      (leaf.mesh.material as THREE.Material).dispose();
    });
    this.leaves = [];
    this.stemPoints = [];
    this.leafUnfoldTimers = [];
    this.seedPhase = 'idle';
    this.seedTimer = 0;
    this.growthTimer = 0;
    this.growthProgress = 0;
    this.isGrowing = false;
  }
}
