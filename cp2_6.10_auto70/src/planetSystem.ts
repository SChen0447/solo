import * as THREE from 'three';

export interface PlanetData {
  name: string;
  nameEn: string;
  mass: number;
  diameter: number;
  orbitalPeriod: number;
  distance: number;
  color: number;
  size: number;
  orbitRadius: number;
  orbitalInclination: number;
  hasRing?: boolean;
  ringInnerRadius?: number;
  ringOuterRadius?: number;
  ringColor?: number;
  stripePattern?: boolean;
}

export const PLANETS_DATA: PlanetData[] = [
  {
    name: '水星', nameEn: 'Mercury',
    mass: 0.055, diameter: 4879, orbitalPeriod: 88, distance: 0.39,
    color: 0x8c7853, size: 0.6, orbitRadius: 30, orbitalInclination: 0.12
  },
  {
    name: '金星', nameEn: 'Venus',
    mass: 0.815, diameter: 12104, orbitalPeriod: 225, distance: 0.72,
    color: 0xffc649, size: 1.0, orbitRadius: 45, orbitalInclination: 0.06
  },
  {
    name: '地球', nameEn: 'Earth',
    mass: 1.0, diameter: 12742, orbitalPeriod: 365, distance: 1.0,
    color: 0x4a90d9, size: 1.1, orbitRadius: 62, orbitalInclination: 0.0
  },
  {
    name: '火星', nameEn: 'Mars',
    mass: 0.107, diameter: 6779, orbitalPeriod: 687, distance: 1.52,
    color: 0xc1440e, size: 0.8, orbitRadius: 80, orbitalInclination: 0.03
  },
  {
    name: '木星', nameEn: 'Jupiter',
    mass: 317.8, diameter: 139820, orbitalPeriod: 4333, distance: 5.20,
    color: 0xd8ca9d, size: 4.5, orbitRadius: 120, orbitalInclination: 0.02,
    stripePattern: true
  },
  {
    name: '土星', nameEn: 'Saturn',
    mass: 95.2, diameter: 116460, orbitalPeriod: 10759, distance: 9.58,
    color: 0xead6b8, size: 3.8, orbitRadius: 165, orbitalInclination: 0.04,
    hasRing: true, ringInnerRadius: 4.5, ringOuterRadius: 7.5, ringColor: 0xc9b896,
    stripePattern: true
  },
  {
    name: '天王星', nameEn: 'Uranus',
    mass: 14.5, diameter: 50724, orbitalPeriod: 30687, distance: 19.22,
    color: 0x9fe8e8, size: 2.2, orbitRadius: 210, orbitalInclination: 0.01
  },
  {
    name: '海王星', nameEn: 'Neptune',
    mass: 17.1, diameter: 49244, orbitalPeriod: 60190, distance: 30.05,
    color: 0x4166f5, size: 2.1, orbitRadius: 255, orbitalInclination: 0.03
  }
];

interface PlanetMesh extends THREE.Mesh {
  userData: {
    isPlanet: boolean;
    data: PlanetData;
    angle: number;
    targetAngle: number;
  };
}

export class PlanetSystem {
  private scene: THREE.Scene;
  private planets: PlanetMesh[] = [];
  private orbits: THREE.Line[] = [];
  private sunGlowParticles!: THREE.Points;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private currentHighlight: THREE.Mesh | null = null;
  private highlightOpacity = 0;
  private highlightTimeout: number | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createSun();
    this.createPlanets();
    this.createStarfield();
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(8, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd00
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData = { isPlanet: false };
    this.scene.add(sun);

    const glowGeometry = new THREE.SphereGeometry(9.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);

    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 10 + Math.random() * 8;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffcc44,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    this.sunGlowParticles = new THREE.Points(particleGeom, particleMat);
    this.scene.add(this.sunGlowParticles);

    const pointLight = new THREE.PointLight(0xffffff, 2.5, 1000, 0.5);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0x222244, 0.4);
    this.scene.add(ambientLight);
  }

  private createStripeTexture(baseColor: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const color = new THREE.Color(baseColor);
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12; i++) {
      const y = (i / 12) * 256;
      const alpha = 0.15 + Math.random() * 0.25;
      const dark = i % 2 === 0;
      ctx.fillStyle = dark
        ? `rgba(${Math.floor(r * 0.6)},${Math.floor(g * 0.6)},${Math.floor(b * 0.6)},${alpha})`
        : `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},${alpha})`;
      ctx.fillRect(0, y, 256, 10 + Math.random() * 15);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createPlanets(): void {
    PLANETS_DATA.forEach((data) => {
      const geometry = new THREE.SphereGeometry(data.size, 32, 32);
      let material: THREE.MeshStandardMaterial;
      if (data.stripePattern) {
        material = new THREE.MeshStandardMaterial({
          map: this.createStripeTexture(data.color),
          roughness: 0.85,
          metalness: 0.05
        });
      } else {
        material = new THREE.MeshStandardMaterial({
          color: data.color,
          roughness: 0.8,
          metalness: 0.1
        });
      }
      const planet = new THREE.Mesh(geometry, material) as PlanetMesh;
      const initialAngle = Math.random() * Math.PI * 2;
      planet.userData = {
        isPlanet: true,
        data: data,
        angle: initialAngle,
        targetAngle: initialAngle
      };
      this.planets.push(planet);
      this.scene.add(planet);

      if (data.hasRing) {
        const ringGeom = new THREE.RingGeometry(
          data.ringInnerRadius!, data.ringOuterRadius!, 64
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: data.ringColor!,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = Math.PI / 2.3;
        planet.add(ring);
      }

      const orbitGeom = new THREE.BufferGeometry();
      const orbitPoints: number[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t) * data.orbitRadius;
        const z = Math.sin(t) * data.orbitRadius;
        const y = Math.sin(t * 2) * data.orbitRadius * Math.sin(data.orbitalInclination);
        orbitPoints.push(x, y, z);
      }
      orbitGeom.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
      const orbitMat = new THREE.LineBasicMaterial({
        color: 0x5566aa,
        transparent: true,
        opacity: 0.35
      });
      const orbit = new THREE.Line(orbitGeom, orbitMat);
      this.orbits.push(orbit);
      this.scene.add(orbit);
    });
  }

  private createStarfield(): void {
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 600 + Math.random() * 400;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const stars = new THREE.Points(geom, mat);
    this.scene.add(stars);
  }

  public update(delta: number, timeScale: number): void {
    this.planets.forEach((planet) => {
      const data = planet.userData.data;
      const baseSpeed = (Math.PI * 2) / (data.orbitalPeriod * 0.08);
      planet.userData.targetAngle += baseSpeed * delta * timeScale;
      planet.userData.angle = THREE.MathUtils.lerp(
        planet.userData.angle,
        planet.userData.targetAngle,
        0.15
      );
      const angle = planet.userData.angle;
      const r = data.orbitRadius;
      planet.position.x = Math.cos(angle) * r;
      planet.position.z = Math.sin(angle) * r;
      planet.position.y = Math.sin(angle * 2) * r * Math.sin(data.orbitalInclination);
      planet.rotation.y += delta * 0.5;
    });

    if (this.sunGlowParticles) {
      this.sunGlowParticles.rotation.y += delta * 0.1;
    }

    if (this.currentHighlight && this.highlightTimeout !== null) {
      this.highlightOpacity -= delta * 2;
      if (this.highlightOpacity <= 0) {
        this.highlightOpacity = 0;
        this.scene.remove(this.currentHighlight);
        this.currentHighlight = null;
        this.highlightTimeout = null;
      } else {
        (this.currentHighlight.material as THREE.MeshBasicMaterial).opacity = this.highlightOpacity;
      }
    }
  }

  public handleClick(
    clientX: number,
    clientY: number,
    camera: THREE.Camera,
    canvasRect: DOMRect
  ): PlanetData | null {
    this.mouse.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.mouse.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.planets as THREE.Mesh[];
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object as PlanetMesh;
      if (hit.userData.isPlanet) {
        this.applyHighlight(hit);
        return hit.userData.data;
      }
    }
    return null;
  }

  private applyHighlight(planet: PlanetMesh): void {
    if (this.currentHighlight && this.highlightTimeout !== null) {
      clearTimeout(this.highlightTimeout);
      this.scene.remove(this.currentHighlight);
    }
    const highlightGeom = new THREE.SphereGeometry(
      planet.userData.data.size * 1.3,
      32, 32
    );
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.7,
      side: THREE.BackSide
    });
    const highlight = new THREE.Mesh(highlightGeom, highlightMat);
    highlight.position.copy(planet.position);
    this.currentHighlight = highlight;
    this.highlightOpacity = 0.7;
    this.scene.add(highlight);
    if (this.highlightTimeout !== null) {
      clearTimeout(this.highlightTimeout);
    }
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    return this.planets as THREE.Mesh[];
  }
}
