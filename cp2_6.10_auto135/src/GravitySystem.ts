import * as THREE from 'three';
import { Planet } from './Planet';

export interface OrbitData {
  simulationTime: number;
  averageSpeed: number;
  eccentricityChanges: Map<string, number>;
  perturbationStrengths: Map<string, number>;
}

export class GravitySystem {
  private planets: Planet[];
  private starMass: number;
  private G: number = 50.0;
  private simulationTime: number = 0;
  private fixedTimeStep: number = 0.002;

  constructor(planets: Planet[], starMass: number = 1000) {
    this.planets = planets;
    this.starMass = starMass;
  }

  public update(timeMultiplier: number): OrbitData {
    const steps = Math.max(1, Math.ceil(timeMultiplier));
    const dt = this.fixedTimeStep * (timeMultiplier / steps);

    for (let step = 0; step < steps; step++) {
      this.simulationTime += dt;
      this.integrate(dt);
    }

    this.updateOrbitalElements();

    let totalSpeed = 0;
    const eccentricityChanges = new Map<string, number>();
    const perturbationStrengths = new Map<string, number>();

    for (const planet of this.planets) {
      totalSpeed += planet.getSpeed();
      eccentricityChanges.set(planet.name, planet.getEccentricityChangePercent());
      perturbationStrengths.set(planet.name, planet.perturbationStrength);
    }

    return {
      simulationTime: this.simulationTime,
      averageSpeed: this.planets.length > 0 ? totalSpeed / this.planets.length : 0,
      eccentricityChanges,
      perturbationStrengths
    };
  }

  private integrate(dt: number): void {
    const accelerations: THREE.Vector3[] = [];
    const perturbationMagnitudes: number[] = [];

    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      const totalAcc = new THREE.Vector3(0, 0, 0);
      let perturbationAcc = 0;

      const starDir = new THREE.Vector3().subVectors(
        new THREE.Vector3(0, 0, 0),
        planet.group.position
      );
      const starDistSq = Math.max(starDir.lengthSq(), 0.01);
      const starDist = Math.sqrt(starDistSq);
      const starAccMag = (this.G * this.starMass) / starDistSq;
      starDir.normalize().multiplyScalar(starAccMag);
      totalAcc.add(starDir);

      for (let j = 0; j < this.planets.length; j++) {
        if (i === j) continue;
        const other = this.planets[j];
        const dir = new THREE.Vector3().subVectors(
          other.group.position,
          planet.group.position
        );
        const distSq = Math.max(dir.lengthSq(), 0.01);
        const dist = Math.sqrt(distSq);
        const accMag = (this.G * other.mass) / distSq;
        dir.normalize().multiplyScalar(accMag);
        totalAcc.add(dir);
        perturbationAcc += accMag;
      }

      accelerations.push(totalAcc);
      perturbationMagnitudes.push(perturbationAcc);
    }

    const maxPerturbation = Math.max(...perturbationMagnitudes, 0.001);
    for (let i = 0; i < this.planets.length; i++) {
      const planet = this.planets[i];
      planet.velocity.add(accelerations[i].clone().multiplyScalar(dt));
      planet.group.position.add(planet.velocity.clone().multiplyScalar(dt));

      const normalizedPerturbation = Math.min(1.0, perturbationMagnitudes[i] / (maxPerturbation * 0.5));
      planet.updateTrail(normalizedPerturbation);
    }
  }

  private updateOrbitalElements(): void {
    for (const planet of this.planets) {
      const pos = planet.group.position.clone();
      const vel = planet.velocity.clone();
      const mu = this.G * this.starMass;

      const r = pos.length();
      if (r < 0.001) continue;

      const hVec = new THREE.Vector3().crossVectors(pos, vel);
      const h = hVec.length();

      if (h < 0.0001) continue;

      const vCrossH = new THREE.Vector3().crossVectors(vel, hVec);
      const rHat = pos.clone().normalize();

      const eccentricityVec = vCrossH.multiplyScalar(1.0 / mu).sub(rHat);
      const e = eccentricityVec.length();
      planet.currentEccentricity = Math.min(0.95, Math.max(0, e));
    }
  }

  public reset(): void {
    this.simulationTime = 0;
    for (const planet of this.planets) {
      planet.reset();
    }
  }

  public getSimulationTimeDays(): number {
    return this.simulationTime * 100;
  }
}
