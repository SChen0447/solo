import * as THREE from 'three';

export interface BranchInfo {
  length: number;
  branchCount: number;
  growthRate: number;
}

interface CrystalBranch {
  id: number;
  parentId: number | null;
  startPos: THREE.Vector3;
  direction: THREE.Vector3;
  length: number;
  maxLength: number;
  growthRate: number;
  depth: number;
  frameCounter: number;
  vertices: THREE.Vector3[];
  mesh: THREE.Mesh | null;
  glowMesh: THREE.Mesh | null;
  isHighlighted: boolean;
  isMain: boolean;
  children: number[];
}

export class CrystalGrowthSystem {
  private scene: THREE.Scene;
  private branches: Map<number, CrystalBranch> = new Map();
  private nextBranchId = 0;
  private temperature: number = -15;
  private humidity: number = 80;
  private basePlate!: THREE.Mesh;
  private nucleationCores: THREE.Points | null = null;
  private frameCount = 0;
  private maxBranches = 50;
  private maxVerticesPerBranch = 500;
  private jitterAmount = 0.02;
  private selectedBranchId: number | null = null;
  private branchGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.branchGroup = new THREE.Group();
    this.scene.add(this.branchGroup);
  }

  public init(): void {
    this.createBasePlate();
    this.createNucleationCores();
    this.spawnInitialBranches();
  }

  private createBasePlate(): void {
    const geometry = new THREE.CylinderGeometry(3, 3, 0.1, 6);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6f0,
      transparent: true,
      opacity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.basePlate = new THREE.Mesh(geometry, material);
    this.basePlate.position.y = -0.05;
    this.basePlate.rotation.y = Math.PI / 6;
    this.scene.add(this.basePlate);
  }

  private createNucleationCores(): void {
    const positions: number[] = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 2.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, 0.01, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      sizeAttenuation: true
    });

    this.nucleationCores = new THREE.Points(geometry, material);
    this.scene.add(this.nucleationCores);
  }

  private spawnInitialBranches(): void {
    const coreCount = Math.min(8, this.maxBranches);
    for (let i = 0; i < coreCount; i++) {
      const angle = (i / coreCount) * Math.PI * 2 + Math.random() * 0.2;
      const radius = Math.random() * 1.5;
      const startX = Math.cos(angle) * radius;
      const startZ = Math.sin(angle) * radius;
      const startPos = new THREE.Vector3(startX, 0, startZ);

      for (let d = 0; d < 6; d++) {
        if (this.branches.size >= this.maxBranches) break;
        const dirAngle = (d / 6) * Math.PI * 2;
        const direction = new THREE.Vector3(
          Math.cos(dirAngle),
          (Math.random() - 0.5) * 0.1,
          Math.sin(dirAngle)
        ).normalize();

        this.createBranch(startPos, direction, 0, null, true);
      }
    }
  }

  private createBranch(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    depth: number,
    parentId: number | null,
    isMain: boolean
  ): number | null {
    if (this.branches.size >= this.maxBranches) return null;

    const id = this.nextBranchId++;
    const baseGrowthRate = 0.1 / 10;
    const humidityFactor = 1 - ((100 - this.humidity) / 10) * 0.15;
    const growthRate = baseGrowthRate * Math.max(0.2, humidityFactor);

    const branch: CrystalBranch = {
      id,
      parentId,
      startPos: startPos.clone(),
      direction: direction.clone().normalize(),
      length: 0,
      maxLength: isMain ? 3 + Math.random() * 1.5 : 1.2 + Math.random() * 0.5,
      growthRate,
      depth,
      frameCounter: 0,
      vertices: [startPos.clone()],
      mesh: null,
      glowMesh: null,
      isHighlighted: false,
      isMain,
      children: []
    };

    this.createBranchMesh(branch);
    this.branches.set(id, branch);

    if (parentId !== null) {
      const parent = this.branches.get(parentId);
      if (parent) {
        parent.children.push(id);
      }
    }

    return id;
  }

  private createBranchMesh(branch: CrystalBranch): void {
    const geometry = new THREE.CylinderGeometry(0.04, 0.02, 0.1, 6);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xeaf5ff,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.05,
      emissive: 0x4488aa,
      emissiveIntensity: 0.08
    });

    branch.mesh = new THREE.Mesh(geometry, material);
    branch.mesh.userData.branchId = branch.id;
    this.updateBranchMeshTransform(branch);
    this.branchGroup.add(branch.mesh);

    const glowGeometry = new THREE.CylinderGeometry(0.08, 0.05, 0.12, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff99,
      transparent: true,
      opacity: 0
    });
    branch.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    branch.glowMesh.userData.branchId = branch.id;
    this.branchGroup.add(branch.glowMesh);
  }

  private updateBranchMeshTransform(branch: CrystalBranch): void {
    if (!branch.mesh || branch.vertices.length < 2) return;

    const start = branch.vertices[0];
    const end = branch.vertices[branch.vertices.length - 1];
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const length = start.distanceTo(end);

    branch.mesh.position.copy(mid);
    branch.mesh.scale.set(1, Math.max(0.1, length * 10), 1);

    const dir = end.clone().sub(start).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    branch.mesh.quaternion.copy(quaternion);

    if (branch.glowMesh) {
      branch.glowMesh.position.copy(mid);
      branch.glowMesh.scale.set(1, Math.max(0.1, length * 10), 1);
      branch.glowMesh.quaternion.copy(quaternion);
    }
  }

  public setTemperature(temp: number): void {
    this.temperature = temp;
    const humidityFactor = 1 - ((100 - this.humidity) / 10) * 0.15;
    const baseGrowthRate = 0.1 / 10;
    const newGrowthRate = baseGrowthRate * Math.max(0.2, humidityFactor);
    this.branches.forEach(branch => {
      branch.growthRate = newGrowthRate;
    });
  }

  public setHumidity(hum: number): void {
    this.humidity = hum;
    const humidityFactor = 1 - ((100 - this.humidity) / 10) * 0.15;
    const baseGrowthRate = 0.1 / 10;
    const newGrowthRate = baseGrowthRate * Math.max(0.2, humidityFactor);
    this.branches.forEach(branch => {
      branch.growthRate = newGrowthRate;
    });
  }

  public update(): void {
    this.frameCount++;

    this.branches.forEach(branch => {
      this.growBranch(branch);

      if (branch.isMain && branch.frameCounter % 20 === 0 && branch.length > 0.3) {
        this.trySpawnSideBranches(branch);
      }
    });
  }

  private growBranch(branch: CrystalBranch): void {
    if (branch.length >= branch.maxLength) return;

    branch.frameCounter++;

    if (branch.frameCounter % 10 !== 0) return;

    const growthAmount = branch.growthRate;
    branch.length = Math.min(branch.length + growthAmount, branch.maxLength);

    const lastVertex = branch.vertices[branch.vertices.length - 1];
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * this.jitterAmount,
      (Math.random() - 0.5) * this.jitterAmount * 0.5,
      (Math.random() - 0.5) * this.jitterAmount
    );

    const newPos = lastVertex
      .clone()
      .add(branch.direction.clone().multiplyScalar(growthAmount))
      .add(jitter);

    if (branch.vertices.length < this.maxVerticesPerBranch) {
      branch.vertices.push(newPos);
    } else {
      branch.vertices[branch.vertices.length - 1] = newPos;
    }

    this.updateBranchMeshTransform(branch);
  }

  private trySpawnSideBranches(branch: CrystalBranch): void {
    const tempDiff = this.temperature - (-15);
    const densityReduction = (tempDiff / 5) * 0.2;
    const spawnChance = Math.max(0.2, 1 - densityReduction);

    if (Math.random() > spawnChance) return;
    if (branch.depth >= 2) return;

    const vertexCount = branch.vertices.length;
    if (vertexCount < 3) return;

    const spawnIndex = Math.floor(Math.random() * (vertexCount - 2)) + 1;
    const spawnPos = branch.vertices[spawnIndex];

    const perp = new THREE.Vector3(
      -branch.direction.z,
      0,
      branch.direction.x
    ).normalize();

    for (const side of [-1, 1]) {
      if (this.branches.size >= this.maxBranches) break;

      const sideDir = perp.clone().multiplyScalar(side);
      const angleOffset = (60 * Math.PI) / 180;
      const branchDir = branch.direction
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset * side);

      const finalDir = branchDir
        .clone()
        .add(sideDir.multiplyScalar(0.3))
        .normalize();

      const childId = this.createBranch(
        spawnPos,
        finalDir,
        branch.depth + 1,
        branch.id,
        false
      );

      if (childId !== null) {
        const child = this.branches.get(childId);
        if (child) {
          child.maxLength = branch.maxLength * 0.4;
        }
      }
    }
  }

  public highlightBranch(branchId: number | null): void {
    if (this.selectedBranchId !== null && this.selectedBranchId !== branchId) {
      const prev = this.branches.get(this.selectedBranchId);
      if (prev && prev.glowMesh) {
        (prev.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
        prev.isHighlighted = false;
      }
    }

    this.selectedBranchId = branchId;

    if (branchId !== null) {
      const branch = this.branches.get(branchId);
      if (branch && branch.glowMesh) {
        (branch.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
        branch.isHighlighted = true;
      }
    }
  }

  public getBranchInfo(branchId: number): BranchInfo | null {
    const branch = this.branches.get(branchId);
    if (!branch) return null;

    return {
      length: branch.length,
      branchCount: branch.children.length,
      growthRate: branch.growthRate
    };
  }

  public getTotalBranches(): number {
    return this.branches.size;
  }

  public getAverageGrowthRate(): number {
    if (this.branches.size === 0) return 0;
    let total = 0;
    this.branches.forEach(b => {
      total += b.growthRate;
    });
    return total / this.branches.size;
  }

  public getBranchMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.branches.forEach(b => {
      if (b.mesh) meshes.push(b.mesh);
    });
    return meshes;
  }
}
