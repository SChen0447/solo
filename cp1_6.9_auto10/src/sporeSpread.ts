import * as THREE from 'three';
import { Forest, TreeData } from './forest';

interface Spore {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  mesh: THREE.Mesh;
  sourceTreeId: number;
  life: number;
  maxLife: number;
}

export interface SporeSpreadParams {
  windStrength: number;
  windDirection: THREE.Vector2;
  spawningInterval: number;
}

const SPORE_COLORS = [
  new THREE.Color(0xe0b0ff),
  new THREE.Color(0xb0ffb0),
  new THREE.Color(0xffe0a0)
];

export class SporeSpread {
  scene: THREE.Scene;
  forest: Forest;
  spores: Map<number, Spore> = new Map();
  private sporeIdCounter = 0;
  private spawningTimer = 0;
  private windChangeTimer = 0;
  private nextWindChangeTime: number;
  params: SporeSpreadParams;
  private readonly gravity = -1.5;

  constructor(scene: THREE.Scene, forest: Forest) {
    this.scene = scene;
    this.forest = forest;
    this.params = {
      windStrength: 1.2,
      windDirection: new THREE.Vector2(1, 0.3).normalize(),
      spawningInterval: 3
    };
    this.nextWindChangeTime = this.getRandomWindChangeInterval();
  }

  private getRandomWindChangeInterval(): number {
    return 15 + Math.random() * 15;
  }

  updateParams(params: Partial<SporeSpreadParams>): void {
    Object.assign(this.params, params);
    this.forest.params.windStrength = this.params.windStrength;
    this.forest.params.windDirection = this.params.windDirection;
  }

  update(deltaTime: number): void {
    this.windChangeTimer += deltaTime;
    if (this.windChangeTimer >= this.nextWindChangeTime) {
      this.windChangeTimer = 0;
      this.nextWindChangeTime = this.getRandomWindChangeInterval();
      this.changeWindDirection();
    }

    this.params.windStrength = 0.5 + Math.random() * 1.5;
    this.forest.params.windStrength = this.params.windStrength;

    this.spawningTimer += deltaTime;
    const effectiveInterval = this.getEffectiveSpawningInterval();
    if (this.spawningTimer >= effectiveInterval) {
      this.spawningTimer = 0;
      this.spawnSporesFromTrees();
    }

    this.updateSpores(deltaTime);
  }

  private getEffectiveSpawningInterval(): number {
    const treeCount = this.forest.getTreeCount();
    if (treeCount > 100) {
      return Math.max(8, this.params.spawningInterval + 5);
    }
    return this.params.spawningInterval;
  }

  private getEffectiveSporeCount(): number {
    const treeCount = this.forest.getTreeCount();
    return treeCount > 100 ? 5 : 10;
  }

  private changeWindDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.params.windDirection.set(Math.cos(angle), Math.sin(angle)).normalize();
    this.forest.params.windDirection.copy(this.params.windDirection);
  }

  private spawnSporesFromTrees(): void {
    const trees = Array.from(this.forest.trees.values()).filter(t => !t.isGrowing);
    if (trees.length === 0) return;

    const sporeCount = this.getEffectiveSporeCount();
    const countPerTree = Math.max(1, Math.ceil(sporeCount / trees.length));

    for (let i = 0; i < sporeCount; i++) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      for (let j = 0; j < countPerTree && this.spores.size < 500; j++) {
        this.spawnSporeFromTree(tree);
      }
      if (this.spores.size >= 500) break;
    }
  }

  private spawnSporeFromTree(tree: TreeData): void {
    const crownPos = this.forest.getCrownWorldPosition(tree);
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * tree.crownRadius * 1.5,
      (Math.random() - 0.5) * tree.crownRadius * 0.8,
      (Math.random() - 0.5) * tree.crownRadius * 1.5
    );
    const spawnPos = crownPos.clone().add(offset);

    const color = SPORE_COLORS[Math.floor(Math.random() * SPORE_COLORS.length)].clone();

    const geometry = new THREE.SphereGeometry(0.1, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const windVel = new THREE.Vector3(
      this.params.windDirection.x * this.params.windStrength,
      0,
      this.params.windDirection.y * this.params.windStrength
    );
    const randomVel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 0.8,
      (Math.random() - 0.5) * 0.5
    );

    const spore: Spore = {
      id: ++this.sporeIdCounter,
      position: spawnPos.clone(),
      velocity: windVel.add(randomVel),
      color,
      mesh,
      sourceTreeId: tree.id,
      life: 0,
      maxLife: 8 + Math.random() * 8
    };

    this.spores.set(spore.id, spore);
  }

  private updateSpores(deltaTime: number): void {
    const toRemove: number[] = [];

    this.spores.forEach(spore => {
      spore.life += deltaTime;

      spore.velocity.x += this.params.windDirection.x * this.params.windStrength * deltaTime * 0.5;
      spore.velocity.z += this.params.windDirection.y * this.params.windStrength * deltaTime * 0.5;
      spore.velocity.y += this.gravity * deltaTime;

      spore.velocity.x += (Math.random() - 0.5) * 0.3 * deltaTime * 10;
      spore.velocity.z += (Math.random() - 0.5) * 0.3 * deltaTime * 10;

      spore.velocity.clampLength(0, 3);

      spore.position.addScaledVector(spore.velocity, deltaTime);
      spore.mesh.position.copy(spore.position);

      const opacity = 0.8 * (1 - spore.life / spore.maxLife * 0.5);
      (spore.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.2, opacity);

      if (this.checkCollisionAndGrow(spore)) {
        toRemove.push(spore.id);
        return;
      }

      if (spore.life >= spore.maxLife || spore.position.y < -2) {
        toRemove.push(spore.id);
      }
    });

    toRemove.forEach(id => this.removeSpore(id));
  }

  private checkCollisionAndGrow(spore: Spore): boolean {
    const terrainHeight = this.forest.getTerrainHeight(spore.position.x, spore.position.z);
    if (spore.position.y <= terrainHeight + 0.1) {
      this.tryGrowTree(spore, new THREE.Vector3(spore.position.x, terrainHeight, spore.position.z));
      return true;
    }

    for (const tree of this.forest.trees.values()) {
      if (tree.isGrowing) continue;

      const trunkTop = tree.position.y + tree.height * 0.6;
      const trunkRadius = 0.08 + tree.height * 0.04;

      const dx = spore.position.x - tree.position.x;
      const dz = spore.position.z - tree.position.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);

      if (distXZ < trunkRadius + 0.1 &&
          spore.position.y > tree.position.y &&
          spore.position.y < trunkTop) {
        const growPos = new THREE.Vector3(
          tree.position.x + dx * 0.3,
          spore.position.y,
          tree.position.z + dz * 0.3
        );
        this.tryGrowTree(spore, growPos);
        return true;
      }
    }

    return false;
  }

  private tryGrowTree(spore: Spore, position: THREE.Vector3): boolean {
    if (Math.random() > 0.4) {
      return false;
    }

    const targetHeight = 0.8 + Math.random() * 0.4;
    const treeColor = this.dimColor(spore.color, 0.4);
    const crownColor = this.dimColor(spore.color, 0.4);

    const newTree = this.forest.addTree(
      position,
      targetHeight,
      treeColor,
      crownColor,
      spore.sourceTreeId,
      true
    );

    this.forest.incrementSporeCount(spore.sourceTreeId);

    return newTree !== null;
  }

  private dimColor(color: THREE.Color, factor: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.l = Math.max(0.1, hsl.l * (1 - factor));
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
  }

  private removeSpore(id: number): void {
    const spore = this.spores.get(id);
    if (!spore) return;

    spore.mesh.geometry.dispose();
    (spore.mesh.material as THREE.Material).dispose();
    this.scene.remove(spore.mesh);
    this.spores.delete(id);
  }

  getSporeCount(): number {
    return this.spores.size;
  }
}
