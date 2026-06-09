import * as THREE from 'three';
import { PlanetState, getColorForMass, getRadiusForMass } from './types';

export class PlanetFactory {
  private static readonly COLOR_PALETTE = [
    '#FF6F00', '#FF8F00', '#FFA000', '#FFB300',
    '#00ACC1', '#00BCD4', '#26C6DA', '#4DD0E1'
  ];

  static generatePlanets(count: number = 6): PlanetState[] {
    const actualCount = Math.min(8, Math.max(5, count));
    const planets: PlanetState[] = [];
    const starMass = 1000;

    for (let i = 0; i < actualCount; i++) {
      const mass = 1 + Math.random() * 9;
      const orbitRadius = 5 + Math.random() * 25;
      const inclination = ((Math.random() * 30) - 15) * (Math.PI / 180);
      const angle = Math.random() * Math.PI * 2;

      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const y = Math.sin(inclination) * orbitRadius * 0.3;

      const position = new THREE.Vector3(x, y, z);

      const speed = Math.sqrt(starMass / orbitRadius) * 0.5;
      const tangentDir = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
      const velocity = tangentDir.multiplyScalar(speed);
      velocity.y = Math.sin(inclination) * speed * 0.2;

      const color = this.COLOR_PALETTE[i % this.COLOR_PALETTE.length];

      planets.push({
        id: i,
        name: `行星#${i + 1}`,
        mass,
        position,
        velocity,
        radius: getRadiusForMass(mass),
        color,
        inclination,
        orbitRadius,
        eccentricity: 0.01 + Math.random() * 0.05
      });
    }

    return planets;
  }

  static createPlanetFromState(
    id: number,
    name: string,
    mass: number,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    inclination: number = 0
  ): PlanetState {
    return {
      id,
      name,
      mass,
      position: position.clone(),
      velocity: velocity.clone(),
      radius: getRadiusForMass(mass),
      color: getColorForMass(mass),
      inclination,
      orbitRadius: position.length(),
      eccentricity: 0
    };
  }
}
