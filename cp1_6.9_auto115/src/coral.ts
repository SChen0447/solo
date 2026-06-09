import * as THREE from 'three';

export class Coral {
  public mesh: THREE.Group;
  public baseColor: THREE.Color;
  public initialHeight: number;
  public currentHeight: number;
  public saturationBoost: number = 0;
  public branches: THREE.Mesh[] = [];
  public isMaxLevel: boolean = false;

  private static readonly TOTAL_FEED_FOR_MAX = 50;
  private static readonly GROWTH_PER_FEED = 0.05;
  private static readonly SATURATION_PER_FEED = 0.05;

  constructor(position: THREE.Vector3) {
    const startHue = Math.random();
    this.baseColor = new THREE.Color().setHSL(startHue, 0.7, 0.6);
    this.initialHeight = 1 + Math.random();
    this.currentHeight = this.initialHeight;

    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    this.createBranches();
  }

  private createBranches(): void {
    const branchCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.6 + Math.random() * 0.4;
      const branchHeight = this.initialHeight * heightRatio;
      const branchRadius = 0.08 + Math.random() * 0.08;

      const branchGeo = new THREE.CylinderGeometry(
        branchRadius * 0.4,
        branchRadius,
        branchHeight,
        6
      );
      branchGeo.translate(0, branchHeight / 2, 0);

      const hue = this.baseColor.getHSL({ h: 0, s: 0, l: 0 }).h;
      const colorVariation = new THREE.Color().setHSL(
        hue + (Math.random() - 0.5) * 0.1,
        0.65 + Math.random() * 0.1,
        0.55 + Math.random() * 0.1
      );

      const branchMat = new THREE.MeshPhongMaterial({
        color: colorVariation,
        shininess: 30,
        flatShading: true
      });

      const branch = new THREE.Mesh(branchGeo, branchMat);
      branch.userData.baseColor = colorVariation.clone();
      branch.userData.baseHeight = branchHeight;

      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const tilt = 0.2 + Math.random() * 0.4;
      branch.rotation.x = Math.cos(angle) * tilt;
      branch.rotation.z = Math.sin(angle) * tilt;

      this.mesh.add(branch);
      this.branches.push(branch);

      this.addBranchTips(branch, branchHeight, 2);
    }
  }

  private addBranchTips(parent: THREE.Mesh, parentHeight: number, depth: number): void {
    if (depth <= 0) return;

    const tipCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < tipCount; i++) {
      const tipHeight = parentHeight * (0.3 + Math.random() * 0.3);
      const tipRadius = 0.04 + Math.random() * 0.04;

      const tipGeo = new THREE.CylinderGeometry(
        tipRadius * 0.3,
        tipRadius,
        tipHeight,
        5
      );
      tipGeo.translate(0, tipHeight / 2, 0);

      const baseColor = (parent.userData.baseColor as THREE.Color).clone();
      const tipMat = new THREE.MeshPhongMaterial({
        color: baseColor,
        shininess: 30,
        flatShading: true
      });

      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.userData.baseColor = baseColor.clone();
      tip.userData.baseHeight = tipHeight;

      tip.position.y = parentHeight * 0.9;
      const angle = Math.random() * Math.PI * 2;
      const tilt = 0.3 + Math.random() * 0.5;
      tip.rotation.x = Math.cos(angle) * tilt;
      tip.rotation.z = Math.sin(angle) * tilt;

      parent.add(tip);
      this.branches.push(tip);

      this.addBranchTips(tip, tipHeight, depth - 1);
    }
  }

  public grow(): void {
    if (this.isMaxLevel) return;

    this.currentHeight += Coral.GROWTH_PER_FEED;
    this.saturationBoost = Math.min(1, this.saturationBoost + Coral.SATURATION_PER_FEED);

    const scaleFactor = this.currentHeight / this.initialHeight;

    this.branches.forEach((branch) => {
      const baseHeight = branch.userData.baseHeight as number;
      branch.scale.y = scaleFactor;

      const baseColor = branch.userData.baseColor as THREE.Color;
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);

      const newSat = Math.min(1, hsl.s + this.saturationBoost * 0.3);
      const newLight = Math.min(0.8, hsl.l + this.saturationBoost * 0.1);
      (branch.material as THREE.MeshPhongMaterial).color.setHSL(hsl.h, newSat, newLight);
    });

    const maxHeight = this.initialHeight * 1.5;
    if (this.currentHeight >= maxHeight) {
      this.isMaxLevel = true;
      this.setMaxColor();
    }
  }

  private setMaxColor(): void {
    this.branches.forEach((branch) => {
      (branch.material as THREE.MeshPhongMaterial).color.setHex(0xff1493);
      (branch.material as THREE.MeshPhongMaterial).emissive.setHex(0xff1493);
      (branch.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.2;
    });
  }

  public setHover(hovered: boolean): void {
    this.branches.forEach((branch) => {
      const mat = branch.material as THREE.MeshPhongMaterial;
      if (hovered) {
        mat.emissive.copy(mat.color);
        mat.emissiveIntensity = 0.3;
      } else if (!this.isMaxLevel) {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }

  public getBoundingSphere(): THREE.Sphere {
    return new THREE.Sphere(this.mesh.position.clone(), this.currentHeight * 0.8);
  }

  public static getFeedsForMax(): number {
    return Coral.TOTAL_FEED_FOR_MAX;
  }

  public static getGrowthPerFeed(): number {
    return Coral.GROWTH_PER_FEED;
  }
}

export class CoralManager {
  public corals: Coral[] = [];
  public totalFeedCount: number = 0;
  public maxLevelReached: boolean = false;
  public lastSpecialEventTime: number | null = null;

  private bounds: THREE.Box3;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, bounds: THREE.Box3) {
    this.scene = scene;
    this.bounds = bounds;
  }

  public reset(): void {
    this.corals.forEach((c) => this.scene.remove(c.mesh));
    this.corals = [];
    this.totalFeedCount = 0;
    this.maxLevelReached = false;
    this.lastSpecialEventTime = null;
    this.spawnInitialCorals();
  }

  public spawnInitialCorals(): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const x = this.bounds.min.x + 1 + Math.random() * (this.bounds.max.x - this.bounds.min.x - 2);
      const z = this.bounds.min.z + 1 + Math.random() * (this.bounds.max.z - this.bounds.min.z - 2);
      const y = this.bounds.min.y + 0.1;

      const coral = new Coral(new THREE.Vector3(x, y, z));
      this.corals.push(coral);
      this.scene.add(coral.mesh);
    }
  }

  public registerFeed(): boolean {
    this.totalFeedCount++;
    const feedsPerGrowth = 10;

    if (this.totalFeedCount % feedsPerGrowth === 0 && this.corals.length > 0) {
      const nonMaxCorals = this.corals.filter((c) => !c.isMaxLevel);
      if (nonMaxCorals.length > 0) {
        const idx = Math.floor(Math.random() * nonMaxCorals.length);
        nonMaxCorals[idx].grow();
      }
    }

    if (this.totalFeedCount >= Coral.getFeedsForMax() && !this.maxLevelReached) {
      this.maxLevelReached = true;
      this.lastSpecialEventTime = Date.now();
      this.corals.forEach((c) => {
        while (!c.isMaxLevel) c.grow();
      });
      return true;
    }

    return false;
  }

  public getProgress(): number {
    return Math.min(100, (this.totalFeedCount / Coral.getFeedsForMax()) * 100);
  }

  public getLastEventFormatted(): string {
    if (!this.lastSpecialEventTime) return '尚未触发';
    const seconds = Math.floor((Date.now() - this.lastSpecialEventTime) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟前`;
  }

  public getCount(): number {
    return this.corals.length;
  }
}
