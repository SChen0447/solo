import * as THREE from 'three';

export interface PlanetData {
  name: string;
  color: number;
  radius: number;
  semiMajorAxis: number;
  eccentricity: number;
  orbitalPeriod: number;
  inclination: number;
  avgDistance: number;
  angularSpeed: number;
}

export interface PlanetObject {
  data: PlanetData;
  mesh: THREE.Mesh;
  orbit: THREE.Line;
  label: HTMLDivElement;
  angle: number;
  pivot: THREE.Object3D;
}

const PLANET_DATA: PlanetData[] = [
  {
    name: '水星',
    color: 0x8c7853,
    radius: 0.4,
    semiMajorAxis: 8,
    eccentricity: 0.205,
    orbitalPeriod: 87.97,
    inclination: 7.0,
    avgDistance: 57.9,
    angularSpeed: 4.15
  },
  {
    name: '金星',
    color: 0xffc649,
    radius: 0.6,
    semiMajorAxis: 12,
    eccentricity: 0.007,
    orbitalPeriod: 224.7,
    inclination: 3.4,
    avgDistance: 108.2,
    angularSpeed: 1.62
  },
  {
    name: '地球',
    color: 0x4a90d9,
    radius: 0.65,
    semiMajorAxis: 17,
    eccentricity: 0.017,
    orbitalPeriod: 365.25,
    inclination: 0.0,
    avgDistance: 149.6,
    angularSpeed: 1.0
  },
  {
    name: '火星',
    color: 0xc1440e,
    radius: 0.5,
    semiMajorAxis: 23,
    eccentricity: 0.093,
    orbitalPeriod: 687.0,
    inclination: 1.9,
    avgDistance: 227.9,
    angularSpeed: 0.53
  },
  {
    name: '木星',
    color: 0xd8ca9d,
    radius: 1.8,
    semiMajorAxis: 35,
    eccentricity: 0.049,
    orbitalPeriod: 4333.0,
    inclination: 1.3,
    avgDistance: 778.6,
    angularSpeed: 0.084
  },
  {
    name: '土星',
    color: 0xfad5a5,
    radius: 1.5,
    semiMajorAxis: 48,
    eccentricity: 0.057,
    orbitalPeriod: 10759.0,
    inclination: 2.5,
    avgDistance: 1434.0,
    angularSpeed: 0.034
  }
];

export class PlanetSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sun: THREE.Mesh;
  private sunLight: THREE.PointLight;
  private planets: PlanetObject[] = [];
  private speedMultiplier: number = 1.0;
  private orbitsVisible: boolean = true;
  private labelContainer: HTMLElement;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, labelContainer: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.labelContainer = labelContainer;

    this.sun = this.createSun();
    this.sunLight = this.createSunLight();
    this.createPlanets();
    this.createStarfield();
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFAA00,
    });
    const sun = new THREE.Mesh(geometry, material);
    this.scene.add(sun);

    const glowGeometry = new THREE.SphereGeometry(3.5, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color(0xFFAA00) },
        viewVector: { value: this.camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);

    return sun;
  }

  private createSunLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xffffff, 2, 200);
    light.position.set(0, 0, 0);
    this.scene.add(light);
    return light;
  }

  private createOrbitLine(planetData: PlanetData): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    const a = planetData.semiMajorAxis;
    const e = planetData.eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = a * Math.cos(theta) - c;
      const z = b * Math.sin(theta);
      points.push(new THREE.Vector3(x, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });
    const line = new THREE.Line(geometry, material);

    if (planetData.inclination > 0) {
      line.rotation.x = (planetData.inclination * Math.PI) / 180;
    }

    return line;
  }

  private createPlanet(planetData: PlanetData): PlanetObject {
    const geometry = new THREE.SphereGeometry(planetData.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: planetData.color,
      roughness: 0.8,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);

    const pivot = new THREE.Object3D();
    if (planetData.inclination > 0) {
      pivot.rotation.x = (planetData.inclination * Math.PI) / 180;
    }
    this.scene.add(pivot);
    pivot.add(mesh);

    const orbit = this.createOrbitLine(planetData);
    this.scene.add(orbit);

    const label = document.createElement('div');
    label.className = 'planet-label';
    label.textContent = planetData.name;
    label.style.cssText = `
      position: absolute;
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6);
      pointer-events: none;
      white-space: nowrap;
      transform: translate(-50%, -50%);
    `;
    this.labelContainer.appendChild(label);

    const angle = Math.random() * Math.PI * 2;

    return {
      data: planetData,
      mesh,
      orbit,
      label,
      angle,
      pivot
    };
  }

  private createPlanets(): void {
    PLANET_DATA.forEach((data) => {
      this.planets.push(this.createPlanet(data));
    });
  }

  private createStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 100 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.8
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  public toggleOrbits(visible: boolean): void {
    this.orbitsVisible = visible;
    this.planets.forEach((planet) => {
      planet.orbit.visible = visible;
    });
  }

  public getPlanets(): PlanetObject[] {
    return this.planets;
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    return this.planets.map((p) => p.mesh);
  }

  public findPlanetByMesh(mesh: THREE.Object3D): PlanetObject | undefined {
    return this.planets.find((p) => p.mesh === mesh);
  }

  private updatePlanetPosition(planet: PlanetObject): void {
    const a = planet.data.semiMajorAxis;
    const e = planet.data.eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;

    const x = a * Math.cos(planet.angle) - c;
    const z = b * Math.sin(planet.angle);

    planet.mesh.position.set(x, 0, z);
  }

  private updateLabels(): void {
    this.planets.forEach((planet) => {
      const vector = new THREE.Vector3();
      planet.mesh.getWorldPosition(vector);
      vector.y += planet.data.radius + 0.8;

      const projected = vector.project(this.camera);

      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

      if (projected.z < 1) {
        planet.label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        planet.label.style.display = 'block';
      } else {
        planet.label.style.display = 'none';
      }
    });
  }

  public update(deltaTime: number): void {
    const sunPulse = 1 + Math.sin(Date.now() * 0.002) * 0.03;
    this.sun.scale.set(sunPulse, sunPulse, sunPulse);

    this.planets.forEach((planet) => {
      planet.angle += planet.data.angularSpeed * this.speedMultiplier * deltaTime * 0.5;
      this.updatePlanetPosition(planet);
    });

    this.updateLabels();
  }

  public dispose(): void {
    this.planets.forEach((planet) => {
      planet.label.remove();
    });
  }
}
