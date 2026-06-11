import * as THREE from 'three';
import gsap from 'gsap';

export interface PlanetParams {
  mass: number;
  eccentricity: number;
  rotationSpeed: number;
}

interface OrbitData {
  line: THREE.Line;
  points: THREE.Vector3[];
  inclination: number;
  baseRadius: number;
  asteroids: {
    mesh: THREE.Mesh;
    orbitAngle: number;
    orbitSpeed: number;
  }[];
  geometry: THREE.BufferGeometry;
}

const COLOR_LOW = new THREE.Color('#4f9fff');
const COLOR_HIGH = new THREE.Color('#ff6b4a');
const POINTS_PER_ORBIT = 200;
const ASTEROIDS_PER_ORBIT = 8;
const INCLINATIONS = [15, 30, 45];
const BASE_RADII = [120, 160, 200];

export class OrbitSystem {
  private scene: THREE.Scene;
  private orbits: OrbitData[] = [];
  private currentParams: PlanetParams;
  private tweenTargets: PlanetParams;
  private star: {
    mesh: THREE.Mesh;
    halos: THREE.Mesh[];
    pulsePhase: number;
  } | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = { mass: 3, eccentricity: 0.3, rotationSpeed: 1 };
    this.tweenTargets = { ...this.currentParams };
    this.createStar();
    this.createOrbits();
  }

  private createStar(): void {
    const starGeometry = new THREE.SphereGeometry(30, 64, 64);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: '#ffaa44',
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    this.scene.add(starMesh);

    const halos: THREE.Mesh[] = [];
    for (let i = 0; i < 20; i++) {
      const radius = 40 + (i / 19) * 160;
      const opacity = 0.3 * (1 - i / 19);
      const haloGeometry = new THREE.RingGeometry(radius - 2, radius + 2, 64);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: '#ffaa44',
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.rotation.x = Math.PI / 2;
      this.scene.add(halo);
      halos.push(halo);
    }

    this.star = {
      mesh: starMesh,
      halos: halos,
      pulsePhase: 0,
    };
  }

  private createOrbits(): void {
    for (let i = 0; i < 3; i++) {
      const inclination = (INCLINATIONS[i] * Math.PI) / 180;
      const baseRadius = BASE_RADII[i];
      const points: THREE.Vector3[] = [];

      for (let j = 0; j <= POINTS_PER_ORBIT; j++) {
        const angle = (j / POINTS_PER_ORBIT) * Math.PI * 2;
        const point = this.calculateOrbitPoint(angle, baseRadius, inclination);
        points.push(point);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const color = this.getOrbitColor(i);
      const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.7,
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);

      const asteroids: OrbitData['asteroids'] = [];
      for (let k = 0; k < ASTEROIDS_PER_ORBIT; k++) {
        const asteroidRadius = 3 + Math.random() * 3;
        const asteroidGeometry = new THREE.SphereGeometry(asteroidRadius, 16, 16);
        const asteroidColor = this.getAsteroidColor(inclination, k);
        const asteroidMaterial = new THREE.MeshBasicMaterial({
          color: asteroidColor,
        });
        const asteroidMesh = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        this.scene.add(asteroidMesh);

        asteroids.push({
          mesh: asteroidMesh,
          orbitAngle: (k / ASTEROIDS_PER_ORBIT) * Math.PI * 2,
          orbitSpeed: 0.2 + Math.random() * 0.3,
        });
      }

      this.orbits.push({
        line,
        points,
        inclination,
        baseRadius,
        asteroids,
        geometry,
      });
    }
  }

  private calculateOrbitPoint(
    angle: number,
    baseRadius: number,
    inclination: number,
    eccentricity: number = this.currentParams.eccentricity
  ): THREE.Vector3 {
    const e = eccentricity;
    const r = baseRadius * (1 - e * e) / (1 + e * Math.cos(angle));
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle) * Math.sin(inclination);
    const z = r * Math.sin(angle) * Math.cos(inclination);
    return new THREE.Vector3(x, y, z);
  }

  private getOrbitColor(index: number): THREE.Color {
    const t = (this.currentParams.mass - 0.5) / 9.5;
    const baseColor = COLOR_LOW.clone().lerp(COLOR_HIGH, t);
    const hueShift = index * 0.05;
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.h = (hsl.h + hueShift) % 1;
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  private getAsteroidColor(inclination: number, index: number): THREE.Color {
    const hue = (0.55 + inclination * 0.3 + index * 0.03) % 1;
    return new THREE.Color().setHSL(hue, 0.8, 0.6);
  }

  public updateParams(params: Partial<PlanetParams>): void {
    const newParams = { ...this.tweenTargets, ...params };
    gsap.to(this.tweenTargets, {
      ...newParams,
      duration: 0.5,
      ease: 'power2.out',
    });

    this.orbits.forEach((orbit, i) => {
      const color = this.getOrbitColor(i);
      const material = orbit.line.material as THREE.LineBasicMaterial;
      gsap.to(material.color, {
        r: color.r,
        g: color.g,
        b: color.b,
        duration: 0.5,
        ease: 'power2.out',
      });
    });
  }

  public update(deltaTime: number): void {
    this.currentParams = { ...this.tweenTargets };

    if (this.star) {
      this.star.pulsePhase += deltaTime * this.currentParams.rotationSpeed * 0.5;
      const pulseScale = 1 + Math.sin(this.star.pulsePhase) * 0.05;
      this.star.mesh.scale.setScalar(pulseScale);
      this.star.mesh.rotation.y += deltaTime * this.currentParams.rotationSpeed * 0.2;
    }

    this.orbits.forEach((orbit) => {
      for (let j = 0; j <= POINTS_PER_ORBIT; j++) {
        const angle = (j / POINTS_PER_ORBIT) * Math.PI * 2;
        const point = this.calculateOrbitPoint(
          angle,
          orbit.baseRadius,
          orbit.inclination
        );
        orbit.points[j].copy(point);
      }
      orbit.geometry.setFromPoints(orbit.points);
      orbit.geometry.attributes.position.needsUpdate = true;

      const width = 1 + (this.currentParams.mass / 10) * 4;
      const material = orbit.line.material as THREE.LineBasicMaterial;
      if ('linewidth' in material) {
        (material as any).linewidth = width;
      }

      orbit.asteroids.forEach((asteroid) => {
        asteroid.orbitAngle += deltaTime * asteroid.orbitSpeed * this.currentParams.rotationSpeed;
        const pos = this.calculateOrbitPoint(
          asteroid.orbitAngle,
          orbit.baseRadius,
          orbit.inclination
        );
        asteroid.mesh.position.copy(pos);
        asteroid.mesh.rotation.y += deltaTime * 2;
      });
    });
  }

  public getOrbitLines(): THREE.Line[] {
    return this.orbits.map((o) => o.line);
  }

  public getOrbitPoints(): THREE.Vector3[][] {
    return this.orbits.map((o) => o.points);
  }

  public getParams(): PlanetParams {
    return { ...this.currentParams };
  }

  public highlightOrbit(line: THREE.Line, intensity: number): void {
    const material = line.material as THREE.LineBasicMaterial;
    gsap.to(material, {
      opacity: 0.5 + intensity * 0.5,
      duration: 0.3,
      ease: 'power2.out',
    });
  }

  public dispose(): void {
    this.orbits.forEach((orbit) => {
      orbit.geometry.dispose();
      (orbit.line.material as THREE.Material).dispose();
      this.scene.remove(orbit.line);
      orbit.asteroids.forEach((a) => {
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        this.scene.remove(a.mesh);
      });
    });
    if (this.star) {
      this.star.mesh.geometry.dispose();
      (this.star.mesh.material as THREE.Material).dispose();
      this.scene.remove(this.star.mesh);
      this.star.halos.forEach((halo) => {
        halo.geometry.dispose();
        (halo.material as THREE.Material).dispose();
        this.scene.remove(halo);
      });
    }
  }
}
