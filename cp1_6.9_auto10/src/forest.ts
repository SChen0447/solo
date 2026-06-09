import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { playLowFrequencySound } from './audio';

export interface TreeData {
  id: number;
  position: THREE.Vector3;
  height: number;
  crownRadius: number;
  crownColor: THREE.Color;
  baseCrownColor: THREE.Color;
  sporeCount: number;
  parentId: number | null;
  group: THREE.Group;
  trunkMesh: THREE.Mesh;
  crownMesh: THREE.Mesh;
  isGrowing: boolean;
  growStartTime: number;
  growDuration: number;
  initialHeight: number;
  targetHeight: number;
  highlightStartTime: number | null;
}

export interface ForestParams {
  windStrength: number;
  windDirection: THREE.Vector2;
  colorTheme: 'purple' | 'green' | 'orange';
}

export class Forest {
  scene: THREE.Scene;
  trees: Map<number, TreeData> = new Map();
  private noise2D = createNoise2D();
  private terrainMesh: THREE.Mesh | null = null;
  private treeIdCounter = 0;
  params: ForestParams;
  private colorCycleTime = 0;
  private readonly colorCyclePeriod = 60;
  private onTreeAddedCallback: ((tree: TreeData) => void) | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.params = {
      windStrength: 1.2,
      windDirection: new THREE.Vector2(1, 0.3).normalize(),
      colorTheme: 'purple'
    };
  }

  setOnTreeAdded(callback: (tree: TreeData) => void): void {
    this.onTreeAddedCallback = callback;
  }

  init(): void {
    this.scene.fog = new THREE.FogExp2(0x0a0a2a, 0.02);

    this.ambientLight = new THREE.AmbientLight(0x8060c0, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffd0a0, 0.8);
    this.directionalLight.position.set(5, 10, 5);
    this.scene.add(this.directionalLight);

    this.createTerrain();
    this.generateInitialTrees(12);
  }

  private createTerrain(): void {
    const size = 40;
    const segments = 64;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noiseVal = this.noise2D(x * 0.1, z * 0.1) * 0.3;
      positions.setY(i, noiseVal);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x1a0a2e,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x0a0515,
      emissiveIntensity: 0.2
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  private generateInitialTrees(count: number): void {
    const colors = [
      new THREE.Color(0xe0b0ff),
      new THREE.Color(0xb0ffb0),
      new THREE.Color(0xffe0a0)
    ];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 12;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const height = 0.8 + Math.random() * 0.6;
      const sporeColor = colors[Math.floor(Math.random() * colors.length)];
      const treeColor = this.dimColor(sporeColor, 0.4);

      this.addTree(new THREE.Vector3(x, 0, z), height, treeColor, sporeColor, null, false);
    }
  }

  addTree(
    position: THREE.Vector3,
    height: number,
    _treeColor: THREE.Color,
    crownColor: THREE.Color,
    parentId: number | null,
    animateGrowth: boolean
  ): TreeData {
    const id = ++this.treeIdCounter;
    const group = new THREE.Group();

    const trunkHeight = animateGrowth ? 0.3 : height * 0.6;
    const trunkRadius = 0.08 + height * 0.04;
    const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2a5e,
      roughness: 0.8,
      emissive: 0x2a1540,
      emissiveIntensity: 0.2
    });
    const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunkMesh.position.y = trunkHeight / 2;
    group.add(trunkMesh);

    const crownRadius = animateGrowth ? 0.15 : height * 0.4;
    const crownGeometry = new THREE.SphereGeometry(crownRadius, 8, 6);
    crownGeometry.scale(1, 1.3, 1);
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: crownColor,
      roughness: 0.5,
      emissive: crownColor,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.95
    });
    const crownMesh = new THREE.Mesh(crownGeometry, crownMaterial);
    crownMesh.position.y = trunkHeight + crownRadius * 0.8;
    group.add(crownMesh);

    group.position.copy(position);
    this.scene.add(group);

    const tree: TreeData = {
      id,
      position: position.clone(),
      height: animateGrowth ? 0.3 : height,
      crownRadius,
      crownColor: crownColor.clone(),
      baseCrownColor: crownColor.clone(),
      sporeCount: 0,
      parentId,
      group,
      trunkMesh,
      crownMesh,
      isGrowing: animateGrowth,
      growStartTime: animateGrowth ? performance.now() : 0,
      growDuration: 3000,
      initialHeight: 0.3,
      targetHeight: height,
      highlightStartTime: null
    };

    this.trees.set(id, tree);

    if (this.onTreeAddedCallback) {
      this.onTreeAddedCallback(tree);
    }

    return tree;
  }

  private dimColor(color: THREE.Color, factor: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.max(0.1, hsl.l * (1 - factor));
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
  }

  getCrownWorldPosition(tree: TreeData): THREE.Vector3 {
    const pos = new THREE.Vector3();
    tree.crownMesh.getWorldPosition(pos);
    return pos;
  }

  incrementSporeCount(treeId: number): void {
    const tree = this.trees.get(treeId);
    if (!tree) return;

    tree.sporeCount++;
    if (tree.sporeCount >= 5) {
      tree.sporeCount = 0;
      this.shiftColorToWarm(tree);
      playLowFrequencySound();
    }
  }

  private shiftColorToWarm(tree: TreeData): void {
    const hsl = { h: 0, s: 0, l: 0 };
    tree.crownColor.getHSL(hsl);
    hsl.h = (hsl.h + 5 / 360) % 1;
    tree.crownColor.setHSL(hsl.h, hsl.s, hsl.l);
    tree.baseCrownColor.copy(tree.crownColor);
    const material = tree.crownMesh.material as THREE.MeshStandardMaterial;
    material.color.copy(tree.crownColor);
    material.emissive.copy(tree.crownColor);
  }

  highlightTreeAndDescendants(treeId: number): void {
    const descendants = this.getTreeAndDescendants(treeId);
    const now = performance.now();
    descendants.forEach(id => {
      const tree = this.trees.get(id);
      if (tree) {
        tree.highlightStartTime = now;
      }
    });
  }

  private getTreeAndDescendants(treeId: number): number[] {
    const result: number[] = [treeId];
    const stack = [treeId];
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      this.trees.forEach(tree => {
        if (tree.parentId === currentId) {
          result.push(tree.id);
          stack.push(tree.id);
        }
      });
    }
    return result;
  }

  update(deltaTime: number, elapsedTime: number): void {
    this.colorCycleTime += deltaTime;
    this.updateColorCycle(elapsedTime);
    this.updateGrowingTrees();
    this.updateHighlights();
  }

  private updateColorCycle(elapsedTime: number): void {
    const t = (elapsedTime % this.colorCyclePeriod) / this.colorCyclePeriod;
    let themeHue: number;
    switch (this.params.colorTheme) {
      case 'purple': themeHue = 0.75; break;
      case 'green': themeHue = 0.42; break;
      case 'orange': themeHue = 0.08; break;
    }

    const cycleHue = (themeHue + Math.sin(t * Math.PI * 2) * 0.08 + 1) % 1;

    if (this.ambientLight) {
      const ambientColor = new THREE.Color().setHSL(cycleHue, 0.5, 0.25);
      this.ambientLight.color.copy(ambientColor);
    }

    if (this.directionalLight) {
      const dirColor = new THREE.Color().setHSL((cycleHue + 0.05) % 1, 0.6, 0.6);
      this.directionalLight.color.copy(dirColor);
    }

    if (this.terrainMesh) {
      const mat = this.terrainMesh.material as THREE.MeshStandardMaterial;
      const terrainColor = new THREE.Color().setHSL(cycleHue, 0.3, 0.08);
      mat.color.copy(terrainColor);
      mat.emissive.setHSL(cycleHue, 0.4, 0.04);
    }
  }

  private updateGrowingTrees(): void {
    const now = performance.now();
    this.trees.forEach(tree => {
      if (!tree.isGrowing) return;

      const elapsed = now - tree.growStartTime;
      if (elapsed >= tree.growDuration) {
        tree.isGrowing = false;
        tree.height = tree.targetHeight;
        this.updateTreeVisuals(tree, tree.targetHeight);
      } else {
        const progress = elapsed / tree.growDuration;
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentHeight = tree.initialHeight + (tree.targetHeight - tree.initialHeight) * eased;
        tree.height = currentHeight;
        this.updateTreeVisuals(tree, currentHeight);
      }
    });
  }

  private updateTreeVisuals(tree: TreeData, height: number): void {
    const trunkHeight = height * 0.6;
    const trunkRadius = 0.08 + height * 0.04;
    const crownRadius = height * 0.4;

    tree.trunkMesh.geometry.dispose();
    tree.trunkMesh.geometry = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6);
    tree.trunkMesh.position.y = trunkHeight / 2;

    tree.crownMesh.geometry.dispose();
    const crownGeo = new THREE.SphereGeometry(crownRadius, 8, 6);
    crownGeo.scale(1, 1.3, 1);
    tree.crownMesh.geometry = crownGeo;
    tree.crownMesh.position.y = trunkHeight + crownRadius * 0.8;

    tree.crownRadius = crownRadius;
  }

  private updateHighlights(): void {
    const now = performance.now();
    this.trees.forEach(tree => {
      if (tree.highlightStartTime === null) return;

      const elapsed = now - tree.highlightStartTime;
      const totalDuration = 2000;

      if (elapsed >= totalDuration) {
        tree.highlightStartTime = null;
        const mat = tree.crownMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.2;
        mat.opacity = 0.95;
      } else {
        const t = elapsed / totalDuration;
        const intensity = t < 0.3 ? 0.8 : 0.8 * (1 - (t - 0.3) / 0.7);
        const opacity = t < 0.3 ? 1.0 : 0.95 + 0.05 * (1 - (t - 0.3) / 0.7);
        const mat = tree.crownMesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = Math.max(0.2, intensity);
        mat.opacity = opacity;
      }
    });
  }

  getTreeCount(): number {
    return this.trees.size;
  }

  getTerrainHeight(x: number, z: number): number {
    return this.noise2D(x * 0.1, z * 0.1) * 0.3;
  }

  findTreeAtPosition(worldPos: THREE.Vector3): TreeData | null {
    let closest: TreeData | null = null;
    let closestDist = Infinity;

    this.trees.forEach(tree => {
      const crownPos = this.getCrownWorldPosition(tree);
      const dx = worldPos.x - crownPos.x;
      const dz = worldPos.z - crownPos.z;
      const dy = worldPos.y - crownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const threshold = tree.crownRadius * 1.5 + 0.5;
      if (dist < threshold && dist < closestDist) {
        closest = tree;
        closestDist = dist;
      }
    });

    return closest;
  }
}
