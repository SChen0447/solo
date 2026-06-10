import * as THREE from 'three';

const FLOWER_COLORS = [
  new THREE.Color(0xff66aa),
  new THREE.Color(0xffaa66),
  new THREE.Color(0x66ffaa),
  new THREE.Color(0xaa66ff)
];

const STEM_START_COLOR = new THREE.Color(0x88ffaa);
const STEM_END_COLOR = new THREE.Color(0x66dd88);
const LEAF_START_COLOR = new THREE.Color(0x44ff88);
const LEAF_END_COLOR = new THREE.Color(0x88ff44);
const SEED_COLOR = new THREE.Color(0x88ddff);

type GrowthStage = 'seed' | 'root' | 'stem' | 'leaves' | 'flower' | 'complete';

export class Plant {
  group: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  isMoving: boolean;
  stemHeight: number;
  flowerColor: THREE.Color;
  pulsePhase: number;
  pulseSpeed: number;
  rotationSpeed: number;

  private growthStage: GrowthStage;
  private growthProgress: number;
  private moveStartPos: THREE.Vector3;
  private moveEndPos: THREE.Vector3;
  private moveTime: number;
  private moveDuration: number;

  private seedMesh: THREE.Mesh | null = null;
  private roots: THREE.Line[] = [];
  private stemMesh: THREE.Mesh | null = null;
  private leaves: THREE.Mesh[] = [];
  private flowerGroup: THREE.Group | null = null;
  private flowerPetals: THREE.Mesh[] = [];

  private rootsTargetLength: number = 0.5;
  private leafCount: number;
  private petalCount: number;
  private petalRadius: number;

  private stemMaterial: THREE.MeshBasicMaterial | null = null;
  private currentStemT: number = 0;

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.position = position.clone();
    this.targetPosition = position.clone();
    this.group.position.copy(position);
    this.isMoving = false;
    this.moveStartPos = new THREE.Vector3();
    this.moveEndPos = new THREE.Vector3();
    this.moveTime = 0;
    this.moveDuration = 0.5;

    this.stemHeight = 0.5 + Math.random() * 1.0;
    this.flowerColor = FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)].clone();
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = (Math.PI * 2) / 1.5;
    this.rotationSpeed = 0.01;

    this.growthStage = 'seed';
    this.growthProgress = 0;
    this.leafCount = 2 + Math.floor(Math.random() * 3);
    this.petalCount = 3 + Math.floor(Math.random() * 3);
    this.petalRadius = 0.15 + Math.random() * 0.05;

    this.createSeed();
  }

  private createSeed(): void {
    const geom = new THREE.SphereGeometry(0.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: SEED_COLOR,
      transparent: true,
      opacity: 0.95
    });
    this.seedMesh = new THREE.Mesh(geom, mat);
    this.seedMesh.position.y = 0.5;
    this.group.add(this.seedMesh);
    this.growthStage = 'root';
    this.growthProgress = 0;
  }

  private createRoots(): void {
    const rootCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < rootCount; i++) {
      const angle = (i / rootCount) * Math.PI * 2 + Math.random() * 0.5;
      const spread = 0.1 + Math.random() * 0.2;
      const points: THREE.Vector3[] = [];
      const startY = 0.4;
      points.push(new THREE.Vector3(0, startY, 0));
      points.push(new THREE.Vector3(
        Math.cos(angle) * spread * 0.5,
        startY - this.rootsTargetLength * 0.5,
        Math.sin(angle) * spread * 0.5
      ));
      points.push(new THREE.Vector3(
        Math.cos(angle) * spread,
        startY - this.rootsTargetLength,
        Math.sin(angle) * spread
      ));

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0x66aacc,
        transparent: true,
        opacity: 0.4
      });
      const line = new THREE.Line(geom, mat);
      this.roots.push(line);
      this.group.add(line);
    }
  }

  private createStem(): void {
    const geom = new THREE.CylinderGeometry(0.05, 0.05, this.stemHeight, 8);
    this.stemMaterial = new THREE.MeshBasicMaterial({
      color: STEM_START_COLOR.clone(),
      transparent: true,
      opacity: 0.9
    });
    this.stemMesh = new THREE.Mesh(geom, this.stemMaterial);
    this.stemMesh.position.y = 0.5 + this.stemHeight / 2;
    this.group.add(this.stemMesh);
  }

  private createLeaves(): void {
    for (let i = 0; i < this.leafCount; i++) {
      const geom = new THREE.SphereGeometry(1, 12, 8);
      geom.scale(0.15, 0.05, 0.3);
      const t = i / Math.max(1, this.leafCount - 1);
      const color = LEAF_START_COLOR.clone().lerp(LEAF_END_COLOR, t);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      });
      const leaf = new THREE.Mesh(geom, mat);
      const heightT = 0.3 + Math.random() * 0.5;
      leaf.position.y = 0.5 + this.stemHeight * heightT;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.08;
      leaf.position.x = Math.cos(angle) * radius;
      leaf.position.z = Math.sin(angle) * radius;
      leaf.rotation.y = angle;
      leaf.rotation.x = -0.4 + Math.random() * 0.3;
      leaf.rotation.z = (Math.random() - 0.5) * 0.4;
      leaf.scale.setScalar(0.01);
      this.leaves.push(leaf);
      this.group.add(leaf);
    }
  }

  private createFlower(): void {
    this.flowerGroup = new THREE.Group();
    this.flowerGroup.position.y = 0.5 + this.stemHeight;
    for (let i = 0; i < this.petalCount; i++) {
      const angle = (i / this.petalCount) * Math.PI * 2;
      const geom = new THREE.SphereGeometry(1, 12, 8);
      geom.scale(this.petalRadius, this.petalRadius * 0.3, this.petalRadius * 1.2);
      const mat = new THREE.MeshBasicMaterial({
        color: this.flowerColor,
        transparent: true,
        opacity: 0.9
      });
      const petal = new THREE.Mesh(geom, mat);
      petal.position.x = Math.cos(angle) * this.petalRadius * 0.6;
      petal.position.z = Math.sin(angle) * this.petalRadius * 0.6;
      petal.rotation.y = angle;
      petal.scale.setScalar(0.01);
      this.flowerPetals.push(petal);
      this.flowerGroup.add(petal);
    }
    this.group.add(this.flowerGroup);
  }

  update(delta: number): void {
    if (this.isMoving) {
      this.moveTime += delta;
      const t = Math.min(1, this.moveTime / this.moveDuration);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.group.position.lerpVectors(this.moveStartPos, this.moveEndPos, ease);
      this.position.copy(this.group.position);
      if (t >= 1) {
        this.isMoving = false;
        this.targetPosition.copy(this.moveEndPos);
      }
    }

    this.pulsePhase += this.pulseSpeed * delta;
    if (this.flowerGroup) {
      this.flowerGroup.rotation.y += this.rotationSpeed;
      const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
      this.flowerGroup.scale.setScalar(pulseScale);
    }

    this.updateGrowth(delta);
  }

  private updateGrowth(delta: number): void {
    const growthSpeed = 0.8;

    if (this.growthStage === 'root') {
      this.growthProgress += delta * growthSpeed;
      if (this.roots.length === 0 && this.growthProgress > 0.1) {
        this.createRoots();
      }
      if (this.growthProgress >= 1) {
        this.growthStage = 'stem';
        this.growthProgress = 0;
      }
    } else if (this.growthStage === 'stem') {
      this.growthProgress += delta * growthSpeed;
      if (!this.stemMesh && this.growthProgress > 0.05) {
        this.createStem();
      }
      if (this.stemMesh) {
        const t = Math.min(1, this.growthProgress);
        this.stemMesh.scale.y = t;
        this.stemMesh.position.y = 0.5 + (this.stemHeight * t) / 2;
        this.currentStemT = t;
        const stemColor = STEM_START_COLOR.clone().lerp(STEM_END_COLOR, t);
        if (this.stemMaterial) {
          this.stemMaterial.color.copy(stemColor);
        }
      }
      if (this.growthProgress >= 1) {
        this.growthStage = 'leaves';
        this.growthProgress = 0;
      }
    } else if (this.growthStage === 'leaves') {
      this.growthProgress += delta * growthSpeed;
      if (this.leaves.length === 0 && this.growthProgress > 0.05) {
        this.createLeaves();
      }
      if (this.leaves.length > 0) {
        const t = Math.min(1, this.growthProgress);
        this.leaves.forEach((leaf, i) => {
          const offset = i / this.leaves.length * 0.3;
          const leafT = Math.max(0, Math.min(1, (t - offset) / (1 - offset)));
          leaf.scale.setScalar(leafT);
        });
      }
      if (this.growthProgress >= 1) {
        this.growthStage = 'flower';
        this.growthProgress = 0;
      }
    } else if (this.growthStage === 'flower') {
      this.growthProgress += delta * growthSpeed;
      if (!this.flowerGroup && this.growthProgress > 0.05) {
        this.createFlower();
      }
      if (this.flowerPetals.length > 0) {
        const t = Math.min(1, this.growthProgress);
        this.flowerPetals.forEach((petal, i) => {
          const offset = i / this.flowerPetals.length * 0.3;
          const petalT = Math.max(0, Math.min(1, (t - offset) / (1 - offset)));
          petal.scale.setScalar(petalT);
        });
      }
      if (this.growthProgress >= 1) {
        this.growthStage = 'complete';
        this.growthProgress = 1;
      }
    }
  }

  moveTo(target: THREE.Vector3, duration: number = 0.5): void {
    this.moveStartPos.copy(this.group.position);
    this.moveEndPos.copy(target);
    this.targetPosition.copy(target);
    this.moveTime = 0;
    this.moveDuration = duration;
    this.isMoving = true;
  }

  getFlowerWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    if (this.flowerGroup) {
      this.flowerGroup.getWorldPosition(pos);
    } else {
      this.group.getWorldPosition(pos);
      pos.y += 0.5 + this.stemHeight * this.currentStemT;
    }
    return pos;
  }

  isFullyGrown(): boolean {
    return this.growthStage === 'complete';
  }

  dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      } else if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.roots = [];
    this.leaves = [];
    this.flowerPetals = [];
    this.seedMesh = null;
    this.stemMesh = null;
    this.stemMaterial = null;
    this.flowerGroup = null;
  }
}
