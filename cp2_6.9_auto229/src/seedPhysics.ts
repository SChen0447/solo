import * as THREE from 'three';
import { SeedData, Dandelion } from './dandelion';

export interface LandEvent {
  position: THREE.Vector3;
  seedIndex: number;
}

export class PhysicsSystem {
  public gravity: number = 1.0;
  public windStrength: number = 1.0;
  public windDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  public timeScale: number = 1.0;

  public onSeedLand: ((event: LandEvent) => void) | null = null;
  public onAllSeedsLanded: (() => void) | null = null;

  private seeds: SeedData[] = [];
  private dandelion: Dandelion;
  private dummyMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private dummyPosition: THREE.Vector3 = new THREE.Vector3();
  private dummyQuaternion: THREE.Quaternion = new THREE.Quaternion();
  private dummyScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private dummyEuler: THREE.Euler = new THREE.Euler();

  constructor(dandelion: Dandelion) {
    this.dandelion = dandelion;
  }

  public setSeeds(seeds: SeedData[]): void {
    this.seeds = seeds;
  }

  public setWindFromDrag(deltaX: number, deltaY: number, dragSpeed: number): void {
    this.windDirection.set(deltaX, 0, -deltaY).normalize();
    if (isNaN(this.windDirection.x)) {
      this.windDirection.set(1, 0, 0);
    }
    this.windStrength = Math.min(dragSpeed, 2.0);
  }

  public update(dt: number): void {
    if (this.seeds.length === 0) return;

    const scaledDt = dt * this.timeScale;
    let allLanded = true;
    let hasActiveSeeds = false;

    for (let i = 0; i < this.seeds.length; i++) {
      const seed = this.seeds[i];
      if (!seed.alive) continue;
      hasActiveSeeds = true;

      if (!seed.landed) {
        allLanded = false;

        const windForce = this.windDirection.clone().multiplyScalar(this.windStrength * 0.3 * scaledDt);
        seed.velocity.x += windForce.x;
        seed.velocity.z += windForce.z;

        const buoyancy = 0.7;
        seed.velocity.y -= (this.gravity - buoyancy) * scaledDt;

        const drag = 0.992;
        seed.velocity.multiplyScalar(drag);

        seed.position.x += seed.velocity.x * scaledDt;
        seed.position.y += seed.velocity.y * scaledDt;
        seed.position.z += seed.velocity.z * scaledDt;

        seed.rotation.x += seed.angularVelocity.x * scaledDt;
        seed.rotation.y += seed.angularVelocity.y * scaledDt;
        seed.rotation.z += seed.angularVelocity.z * scaledDt;

        if (seed.position.y <= 0.02) {
          seed.position.y = 0.02;
          seed.landed = true;
          seed.velocity.set(0, 0, 0);

          if (this.onSeedLand) {
            this.onSeedLand({
              position: seed.position.clone(),
              seedIndex: i
            });
          }
        }
      }

      this.updateInstanceMatrices(i, seed);
    }

    if (hasActiveSeeds && allLanded && this.onAllSeedsLanded) {
      this.onAllSeedsLanded();
    }

    if (this.dandelion.seedsMesh) {
      this.dandelion.seedsMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.dandelion.parachuteMesh) {
      this.dandelion.parachuteMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateInstanceMatrices(index: number, seed: SeedData): void {
    this.dummyPosition.copy(seed.position);
    this.dummyEuler.copy(seed.rotation);
    this.dummyQuaternion.setFromEuler(this.dummyEuler);
    this.dummyScale.setScalar(seed.landed ? 0.001 : 1);
    this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);

    if (this.dandelion.seedsMesh) {
      this.dandelion.seedsMesh.setMatrixAt(index, this.dummyMatrix);
    }

    if (this.dandelion.parachuteMesh) {
      this.dummyPosition.copy(seed.position);
      this.dummyPosition.y += 0.14;
      this.dummyScale.setScalar(seed.landed ? 0.001 : 1);
      this.dummyEuler.set(
        seed.rotation.x,
        seed.rotation.y,
        seed.rotation.z
      );
      this.dummyQuaternion.setFromEuler(this.dummyEuler);
      this.dummyMatrix.compose(this.dummyPosition, this.dummyQuaternion, this.dummyScale);
      this.dandelion.parachuteMesh.setMatrixAt(index, this.dummyMatrix);
    }
  }

  public allLanded(): boolean {
    if (this.seeds.length === 0) return false;
    return this.seeds.every(s => s.landed || !s.alive);
  }

  public activeSeedCount(): number {
    return this.seeds.filter(s => s.alive && !s.landed).length;
  }
}
