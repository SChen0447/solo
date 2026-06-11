import * as THREE from 'three';
import { Bee, BeeMode, BeeStatus } from './Bee';
import { PheromoneManager } from './Pheromone';

export class BeeSwarmManager {
  bees: Bee[] = [];
  pheromoneManager: PheromoneManager;
  private scene: THREE.Scene;
  private beeCount: number = 25;
  private evaporationRate: number = 1.0;

  totalPheromonesReleased: number = 0;
  collectTimes: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pheromoneManager = new PheromoneManager();
  }

  init(count?: number, evaporationRate?: number): void {
    if (count !== undefined) this.beeCount = count;
    if (evaporationRate !== undefined) this.evaporationRate = evaporationRate;

    for (const bee of this.bees) {
      bee.dispose();
    }
    this.bees = [];
    this.pheromoneManager.clear();
    this.totalPheromonesReleased = 0;
    this.collectTimes = [];

    for (let i = 0; i < this.beeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 3;
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 1.0, Math.sin(angle) * radius);
      const bee = new Bee(i, pos, this.scene, this.pheromoneManager, this.evaporationRate);
      this.bees.push(bee);
    }
  }

  setEvaporationRate(rate: number): void {
    this.evaporationRate = rate;
    for (const bee of this.bees) {
      bee.setEvaporationRate(rate);
    }
  }

  update(dt: number, flowers: THREE.Object3D[], obstacles: THREE.Object3D[], time: number): void {
    const prevPheromoneCount = this.pheromoneManager.getTotalCount();

    for (const bee of this.bees) {
      bee.update(dt, flowers, obstacles, this.bees, time);
    }

    const deadPheromones = this.pheromoneManager.update(dt);

    const newPheromoneCount = this.pheromoneManager.getTotalCount();
    const addedCount = newPheromoneCount - (prevPheromoneCount - deadPheromones.length);
    if (addedCount > 0) {
      this.totalPheromonesReleased += addedCount;
    }

    for (const bee of this.bees) {
      if (bee.totalTimeToCollect > 0) {
        this.collectTimes.push(bee.totalTimeToCollect);
        bee.totalTimeToCollect = 0;
        if (this.collectTimes.length > 100) {
          this.collectTimes.shift();
        }
      }
    }
  }

  getActiveBeeCount(): number {
    return this.bees.filter(
      (b) => b.status !== BeeStatus.Collecting
    ).length;
  }

  getTotalCollectCount(): number {
    return this.bees.reduce((sum, b) => sum + b.collectCount, 0);
  }

  getAverageCollectTime(): number {
    if (this.collectTimes.length === 0) return 0;
    return this.collectTimes.reduce((a, b) => a + b, 0) / this.collectTimes.length;
  }

  reset(): void {
    for (const bee of this.bees) {
      bee.reset();
    }
    this.pheromoneManager.clear();
    this.totalPheromonesReleased = 0;
    this.collectTimes = [];
  }

  dispose(): void {
    for (const bee of this.bees) {
      bee.dispose();
    }
    this.bees = [];
    this.pheromoneManager.clear();
  }
}
