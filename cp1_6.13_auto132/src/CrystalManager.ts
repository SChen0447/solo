import * as THREE from 'three';
import { Crystal, CrystalConfig } from './Crystal';

export interface ManagerConfig {
  scene: THREE.Scene;
  maxCrystals?: number;
  growthSpeed?: number;
  fragmentForce?: number;
  colorCycleSpeed?: number;
}

interface ColorPropagation {
  sourceHue: number;
  center: THREE.Vector3;
  startTime: number;
  duration: number;
  affectedCrystals: Set<number>;
}

interface InitialCrystalState {
  config: CrystalConfig;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class CrystalManager {
  public crystals: Crystal[] = [];
  
  private scene: THREE.Scene;
  private maxCrystals: number;
  private growthSpeed: number;
  private fragmentForce: number;
  private colorCycleSpeed: number;
  private colorTransitionStep: number = 0.02;
  
  private colorPropagations: ColorPropagation[] = [];
  private initialStates: InitialCrystalState[] = [];
  private isResetting: boolean = false;
  private resetProgress: number = 0;
  private resetDuration: number = 1;
  private autoColorCycleOffset: number = 0;

  constructor(config: ManagerConfig) {
    this.scene = config.scene;
    this.maxCrystals = config.maxCrystals || 100;
    this.growthSpeed = config.growthSpeed || 1;
    this.fragmentForce = config.fragmentForce || 1;
    this.colorCycleSpeed = config.colorCycleSpeed || 0.5;
  }

  public generateInitialCrystals(count: number): void {
    this.initialStates = [];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 15;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 2 + Math.random() * 6;
      const polyhedronCount = 6 + Math.floor(Math.random() * 7);
      const hue = 0.6 + Math.random() * 0.2;
      const rotationSpeed = 0.005 + Math.random() * 0.045;

      const config: CrystalConfig = {
        position: new THREE.Vector3(x, height / 2, z),
        height,
        polyhedronCount,
        hue,
        rotationSpeed
      };

      this.initialStates.push({ config });
      
      const crystal = new Crystal(config);
      crystal.setScene(this.scene);
      crystal.setColorTransitionSpeed(this.colorTransitionStep);
      this.crystals.push(crystal);
      this.scene.add(crystal.group);
    }
  }

  public update(delta: number, time: number): void {
    const adjustedDelta = delta * this.growthSpeed;

    if (this.colorCycleSpeed > 0) {
      this.autoColorCycleOffset += delta * this.colorCycleSpeed * 0.05;
      this.updateAutoColorCycle();
    }

    if (this.isResetting) {
      this.updateReset(adjustedDelta);
    }

    this.updateColorPropagations(time);

    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];
      crystal.update(adjustedDelta, time);

      if (!crystal.isAlive() && !this.isResetting) {
        crystal.dispose();
        this.crystals.splice(i, 1);
      }
    }

    this.cleanupOldCrystals();
  }

  private updateAutoColorCycle(): void {
    this.crystals.forEach((crystal, index) => {
      if (!crystal.isDendrite && !crystal.isFragment) {
        const baseHue = this.initialStates[index]?.config.hue || 0.7;
        const cycledHue = baseHue + Math.sin(this.autoColorCycleOffset + index * 0.3) * 0.05;
        crystal.setColor(((cycledHue % 1) + 1) % 1);
      }
    });
  }

  private updateReset(delta: number): void {
    this.resetProgress += delta / this.resetDuration;
    const easedProgress = easeOutCubic(Math.min(this.resetProgress, 1));

    this.crystals.forEach((crystal, index) => {
      const initialState = this.initialStates[index];
      if (initialState) {
        const targetPosition = initialState.config.position.clone();
        const currentPosition = crystal.group.position;
        
        crystal.group.position.lerp(targetPosition, easedProgress * 0.1);
        
        if (easedProgress > 0.5 && crystal.isAlive()) {
          crystal.setColor(initialState.config.hue);
        }
      }
    });

    if (this.resetProgress >= 1) {
      this.completeReset();
    }
  }

  private completeReset(): void {
    this.crystals.forEach(crystal => crystal.dispose());
    this.crystals = [];
    this.colorPropagations = [];
    this.isResetting = false;
    this.resetProgress = 0;
    this.autoColorCycleOffset = 0;

    this.initialStates.forEach(state => {
      const crystal = new Crystal(state.config);
      crystal.setScene(this.scene);
      crystal.setColorTransitionSpeed(this.colorTransitionStep);
      this.crystals.push(crystal);
      this.scene.add(crystal.group);
    });
  }

  private updateColorPropagations(time: number): void {
    for (let i = this.colorPropagations.length - 1; i >= 0; i--) {
      const propagation = this.colorPropagations[i];
      const elapsed = (time - propagation.startTime) / 1000;
      const progress = Math.min(elapsed / propagation.duration, 1);
      const waveRadius = progress * 25;

      this.crystals.forEach(crystal => {
        if (propagation.affectedCrystals.has(crystal.id)) return;
        if (crystal.isFragment) return;

        const distance = crystal.getWorldPosition().distanceTo(propagation.center);
        if (distance <= waveRadius) {
          propagation.affectedCrystals.add(crystal.id);
          const delay = distance / 25 * 0.5;
          
          setTimeout(() => {
            if (crystal && this.crystals.includes(crystal)) {
              crystal.setColor(propagation.sourceHue);
            }
          }, delay * 1000);
        }
      });

      if (progress >= 1) {
        this.colorPropagations.splice(i, 1);
      }
    }
  }

  private cleanupOldCrystals(): void {
    while (this.crystals.length > this.maxCrystals) {
      const oldestCrystal = this.crystals.reduce((oldest, current) => {
        return current.createdAt < oldest.createdAt ? current : oldest;
      });
      
      oldestCrystal.dispose();
      const index = this.crystals.indexOf(oldestCrystal);
      if (index > -1) {
        this.crystals.splice(index, 1);
      }
    }
  }

  public onCrystalClick(crystal: Crystal): void {
    if (this.isResetting) return;
    if (crystal.isFragment || crystal.isDendrite) return;

    const sourceHue = crystal.getColor();
    const center = crystal.getWorldPosition().clone();

    crystal.shatter(this.fragmentForce);

    const dendrites = crystal.growDendrite();
    dendrites.forEach(dendrite => {
      dendrite.setColorTransitionSpeed(this.colorTransitionStep);
      this.crystals.push(dendrite);
    });

    this.propagateColor(sourceHue, center);
  }

  public propagateColor(sourceHue: number, center: THREE.Vector3): void {
    const propagation: ColorPropagation = {
      sourceHue,
      center: center.clone(),
      startTime: performance.now(),
      duration: 3,
      affectedCrystals: new Set()
    };
    this.colorPropagations.push(propagation);
  }

  public reset(): void {
    if (this.isResetting) return;
    this.isResetting = true;
    this.resetProgress = 0;
  }

  public setGrowthSpeed(speed: number): void {
    this.growthSpeed = Math.max(0.1, Math.min(2.0, speed));
  }

  public setFragmentForce(force: number): void {
    this.fragmentForce = Math.max(0.5, Math.min(2.0, force));
  }

  public setColorCycleSpeed(speed: number): void {
    this.colorCycleSpeed = Math.max(0, Math.min(1.0, speed));
  }

  public getGrowthSpeed(): number {
    return this.growthSpeed;
  }

  public getFragmentForce(): number {
    return this.fragmentForce;
  }

  public getColorCycleSpeed(): number {
    return this.colorCycleSpeed;
  }

  public getCrystalCount(): number {
    return this.crystals.length;
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.crystals.forEach(crystal => {
      meshes.push(...crystal.getMeshes());
    });
    return meshes;
  }

  public findCrystalByMesh(mesh: THREE.Object3D): Crystal | null {
    let current: THREE.Object3D | null = mesh;
    while (current) {
      if (current.userData.crystal) {
        const crystal = current.userData.crystal as Crystal;
        if (this.crystals.includes(crystal)) {
          return crystal;
        }
      }
      current = current.parent;
    }
    return null;
  }

  public dispose(): void {
    this.crystals.forEach(crystal => crystal.dispose());
    this.crystals = [];
    this.colorPropagations = [];
  }
}
