import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameCN: string;
  color: number;
  radius: number;
  orbitRadius: number;
  orbitalPeriod: number;
  distanceAU: number;
  temperature: string;
  inclination: number;
  hasRing?: boolean;
}

export interface PlanetObject {
  data: PlanetData;
  mesh: THREE.Mesh;
  orbit: THREE.Line;
  angle: number;
  group: THREE.Group;
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameCN: '水星',
    color: 0xb5b5b5,
    radius: 0.08,
    orbitRadius: 1.2,
    orbitalPeriod: 88,
    distanceAU: 0.39,
    temperature: '-173°C ~ 427°C',
    inclination: 0.12,
  },
  {
    name: 'Venus',
    nameCN: '金星',
    color: 0xe6c200,
    radius: 0.14,
    orbitRadius: 1.8,
    orbitalPeriod: 225,
    distanceAU: 0.72,
    temperature: '462°C',
    inclination: 0.06,
  },
  {
    name: 'Earth',
    nameCN: '地球',
    color: 0x4c9a56,
    radius: 0.15,
    orbitRadius: 2.5,
    orbitalPeriod: 365,
    distanceAU: 1.00,
    temperature: '-88°C ~ 58°C',
    inclination: 0.0,
  },
  {
    name: 'Mars',
    nameCN: '火星',
    color: 0xc1440e,
    radius: 0.11,
    orbitRadius: 3.3,
    orbitalPeriod: 687,
    distanceAU: 1.52,
    temperature: '-87°C ~ -5°C',
    inclination: 0.03,
  },
  {
    name: 'Jupiter',
    nameCN: '木星',
    color: 0xc88b3a,
    radius: 0.35,
    orbitRadius: 4.8,
    orbitalPeriod: 4333,
    distanceAU: 5.20,
    temperature: '-108°C',
    inclination: 0.02,
  },
  {
    name: 'Saturn',
    nameCN: '土星',
    color: 0xead6b8,
    radius: 0.3,
    orbitRadius: 6.2,
    orbitalPeriod: 10759,
    distanceAU: 9.58,
    temperature: '-139°C',
    inclination: 0.04,
    hasRing: true,
  },
  {
    name: 'Uranus',
    nameCN: '天王星',
    color: 0x73b2d6,
    radius: 0.22,
    orbitRadius: 7.5,
    orbitalPeriod: 30687,
    distanceAU: 19.22,
    temperature: '-197°C',
    inclination: 0.01,
  },
  {
    name: 'Neptune',
    nameCN: '海王星',
    color: 0x3d5a80,
    radius: 0.21,
    orbitRadius: 8.8,
    orbitalPeriod: 60190,
    distanceAU: 30.05,
    temperature: '-201°C',
    inclination: 0.03,
  },
];

export class PlanetSystem {
  public group: THREE.Group;
  public sun: THREE.Mesh;
  public planets: PlanetObject[] = [];
  public simulationTime: number = 0;
  public earthOrbits: number = 0;

  private readonly EARTH_PERIOD = 365;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    this.sun = this.createSun();
    this.group.add(this.sun);

    for (const data of PLANET_DATA) {
      const planet = this.createPlanet(data);
      this.planets.push(planet);
      this.group.add(planet.group);
    }
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const sun = new THREE.Mesh(geometry, material);

    const pointLight = new THREE.PointLight(0xffffff, 2.5, 100);
    sun.add(pointLight);

    return sun;
  }

  private createPlanet(data: PlanetData): PlanetObject {
    const group = new THREE.Group();
    group.rotation.x = data.inclination;

    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.8,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { planetData: data };
    group.add(mesh);

    if (data.hasRing) {
      const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xd4c4a8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2.5;
      group.add(ring);
    }

    const orbit = this.createOrbitLine(data.orbitRadius);
    group.add(orbit);

    const initialAngle = Math.random() * Math.PI * 2;

    return { data, mesh, orbit, angle: initialAngle, group };
  }

  private createOrbitLine(radius: number): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    return new THREE.Line(geometry, material);
  }

  public updatePositions(deltaDays: number): void {
    this.simulationTime += deltaDays;
    this.earthOrbits = this.simulationTime / this.EARTH_PERIOD;

    for (const planet of this.planets) {
      const angularSpeed = (2 * Math.PI) / planet.data.orbitalPeriod;
      planet.angle += angularSpeed * deltaDays;

      const x = Math.cos(planet.angle) * planet.data.orbitRadius;
      const z = Math.sin(planet.angle) * planet.data.orbitRadius;

      planet.mesh.position.set(x, 0, z);
      planet.mesh.rotation.y += deltaDays * 0.5;
    }

    this.sun.rotation.y += deltaDays * 0.05;
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    return this.planets.map((p) => p.mesh);
  }
}
