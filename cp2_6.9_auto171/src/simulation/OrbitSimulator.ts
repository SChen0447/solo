import * as THREE from 'three';
import { PlanetState, SimulationConfig, GravityWave, getColorForMass, getRadiusForMass } from './types';
import { PlanetFactory } from './PlanetFactory';

export class OrbitSimulator {
  planets: PlanetState[] = [];
  config: SimulationConfig = {
    G: 1.0,
    showOrbits: true,
    showVelocity: true,
    showFieldLines: false,
    showGrid: true,
    timeScale: 1.0
  };

  gravityWaves: GravityWave[] = [];
  starPosition = new THREE.Vector3(0, 0, 0);
  starMass = 1000;

  private selectedPlanetId: number | null = null;
  private draggedPlanetId: number | null = null;
  private lastPosition = new THREE.Vector3();

  constructor() {
    this.planets = PlanetFactory.generatePlanets();
  }

  update(dt: number): void {
    const timeStep = Math.min(dt, 0.05) * this.config.timeScale;
    const subSteps = 4;
    const h = timeStep / subSteps;

    for (let step = 0; step < subSteps; step++) {
      this.integrate(h);
    }

    for (const planet of this.planets) {
      const params = this.calculateOrbitalParams(planet);
      planet.orbitRadius = params.radius;
      planet.eccentricity = params.eccentricity;
    }

    const now = performance.now() / 1000;
    this.gravityWaves = this.gravityWaves.filter(
      w => now - w.startTime < w.duration
    );
  }

  private integrate(h: number): void {
    for (const planet of this.planets) {
      if (planet.id === this.draggedPlanetId) continue;

      const acceleration = this.calculateGravity(planet);
      planet.velocity.addScaledVector(acceleration, h);
    }

    for (const planet of this.planets) {
      if (planet.id === this.draggedPlanetId) continue;
      planet.position.addScaledVector(planet.velocity, h);
    }
  }

  private calculateGravity(planet: PlanetState): THREE.Vector3 {
    const acceleration = new THREE.Vector3();

    const toStar = new THREE.Vector3().subVectors(this.starPosition, planet.position);
    const distStar = toStar.length();
    if (distStar > 0.1) {
      const forceMag = (this.config.G * this.starMass) / (distStar * distStar);
      acceleration.add(toStar.normalize().multiplyScalar(forceMag));
    }

    for (const other of this.planets) {
      if (other.id === planet.id) continue;
      const toOther = new THREE.Vector3().subVectors(other.position, planet.position);
      const dist = toOther.length();
      if (dist > 0.5) {
        const forceMag = (this.config.G * other.mass) / (dist * dist);
        acceleration.add(toOther.normalize().multiplyScalar(forceMag));
      }
    }

    return acceleration;
  }

  private calculateOrbitalParams(planet: PlanetState): { radius: number; eccentricity: number } {
    const r = planet.position.clone();
    const v = planet.velocity.clone();
    const radius = r.length();

    const mu = this.config.G * this.starMass;
    const hVec = new THREE.Vector3().crossVectors(r, v);
    const h = hVec.length();

    const eVec = new THREE.Vector3()
      .addScaledVector(v, h / mu)
      .sub(r.clone().normalize().multiplyScalar((v.lengthSq() - mu / radius) / mu));
    const eccentricity = Math.min(eVec.length(), 0.9999);

    return { radius, eccentricity };
  }

  setPlanetMass(id: number, mass: number): void {
    const planet = this.planets.find(p => p.id === id);
    if (planet) {
      planet.mass = mass;
      planet.radius = getRadiusForMass(mass);
      planet.color = getColorForMass(mass);
    }
  }

  setPlanetPosition(id: number, pos: THREE.Vector3): void {
    const planet = this.planets.find(p => p.id === id);
    if (planet) {
      this.lastPosition.copy(planet.position);
      planet.position.copy(pos);
    }
  }

  startDrag(id: number): void {
    this.draggedPlanetId = id;
    const planet = this.planets.find(p => p.id === id);
    if (planet) {
      this.lastPosition.copy(planet.position);
    }
  }

  endDrag(id: number): void {
    const planet = this.planets.find(p => p.id === id);
    if (planet) {
      const newVelocity = planet.position.clone()
        .sub(this.lastPosition)
        .multiplyScalar(2);
      planet.velocity.lerp(newVelocity, 0.3);
      this.triggerGravityWave(planet.position.clone());
    }
    this.draggedPlanetId = null;
  }

  isDragging(id: number): boolean {
    return this.draggedPlanetId === id;
  }

  getSelectedPlanetId(): number | null {
    return this.selectedPlanetId;
  }

  setSelectedPlanetId(id: number | null): void {
    this.selectedPlanetId = id;
  }

  getOrbitalParams(id: number): { radius: number; eccentricity: number } {
    const planet = this.planets.find(p => p.id === id);
    if (!planet) return { radius: 0, eccentricity: 0 };
    return { radius: planet.orbitRadius, eccentricity: planet.eccentricity };
  }

  triggerGravityWave(position: THREE.Vector3): void {
    this.gravityWaves.push({
      position: position.clone(),
      startTime: performance.now() / 1000,
      duration: 1.5,
      maxRadius: 5
    });
  }

  getFieldLinePoints(): THREE.Vector3[][] {
    const lines: THREE.Vector3[][] = [];
    const density = 30;
    const maxDist = 35;

    for (let i = 0; i < density; i++) {
      const phi = Math.acos(1 - 2 * (i / density));
      for (let j = 0; j < density / 3; j++) {
        const theta = (j / (density / 3)) * Math.PI * 2;
        const points: THREE.Vector3[] = [];
        const steps = 20;

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const r = 1.5 + t * (maxDist - 1.5);
          const wobble = Math.sin(t * Math.PI * 3) * 0.5 * (1 - t);

          const x = r * Math.sin(phi + wobble) * Math.cos(theta);
          const y = r * Math.sin(phi + wobble) * Math.sin(theta) * 0.7;
          const z = r * Math.cos(phi + wobble);

          points.push(new THREE.Vector3(x, y, z));
        }
        lines.push(points);
      }
    }
    return lines;
  }
}
