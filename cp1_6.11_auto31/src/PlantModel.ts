import * as THREE from 'three';

export interface PlantParams {
  light: number;
  water: number;
  temperature: number;
}

interface BranchData {
  group: THREE.Group;
  targetHeight: number;
  currentHeight: number;
  layer: number;
  angle: number;
  baseRotationX: number;
  baseRotationZ: number;
}

interface LeafData {
  mesh: THREE.Mesh;
  baseScale: number;
  baseRotationX: number;
  layer: number;
  side: number;
}

export class PlantModel {
  public group: THREE.Group;
  private branches: BranchData[] = [];
  private leaves: LeafData[] = [];
  private seedMesh: THREE.Mesh;
  private isSown: boolean = false;
  private maxHeight: number = 3;
  private leafMaterial: THREE.MeshStandardMaterial;
  private branchMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    this.branchMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.9,
      metalness: 0.1,
    });

    this.leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b5e20,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    this.seedMesh = this.createSeed();
    this.group.add(this.seedMesh);
  }

  private createSeed(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.08, 8, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4e342e,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -0.05;
    mesh.scale.set(1, 0.6, 1);
    return mesh;
  }

  public sow(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isSown) {
        resolve();
        return;
      }
      this.isSown = true;

      const startY = this.seedMesh.position.y;
      const startTime = performance.now();
      const duration = 1000;

      const animateSeed = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeInOutCubic(progress);

        this.seedMesh.position.y = startY + eased * 0.15;
        this.seedMesh.scale.setScalar(1 + eased * 0.3);
        this.seedMesh.rotation.z = eased * Math.PI * 0.2;

        if (progress < 1) {
          requestAnimationFrame(animateSeed);
        } else {
          this.createMainBranch();
          resolve();
        }
      };
      animateSeed();
    });
  }

  private createMainBranch(): void {
    const branchGroup = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(0.04, 0.06, this.maxHeight, 8);
    geometry.translate(0, this.maxHeight / 2, 0);
    const mesh = new THREE.Mesh(geometry, this.branchMaterial);
    branchGroup.add(mesh);
    branchGroup.position.y = 0;
    branchGroup.scale.y = 0;

    this.group.add(branchGroup);
    this.branches.push({
      group: branchGroup,
      targetHeight: this.maxHeight,
      currentHeight: 0,
      layer: 0,
      angle: 0,
      baseRotationX: 0,
      baseRotationZ: 0,
    });
  }

  public addBranch(parentBranch: BranchData, heightRatio: number, angle: number, layer: number): BranchData {
    const height = this.maxHeight * (1 - layer * 0.2);
    const branchGroup = new THREE.Group();
    const geometry = new THREE.CylinderGeometry(0.02, 0.03, height, 6);
    geometry.translate(0, height / 2, 0);
    const mesh = new THREE.Mesh(geometry, this.branchMaterial);
    branchGroup.add(mesh);

    const parentHeight = parentBranch.targetHeight * heightRatio;
    branchGroup.position.set(0, parentHeight, 0);
    branchGroup.rotation.z = angle;
    branchGroup.rotation.x = (Math.random() - 0.5) * 0.3;
    branchGroup.scale.y = 0;

    parentBranch.group.add(branchGroup);

    const data: BranchData = {
      group: branchGroup,
      targetHeight: height,
      currentHeight: 0,
      layer,
      angle,
      baseRotationX: branchGroup.rotation.x,
      baseRotationZ: branchGroup.rotation.z,
    };
    this.branches.push(data);
    return data;
  }

  public addLeaf(branch: BranchData, heightRatio: number, side: number): LeafData {
    const leafGroup = new THREE.Group();
    const geometry = new THREE.PlaneGeometry(0.3, 0.15, 2, 2);
    geometry.translate(0.15, 0, 0);
    const mesh = new THREE.Mesh(geometry, this.leafMaterial.clone() as THREE.MeshStandardMaterial);
    leafGroup.add(mesh);

    const height = branch.targetHeight * heightRatio;
    leafGroup.position.set(0, height, 0.02);
    leafGroup.rotation.y = side > 0 ? -0.5 : 0.5;
    leafGroup.rotation.z = side > 0 ? -0.3 : 0.3;
    leafGroup.scale.set(0, 0, 0);

    branch.group.add(leafGroup);

    const data: LeafData = {
      mesh,
      baseScale: 1,
      baseRotationX: 0,
      layer: branch.layer,
      side,
    };
    this.leaves.push(data);
    return data;
  }

  public getBranches(): BranchData[] {
    return this.branches;
  }

  public getLeaves(): LeafData[] {
    return this.leaves;
  }

  public getMainBranch(): BranchData | undefined {
    return this.branches.find(b => b.layer === 0);
  }

  public updateColors(params: PlantParams): void {
    const lightFactor = params.light / 100;
    const lowColor = new THREE.Color(0x1b5e20);
    const highColor = new THREE.Color(0xcddc39);

    this.leaves.forEach((leaf) => {
      const material = leaf.mesh.material as THREE.MeshStandardMaterial;
      const color = lowColor.clone().lerp(highColor, lightFactor);
      material.color.copy(color);
    });
  }

  public updateLeafWaterEffect(params: PlantParams): void {
    const waterFactor = params.water / 100;
    const hasWaterDrops = params.water > 70;

    this.leaves.forEach((leaf) => {
      const material = leaf.mesh.material as THREE.MeshStandardMaterial;
      if (hasWaterDrops) {
        material.roughness = 0.3;
        material.metalness = 0.2;
        material.envMapIntensity = 0.8;
      } else {
        material.roughness = 0.7 - waterFactor * 0.3;
        material.metalness = 0.0;
        material.envMapIntensity = 0;
      }
      material.needsUpdate = true;
    });
  }

  public getMaxHeight(): number {
    return this.maxHeight;
  }

  public getIsSown(): boolean {
    return this.isSown;
  }

  public reset(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }
    this.branches = [];
    this.leaves = [];
    this.isSown = false;
    this.seedMesh = this.createSeed();
    this.group.add(this.seedMesh);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
