import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

interface Segment {
  position: THREE.Vector3;
  color: THREE.Color;
  radius: number;
  targetRadius: number;
}

interface Branch {
  basePosition: THREE.Vector3;
  direction: THREE.Vector3;
  segments: Segment[];
  meshes: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
  maxSegments: number;
  branchCount: number;
  targetBranchCount: number;
  isBranching: boolean;
  growthTimer: number;
  bleachingTimer: number;
  isBleaching: boolean;
  bleachingPhase: 'in' | 'hold' | 'out' | 'none';
}

export class CoralManager {
  private scene: THREE.Scene;
  private branches: Branch[] = [];
  private particleSystem: ParticleSystem;
  private group: THREE.Group;

  private light: number = 60;
  private flow: number = 3;
  private nutrients: number = 30;

  private prevLight: number = 60;
  private prevFlow: number = 3;
  private prevNutrients: number = 30;

  private baseHealthyColor = new THREE.Color(0xD4A574);
  private baseDeclineColor = new THREE.Color(0x8B4513);
  private algaeColor = new THREE.Color(0x5B8C5A);

  private elapsed: number = 0;
  private growthInterval: number = 5;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.initCorals();
  }

  private initCorals(): void {
    const coralCount = 5 + Math.floor(Math.random() * 3);

    for (let i = 0; i < coralCount; i++) {
      const angle = (i / coralCount) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 0.5 + Math.random() * 1.5;
      const basePos = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );

      const isBranching = Math.random() > 0.4;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.7 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.4
      ).normalize();

      const branch = this.createBranch(basePos, dir, isBranching);
      this.branches.push(branch);

      const initialSegments = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < initialSegments; s++) {
        this.growSegment(branch, false);
      }
    }
  }

  private createBranch(basePos: THREE.Vector3, direction: THREE.Vector3, isBranching: boolean): Branch {
    const baseRadius = isBranching ? 0.08 + Math.random() * 0.06 : 0.15 + Math.random() * 0.1;
    const initialColor = this.baseHealthyColor.clone().lerp(
      this.baseDeclineColor,
      Math.random() * 0.2
    );

    const segments: Segment[] = [{
      position: basePos.clone(),
      color: initialColor.clone(),
      radius: baseRadius,
      targetRadius: baseRadius
    }];

    return {
      basePosition: basePos.clone(),
      direction: direction.clone(),
      segments,
      meshes: [],
      materials: [],
      maxSegments: isBranching ? 18 : 10,
      branchCount: 0,
      targetBranchCount: 0,
      isBranching,
      growthTimer: Math.random() * this.growthInterval,
      bleachingTimer: 0,
      isBleaching: false,
      bleachingPhase: 'none'
    };
  }

  private createSegmentMesh(branch: Branch, index: number): void {
    if (index >= branch.segments.length - 1) return;

    const seg1 = branch.segments[index];
    const seg2 = branch.segments[index + 1];

    const distance = seg1.position.distanceTo(seg2.position);
    const midPos = seg1.position.clone().add(seg2.position).multiplyScalar(0.5);
    const avgRadius = (seg1.radius + seg2.radius) * 0.5;

    const geometry = new THREE.CylinderGeometry(
      avgRadius * 0.85,
      avgRadius,
      distance,
      10
    );

    const material = new THREE.MeshStandardMaterial({
      color: seg2.color.clone(),
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(midPos);

    const direction = seg2.position.clone().sub(seg1.position).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    branch.meshes.push(mesh);
    branch.materials.push(material);
    this.group.add(mesh);

    const capGeometry = new THREE.SphereGeometry(seg2.radius * 0.95, 10, 8);
    const capMaterial = material.clone();
    const capMesh = new THREE.Mesh(capGeometry, capMaterial);
    capMesh.position.copy(seg2.position);

    branch.meshes.push(capMesh);
    branch.materials.push(capMaterial as THREE.MeshStandardMaterial);
    this.group.add(capMesh);
  }

  private growSegment(branch: Branch, emitParticles: boolean = true): void {
    if (branch.segments.length >= branch.maxSegments) return;

    const lastSeg = branch.segments[branch.segments.length - 1];
    const segLength = 0.2 + Math.random() * 0.3;

    let growthDir = branch.direction.clone();

    if (branch.isBranching && branch.segments.length > 2 && Math.random() > 0.7) {
      const angleOffset = (Math.random() - 0.5) * 0.8;
      const axis = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      growthDir.applyAxisAngle(axis, angleOffset);
    } else {
      growthDir.x += (Math.random() - 0.5) * 0.15;
      growthDir.z += (Math.random() - 0.5) * 0.15;
      growthDir.normalize();
    }

    const newPos = lastSeg.position.clone().add(growthDir.multiplyScalar(segLength));

    const baseRadius = branch.isBranching ? 0.08 : 0.15;
    const lightFactor = this.light / 100;
    const flowFactor = this.flow / 10;
    const lightInfluence = 1 - lightFactor * 0.2;
    const flowInfluence = 1 + flowFactor * 0.3;
    const targetRadius = baseRadius * lightInfluence * flowInfluence;

    const newColor = lastSeg.color.clone();
    const lightenAmount = 0.03 + Math.random() * 0.04;
    newColor.r = Math.min(1, newColor.r + lightenAmount);
    newColor.g = Math.min(1, newColor.g + lightenAmount * 0.7);
    newColor.b = Math.min(1, newColor.b + lightenAmount * 0.5);

    this.applyNutrientColor(newColor);

    branch.segments.push({
      position: newPos,
      color: newColor,
      radius: lastSeg.radius,
      targetRadius
    });

    this.createSegmentMesh(branch, branch.segments.length - 2);

    this.animateNewSegment(branch);

    if (emitParticles) {
      this.emitLarvae(newPos);
    }
  }

  private animateNewSegment(branch: Branch): void {
    if (branch.meshes.length === 0) return;

    const lastMesh = branch.meshes[branch.meshes.length - 1];
    const targetScale = lastMesh.scale.clone();
    lastMesh.scale.setScalar(0.01);

    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      lastMesh.scale.lerpVectors(new THREE.Vector3(0.01, 0.01, 0.01), targetScale, eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private emitLarvae(position: THREE.Vector3): void {
    const count = 2 + Math.floor(Math.random() * 2);
    this.particleSystem.emit(position, count);
  }

  private applyNutrientColor(color: THREE.Color): void {
    const nutrientFactor = Math.min(this.nutrients / 100, 1);
    color.lerp(this.algaeColor, nutrientFactor * 0.6);
  }

  private checkBleaching(): void {
    const lightChange = Math.abs(this.light - this.prevLight);
    const flowChange = Math.abs(this.flow - this.prevFlow);
    const nutrientChange = Math.abs(this.nutrients - this.prevNutrients);

    const totalChange = lightChange + flowChange * 2 + nutrientChange * 0.5;

    if (totalChange > 20) {
      this.triggerBleaching();
    }

    this.prevLight = this.light;
    this.prevFlow = this.flow;
    this.prevNutrients = this.nutrients;
  }

  private triggerBleaching(): void {
    for (const branch of this.branches) {
      branch.isBleaching = true;
      branch.bleachingPhase = 'in';
      branch.bleachingTimer = 0;
    }
  }

  private updateBleaching(deltaTime: number): void {
    for (const branch of this.branches) {
      if (!branch.isBleaching) continue;

      branch.bleachingTimer += deltaTime;

      const inDuration = 0.5;
      const holdDuration = 3;
      const outDuration = 0.5;

      if (branch.bleachingPhase === 'in') {
        const progress = Math.min(branch.bleachingTimer / inDuration, 1);
        this.setBleachingState(branch, progress);
        if (progress >= 1) {
          branch.bleachingPhase = 'hold';
          branch.bleachingTimer = 0;
        }
      } else if (branch.bleachingPhase === 'hold') {
        this.setBleachingState(branch, 1);
        if (branch.bleachingTimer >= holdDuration) {
          branch.bleachingPhase = 'out';
          branch.bleachingTimer = 0;
        }
      } else if (branch.bleachingPhase === 'out') {
        const progress = Math.min(branch.bleachingTimer / outDuration, 1);
        this.setBleachingState(branch, 1 - progress);
        if (progress >= 1) {
          branch.bleachingPhase = 'none';
          branch.isBleaching = false;
          branch.bleachingTimer = 0;
          this.refreshBranchColors(branch);
        }
      }
    }
  }

  private setBleachingState(branch: Branch, amount: number): void {
    for (const mat of branch.materials) {
      const baseColor = this.baseHealthyColor.clone();
      mat.color.lerpColors(baseColor, new THREE.Color(0xffffff), amount * 0.85);
      mat.opacity = 1 - amount * 0.6;
    }
  }

  private refreshBranchColors(branch: Branch): void {
    for (let i = 0; i < branch.segments.length; i++) {
      const seg = branch.segments[i];
      const baseColor = this.baseHealthyColor.clone().lerp(
        this.baseDeclineColor,
        0.1
      );
      const lighten = (i / branch.segments.length) * 0.2;
      baseColor.r = Math.min(1, baseColor.r + lighten);
      baseColor.g = Math.min(1, baseColor.g + lighten * 0.7);
      baseColor.b = Math.min(1, baseColor.b + lighten * 0.5);
      this.applyNutrientColor(baseColor);
      seg.color.copy(baseColor);

      if (branch.materials[i]) {
        branch.materials[i].color.copy(seg.color);
        branch.materials[i].opacity = 1;
      }
    }
  }

  private updateBranchMorphology(): void {
    for (const branch of this.branches) {
      const lightFactor = this.light / 100;
      const flowFactor = this.flow / 10;

      for (let i = 0; i < branch.segments.length; i++) {
        const seg = branch.segments[i];
        const baseRadius = branch.isBranching ? 0.08 : 0.15;
        const lightInfluence = 1 - lightFactor * 0.2;
        const flowInfluence = 1 + flowFactor * 0.3;
        seg.targetRadius = baseRadius * lightInfluence * flowInfluence * (1 - i * 0.03);

        seg.radius += (seg.targetRadius - seg.radius) * 0.05;
      }

      for (let i = 0; i < branch.meshes.length; i++) {
        const mesh = branch.meshes[i];
        if (mesh.geometry instanceof THREE.CylinderGeometry) {
          const segIdx = Math.floor(i / 2);
          if (branch.segments[segIdx] && branch.segments[segIdx + 1]) {
            const avgRadius = (branch.segments[segIdx].radius + branch.segments[segIdx + 1].radius) * 0.5;
            const originalTop = 0.85;
            const originalBottom = 1;
            mesh.scale.x = avgRadius * originalTop / 0.1;
            mesh.scale.z = avgRadius * originalBottom / 0.1;
          }
        } else if (mesh.geometry instanceof THREE.SphereGeometry) {
          const segIdx = Math.floor(i / 2);
          if (branch.segments[segIdx]) {
            const scale = branch.segments[segIdx].radius / 0.1;
            mesh.scale.setScalar(scale);
          }
        }
      }
    }
  }

  update(light: number, flow: number, nutrients: number, deltaTime: number): void {
    this.light = light;
    this.flow = flow;
    this.nutrients = nutrients;

    this.checkBleaching();
    this.updateBleaching(deltaTime);
    this.updateBranchMorphology();

    if (!this.isAnyBleaching()) {
      this.refreshBranchColors(this.branches[0]);
      for (const branch of this.branches) {
        this.refreshBranchColors(branch);
      }
    }

    this.elapsed += deltaTime;

    for (const branch of this.branches) {
      branch.growthTimer += deltaTime;

      if (branch.growthTimer >= this.growthInterval && branch.segments.length < branch.maxSegments) {
        branch.growthTimer = 0;
        this.growSegment(branch, true);

        if (branch.isBranching && branch.segments.length > 4 && Math.random() > 0.6) {
          const midIdx = Math.floor(branch.segments.length * 0.6);
          const midSeg = branch.segments[midIdx];
          const newDir = branch.direction.clone();
          const axis = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          newDir.applyAxisAngle(axis, 0.5 + Math.random() * 0.5);

          const newBranch = this.createBranch(midSeg.position.clone(), newDir.normalize(), true);
          newBranch.segments[0].color.copy(midSeg.color);
          newBranch.segments[0].radius = midSeg.radius * 0.7;
          newBranch.segments[0].targetRadius = midSeg.targetRadius * 0.7;
          this.branches.push(newBranch);
        }
      }
    }

    this.particleSystem.update();
  }

  private isAnyBleaching(): boolean {
    return this.branches.some(b => b.isBleaching);
  }

  dispose(): void {
    for (const branch of this.branches) {
      for (const mesh of branch.meshes) {
        this.group.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    }
    this.branches = [];
    this.scene.remove(this.group);
  }
}
