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
  mass: number;
  radiusEarth: number;
  distanceAU: number;
  hasRing?: boolean;
  ringColor?: number;
  ringInner?: number;
  ringOuter?: number;
}

export interface PlanetObject {
  data: PlanetData;
  pivot: THREE.Object3D;
  mesh: THREE.Mesh;
  halo?: THREE.Mesh;
  ring?: THREE.Mesh;
  angle: number;
  targetScale: number;
  currentScale: number;
}

export const PLANET_DATA: PlanetData[] = [
  {
    name: 'Mercury',
    nameCN: '水星',
    radius: 0.3,
    color: 0xb0a89c,
    orbitRadius: 8,
    orbitPeriod: 0.24,
    rotationPeriod: 58.6,
    axialTilt: 0.03,
    mass: 0.055,
    radiusEarth: 0.383,
    distanceAU: 0.387
  },
  {
    name: 'Venus',
    nameCN: '金星',
    radius: 0.8,
    color: 0xe6d6a8,
    orbitRadius: 12,
    orbitPeriod: 0.62,
    rotationPeriod: 243,
    axialTilt: 177.4,
    mass: 0.815,
    radiusEarth: 0.949,
    distanceAU: 0.723
  },
  {
    name: 'Earth',
    nameCN: '地球',
    radius: 0.85,
    color: 0x4a8f6f,
    orbitRadius: 17,
    orbitPeriod: 1,
    rotationPeriod: 1,
    axialTilt: 23.5,
    mass: 1,
    radiusEarth: 1,
    distanceAU: 1
  },
  {
    name: 'Mars',
    nameCN: '火星',
    radius: 0.6,
    color: 0xc1440e,
    orbitRadius: 22,
    orbitPeriod: 1.88,
    rotationPeriod: 1.03,
    axialTilt: 25.2,
    mass: 0.107,
    radiusEarth: 0.532,
    distanceAU: 1.524
  },
  {
    name: 'Jupiter',
    nameCN: '木星',
    radius: 2.5,
    color: 0xc88b5a,
    orbitRadius: 32,
    orbitPeriod: 11.86,
    rotationPeriod: 0.41,
    axialTilt: 3.1,
    mass: 317.8,
    radiusEarth: 11.209,
    distanceAU: 5.203
  },
  {
    name: 'Saturn',
    nameCN: '土星',
    radius: 2.1,
    color: 0xc0a868,
    orbitRadius: 42,
    orbitPeriod: 29.46,
    rotationPeriod: 0.45,
    axialTilt: 26.7,
    mass: 95.2,
    radiusEarth: 9.449,
    distanceAU: 9.537,
    hasRing: true,
    ringColor: 0xd4c49a,
    ringInner: 2.8,
    ringOuter: 4.2
  },
  {
    name: 'Uranus',
    nameCN: '天王星',
    radius: 1.5,
    color: 0x7ec8e3,
    orbitRadius: 52,
    orbitPeriod: 84.01,
    rotationPeriod: 0.72,
    axialTilt: 97.8,
    mass: 14.5,
    radiusEarth: 4.007,
    distanceAU: 19.191
  },
  {
    name: 'Neptune',
    nameCN: '海王星',
    radius: 1.4,
    color: 0x3b5c9c,
    orbitRadius: 62,
    orbitPeriod: 164.8,
    rotationPeriod: 0.67,
    axialTilt: 28.3,
    mass: 17.1,
    radiusEarth: 3.883,
    distanceAU: 30.069
  }
];

const TIME_SCALE = 0.5;
const ROTATION_SCALE = 2;

export class PlanetSystem {
  public group: THREE.Group;
  public sun: THREE.Mesh;
  public planets: PlanetObject[] = [];
  public orbits: THREE.Line[] = [];
  public stars: THREE.Points;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    this.sun = this.createSun();
    this.group.add(this.sun);

    this.createPlanets();
    this.createOrbits();
    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.scene.add(this.group);
  }

  private createSun(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(3, 64, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffaa00
    });

    const sun = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(3.8, 64, 64);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color(0xffaa00) },
        viewVector: { value: new THREE.Vector3(0, 0, 1) }
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
          gl_FragColor = vec4(glow, intensity * 0.8);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);

    const pointLight = new THREE.PointLight(0xffffff, 2, 300);
    pointLight.position.set(0, 0, 0);
    sun.add(pointLight);

    return sun;
  }

  private createProceduralMaterial(color: number): THREE.MeshPhongMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const baseColor = new THREE.Color(color);
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100 * 0.7}%)`);
    gradient.addColorStop(0.3, `hsl(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100}%)`);
    gradient.addColorStop(0.5, `hsl(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100 * 1.1}%)`);
    gradient.addColorStop(0.7, `hsl(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100 * 0.9}%)`);
    gradient.addColorStop(1, `hsl(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100 * 0.6}%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 15 + 2;
      const opacity = Math.random() * 0.15 + 0.05;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      const darker = Math.random() > 0.5;
      ctx.fillStyle = `hsla(${hsl.h * 360}, ${hsl.s * 100}%, ${hsl.l * 100 * (darker ? 0.5 : 1.3)}%, ${opacity})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return new THREE.MeshPhongMaterial({
      map: texture,
      color: color,
      shininess: 15,
      specular: new THREE.Color(0x222222)
    });
  }

  private createPlanets(): void {
    for (const data of PLANET_DATA) {
      const pivot = new THREE.Object3D();
      this.group.add(pivot);

      const geometry = new THREE.SphereGeometry(data.radius, 48, 48);
      const material = this.createProceduralMaterial(data.color);
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(data.orbitRadius, 0, 0);
      mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTilt);
      pivot.add(mesh);

      const haloGeometry = new THREE.SphereGeometry(data.radius * 2, 32, 32);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: data.color,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        depthWrite: false
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      mesh.add(halo);

      let ring: THREE.Mesh | undefined;
      if (data.hasRing && data.ringInner && data.ringOuter) {
        const ringGeometry = new THREE.RingGeometry(data.ringInner, data.ringOuter, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: data.ringColor || 0xd4c49a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });
        ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);
      }

      const startAngle = Math.random() * Math.PI * 2;
      pivot.rotation.y = startAngle;

      this.planets.push({
        data,
        pivot,
        mesh,
        halo,
        ring,
        angle: startAngle,
        targetScale: 1,
        currentScale: 1
      });
    }
  }

  private createOrbits(): void {
    for (const data of PLANET_DATA) {
      const points: THREE.Vector3[] = [];
      const segments = 256;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(theta) * data.orbitRadius,
          0,
          Math.sin(theta) * data.orbitRadius
        ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0x4a4a6a,
        transparent: true,
        opacity: 0.6,
        dashSize: 0.3,
        gapSize: 0.3,
        linewidth: 1
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.orbits.push(line);
      this.group.add(line);
    }
  }

  private createStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const colorStart = new THREE.Color(0xffffff);
    const colorEnd = new THREE.Color(0xaaccff);

    for (let i = 0; i < starCount; i++) {
      const radius = 150 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mix = Math.random();
      const color = colorStart.clone().lerp(colorEnd, mix);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.1 + Math.random() * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  public update(deltaTime: number): void {
    this.sun.rotation.y += deltaTime * 0.05 * ROTATION_SCALE;

    for (const planet of this.planets) {
      const orbitSpeed = (2 * Math.PI) / (planet.data.orbitPeriod * 8) * TIME_SCALE;
      planet.angle += deltaTime * orbitSpeed;
      planet.pivot.rotation.y = planet.angle;

      const rotationSpeed = (2 * Math.PI) / (planet.data.rotationPeriod * 4) * ROTATION_SCALE * TIME_SCALE;
      planet.mesh.rotation.y += deltaTime * rotationSpeed;

      const scaleDiff = planet.targetScale - planet.currentScale;
      if (Math.abs(scaleDiff) > 0.001) {
        planet.currentScale += scaleDiff * Math.min(deltaTime * 8, 1);
        planet.mesh.scale.setScalar(planet.currentScale);
      }

      if (planet.halo) {
        const haloMaterial = planet.halo.material as THREE.MeshBasicMaterial;
        const targetOpacity = planet.targetScale > 1 ? 0.3 : 0;
        haloMaterial.opacity += (targetOpacity - haloMaterial.opacity) * Math.min(deltaTime * 8, 1);
      }
    }
  }

  public setPlanetHighlight(planetIndex: number | null): void {
    for (let i = 0; i < this.planets.length; i++) {
      this.planets[i].targetScale = planetIndex === i ? 1.2 : 1;
    }
  }

  public getPlanetMeshes(): THREE.Mesh[] {
    return this.planets.map(p => p.mesh);
  }

  public getPlanetByMesh(mesh: THREE.Mesh): PlanetObject | null {
    return this.planets.find(p => p.mesh === mesh) || null;
  }
}
