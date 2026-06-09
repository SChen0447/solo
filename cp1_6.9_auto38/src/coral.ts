import * as THREE from 'three';
import { SimplexNoise } from 'simplex-noise';

const simplexNoise = new SimplexNoise();
const noise2D = (x: number, y: number) => simplexNoise.noise2D(x, y);

function hslToHex(h: number, s: number, l: number): number {
  const color = new THREE.Color();
  color.setHSL(h, s, l);
  return color.getHex();
}

function hexToHsl(hex: number): { h: number; s: number; l: number } {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  return hsl;
}

interface BranchData {
  mesh: THREE.Mesh;
  polyps: THREE.Mesh[];
  startHeight: number;
  endHeight: number;
  growthProgress: number;
  baseRadius: number;
  tipRadius: number;
  direction: THREE.Vector3;
  children: BranchData[];
  parent?: BranchData;
  swayOffset: number;
}

export class Coral {
  group: THREE.Group;
  position: THREE.Vector3;
  baseColor: number;
  branches: BranchData[] = [];
  swayPeriod: number;
  swayAmplitude: number;
  growthComplete: boolean = false;
  totalHeight: number = 0;
  targetHeight: number;
  currentScale: number = 1;
  targetScale: number = 1;
  scaleLerpSpeed: number = 1;
  emissiveIntensity: number = 0.3;
  targetEmissive: number = 0.3;
  currentColorHue: number;
  targetColorHue: number;
  colorLerpSpeed: number = 0.5;
  private startTime: number;
  private isGrowing: boolean = true;
  private polypGeometry: THREE.SphereGeometry;

  constructor(position: THREE.Vector3, baseColor: number, preGrown: boolean = false) {
    this.group = new THREE.Group();
    this.position = position.clone();
    this.group.position.copy(position);
    this.baseColor = baseColor;
    const hsl = hexToHsl(baseColor);
    this.currentColorHue = hsl.h;
    this.targetColorHue = hsl.h;
    this.swayPeriod = 4 + Math.random() * 2;
    this.swayAmplitude = 0.02;
    this.targetHeight = 0.8 + Math.random() * 0.7;
    this.startTime = performance.now();
    this.polypGeometry = new THREE.SphereGeometry(0.02, 6, 6);

    if (preGrown) {
      this.isGrowing = false;
      this.growthComplete = true;
      this.generatePreGrown();
    } else {
      this.generateInitialTrunk();
    }
  }

  private createBranchMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: this.emissiveIntensity,
      roughness: 0.6,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
  }

  private createPolypMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: this.emissiveIntensity * 1.2,
      roughness: 0.4,
      metalness: 0.3
    });
  }

  private createBranch(
    startPos: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    baseRadius: number,
    tipRadius: number,
    color: number,
    parent?: BranchData
  ): BranchData {
    const curvePoints: THREE.Vector3[] = [];
    const segments = 12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pos = startPos.clone().add(direction.clone().multiplyScalar(length * t));
      const noise = noise2D(pos.x * 2, pos.z * 2) * 0.05 * t;
      pos.x += noise;
      pos.z += noise * 0.5;
      curvePoints.push(pos);
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const geometry = new THREE.TubeGeometry(curve, 16, baseRadius, 8, false);
    const material = this.createBranchMaterial(color);
    const mesh = new THREE.Mesh(geometry, material);

    const polyps: THREE.Mesh[] = [];
    const polypCount = Math.floor(length / 0.15);
    for (let i = 1; i <= polypCount; i++) {
      const t = i / (polypCount + 1);
      const polypPos = curve.getPoint(t);
      const tangent = curve.getTangentAt(t).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      if (normal.lengthSq() < 0.01) {
        normal.set(1, 0, 0);
      }
      const angle = Math.random() * Math.PI * 2;
      normal.applyAxisAngle(tangent, angle);
      const offset = (baseRadius + (tipRadius - baseRadius) * t) * 1.1;
      polypPos.add(normal.multiplyScalar(offset));

      const polypMat = this.createPolypMaterial(color);
      const polyp = new THREE.Mesh(this.polypGeometry, polypMat);
      polyp.position.copy(polypPos);
      polyp.scale.setScalar(0.8 + Math.random() * 0.4);
      this.group.add(polyp);
      polyps.push(polyp);
    }

    this.group.add(mesh);

    return {
      mesh,
      polyps,
      startHeight: startPos.y - this.position.y,
      endHeight: startPos.y - this.position.y + length,
      growthProgress: 0,
      baseRadius,
      tipRadius,
      direction: direction.clone(),
      children: [],
      parent,
      swayOffset: Math.random() * Math.PI * 2
    };
  }

  private generatePreGrown(): void {
    const hsl = hexToHsl(this.baseColor);
    const branchCount = 3 + Math.floor(Math.random() * 6);

    const trunkDir = new THREE.Vector3(0, 1, 0);
    const trunkColor = hslToHex(
      hsl.h + (Math.random() - 0.5) * 0.05,
      hsl.s,
      hsl.l
    );
    const trunkLength = this.targetHeight * 0.4;
    const trunk = this.createBranch(
      new THREE.Vector3(0, 0, 0),
      trunkDir,
      trunkLength,
      0.1,
      0.05,
      trunkColor
    );
    trunk.growthProgress = 1;
    this.branches.push(trunk);
    this.totalHeight = trunkLength;

    const topPos = new THREE.Vector3(0, trunkLength, 0);
    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const tilt = 0.2 + Math.random() * 0.4;
      const dir = new THREE.Vector3(
        Math.sin(angle) * tilt,
        1 - tilt * 0.5,
        Math.cos(angle) * tilt
      ).normalize();
      const length = this.targetHeight * (0.3 + Math.random() * 0.3);
      const bColor = hslToHex(
        hsl.h + (Math.random() - 0.5) * 0.08,
        hsl.s,
        hsl.l + (Math.random() - 0.5) * 0.05
      );
      const branch = this.createBranch(topPos, dir, length, 0.05, 0.02, bColor, trunk);
      branch.growthProgress = 1;
      trunk.children.push(branch);
      this.branches.push(branch);

      if (Math.random() > 0.5) {
        const subTop = topPos.clone().add(dir.clone().multiplyScalar(length * 0.7));
        const subAngle = angle + (Math.random() - 0.5) * 1.0;
        const subTilt = 0.3 + Math.random() * 0.4;
        const subDir = new THREE.Vector3(
          Math.sin(subAngle) * subTilt,
          1 - subTilt * 0.3,
          Math.cos(subAngle) * subTilt
        ).normalize();
        const subLength = length * (0.4 + Math.random() * 0.4);
        const subColor = hslToHex(
          hsl.h + (Math.random() - 0.5) * 0.1,
          hsl.s,
          hsl.l + (Math.random() - 0.5) * 0.05
        );
        const subBranch = this.createBranch(subTop, subDir, subLength, 0.03, 0.02, subColor, branch);
        subBranch.growthProgress = 1;
        branch.children.push(subBranch);
        this.branches.push(subBranch);
      }
    }
    this.totalHeight = this.targetHeight;
  }

  private generateInitialTrunk(): void {
    const hsl = hexToHsl(this.baseColor);
    const color = hslToHex(hsl.h, hsl.s, hsl.l);
    const trunk = this.createBranch(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0),
      0.3,
      0.08,
      0.04,
      color
    );
    this.branches.push(trunk);
  }

  setWarmColor(offset: number): void {
    const baseHsl = hexToHsl(this.baseColor);
    const warmHue = 30 / 360;
    this.targetColorHue = baseHsl.h + (warmHue - baseHsl.h) * Math.min(1, offset / 60);
    this.colorLerpSpeed = 0.5;
  }

  resetColor(): void {
    const baseHsl = hexToHsl(this.baseColor);
    this.targetColorHue = baseHsl.h;
    this.colorLerpSpeed = 0.25;
  }

  triggerPulse(): void {
    this.targetScale = 0.7;
    this.scaleLerpSpeed = 5;
    this.targetEmissive = 1.0;
    setTimeout(() => {
      this.targetScale = 1.0;
      this.scaleLerpSpeed = 2;
    }, 200);
    setTimeout(() => {
      this.targetEmissive = 0.3;
    }, 500);
  }

  update(time: number, currentEmissiveMultiplier: number = 1): void {
    const elapsed = (time - this.startTime) / 1000;

    if (this.isGrowing) {
      this.updateGrowth(elapsed);
    }

    this.currentColorHue += (this.targetColorHue - this.currentColorHue) * Math.min(1, this.colorLerpSpeed * 0.016);
    this.currentScale += (this.targetScale - this.currentScale) * Math.min(1, this.scaleLerpSpeed * 0.016);
    this.emissiveIntensity += (this.targetEmissive - this.emissiveIntensity) * Math.min(1, 2 * 0.016);

    this.group.scale.setScalar(this.currentScale);

    this.branches.forEach((branch) => {
      const branchMat = branch.mesh.material as THREE.MeshStandardMaterial;
      const hsl = hexToHsl(this.baseColor);
      const newColor = hslToHex(
        this.currentColorHue + (hsl.h - this.currentColorHue) * 0.3 + (Math.random() - 0.5) * 0.01,
        hsl.s,
        hsl.l
      );
      branchMat.color.setHex(newColor);
      branchMat.emissive.setHex(newColor);
      branchMat.emissiveIntensity = this.emissiveIntensity * currentEmissiveMultiplier;
      branchMat.needsUpdate = true;

      branch.polyps.forEach((polyp) => {
        const pMat = polyp.material as THREE.MeshStandardMaterial;
        pMat.color.setHex(newColor);
        pMat.emissive.setHex(newColor);
        pMat.emissiveIntensity = this.emissiveIntensity * currentEmissiveMultiplier * 1.2;
        pMat.needsUpdate = true;
      });
    });

    const sway = Math.sin(elapsed * (Math.PI * 2 / this.swayPeriod)) * this.swayAmplitude;
    this.group.rotation.z = sway * 0.5;
    this.group.rotation.x = sway * 0.3;
  }

  private updateGrowth(elapsed: number): void {
    if (this.branches.length === 0) return;

    const trunk = this.branches[0];
    const trunkGrowth = Math.min(1, elapsed / 5);
    trunk.growthProgress = trunkGrowth;
    this.totalHeight = 0.3 * trunkGrowth;

    if (trunkGrowth < 1) {
      this.scaleBranch(trunk, trunkGrowth);
    } else {
      if (trunk.children.length === 0) {
        this.spawnBranches(trunk);
      }
      const totalGrowthTime = 15;
      const branchProgress = Math.min(1, (elapsed - 5) / 10);
      this.growChildren(trunk, branchProgress);

      if (branchProgress >= 1 && !this.growthComplete) {
        this.growthComplete = true;
        this.isGrowing = false;
      }
    }
  }

  private scaleBranch(branch: BranchData, progress: number): void {
    branch.mesh.scale.y = Math.max(0.001, progress);
    branch.mesh.position.y = 0;
    branch.polyps.forEach((polyp, i) => {
      polyp.visible = (i / branch.polyps.length) <= progress;
    });
  }

  private spawnBranches(trunk: BranchData): void {
    const hsl = hexToHsl(this.baseColor);
    const branchCount = 2 + Math.floor(Math.random() * 3);
    const topPos = new THREE.Vector3(0, 0.3, 0);

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const tilt = 0.2 + Math.random() * 0.4;
      const dir = new THREE.Vector3(
        Math.sin(angle) * tilt,
        1 - tilt * 0.5,
        Math.cos(angle) * tilt
      ).normalize();
      const length = this.targetHeight * (0.3 + Math.random() * 0.3);
      const bColor = hslToHex(
        hsl.h + (Math.random() - 0.5) * 0.08,
        hsl.s,
        hsl.l + (Math.random() - 0.5) * 0.05
      );
      const branch = this.createBranch(topPos, dir, length, 0.04, 0.02, bColor, trunk);
      trunk.children.push(branch);
      this.branches.push(branch);

      if (Math.random() > 0.4) {
        setTimeout(() => {
          const subTop = topPos.clone().add(dir.clone().multiplyScalar(length * 0.6));
          const subAngle = angle + (Math.random() - 0.5) * 1.0;
          const subTilt = 0.3 + Math.random() * 0.3;
          const subDir = new THREE.Vector3(
            Math.sin(subAngle) * subTilt,
            1 - subTilt * 0.3,
            Math.cos(subAngle) * subTilt
          ).normalize();
          const subLength = length * (0.4 + Math.random() * 0.4);
          const subColor = hslToHex(
            hsl.h + (Math.random() - 0.5) * 0.1,
            hsl.s,
            hsl.l + (Math.random() - 0.5) * 0.05
          );
          const subBranch = this.createBranch(subTop, subDir, subLength, 0.025, 0.015, subColor, branch);
          branch.children.push(subBranch);
          this.branches.push(subBranch);
        }, 2000 + Math.random() * 2000);
      }
    }
  }

  private growChildren(branch: BranchData, progress: number): void {
    this.scaleBranch(branch, progress);
    branch.children.forEach((child) => {
      this.growChildren(child, progress);
    });
  }

  getColorHex(): number {
    const hsl = hexToHsl(this.baseColor);
    return hslToHex(this.currentColorHue, hsl.s, hsl.l);
  }

  getVertexCount(): number {
    let count = 0;
    this.branches.forEach((b) => {
      const geom = b.mesh.geometry as THREE.BufferGeometry;
      count += geom.attributes.position?.count || 0;
    });
    return count;
  }

  dispose(): void {
    this.branches.forEach((b) => {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
      b.polyps.forEach((p) => {
        (p.material as THREE.Material).dispose();
      });
    });
    this.polypGeometry.dispose();
  }
}
