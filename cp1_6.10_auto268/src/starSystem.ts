import * as THREE from 'three';

export type StarType = 'mainSequence' | 'redGiant' | 'whiteDwarf';

export interface StarData {
  id: string;
  name: string;
  type: StarType;
  color: number;
  temperature: number;
  mass: number;
  size: number;
  rotationSpeed: number;
  position: THREE.Vector3;
  planets: PlanetData[];
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
}

export interface PlanetData {
  id: string;
  name: string;
  orbitRadius: number;
  orbitInclination: number;
  orbitSpeed: number;
  orbitAngle: number;
  rotationSpeed: number;
  size: number;
  color: number;
  parentStar: StarData;
  mesh: THREE.Mesh;
  orbitLine: THREE.Line;
}

const STAR_TYPES: StarType[] = ['mainSequence', 'redGiant', 'whiteDwarf'];
const STAR_TYPE_WEIGHTS = [0.7, 0.2, 0.15];

const STAR_COLORS: Record<StarType, number[]> = {
  mainSequence: [0xffffff, 0xfff4e8, 0xffeedd, 0xaaccff, 0x88ccff],
  redGiant: [0xff6b35, 0xff8c42, 0xffa05a, 0xc0392b],
  whiteDwarf: [0xe8f4ff, 0xd4e8ff, 0xc0d8ff, 0xffffff]
};

const STAR_TEMP_RANGES: Record<StarType, [number, number]> = {
  mainSequence: [4000, 9000],
  redGiant: [2500, 4000],
  whiteDwarf: [8000, 20000]
};

const STAR_SIZE_RANGES: Record<StarType, [number, number]> = {
  mainSequence: [0.4, 1.0],
  redGiant: [1.2, 2.2],
  whiteDwarf: [0.15, 0.35]
};

const STAR_MASS_RANGES: Record<StarType, [number, number]> = {
  mainSequence: [0.5, 2.5],
  redGiant: [0.8, 5.0],
  whiteDwarf: [0.4, 1.2]
};

const PLANET_COLORS = [
  0x4a90a4, 0x7ec8a3, 0xd4a373, 0x8e6f8f, 0x5c7a99,
  0xa3c4ad, 0xc9a87c, 0x6b8e9a, 0x9ab89a, 0xd4956a
];

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randomInSphere(maxRadius: number, minRadius: number = 0): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.pow(Math.random(), 0.33) * (maxRadius - minRadius) + minRadius;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function generateStarName(index: number): string {
  const prefix = ['HD', 'HR', 'GJ', 'HIP', 'BD', 'CD'];
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const num = String(index * 37 + Math.floor(Math.random() * 99)).padStart(4, '0');
  return `${p}-${num}`;
}

function generatePlanetName(starName: string, idx: number): string {
  const letters = ['a', 'b', 'c', 'd'];
  return `${starName} ${letters[idx]}`;
}

export function createStarMaterial(color: number, _emissiveIntensity: number = 1.0): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1.0
  });
}

export function createStarGlowMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export function createPlanetMaterial(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    color,
    emissive: new THREE.Color(color).multiplyScalar(0.08),
    emissiveIntensity: 1.0
  });
}

export function createOrbitLine(radius: number, inclination: number): THREE.Line {
  const segments = 128;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false
  });
  const line = new THREE.Line(geometry, material);
  line.rotation.x = THREE.MathUtils.degToRad(inclination);
  return line;
}

export class StarSystem {
  public stars: StarData[] = [];
  public planets: PlanetData[] = [];
  public group: THREE.Group;
  public backgroundStars: THREE.Points;

  constructor() {
    this.group = new THREE.Group();
    this.backgroundStars = this.createBackgroundStars();
    this.group.add(this.backgroundStars);
  }

  private createBackgroundStars(): THREE.Points {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const pos = randomInSphere(200, 80);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      sizes[i] = random(0.2, 0.8);
      opacities[i] = random(0.4, 0.8);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    (points as any).userData = { opacities, baseSizes: sizes };
    return points;
  }

  public generate(starCount: number = 35): void {
    this.clear();

    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < starCount; i++) {
      let pos: THREE.Vector3;
      let attempts = 0;
      do {
        pos = randomInSphere(35, 3);
        attempts++;
      } while (
        attempts < 30 &&
        positions.some(p => p.distanceTo(pos) < 5)
      );
      positions.push(pos);

      const type = pickWeighted(STAR_TYPES, STAR_TYPE_WEIGHTS);
      const colors = STAR_COLORS[type];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const [tempMin, tempMax] = STAR_TEMP_RANGES[type];
      const [sizeMin, sizeMax] = STAR_SIZE_RANGES[type];
      const [massMin, massMax] = STAR_MASS_RANGES[type];

      const size = random(sizeMin, sizeMax);
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = createStarMaterial(color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      mesh.userData = { kind: 'star', index: i };

      const glowGeometry = new THREE.SphereGeometry(size * 2.2, 32, 32);
      const glowMaterial = createStarGlowMaterial(color);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(pos);
      glow.userData = { kind: 'star-glow', index: i };

      const star: StarData = {
        id: `star-${i}`,
        name: generateStarName(i + 1),
        type,
        color,
        temperature: Math.round(random(tempMin, tempMax)),
        mass: parseFloat(random(massMin, massMax).toFixed(2)),
        size,
        rotationSpeed: random(0.1, 0.5),
        position: pos,
        planets: [],
        mesh,
        glow
      };

      const planetCount = Math.floor(random(1, 4));
      for (let p = 0; p < planetCount; p++) {
        const orbitRadius = random(3, 10);
        const orbitInclination = random(-30, 30);
        const baseSpeed = 0.4;
        const orbitSpeed = baseSpeed / Math.pow(orbitRadius, 1.5);

        const planetSize = random(0.15, 0.45);
        const planetColor = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];

        const pGeometry = new THREE.SphereGeometry(planetSize, 24, 24);
        const pMaterial = createPlanetMaterial(planetColor);
        const pMesh = new THREE.Mesh(pGeometry, pMaterial);
        pMesh.userData = { kind: 'planet', starIndex: i, planetIndex: p };

        const orbitLine = createOrbitLine(orbitRadius, orbitInclination);
        orbitLine.position.copy(pos);
        orbitLine.userData = { kind: 'orbit' };

        const planet: PlanetData = {
          id: `planet-${i}-${p}`,
          name: generatePlanetName(star.name, p),
          orbitRadius,
          orbitInclination,
          orbitSpeed,
          orbitAngle: random(0, Math.PI * 2),
          rotationSpeed: random(0.3, 1.2),
          size: planetSize,
          color: planetColor,
          parentStar: star,
          mesh: pMesh,
          orbitLine
        };

        star.planets.push(planet);
        this.planets.push(planet);
        this.group.add(pMesh);
        this.group.add(orbitLine);
      }

      this.stars.push(star);
      this.group.add(mesh);
      this.group.add(glow);
    }
  }

  public clear(): void {
    for (const star of this.stars) {
      this.group.remove(star.mesh);
      this.group.remove(star.glow);
      star.mesh.geometry.dispose();
      (star.mesh.material as THREE.Material).dispose();
      star.glow.geometry.dispose();
      (star.glow.material as THREE.Material).dispose();
    }
    for (const planet of this.planets) {
      this.group.remove(planet.mesh);
      this.group.remove(planet.orbitLine);
      planet.mesh.geometry.dispose();
      (planet.mesh.material as THREE.Material).dispose();
      planet.orbitLine.geometry.dispose();
      (planet.orbitLine.material as THREE.Material).dispose();
    }
    this.stars = [];
    this.planets = [];
  }

  public update(deltaTime: number, elapsed: number): void {
    for (const star of this.stars) {
      star.mesh.rotation.y += star.rotationSpeed * deltaTime;
      star.glow.rotation.y += star.rotationSpeed * deltaTime * 0.5;

      const pulse = 1.0 + Math.sin(elapsed * 2 + star.position.x) * 0.05;
      star.glow.scale.setScalar(pulse);
    }

    for (const planet of this.planets) {
      planet.orbitAngle += planet.orbitSpeed * deltaTime;
      const incRad = THREE.MathUtils.degToRad(planet.orbitInclination);

      const x = Math.cos(planet.orbitAngle) * planet.orbitRadius;
      const z = Math.sin(planet.orbitAngle) * planet.orbitRadius;
      const y = Math.sin(planet.orbitAngle) * planet.orbitRadius * Math.sin(incRad);

      planet.mesh.position.set(
        planet.parentStar.position.x + x,
        planet.parentStar.position.y + y * 0.3,
        planet.parentStar.position.z + z
      );

      planet.mesh.rotation.y += planet.rotationSpeed * deltaTime;
    }

    this.updateBackgroundStars(elapsed);
  }

  private updateBackgroundStars(elapsed: number): void {
    const userData = (this.backgroundStars as any).userData;
    if (!userData) return;
    const opacities: Float32Array = userData.opacities;
    const material = this.backgroundStars.material as THREE.PointsMaterial;
    const flicker = 0.75 + Math.sin(elapsed * 1.5) * 0.15 + Math.sin(elapsed * 3.7) * 0.1;
    material.opacity = Math.max(0.3, Math.min(0.9, flicker * 0.7));
    material.size = 0.55 + Math.sin(elapsed * 2.1) * 0.08;
    for (let i = 0; i < opacities.length; i++) {
      opacities[i] = opacities[i];
    }
  }

  public getStarCount(): number {
    return this.stars.length;
  }
}

export function getTypeLabel(type: StarType): string {
  switch (type) {
    case 'mainSequence': return '主序星';
    case 'redGiant': return '红巨星';
    case 'whiteDwarf': return '白矮星';
  }
}
