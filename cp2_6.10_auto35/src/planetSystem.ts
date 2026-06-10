import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameCn: string;
  color: number;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  rotationSpeed: number;
  periodEarthYears: number;
  diameterKm: number;
  distanceAu: number;
  moons: number;
}

export interface PlanetObject {
  data: PlanetData;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  pivot: THREE.Object3D;
  orbitLine: THREE.Line;
  originalScale: number;
  isSelected: boolean;
}

const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameCn: '水星',
    color: 0x8c7853,
    radius: 0.25,
    orbitRadius: 6,
    orbitSpeed: 4.15,
    rotationSpeed: 0.004,
    periodEarthYears: 0.24,
    diameterKm: 4879,
    distanceAu: 0.39,
    moons: 0
  },
  {
    name: 'Venus',
    nameCn: '金星',
    color: 0xffc649,
    radius: 0.4,
    orbitRadius: 9,
    orbitSpeed: 1.62,
    rotationSpeed: 0.002,
    periodEarthYears: 0.62,
    diameterKm: 12104,
    distanceAu: 0.72,
    moons: 0
  },
  {
    name: 'Earth',
    nameCn: '地球',
    color: 0x2e86ab,
    radius: 0.42,
    orbitRadius: 12,
    orbitSpeed: 1.0,
    rotationSpeed: 0.01,
    periodEarthYears: 1.0,
    diameterKm: 12756,
    distanceAu: 1.0,
    moons: 1
  },
  {
    name: 'Mars',
    nameCn: '火星',
    color: 0xc1440e,
    radius: 0.3,
    orbitRadius: 15,
    orbitSpeed: 0.53,
    rotationSpeed: 0.009,
    periodEarthYears: 1.88,
    diameterKm: 6792,
    distanceAu: 1.52,
    moons: 2
  },
  {
    name: 'Jupiter',
    nameCn: '木星',
    color: 0xd8ca9d,
    radius: 1.2,
    orbitRadius: 21,
    orbitSpeed: 0.084,
    rotationSpeed: 0.02,
    periodEarthYears: 11.86,
    diameterKm: 142984,
    distanceAu: 5.2,
    moons: 95
  },
  {
    name: 'Saturn',
    nameCn: '土星',
    color: 0xf4d59e,
    radius: 1.0,
    orbitRadius: 27,
    orbitSpeed: 0.034,
    rotationSpeed: 0.018,
    periodEarthYears: 29.46,
    diameterKm: 120536,
    distanceAu: 9.54,
    moons: 146
  },
  {
    name: 'Uranus',
    nameCn: '天王星',
    color: 0x72c2d8,
    radius: 0.7,
    orbitRadius: 33,
    orbitSpeed: 0.012,
    rotationSpeed: 0.014,
    periodEarthYears: 84.01,
    diameterKm: 51118,
    distanceAu: 19.22,
    moons: 27
  },
  {
    name: 'Neptune',
    nameCn: '海王星',
    color: 0x3b5ef0,
    radius: 0.68,
    orbitRadius: 38,
    orbitSpeed: 0.006,
    rotationSpeed: 0.016,
    periodEarthYears: 164.8,
    diameterKm: 49528,
    distanceAu: 30.06,
    moons: 14
  }
];

export class PlanetSystem {
  public scene: THREE.Scene;
  public sun: THREE.Mesh;
  public sunGlow: THREE.Mesh;
  public planets: PlanetObject[] = [];
  public timeSpeed: number = 1.0;
  public simulationDays: number = 0;
  private allOrbits: THREE.Line[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sun = this.createSun();
    this.sunGlow = this.createSunGlow();
    this.createPlanets();
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(2.5, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd00
    });
    const sun = new THREE.Mesh(geometry, material);
    this.scene.add(sun);
    return sun;
  }

  private createSunGlow(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(3.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(geometry, material);
    this.scene.add(glow);
    return glow;
  }

  private createPlanetGlow(color: number, radius: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius * 1.25, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    return new THREE.Mesh(geometry, material);
  }

  private createOrbitLine(radius: number): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(theta) * radius,
        0,
        Math.sin(theta) * radius
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      dashSize: 0.3,
      gapSize: 0.15
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.scene.add(line);
    this.allOrbits.push(line);
    return line;
  }

  private createSaturnRing(parent: THREE.Mesh, planetData: PlanetData): void {
    if (planetData.name !== 'Saturn') return;
    const innerRadius = planetData.radius * 1.3;
    const outerRadius = planetData.radius * 2.0;
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xc4a661,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2.5;
    parent.add(ring);
  }

  private createPlanets(): void {
    for (const data of PLANET_DATA) {
      const geometry = new THREE.SphereGeometry(data.radius, 48, 48);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.8,
        metalness: 0.1,
        emissive: data.color,
        emissiveIntensity: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);

      const glow = this.createPlanetGlow(data.color, data.radius);
      mesh.add(glow);

      this.createSaturnRing(mesh, data);

      const pivot = new THREE.Object3D();
      const initialAngle = Math.random() * Math.PI * 2;
      pivot.rotation.y = initialAngle;
      mesh.position.x = data.orbitRadius;

      pivot.add(mesh);
      this.scene.add(pivot);

      const orbitLine = this.createOrbitLine(data.orbitRadius);

      this.planets.push({
        data,
        mesh,
        glow,
        pivot,
        orbitLine,
        originalScale: 1,
        isSelected: false
      });
    }
  }

  public update(deltaTime: number): void {
    const adjustedDelta = deltaTime * this.timeSpeed;

    for (const planet of this.planets) {
      planet.pivot.rotation.y += planet.data.orbitSpeed * adjustedDelta * 0.1;
      planet.mesh.rotation.y += planet.data.rotationSpeed * this.timeSpeed * 60 * deltaTime;
    }

    this.sun.rotation.y += 0.001 * this.timeSpeed * 60 * deltaTime;

    const earthDaysPerSecond = 10;
    this.simulationDays += adjustedDelta * earthDaysPerSecond;
  }

  public setTimeSpeed(speed: number): void {
    this.timeSpeed = speed;
  }

  public selectPlanet(planet: PlanetObject | null): void {
    for (const p of this.planets) {
      if (p === planet) {
        if (!p.isSelected) {
          p.isSelected = true;
          p.originalScale = p.mesh.scale.x;
          p.mesh.scale.setScalar(p.originalScale * 1.5);
          (p.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        }
      } else if (p.isSelected) {
        p.isSelected = false;
        p.mesh.scale.setScalar(p.originalScale);
        (p.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.1;
      }
    }
  }

  public getPlanetByMesh(mesh: THREE.Object3D): PlanetObject | null {
    for (const planet of this.planets) {
      if (planet.mesh === mesh || planet.mesh.children.includes(mesh as THREE.Mesh)) {
        return planet;
      }
    }
    return null;
  }

  public getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const planet of this.planets) {
      meshes.push(planet.mesh);
    }
    return meshes;
  }
}
