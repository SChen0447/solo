import * as THREE from 'three';
import { LeafSystem } from './LeafSystem';

interface StemSegment {
  mesh: THREE.Mesh;
  height: number;
  targetHeight: number;
  radius: number;
  targetRadius: number;
  yOffset: number;
}

interface Branch {
  group: THREE.Group;
  stemSegments: StemSegment[];
  positionOnMain: number;
  angle: number;
  leafSystem: LeafSystem;
  grown: boolean;
  targetLength: number;
  currentLength: number;
}

interface RootSegment {
  mesh: THREE.Mesh;
  length: number;
  targetLength: number;
  radius: number;
  angle: number;
  depth: number;
}

interface RootHairParticle {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

type GrowthPhase = 'seed' | 'sprouting' | 'cotyledon' | 'growing' | 'mature';

export class PlantSimulator {
  private scene: THREE.Scene;
  private plantGroup: THREE.Group;
  private stemGroup: THREE.Group;
  private leavesGroup: THREE.Group;
  private rootsGroup: THREE.Group;
  private rootHairsGroup: THREE.Group;

  private leafSystem: LeafSystem;

  private mainStemSegments: StemSegment[] = [];
  private branches: Branch[] = [];
  private roots: RootSegment[] = [];
  private rootHairs: RootHairParticle[] = [];

  private light: number = 0.7;
  private water: number = 0.7;
  private temperature: number = 0.5;

  private growthPhase: GrowthPhase = 'seed';
  private growthProgress: number = 0;
  private totalHeight: number = 0;
  private targetTotalHeight: number = 6;

  private segmentHeight: number = 0.5;
  private stemRadius: number = 0.08;

  private growthSpeed: number = 0.3;
  private time: number = 0;

  private cotyledonLeft?: THREE.Object3D;
  private cotyledonRight?: THREE.Object3D;

  private seedMesh?: THREE.Mesh;

  private vibrationTime: number = 0;
  private isVibrating: boolean = false;

  private rootGrowthSpeed: number = 0.2;
  private targetRootDepth: number = 3;
  private currentRootDepth: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.plantGroup = new THREE.Group();
    this.plantGroup.position.y = 0;
    this.scene.add(this.plantGroup);

    this.stemGroup = new THREE.Group();
    this.plantGroup.add(this.stemGroup);

    this.leavesGroup = new THREE.Group();
    this.plantGroup.add(this.leavesGroup);

    this.rootsGroup = new THREE.Group();
    this.plantGroup.add(this.rootsGroup);

    this.rootHairsGroup = new THREE.Group();
    this.plantGroup.add(this.rootHairsGroup);

    this.leafSystem = new LeafSystem(scene, this.leavesGroup);

    this.createSeed();
    this.createRoots();
  }

  private createSeed(): void {
    const seedGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const seedMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.8
    });
    this.seedMesh = new THREE.Mesh(seedGeometry, seedMaterial);
    this.seedMesh.position.y = -0.1;
    this.seedMesh.scale.y = 0.7;
    this.plantGroup.add(this.seedMesh);
  }

  private createStripeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 128, 0);
    gradient.addColorStop(0, '#5d8a3a');
    gradient.addColorStop(0.3, '#7cb342');
    gradient.addColorStop(0.5, '#8bc34a');
    gradient.addColorStop(0.7, '#7cb342');
    gradient.addColorStop(1, '#5d8a3a');

    ctx.fillStyle = '#689f38';
    ctx.fillRect(0, 0, 128, 256);

    for (let i = 0; i < 12; i++) {
      const x = (i / 12) * 128 + Math.sin(i * 0.5) * 3;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(104, 159, 56, 0.3)' : 'rgba(76, 140, 40, 0.3)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < 256; y += 10) {
        const offset = Math.sin(y * 0.02 + i) * 2;
        ctx.lineTo(x + offset, y);
      }
      ctx.lineTo(x + 4, 256);
      ctx.lineTo(x - 4, 256);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createStemSegment(yOffset: number, height: number, radius: number, isMain: boolean = true): StemSegment {
    const geometry = new THREE.CylinderGeometry(radius, radius * 1.05, height, 16);
    const stripeTexture = this.createStripeTexture();
    stripeTexture.repeat.set(1, Math.max(1, height / 0.5));

    const material = new THREE.MeshStandardMaterial({
      color: isMain ? 0x7cb342 : 0x8bc34a,
      map: stripeTexture,
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = yOffset + height / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return {
      mesh,
      height: 0,
      targetHeight: height,
      radius: radius * 0.3,
      targetRadius: radius,
      yOffset
    };
  }

  private createRoots(): void {
    const mainRootCount = 3;
    for (let i = 0; i < mainRootCount; i++) {
      const angle = (i / mainRootCount) * Math.PI * 2;
      this.createRootSegment(angle, 0, 0.15, true);
    }
  }

  private createRootSegment(angle: number, depth: number, radius: number, isMain: boolean): RootSegment {
    const length = isMain ? 1.5 : 0.8;
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.4, length, 8);
    geometry.translate(0, -length / 2, 0);

    const material = new THREE.MeshPhysicalMaterial({
      color: isMain ? 0x8d6e63 : 0xa1887f,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -depth;
    mesh.rotation.x = isMain ? 0.2 : 0.5;
    mesh.rotation.z = angle;

    this.rootsGroup.add(mesh);

    const segment: RootSegment = {
      mesh,
      length: 0,
      targetLength: length,
      radius,
      angle,
      depth
    };

    this.roots.push(segment);
    return segment;
  }

  private updateRootHairParticles(delta: number): void {
    const hairCount = 30;
    const waterFactor = this.water;

    if (this.rootHairs.length < hairCount && Math.random() < delta * 5 * waterFactor) {
      this.spawnRootHair();
    }

    for (let i = this.rootHairs.length - 1; i >= 0; i--) {
      const hair = this.rootHairs[i];
      hair.life -= delta;

      if (hair.life <= 0) {
        this.rootHairsGroup.remove(hair.mesh);
        hair.mesh.geometry.dispose();
        (hair.mesh.material as THREE.Material).dispose();
        this.rootHairs.splice(i, 1);
        continue;
      }

      const alpha = hair.life / hair.maxLife;
      (hair.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.8;
      hair.mesh.position.add(hair.velocity.clone().multiplyScalar(delta));
    }
  }

  private spawnRootHair(): void {
    if (this.roots.length === 0) return;

    const root = this.roots[Math.floor(Math.random() * this.roots.length)];
    const depthFactor = Math.random() * Math.min(1, this.currentRootDepth / this.targetRootDepth);
    const y = -depthFactor * 2;
    const angle = root.angle + (Math.random() - 0.5) * 0.5;

    const hairGeometry = new THREE.SphereGeometry(0.015, 4, 4);
    const hairMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    const mesh = new THREE.Mesh(hairGeometry, hairMaterial);
    const radius = 0.3 + depthFactor * 0.5;
    mesh.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );

    this.rootHairsGroup.add(mesh);

    this.rootHairs.push({
      mesh,
      position: mesh.position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        -0.02 - Math.random() * 0.03,
        (Math.random() - 0.5) * 0.05
      ),
      life: 1.5 + Math.random() * 1.5,
      maxLife: 3
    });
  }

  public setLight(value: number): void {
    this.light = Math.max(0, Math.min(1, value));
    this.leafSystem.setEnvironment({
      light: this.light,
      water: this.water,
      temperature: this.temperature
    });
    this.growthSpeed = 0.2 + (this.light * 0.4 + this.water * 0.4 + this.temperature * 0.2) * 0.5;
  }

  public setWater(value: number): void {
    this.water = Math.max(0, Math.min(1, value));
    this.leafSystem.setEnvironment({
      light: this.light,
      water: this.water,
      temperature: this.temperature
    });
    this.targetRootDepth = 1 + this.water * 3;
    this.growthSpeed = 0.2 + (this.light * 0.4 + this.water * 0.4 + this.temperature * 0.2) * 0.5;
  }

  public setTemperature(value: number): void {
    this.temperature = Math.max(0, Math.min(1, value));
    this.leafSystem.setEnvironment({
      light: this.light,
      water: this.water,
      temperature: this.temperature
    });
    this.growthSpeed = 0.2 + (this.light * 0.4 + this.water * 0.4 + this.temperature * 0.2) * 0.5;
  }

  private triggerVibration(): void {
    this.isVibrating = true;
    this.vibrationTime = 0.1;

    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  private updateGrowth(delta: number): void {
    if (this.growthPhase === 'seed') {
      this.growthProgress += delta * 0.5;
      if (this.growthProgress >= 1) {
        this.growthPhase = 'sprouting';
        this.growthProgress = 0;
        this.addStemSegment();
        this.triggerVibration();
      }
      return;
    }

    if (this.growthPhase === 'sprouting') {
      this.growthProgress += delta * this.growthSpeed;

      if (this.mainStemSegments.length > 0) {
        const seg = this.mainStemSegments[0];
        seg.height += delta * this.growthSpeed * 2;
        seg.radius += delta * this.growthSpeed * 0.1;

        if (seg.height >= 0.8) {
          seg.height = 0.8;
          this.growthPhase = 'cotyledon';
          this.createCotyledons();
        }

        this.updateStemMesh(seg);
      }
      return;
    }

    if (this.totalHeight < this.targetTotalHeight) {
      const lastSegment = this.mainStemSegments[this.mainStemSegments.length - 1];

      if (lastSegment) {
        if (lastSegment.height < lastSegment.targetHeight) {
          lastSegment.height += delta * this.growthSpeed;
          lastSegment.radius = Math.min(lastSegment.targetRadius, lastSegment.radius + delta * 0.05);
          this.updateStemMesh(lastSegment);

          if (lastSegment.height >= lastSegment.targetHeight) {
            lastSegment.height = lastSegment.targetHeight;
            this.triggerVibration();
          }
        } else {
          this.totalHeight += lastSegment.targetHeight;
          this.addStemSegment();

          if (this.mainStemSegments.length > 2 && Math.random() < 0.6) {
            this.addBranch();
          }

          if (this.totalHeight >= this.targetTotalHeight * 0.7) {
            this.growthPhase = 'mature';
          }
        }
      }
    }

    this.updateBranches(delta);
  }

  private addStemSegment(): void {
    const yOffset = this.mainStemSegments.reduce((sum, s) => sum + s.targetHeight, 0);
    const radius = this.stemRadius * (1 - this.mainStemSegments.length * 0.03);

    const segment = this.createStemSegment(yOffset, this.segmentHeight, Math.max(0.04, radius));
    this.stemGroup.add(segment.mesh);
    this.mainStemSegments.push(segment);

    if (this.mainStemSegments.length > 3 && this.mainStemSegments.length % 2 === 0) {
      this.addLeavesOnStem(segment);
    }
  }

  private updateStemMesh(segment: StemSegment): void {
    segment.mesh.scale.y = segment.height / segment.targetHeight;
    segment.mesh.scale.x = segment.radius / segment.targetRadius;
    segment.mesh.scale.z = segment.radius / segment.targetRadius;
    segment.mesh.position.y = segment.yOffset + segment.height / 2;
  }

  private createCotyledons(): void {
    const topY = this.mainStemSegments[0].height;

    const leftGroup = new THREE.Group();
    leftGroup.position.set(0, topY - 0.1, 0);
    leftGroup.rotation.z = Math.PI / 3;
    this.stemGroup.add(leftGroup);

    const rightGroup = new THREE.Group();
    rightGroup.position.set(0, topY - 0.1, 0);
    rightGroup.rotation.z = -Math.PI / 3;
    this.stemGroup.add(rightGroup);

    this.cotyledonLeft = leftGroup;
    this.cotyledonRight = rightGroup;

    this.leafSystem.addLeaf({
      size: 0.8,
      length: 0.9,
      width: 0.5,
      isCotyledon: true,
      position: new THREE.Vector3(0.3, 0, 0),
      rotation: new THREE.Euler(0, 0, -Math.PI / 6)
    });

    this.leafSystem.addLeaf({
      size: 0.8,
      length: 0.9,
      width: 0.5,
      isCotyledon: true,
      position: new THREE.Vector3(-0.3, 0, 0),
      rotation: new THREE.Euler(0, Math.PI, -Math.PI / 6)
    });

    leftGroup.add(this.leafSystem.getLeaves()[this.leafSystem.getLeaves().length - 2].mesh);
    rightGroup.add(this.leafSystem.getLeaves()[this.leafSystem.getLeaves().length - 1].mesh);

    this.leafSystem.getLeaves()[this.leafSystem.getLeaves().length - 2].mesh.position.set(0.3, 0, 0);
    this.leafSystem.getLeaves()[this.leafSystem.getLeaves().length - 1].mesh.position.set(-0.3, 0, 0);
  }

  private addBranch(): void {
    const stemIndex = Math.floor(this.mainStemSegments.length * 0.4) + Math.floor(Math.random() * (this.mainStemSegments.length * 0.5));
    const seg = this.mainStemSegments[Math.min(stemIndex, this.mainStemSegments.length - 1)];
    if (!seg) return;

    const angle = Math.random() * Math.PI * 2;
    const horizontalAngle = (Math.random() - 0.5) * Math.PI / 3;

    const branchGroup = new THREE.Group();
    branchGroup.position.y = seg.yOffset + seg.height * 0.8;
    branchGroup.rotation.y = angle;
    branchGroup.rotation.z = -Math.PI / 4 + horizontalAngle;
    this.stemGroup.add(branchGroup);

    const branchLeafSystem = new LeafSystem(this.scene, branchGroup);
    branchLeafSystem.setEnvironment({
      light: this.light,
      water: this.water,
      temperature: this.temperature
    });

    const branch: Branch = {
      group: branchGroup,
      stemSegments: [],
      positionOnMain: seg.yOffset,
      angle,
      leafSystem: branchLeafSystem,
      grown: false,
      targetLength: 1.5 + Math.random() * 1,
      currentLength: 0
    };

    const branchSeg = this.createStemSegment(0, branch.targetLength, 0.04, false);
    branchGroup.add(branchSeg.mesh);
    branch.stemSegments.push(branchSeg);

    for (let i = 0; i < 3; i++) {
      const leafY = 0.3 + i * 0.4;
      const leafAngle = (i % 2 === 0 ? 1 : -1) * Math.PI / 2;
      branchLeafSystem.addLeaf({
        size: 0.6 + Math.random() * 0.3,
        length: 1,
        width: 0.5,
        position: new THREE.Vector3(
          Math.cos(leafAngle) * 0.05,
          leafY,
          Math.sin(leafAngle) * 0.05
        ),
        rotation: new THREE.Euler(
          Math.PI / 4 + (Math.random() - 0.5) * 0.3,
          leafAngle,
          (Math.random() - 0.5) * 0.2
        )
      });
    }

    this.branches.push(branch);
  }

  private addLeavesOnStem(segment: StemSegment): void {
    const leafCount = 2;
    const angleOffset = Math.random() * Math.PI;

    for (let i = 0; i < leafCount; i++) {
      const angle = angleOffset + (i / leafCount) * Math.PI * 2;
      const leafSize = 0.7 + Math.random() * 0.3;

      this.leafSystem.addLeaf({
        size: leafSize,
        length: 1.1,
        width: 0.55,
        position: new THREE.Vector3(
          Math.cos(angle) * 0.06,
          segment.yOffset + segment.height * 0.7,
          Math.sin(angle) * 0.06
        ),
        rotation: new THREE.Euler(
          Math.PI / 3 + (Math.random() - 0.5) * 0.2,
          angle + Math.PI / 2,
          (Math.random() - 0.5) * 0.3
        )
      });
    }
  }

  private updateBranches(delta: number): void {
    for (const branch of this.branches) {
      if (branch.stemSegments.length > 0 && !branch.grown) {
        const seg = branch.stemSegments[0];
        if (seg.height < seg.targetHeight) {
          seg.height += delta * this.growthSpeed * 0.8;
          seg.radius = Math.min(seg.targetRadius, seg.radius + delta * 0.03);
          this.updateBranchStemMesh(seg);

          if (seg.height >= seg.targetHeight) {
            branch.grown = true;
            branch.currentLength = seg.targetHeight;
          }
        }
      }

      branch.leafSystem.update(delta, this.time);
    }
  }

  private updateBranchStemMesh(segment: StemSegment): void {
    segment.mesh.scale.y = segment.height / segment.targetHeight;
    segment.mesh.scale.x = segment.radius / segment.targetRadius;
    segment.mesh.scale.z = segment.radius / segment.targetRadius;
    segment.mesh.position.y = segment.height / 2;
  }

  private updateRoots(delta: number): void {
    const waterFactor = this.water;

    if (this.currentRootDepth < this.targetRootDepth) {
      this.currentRootDepth += delta * this.rootGrowthSpeed * waterFactor;
      if (this.currentRootDepth > this.targetRootDepth) {
        this.currentRootDepth = this.targetRootDepth;
      }
    } else if (this.currentRootDepth > this.targetRootDepth) {
      this.currentRootDepth -= delta * this.rootGrowthSpeed * 0.5;
      if (this.currentRootDepth < this.targetRootDepth) {
        this.currentRootDepth = this.targetRootDepth;
      }
    }

    const mainRoots = this.roots.slice(0, 3);
    for (let i = 0; i < mainRoots.length; i++) {
      const root = mainRoots[i];
      const targetScale = this.currentRootDepth / this.targetRootDepth;
      const currentScale = root.mesh.scale.y;
      root.mesh.scale.y += (targetScale - currentScale) * delta * 0.5;
      root.mesh.scale.x = root.mesh.scale.z = 0.5 + root.mesh.scale.y * 0.5;
    }

    if (this.roots.length < 3 + Math.floor(waterFactor * 6) && Math.random() < delta * 0.3) {
      const depth = Math.random() * this.currentRootDepth * 0.7;
      const angle = Math.random() * Math.PI * 2;
      this.createRootSegment(angle, depth, 0.05, false);
    }

    this.updateRootHairParticles(delta);
  }

  private applyVibration(delta: number): void {
    if (this.isVibrating) {
      this.vibrationTime -= delta;
      if (this.vibrationTime <= 0) {
        this.isVibrating = false;
        this.plantGroup.position.x = 0;
        this.plantGroup.position.z = 0;
      } else {
        const intensity = this.vibrationTime * 2;
        this.plantGroup.position.x = (Math.random() - 0.5) * 0.02 * intensity;
        this.plantGroup.position.z = (Math.random() - 0.5) * 0.02 * intensity;
      }
    }
  }

  public update(delta: number, time: number): void {
    this.time = time;

    if (this.seedMesh && this.growthPhase !== 'seed') {
      this.seedMesh.visible = false;
    }

    this.updateGrowth(delta);
    this.leafSystem.update(delta, time);
    this.updateRoots(delta);
    this.applyVibration(delta);

    if (this.cotyledonLeft && this.cotyledonRight) {
      const sway = Math.sin(time * 2) * 0.05;
      this.cotyledonLeft.rotation.z = Math.PI / 3 + sway;
      this.cotyledonRight.rotation.z = -Math.PI / 3 - sway;
    }
  }

  public dispose(): void {
    this.leafSystem.dispose();

    for (const branch of this.branches) {
      branch.leafSystem.dispose();
    }

    for (const seg of this.mainStemSegments) {
      seg.mesh.geometry.dispose();
      (seg.mesh.material as THREE.Material).dispose();
    }

    for (const root of this.roots) {
      root.mesh.geometry.dispose();
      (root.mesh.material as THREE.Material).dispose();
    }

    for (const hair of this.rootHairs) {
      hair.mesh.geometry.dispose();
      (hair.mesh.material as THREE.Material).dispose();
    }

    this.scene.remove(this.plantGroup);
  }
}
