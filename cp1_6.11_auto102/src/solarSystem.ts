import * as THREE from 'three';

export interface PlanetData {
  name: string;
  radius: number;
  color: string;
  distance: number;
  orbitalPeriod: number;
  inclination: number;
  temperature: number;
  hasRing?: boolean;
  mass: number;
}

export interface PlanetObject {
  data: PlanetData;
  mesh: THREE.Mesh;
  orbit: THREE.Line;
  angle: number;
  group: THREE.Group;
  ring?: THREE.Mesh;
}

export const PLANET_DATA: PlanetData[] = [
  { name: '水星', radius: 0.5, color: '#b0a89a', distance: 10, orbitalPeriod: 88, inclination: 7.0, temperature: 440, mass: 0.055 },
  { name: '金星', radius: 0.9, color: '#e8c87a', distance: 14, orbitalPeriod: 225, inclination: 3.4, temperature: 737, mass: 0.815 },
  { name: '地球', radius: 1.0, color: '#4a90d9', distance: 19, orbitalPeriod: 365, inclination: 0.0, temperature: 288, mass: 1.0 },
  { name: '火星', radius: 0.7, color: '#c46a4a', distance: 24, orbitalPeriod: 687, inclination: 1.9, temperature: 210, mass: 0.107 },
  { name: '木星', radius: 3.0, color: '#d4a070', distance: 34, orbitalPeriod: 4333, inclination: 1.3, temperature: 165, mass: 317.8 },
  { name: '土星', radius: 2.5, color: '#e0c08a', distance: 44, orbitalPeriod: 10759, inclination: 2.5, temperature: 134, mass: 95.2, hasRing: true },
  { name: '天王星', radius: 1.8, color: '#80c0d0', distance: 52, orbitalPeriod: 30687, inclination: 0.8, temperature: 76, mass: 14.5 },
  { name: '海王星', radius: 1.7, color: '#3060a0', distance: 60, orbitalPeriod: 60190, inclination: 1.8, temperature: 72, mass: 17.1 }
];

export class SolarSystem {
  public scene: THREE.Scene;
  public sun!: THREE.Mesh;
  public sunLight!: THREE.PointLight;
  public planets: PlanetObject[] = [];
  public stars: THREE.Sprite[] = [];
  public sunParticles: THREE.Points;
  public sunGlow!: THREE.Mesh;
  public orbitalSpeed: number = 1.0;
  public selectedPlanet: PlanetObject | null = null;
  public hoveredPlanet: PlanetObject | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.createSun();
    this.createPlanets();
    this.createStars();
    this.createSunParticles();
    this.setupBackground();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000014');
    gradient.addColorStop(1, '#0a0a2a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.0
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.name = 'sun';
    this.scene.add(this.sun);

    this.sunLight = new THREE.PointLight(0xffffff, 2.0, 300, 0.5);
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0003;
    this.scene.add(this.sunLight);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    this.scene.add(ambientLight);

    const glowGeometry = new THREE.SphereGeometry(7, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.4 },
        p: { value: 4.0 },
        glowColor: { value: new THREE.Color(0xffaa00) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float c;
        uniform float p;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
          gl_FragColor = vec4(glowColor, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    this.sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(this.sunGlow);
  }

  private createSunParticles(): void {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color1 = new THREE.Color(0xffaa00);
    const color2 = new THREE.Color(0xff6600);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5.5 + Math.random() * 3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = Math.random() > 0.5 ? color1 : color2;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.sunParticles = new THREE.Points(geometry, material);
    this.scene.add(this.sunParticles);
  }

  private createPlanets(): void {
    PLANET_DATA.forEach((data) => {
      const group = new THREE.Group();
      group.rotation.x = (data.inclination * Math.PI) / 180;

      const orbitGeometry = new THREE.BufferGeometry();
      const orbitPoints: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        orbitPoints.push(new THREE.Vector3(
          Math.cos(angle) * data.distance,
          0,
          Math.sin(angle) * data.distance
        ));
      }
      orbitGeometry.setFromPoints(orbitPoints);
      const orbitMaterial = new THREE.LineDashedMaterial({
        color: 0x4a90d9,
        dashSize: 0.8,
        gapSize: 0.4,
        transparent: true,
        opacity: 0.5,
        linewidth: 2
      });
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
      orbit.computeLineDistances();
      group.add(orbit);

      const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.5,
        metalness: 0.1,
        bumpScale: 0.05
      });
      const mesh = new THREE.Mesh(planetGeometry, planetMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = data.name;
      mesh.position.x = data.distance;

      let ring: THREE.Mesh | undefined;
      if (data.hasRing) {
        const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xd4b896,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.5;
        mesh.add(ring);
      }

      group.add(mesh);
      this.scene.add(group);

      this.planets.push({
        data,
        mesh,
        orbit,
        angle: Math.random() * Math.PI * 2,
        group,
        ring
      });
    });
  }

  private createStars(): void {
    const starCount = 500;
    const starTexture = this.createStarTexture();

    for (let i = 0; i < starCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: starTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.7,
        blending: THREE.AdditiveBlending
      });
      const star = new THREE.Sprite(material);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 150 + Math.random() * 100;
      star.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      const size = 0.1 + Math.random() * 0.4;
      star.scale.set(size, size, size);
      (star.material as THREE.SpriteMaterial).userData = {
        baseOpacity: (star.material as THREE.SpriteMaterial).opacity,
        flickerSpeed: 0.5 + Math.random() * 1.5,
        flickerPhase: Math.random() * Math.PI * 2
      };
      this.stars.push(star);
      this.scene.add(star);
    }
  }

  private createStarTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  public update(deltaTime: number, time: number): void {
    const baseSpeed = (2 * Math.PI) / (365 * 10);

    this.planets.forEach((planet) => {
      const speedFactor = 365 / planet.data.orbitalPeriod;
      planet.angle += baseSpeed * speedFactor * this.orbitalSpeed * deltaTime * 60;
      planet.mesh.position.x = Math.cos(planet.angle) * planet.data.distance;
      planet.mesh.position.z = Math.sin(planet.angle) * planet.data.distance;
      planet.mesh.rotation.y += deltaTime * 0.5;
    });

    this.sun.rotation.y += deltaTime * 0.05;
    this.sunParticles.rotation.y += deltaTime * 0.1;

    this.sunParticles.rotation.x = Math.sin(time * 0.2) * 0.1;

    this.stars.forEach((star) => {
      const material = star.material as THREE.SpriteMaterial;
      const { baseOpacity, flickerSpeed, flickerPhase } = material.userData;
      material.opacity = baseOpacity * (0.6 + 0.4 * Math.sin(time * flickerSpeed + flickerPhase));
    });

    const camDistance = this.camera.position.length();
    this.planets.forEach((p) => {
      p.mesh.castShadow = camDistance < 30;
      p.mesh.receiveShadow = camDistance < 30;
    });
  }

  public setOrbitalSpeed(speed: number): void {
    this.orbitalSpeed = speed;
  }

  public getPlanetPositions(): Map<string, { position: THREE.Vector3; radius: number; mass: number; name: string }> {
    const positions = new Map();
    this.planets.forEach((p) => {
      positions.set(p.data.name, {
        position: p.mesh.position.clone(),
        radius: p.data.radius,
        mass: p.data.mass,
        name: p.data.name
      });
    });
    positions.set('太阳', {
      position: this.sun.position.clone(),
      radius: 5,
      mass: 333000,
      name: '太阳'
    });
    return positions;
  }

  public checkHover(mouseX: number, mouseY: number, canvasRect: DOMRect): PlanetData | null {
    this.mouse.x = ((mouseX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.mouse.y = -((mouseY - canvasRect.top) / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const planetMeshes = this.planets.map((p) => p.mesh);
    const intersects = this.raycaster.intersectObjects(planetMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const planet = this.planets.find((p) => p.mesh === hitMesh);
      if (planet) {
        this.hoveredPlanet = planet;
        return planet.data;
      }
    }
    this.hoveredPlanet = null;
    return null;
  }

  public getHoveredPlanetScreenPosition(): THREE.Vector2 | null {
    if (!this.hoveredPlanet) return null;
    const pos = this.hoveredPlanet.mesh.position.clone().project(this.camera);
    return new THREE.Vector2(
      (pos.x + 1) / 2 * window.innerWidth,
      (-pos.y + 1) / 2 * window.innerHeight
    );
  }

  public selectPlanet(name: string): void {
    this.selectedPlanet = this.planets.find((p) => p.data.name === name) || null;
  }

  public getSelectedPlanetData(): PlanetData | null {
    return this.selectedPlanet ? this.selectedPlanet.data : null;
  }
}
