import * as THREE from 'three';

interface TreeData {
  group: THREE.Group;
  trunk: THREE.Mesh;
  foliage: THREE.Mesh;
  basePosition: THREE.Vector3;
  trunkHeight: number;
  foliageHeight: number;
  foliageBottomRadius: number;
  currentSwingX: number;
  currentSwingZ: number;
  targetSwingX: number;
  targetSwingZ: number;
  randomRotation: number;
}

export class Forest {
  public readonly group: THREE.Group;
  private trees: TreeData[] = [];
  private readonly treeCount = 40;
  private readonly maxSwingAngle = 15 * Math.PI / 180;
  private readonly swingSmoothing = 0.05;

  constructor() {
    this.group = new THREE.Group();
    this.createTrees();
  }

  private createTrees(): void {
    const trunkColor = new THREE.Color(0x4a3728);
    const foliageColorStart = new THREE.Color(0x2d5a27);
    const foliageColorEnd = new THREE.Color(0x5b8c3a);

    for (let i = 0; i < this.treeCount; i++) {
      const treeGroup = new THREE.Group();

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const basePos = new THREE.Vector3(x, 0, z);
      treeGroup.position.copy(basePos);

      const trunkHeight = 1.0 + Math.random() * 1.5;
      const trunkRadius = 0.1 + Math.random() * 0.1;
      const trunkGeometry = new THREE.CylinderGeometry(
        trunkRadius * 0.7,
        trunkRadius,
        trunkHeight,
        8
      );
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: trunkColor });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = trunkHeight / 2;
      treeGroup.add(trunk);

      const foliageHeight = 1.5 + Math.random() * 2.0;
      const foliageBottomRadius = 0.8 + Math.random() * 0.7;
      const foliageGeometry = new THREE.ConeGeometry(
        foliageBottomRadius,
        foliageHeight,
        12
      );
      const foliageColor = foliageColorStart.clone().lerp(
        foliageColorEnd,
        Math.random()
      );
      const foliageMaterial = new THREE.MeshLambertMaterial({ color: foliageColor });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = trunkHeight + foliageHeight / 2;
      treeGroup.add(foliage);

      const randomRotation = Math.random() * Math.PI * 2;
      treeGroup.rotation.y = randomRotation;

      this.group.add(treeGroup);

      this.trees.push({
        group: treeGroup,
        trunk,
        foliage,
        basePosition: basePos,
        trunkHeight,
        foliageHeight,
        foliageBottomRadius,
        currentSwingX: 0,
        currentSwingZ: 0,
        targetSwingX: 0,
        targetSwingZ: 0,
        randomRotation
      });
    }
  }

  public getTreeFoliagePositions(): { position: THREE.Vector3; radius: number; height: number }[] {
    return this.trees.map(tree => ({
      position: tree.basePosition.clone().add(new THREE.Vector3(0, tree.trunkHeight + tree.foliageHeight / 2, 0)),
      radius: tree.foliageBottomRadius,
      height: tree.foliageHeight
    }));
  }

  public update(mouseWorld: THREE.Vector3): void {
    for (let i = 0; i < this.trees.length; i++) {
      const tree = this.trees[i];

      const dx = mouseWorld.x - tree.basePosition.x;
      const dz = mouseWorld.z - tree.basePosition.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const maxDistance = 20;
      const intensity = Math.max(0, 1 - distance / maxDistance);

      const directionX = distance > 0.001 ? dx / distance : 0;
      const directionZ = distance > 0.001 ? dz / distance : 0;

      tree.targetSwingX = -directionZ * this.maxSwingAngle * intensity;
      tree.targetSwingZ = directionX * this.maxSwingAngle * intensity;

      tree.currentSwingX += (tree.targetSwingX - tree.currentSwingX) * this.swingSmoothing;
      tree.currentSwingZ += (tree.targetSwingZ - tree.currentSwingZ) * this.swingSmoothing;

      tree.foliage.rotation.x = tree.currentSwingX;
      tree.foliage.rotation.z = tree.currentSwingZ;

      tree.foliage.position.set(
        Math.sin(tree.currentSwingZ) * (tree.foliageHeight / 2),
        tree.trunkHeight + tree.foliageHeight / 2,
        Math.sin(tree.currentSwingX) * (tree.foliageHeight / 2)
      );
    }
  }
}
