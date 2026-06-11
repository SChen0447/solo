import * as THREE from 'three';
import { PlantModel, PlantParams } from './PlantModel';

interface GrowthState {
  currentPhase: 'idle' | 'seed' | 'growing' | 'paused' | 'complete';
  mainBranchProgress: number;
  leafIndex: number;
  leafTimer: number;
  pauseTimer: number;
  isPaused: boolean;
}

export class GrowthAnimation {
  private plant: PlantModel;
  private state: GrowthState;
  private params: PlantParams;
  private targetParams: PlantParams;
  private isTransitioning: boolean;
  private transitionStart: number;
  private transitionDuration: number;
  private startParams: PlantParams;
  private shakeTime: number;
  private leafCountPerSide: number;
  private generatedLeaves: Set<string>;
  private generatedBranches: Set<number>;

  constructor(plant: PlantModel, initialParams: PlantParams) {
    this.plant = plant;
    this.params = { ...initialParams };
    this.targetParams = { ...initialParams };
    this.startParams = { ...initialParams };
    this.isTransitioning = false;
    this.transitionStart = 0;
    this.transitionDuration = 2000;
    this.shakeTime = 0;
    this.leafCountPerSide = 4;
    this.generatedLeaves = new Set();
    this.generatedBranches = new Set();

    this.state = {
      currentPhase: 'idle',
      mainBranchProgress: 0,
      leafIndex: 0,
      leafTimer: 0,
      pauseTimer: 0,
      isPaused: false,
    };
  }

  public async startGrowth(): Promise<void> {
    this.state.currentPhase = 'seed';
    await this.plant.sow();
    this.state.currentPhase = 'growing';
    this.state.mainBranchProgress = 0;
    this.state.leafIndex = 0;
    this.generatedLeaves.clear();
    this.generatedBranches.clear();
  }

  public reset(): void {
    this.plant.reset();
    this.state = {
      currentPhase: 'idle',
      mainBranchProgress: 0,
      leafIndex: 0,
      leafTimer: 0,
      pauseTimer: 0,
      isPaused: false,
    };
    this.generatedLeaves.clear();
    this.generatedBranches.clear();
  }

  public updateParams(newParams: PlantParams, instant: boolean = false): void {
    if (instant) {
      this.params = { ...newParams };
      this.targetParams = { ...newParams };
      this.startParams = { ...newParams };
      this.isTransitioning = false;
      this.plant.updateColors(this.params);
      this.plant.updateLeafWaterEffect(this.params);
    } else {
      this.startParams = { ...this.params };
      this.targetParams = { ...newParams };
      this.transitionStart = performance.now();
      this.isTransitioning = true;
    }
  }

  public update(deltaTime: number): void {
    this.shakeTime += deltaTime;

    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStart;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const eased = this.easeInOutCubic(progress);

      this.params.light = this.lerp(this.startParams.light, this.targetParams.light, eased);
      this.params.water = this.lerp(this.startParams.water, this.targetParams.water, eased);
      this.params.temperature = this.lerp(this.startParams.temperature, this.targetParams.temperature, eased);

      this.plant.updateColors(this.params);
      this.plant.updateLeafWaterEffect(this.params);

      if (progress >= 1) {
        this.isTransitioning = false;
      }
    }

    if (this.state.currentPhase === 'growing') {
      this.updateGrowth(deltaTime);
    }

    this.updatePlantPose(deltaTime);
  }

  private updateGrowth(deltaTime: number): void {
    const baseSpeed = this.getGrowthSpeed();
    const mainBranch = this.plant.getMainBranch();
    if (!mainBranch) return;

    if (this.state.isPaused) {
      this.state.pauseTimer -= deltaTime;
      if (this.state.pauseTimer <= 0) {
        this.state.isPaused = false;
      }
      return;
    }

    const maxProgress = this.plant.getMaxHeight();
    const growthIncrement = baseSpeed * deltaTime;
    this.state.mainBranchProgress = Math.min(this.state.mainBranchProgress + growthIncrement, maxProgress);

    mainBranch.currentHeight = this.state.mainBranchProgress;
    mainBranch.group.scale.y = this.state.mainBranchProgress / maxProgress;

    const leafSpacing = maxProgress / (this.leafCountPerSide * 2 + 1);
    for (let i = 0; i < this.leafCountPerSide; i++) {
      const leafHeight = leafSpacing * (i + 1);
      if (this.state.mainBranchProgress >= leafHeight) {
        for (const side of [-1, 1]) {
          const key = `main_${i}_${side}`;
          if (!this.generatedLeaves.has(key)) {
            this.plant.addLeaf(mainBranch, leafHeight / maxProgress, side);
            this.generatedLeaves.add(key);
            this.state.isPaused = true;
            this.state.pauseTimer = 0.2;
          }
        }
      }
    }

    const branchLayers = this.getBranchLayers();
    for (let layer = 1; layer <= branchLayers; layer++) {
      const branchHeight = maxProgress * (0.4 + layer * 0.15);
      if (this.state.mainBranchProgress >= branchHeight && !this.generatedBranches.has(layer)) {
        const angles = [-0.6, 0.6];
        angles.forEach((angle, idx) => {
          const branch = this.plant.addBranch(mainBranch, branchHeight / maxProgress, angle, layer);
          this.generatedBranches.add(layer * 10 + idx);
          for (let j = 0; j < 2; j++) {
            this.plant.addLeaf(branch, 0.5 + j * 0.3, j % 2 === 0 ? -1 : 1);
          }
        });
      }
    }

    const branches = this.plant.getBranches();
    branches.forEach((branch) => {
      if (branch.layer > 0) {
        const targetScale = Math.min((this.state.mainBranchProgress - (maxProgress * 0.3)) / (maxProgress * 0.5), 1);
        branch.group.scale.y = THREE.MathUtils.lerp(branch.group.scale.y, Math.max(0, targetScale), 0.05);
      }
    });

    const leaves = this.plant.getLeaves();
    leaves.forEach((leaf) => {
      const leafSize = this.getLeafScale();
      const targetScale = Math.min((this.state.mainBranchProgress / maxProgress) * 1.5, 1) * leafSize;
      leaf.mesh.parent!.scale.x = THREE.MathUtils.lerp(leaf.mesh.parent!.scale.x, targetScale, 0.08);
      leaf.mesh.parent!.scale.y = THREE.MathUtils.lerp(leaf.mesh.parent!.scale.y, targetScale, 0.08);
      leaf.mesh.parent!.scale.z = THREE.MathUtils.lerp(leaf.mesh.parent!.scale.z, targetScale, 0.08);
    });

    if (this.state.mainBranchProgress >= maxProgress) {
      this.state.currentPhase = 'complete';
    }
  }

  private updatePlantPose(deltaTime: number): void {
    const lightFactor = this.params.light / 100;
    const bendAngle = lightFactor * (Math.PI / 4);

    const mainBranch = this.plant.getMainBranch();
    if (mainBranch) {
      mainBranch.group.rotation.z = THREE.MathUtils.lerp(mainBranch.group.rotation.z, bendAngle, 0.05);
      mainBranch.group.rotation.x = THREE.MathUtils.lerp(mainBranch.group.rotation.x, bendAngle * 0.3, 0.05);
    }

    const tempFactor = this.getTemperatureFactor();
    const baseLeafTilt = this.getLeafBaseTilt();

    this.plant.getLeaves().forEach((leaf) => {
      let rotationX = baseLeafTilt;
      if (this.params.temperature > 30) {
        const shake = Math.sin(this.shakeTime * Math.PI * 2 * 2) * THREE.MathUtils.degToRad(2);
        rotationX += shake;
        leaf.mesh.parent!.rotation.y += shake * 0.5;
      }
      leaf.mesh.parent!.rotation.x = THREE.MathUtils.lerp(leaf.mesh.parent!.rotation.x, rotationX, 0.1);
    });
  }

  private getGrowthSpeed(): number {
    let speed = 0.5;
    if (this.params.temperature < 20) {
      speed *= 0.5;
    } else if (this.params.temperature > 30) {
      speed *= 1.5;
    }
    if (this.params.water < 30) {
      speed *= 0.7;
    } else if (this.params.water > 70) {
      speed *= 1.2;
    }
    return speed;
  }

  private getBranchLayers(): number {
    if (this.params.water < 30) return 2;
    if (this.params.water > 70) return 4;
    return 3;
  }

  private getLeafScale(): number {
    if (this.params.water < 30) return 0.6;
    if (this.params.water > 70) return 1.2;
    return 1;
  }

  private getLeafBaseTilt(): number {
    if (this.params.temperature < 20) {
      return THREE.MathUtils.degToRad(-10);
    } else if (this.params.temperature > 30) {
      return THREE.MathUtils.degToRad(15);
    }
    return 0;
  }

  private getTemperatureFactor(): number {
    return (this.params.temperature - 15) / 20;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public isGrowing(): boolean {
    return this.state.currentPhase === 'growing';
  }

  public isComplete(): boolean {
    return this.state.currentPhase === 'complete';
  }

  public getParams(): PlantParams {
    return { ...this.params };
  }
}
