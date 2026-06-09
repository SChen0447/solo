import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameCN: string;
  radius: number;
  color: number;
  orbitRadius: number;
  orbitPeriod: number;
  rotationPeriod: number;
  axialTilt: number;
  distanceAU: number;
  tempRange: [number, number];
  hasRing?: boolean;
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameCN: '水星',
    radius: 0.3,
    color: 0x8c7853,
    orbitRadius: 10,
    orbitPeriod: 88,
    rotationPeriod: 1407.6,
    axialTilt: 0.03,
    distanceAU: 0.39,
    tempRange: [-173, 427]
  },
  {
    name: 'Venus',
    nameCN: '金星',
    radius: 0.6,
    color: 0xffc649,
    orbitRadius: 15,
    orbitPeriod: 225,
    rotationPeriod: 5832.5,
    axialTilt: 177.4,
    distanceAU: 0.72,
    tempRange: [462, 462]
  },
  {
    name: 'Earth',
    nameCN: '地球',
    radius: 0.65,
    color: 0x4b7f52,
    orbitRadius: 22,
    orbitPeriod: 365,
    rotationPeriod: 23.9,
    axialTilt: 23.4,
    distanceAU: 1.0,
    tempRange: [-88, 58]
  },
  {
    name: 'Mars',
    nameCN: '火星',
    radius: 0.45,
    color: 0xe27b58,
    orbitRadius: 30,
    orbitPeriod: 687,
    rotationPeriod: 24.6,
    axialTilt: 25.2,
    distanceAU: 1.52,
    tempRange: [-87, -5]
  },
  {
    name: 'Jupiter',
    nameCN: '木星',
    radius: 2.5,
    color: 0xc88b3a,
    orbitRadius: 42,
    orbitPeriod: 4333,
    rotationPeriod: 9.9,
    axialTilt: 3.1,
    distanceAU: 5.2,
    tempRange: [-145, -145]
  },
  {
    name: 'Saturn',
    nameCN: '土星',
    radius: 2.1,
    color: 0xd4b96a,
    orbitRadius: 56,
    orbitPeriod: 10759,
    rotationPeriod: 10.7,
    axialTilt: 26.7,
    distanceAU: 9.54,
    tempRange: [-178, -178],
    hasRing: true
  },
  {
    name: 'Uranus',
    nameCN: '天王星',
    radius: 1.3,
    color: 0x9fe8e8,
    orbitRadius: 70,
    orbitPeriod: 30687,
    rotationPeriod: 17.2,
    axialTilt: 97.8,
    distanceAU: 19.2,
    tempRange: [-224, -224]
  },
  {
    name: 'Neptune',
    nameCN: '海王星',
    radius: 1.25,
    color: 0x4166f5,
    orbitRadius: 84,
    orbitPeriod: 60190,
    rotationPeriod: 16.1,
    axialTilt: 28.3,
    distanceAU: 30.06,
    tempRange: [-218, -218]
  }
];

const EARTH_DAY_MS = 24 * 60 * 60 * 1000;

export class Planet {
  public data: PlanetData;
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public pivot: THREE.Group;
  public orbitLine: THREE.Line;
  public ring?: THREE.Mesh;

  private orbitAngle: number = 0;
  private rotationAngle: number = 0;
  private orbitSpeed: number;
  private rotationSpeed: number;

  constructor(data: PlanetData) {
    this.data = data;

    this.group = new THREE.Group();
    this.group.name = data.name;

    this.pivot = new THREE.Group();
    this.pivot.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);

    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      roughness: 0.85,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    (this.mesh as any).planetData = data;

    this.pivot.add(this.mesh);
    this.group.add(this.pivot);

    if (data.hasRing) {
      const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.3, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xd4b96a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
      this.ring.rotation.x = Math.PI / 2;
      this.pivot.add(this.ring);
    }

    this.orbitLine = this.createOrbitLine(data.orbitRadius);

    this.orbitSpeed = (2 * Math.PI) / (data.orbitPeriod * EARTH_DAY_MS);
    this.rotationSpeed = (2 * Math.PI) / (data.rotationPeriod * 60 * 60 * 1000);
  }

  private createOrbitLine(radius: number): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2
    });
    const line = new THREE.Line(geometry, material);
    return line;
  }

  public update(virtualTime: number): void {
    this.orbitAngle = this.orbitSpeed * virtualTime;
    this.rotationAngle = this.rotationSpeed * virtualTime;

    const x = Math.cos(this.orbitAngle) * this.data.orbitRadius;
    const z = Math.sin(this.orbitAngle) * this.data.orbitRadius;
    this.group.position.set(x, 0, z);

    this.mesh.rotation.y = this.rotationAngle;
  }

  public updateOrbitColor(timeSpeed: number): void {
    const material = this.orbitLine.material as THREE.LineBasicMaterial;
    if (timeSpeed >= 50) {
      const t = Math.min((timeSpeed - 50) / 50, 1);
      const color = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        new THREE.Color(0xff7043),
        t
      );
      material.color.copy(color);
      material.opacity = 0.2 + t * 0.4;
    } else {
      material.color.setHex(0xffffff);
      material.opacity = 0.2;
    }
    material.transparent = true;
    material.needsUpdate = true;
  }

  public getWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3();
    this.group.getWorldPosition(pos);
    return pos;
  }

  public dispose(): void {
    (this.mesh.geometry as THREE.BufferGeometry).dispose();
    (this.mesh.material as THREE.Material).dispose();
    (this.orbitLine.geometry as THREE.BufferGeometry).dispose();
    (this.orbitLine.material as THREE.Material).dispose();
    if (this.ring) {
      (this.ring.geometry as THREE.BufferGeometry).dispose();
      (this.ring.material as THREE.Material).dispose();
    }
  }
}
