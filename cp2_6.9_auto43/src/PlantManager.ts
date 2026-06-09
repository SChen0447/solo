import * as THREE from 'three';

interface StemSegment {
  mesh: THREE.Mesh;
  initialQuaternion: THREE.Quaternion;
  targetQuaternion: THREE.Quaternion;
  currentQuaternion: THREE.Quaternion;
  index: number;
  isBranch: boolean;
  branchParentIndex: number;
}

interface Leaf {
  mesh: THREE.Mesh;
  initialQuaternion: THREE.Quaternion;
  targetQuaternion: THREE.Quaternion;
  currentQuaternion: THREE.Quaternion;
  parentSegmentIndex: number;
  offset: THREE.Vector3;
}

export class PlantManager {
  private scene: THREE.Scene;
  private stemSegments: StemSegment[] = [];
  private leaves: Leaf[] = [];
  private plantGroup: THREE.Group;
  private readonly SEGMENT_LENGTH = 8;
  private readonly SEGMENT_RADIUS = 0.4;
  private readonly SEGMENT_COUNT = 12;
  private readonly LEAF_RADIUS = 1.5;
  private isResetting = false;
  private resetStartTime = 0;
  private resetDuration = 1000;
  private initialMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);
    this.createPlant();
  }

  private createPlant() {
    const stemGeometry = new THREE.CylinderGeometry(
      this.SEGMENT_RADIUS,
      this.SEGMENT_RADIUS,
      this.SEGMENT_LENGTH,
      16
    );

    const stemMaterial = new THREE.MeshStandardMaterial({
      color: 0x90ee90,
      transparent: true,
      opacity: 0.85,
      roughness: 0.3,
      metalness: 0.1
    });

    const leafGeometry = new THREE.CircleGeometry(this.LEAF_RADIUS, 32);
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x228b22,
      transparent: true,
      opacity: 0.7,
      roughness: 0.6,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const branchMaterial = stemMaterial.clone();

    this.initialMaterials = [stemMaterial, leafMaterial, branchMaterial];

    let accumulatedPosition = new THREE.Vector3(0, 0, 0);
    const segmentHeight = this.SEGMENT_LENGTH;

    for (let i = 0; i < this.SEGMENT_COUNT; i++) {
      const segment = new THREE.Mesh(stemGeometry, stemMaterial.clone());
      const yPos = i * segmentHeight + segmentHeight / 2;
      segment.position.set(0, yPos, 0);
      segment.castShadow = true;
      segment.receiveShadow = true;

      const initialQuat = new THREE.Quaternion();
      segment.quaternion.copy(initialQuat);

      this.stemSegments.push({
        mesh: segment,
        initialQuaternion: initialQuat.clone(),
        targetQuaternion: initialQuat.clone(),
        currentQuaternion: initialQuat.clone(),
        index: i,
        isBranch: false,
        branchParentIndex: -1
      });

      this.plantGroup.add(segment);

      if (i >= 2 && i < this.SEGMENT_COUNT - 1 && (i % 3 === 0)) {
        this.createBranch(i, stemGeometry, branchMaterial, leafGeometry, leafMaterial);
      }

      if (i >= 1 && (i % 2 === 1)) {
        this.createLeaf(i, leafGeometry, leafMaterial, new THREE.Vector3(this.SEGMENT_RADIUS + 0.3, 0, 0));
      }
    }

    this.createLeaf(
      this.SEGMENT_COUNT - 1,
      leafGeometry,
      leafMaterial,
      new THREE.Vector3(0, this.SEGMENT_LENGTH / 2 + 0.5, 0)
    );
  }

  private createBranch(
    parentIndex: number,
    stemGeometry: THREE.BufferGeometry,
    material: THREE.Material,
    leafGeometry: THREE.BufferGeometry,
    leafMaterial: THREE.Material
  ) {
    const parentSegment = this.stemSegments[parentIndex];
    const branchDirections = [
      new THREE.Vector3(1, 0.3, 0).normalize(),
      new THREE.Vector3(-0.7, 0.3, 0.7).normalize(),
      new THREE.Vector3(0, 0.3, -1).normalize()
    ];

    const dirIndex = parentIndex % branchDirections.length;
    const baseDir = branchDirections[dirIndex];

    const branchCount = 2 + (parentIndex % 2);

    for (let b = 0; b < branchCount; b++) {
      const branch = new THREE.Mesh(stemGeometry, material.clone());
      const parentPos = parentSegment.mesh.position.clone();
      const angleOffset = (b - (branchCount - 1) / 2) * 0.3;
      const branchDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset);

      const segmentHeight = this.SEGMENT_LENGTH * 0.5;
      const startY = parentPos.y + (b === 0 ? 0 : segmentHeight * 0.8);

      branch.position.copy(parentPos);
      branch.position.y = startY + segmentHeight / 2;
      branch.castShadow = true;
      branch.receiveShadow = true;

      const branchQuat = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      branchQuat.setFromUnitVectors(up, branchDir);
      branch.quaternion.copy(branchQuat);
      branch.scale.setScalar(0.6);

      const globalOffset = branchDir.clone().multiplyScalar(segmentHeight / 2);
      branch.position.add(globalOffset);

      const initialQuat = branchQuat.clone();

      this.stemSegments.push({
        mesh: branch,
        initialQuaternion: initialQuat,
        targetQuaternion: initialQuat.clone(),
        currentQuaternion: initialQuat.clone(),
        index: this.stemSegments.length,
        isBranch: true,
        branchParentIndex: parentIndex
      });

      this.plantGroup.add(branch);

      if (b === 0) {
        this.createLeafOnBranch(
          this.stemSegments.length - 1,
          leafGeometry,
          leafMaterial,
          new THREE.Vector3(0, segmentHeight / 2 + 0.3, 0)
        );
      }
    }
  }

  private createLeaf(
    parentSegmentIndex: number,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    offset: THREE.Vector3
  ) {
    const leaf = new THREE.Mesh(geometry, material.clone());
    const parent = this.stemSegments[parentSegmentIndex];

    leaf.position.copy(parent.mesh.position).add(offset);
    leaf.rotation.x = -Math.PI / 2;
    leaf.castShadow = true;

    const initialQuat = leaf.quaternion.clone();

    this.leaves.push({
      mesh: leaf,
      initialQuaternion: initialQuat,
      targetQuaternion: initialQuat.clone(),
      currentQuaternion: initialQuat.clone(),
      parentSegmentIndex,
      offset: offset.clone()
    });

    this.plantGroup.add(leaf);
  }

  private createLeafOnBranch(
    branchIndex: number,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    localOffset: THREE.Vector3
  ) {
    const leaf = new THREE.Mesh(geometry, material.clone());
    const branch = this.stemSegments[branchIndex];

    const worldOffset = localOffset.clone().applyQuaternion(branch.currentQuaternion);
    leaf.position.copy(branch.mesh.position).add(worldOffset);
    leaf.rotation.x = -Math.PI / 2;
    leaf.castShadow = true;
    leaf.scale.setScalar(0.7);

    const initialQuat = leaf.quaternion.clone();

    this.leaves.push({
      mesh: leaf,
      initialQuaternion: initialQuat,
      targetQuaternion: initialQuat.clone(),
      currentQuaternion: initialQuat.clone(),
      parentSegmentIndex: branchIndex,
      offset: localOffset.clone()
    });

    this.plantGroup.add(leaf);
  }

  public updateDirection(
    lightPos: THREE.Vector3,
    intensity: number,
    speed: number,
    deltaTime: number
  ) {
    if (this.isResetting) {
      this.updateResetAnimation();
      return;
    }

    const plantBase = this.plantGroup.position.clone();

    for (let i = 0; i < this.stemSegments.length; i++) {
      const segment = this.stemSegments[i];

      if (i === 0 && !segment.isBranch) {
        segment.targetQuaternion.copy(segment.initialQuaternion);
      } else {
        const segmentWorldPos = new THREE.Vector3();
        segment.mesh.getWorldPosition(segmentWorldPos);

        const toLight = new THREE.Vector3().subVectors(lightPos, segmentWorldPos);
        const distance = toLight.length();
        toLight.normalize();

        const maxDistance = 30;
        const distanceFactor = Math.max(0.1, 1 - distance / maxDistance);
        const nonlinearFactor = Math.pow(distanceFactor, 0.7);

        const influence = segment.isBranch ? 0.7 : 1.0;
        const indexFactor = segment.isBranch ? 1.0 : Math.min(1.0, i / 4);

        const up = new THREE.Vector3(0, 1, 0);
        const targetDir = new THREE.Vector3();
        targetDir.lerpVectors(up, toLight, nonlinearFactor * intensity * influence * indexFactor * 0.6);
        targetDir.normalize();

        const targetQuat = new THREE.Quaternion();
        const currentUp = up.clone().applyQuaternion(segment.currentQuaternion);
        targetQuat.setFromUnitVectors(currentUp.normalize(), targetDir);
        targetQuat.multiply(segment.currentQuaternion);
        segment.targetQuaternion.copy(targetQuat);
      }

      const springStrength = 4.0 * speed;
      const damping = 0.85;
      const lerpFactor = 1 - Math.pow(1 - Math.min(1, springStrength * deltaTime), damping);
      segment.currentQuaternion.slerp(segment.targetQuaternion, lerpFactor);
      segment.mesh.quaternion.copy(segment.currentQuaternion);
    }

    this.updateLeafPositions();

    for (const leaf of this.leaves) {
      const leafWorldPos = new THREE.Vector3();
      leaf.mesh.getWorldPosition(leafWorldPos);

      const toLight = new THREE.Vector3().subVectors(lightPos, leafWorldPos);
      const distance = toLight.length();
      toLight.normalize();

      const maxDistance = 30;
      const distanceFactor = Math.max(0.1, 1 - distance / maxDistance);
      const nonlinearFactor = Math.pow(distanceFactor, 0.6);

      const normalUp = new THREE.Vector3(0, 0, 1);
      const targetNormal = new THREE.Vector3();
      targetNormal.lerpVectors(normalUp, toLight, nonlinearFactor * intensity * 0.8);
      targetNormal.normalize();

      const targetQuat = new THREE.Quaternion();
      const currentNormal = normalUp.clone().applyQuaternion(leaf.currentQuaternion);
      targetQuat.setFromUnitVectors(currentNormal.normalize(), targetNormal);
      targetQuat.multiply(leaf.currentQuaternion);
      leaf.targetQuaternion.copy(targetQuat);

      const springStrength = 5.0 * speed;
      const damping = 0.8;
      const lerpFactor = 1 - Math.pow(1 - Math.min(1, springStrength * deltaTime), damping);
      leaf.currentQuaternion.slerp(leaf.targetQuaternion, lerpFactor);
      leaf.mesh.quaternion.copy(leaf.currentQuaternion);
    }
  }

  private updateLeafPositions() {
    for (const leaf of this.leaves) {
      const parent = this.stemSegments[leaf.parentSegmentIndex];
      if (parent) {
        const worldOffset = leaf.offset.clone().applyQuaternion(parent.currentQuaternion);
        if (leaf.parentSegmentIndex < this.SEGMENT_COUNT && !parent.isBranch) {
          leaf.mesh.position.copy(parent.mesh.position).add(leaf.offset);
        } else {
          leaf.mesh.position.copy(parent.mesh.position).add(worldOffset);
        }
      }
    }
  }

  public resetPlant() {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetStartTime = performance.now();
  }

  private updateResetAnimation() {
    const elapsed = performance.now() - this.resetStartTime;
    const progress = Math.min(1, elapsed / this.resetDuration);
    const eased = 1 - Math.pow(1 - progress, 2);

    const opacity = 0.3 + 0.7 * (1 - eased);

    this.stemSegments.forEach((segment) => {
      segment.currentQuaternion.slerp(segment.initialQuaternion, eased);
      segment.mesh.quaternion.copy(segment.currentQuaternion);
      const mat = segment.mesh.material as THREE.MeshStandardMaterial;
      if (mat.transparent !== undefined) {
        mat.opacity = opacity * (segment.isBranch ? 0.85 : 0.85);
      }
    });

    this.leaves.forEach((leaf) => {
      leaf.currentQuaternion.slerp(leaf.initialQuaternion, eased);
      leaf.mesh.quaternion.copy(leaf.currentQuaternion);
      const mat = leaf.mesh.material as THREE.MeshStandardMaterial;
      if (mat.transparent !== undefined) {
        mat.opacity = opacity * 0.7;
      }
    });

    this.updateLeafPositions();

    if (progress >= 1) {
      this.isResetting = false;
      this.stemSegments.forEach((segment) => {
        segment.currentQuaternion.copy(segment.initialQuaternion);
        segment.targetQuaternion.copy(segment.initialQuaternion);
        segment.mesh.quaternion.copy(segment.initialQuaternion);
        const mat = segment.mesh.material as THREE.MeshStandardMaterial;
        if (mat.transparent !== undefined) {
          mat.opacity = 0.85;
        }
      });

      this.leaves.forEach((leaf) => {
        leaf.currentQuaternion.copy(leaf.initialQuaternion);
        leaf.targetQuaternion.copy(leaf.initialQuaternion);
        leaf.mesh.quaternion.copy(leaf.initialQuaternion);
        const mat = leaf.mesh.material as THREE.MeshStandardMaterial;
        if (mat.transparent !== undefined) {
          mat.opacity = 0.7;
        }
      });
    }
  }

  public dispose() {
    this.scene.remove(this.plantGroup);
    this.stemSegments.forEach((s) => {
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    });
    this.leaves.forEach((l) => {
      l.mesh.geometry.dispose();
      (l.mesh.material as THREE.Material).dispose();
    });
  }
}
