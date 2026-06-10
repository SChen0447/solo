import * as THREE from 'three';

export interface CelestialBodyData {
  name: string;
  nameEn: string;
  diameter: string;
  mass: string;
  orbitPeriod: string;
  distance: string;
  description: string;
  color: number;
}

export interface PlanetData extends CelestialBodyData {
  orbitRadius: number;
  size: number;
  orbitSpeed: number;
  rotationSpeed: number;
  hasRings?: boolean;
  tilt?: number;
}

export const SUN_DATA: CelestialBodyData = {
  name: '太阳',
  nameEn: 'Sun',
  diameter: '1,392,700 km',
  mass: '1.989 × 10³⁰ kg',
  orbitPeriod: '-',
  distance: '-',
  description:
    '太阳是太阳系的中心恒星，占太阳系总质量的99.86%。它是一颗G型主序星，表面温度约5500°C，核心温度高达1500万°C，通过核聚变反应释放能量，为地球上的生命提供光和热。',
  color: 0xffdd44,
};

export const PLANETS_DATA: PlanetData[] = [
  {
    name: '水星',
    nameEn: 'Mercury',
    diameter: '4,879 km',
    mass: '3.301 × 10²³ kg',
    orbitPeriod: '88 天',
    distance: '5790万 km',
    description:
      '水星是距离太阳最近的行星，也是太阳系中最小的行星。其表面布满陨石坑，类似月球，没有大气层保护。昼夜温差极大，白天可达430°C，夜间降至-180°C。',
    color: 0x8c7853,
    orbitRadius: 12,
    size: 0.3,
    orbitSpeed: 4.15,
    rotationSpeed: 0.004,
  },
  {
    name: '金星',
    nameEn: 'Venus',
    diameter: '12,104 km',
    mass: '4.867 × 10²⁴ kg',
    orbitPeriod: '225 天',
    distance: '1.08亿 km',
    description:
      '金星是距离地球最近的行星，被浓厚的二氧化碳大气层包裹，表面温度高达465°C，是太阳系中最热的行星。云层主要由硫酸组成，气压是地球的92倍，自转方向与其他行星相反。',
    color: 0xe8b87c,
    orbitRadius: 18,
    size: 0.7,
    orbitSpeed: 1.62,
    rotationSpeed: -0.002,
  },
  {
    name: '地球',
    nameEn: 'Earth',
    diameter: '12,742 km',
    mass: '5.972 × 10²⁴ kg',
    orbitPeriod: '365.25 天',
    distance: '1.496亿 km',
    description:
      '地球是太阳系中唯一已知存在生命的行星，表面71%被液态水覆盖。拥有由氮气和氧气组成的大气层，以及保护生命免受有害辐射的磁场。有一颗天然卫星——月球。',
    color: 0x3a7bbd,
    orbitRadius: 24,
    size: 0.72,
    orbitSpeed: 1.0,
    rotationSpeed: 0.02,
  },
  {
    name: '火星',
    nameEn: 'Mars',
    diameter: '6,779 km',
    mass: '6.39 × 10²³ kg',
    orbitPeriod: '687 天',
    distance: '2.28亿 km',
    description:
      '火星因其红色外观被称为"红色星球"，表面富含氧化铁。拥有太阳系最大的火山（奥林帕斯山，高22公里）和最大的峡谷（水手谷，长4000公里）。有两颗小卫星：火卫一和火卫二。',
    color: 0xc1440e,
    orbitRadius: 32,
    size: 0.5,
    orbitSpeed: 0.53,
    rotationSpeed: 0.018,
  },
  {
    name: '木星',
    nameEn: 'Jupiter',
    diameter: '139,820 km',
    mass: '1.898 × 10²⁷ kg',
    orbitPeriod: '11.86 年',
    distance: '7.78亿 km',
    description:
      '木星是太阳系最大的行星，质量是其他所有行星总和的2.5倍。它是一颗气态巨行星，主要由氢和氦组成。著名的大红斑是一场持续数百年的巨型风暴。目前已知有95颗卫星，包括伽利略卫星。',
    color: 0xd8a679,
    orbitRadius: 46,
    size: 2.4,
    orbitSpeed: 0.084,
    rotationSpeed: 0.04,
  },
  {
    name: '土星',
    nameEn: 'Saturn',
    diameter: '116,460 km',
    mass: '5.683 × 10²⁶ kg',
    orbitPeriod: '29.46 年',
    distance: '14.3亿 km',
    description:
      '土星以其壮观的环系统著称，环主要由冰粒和岩石碎片组成。它是太阳系密度最低的行星，甚至比水还轻。拥有146颗已知卫星，其中土卫六（泰坦）是唯一拥有浓厚大气层的卫星。',
    color: 0xf4d59e,
    orbitRadius: 60,
    size: 2.0,
    orbitSpeed: 0.034,
    rotationSpeed: 0.038,
    hasRings: true,
    tilt: 0.47,
  },
  {
    name: '天王星',
    nameEn: 'Uranus',
    diameter: '50,724 km',
    mass: '8.681 × 10²⁵ kg',
    orbitPeriod: '84.01 年',
    distance: '28.7亿 km',
    description:
      '天王星是一颗冰巨星，大气中含有甲烷使其呈现蓝绿色。独特之处在于其自转轴几乎与公转平面平行，几乎是"躺着"自转，这可能是远古时期一次巨大撞击的结果。有27颗已知卫星。',
    color: 0x9fe0e0,
    orbitRadius: 74,
    size: 1.2,
    orbitSpeed: 0.012,
    rotationSpeed: 0.03,
    tilt: 1.57,
  },
  {
    name: '海王星',
    nameEn: 'Neptune',
    diameter: '49,244 km',
    mass: '1.024 × 10²⁶ kg',
    orbitPeriod: '164.8 年',
    distance: '45亿 km',
    description:
      '海王星是太阳系最远的行星，也是风速最快的行星，风速可达每小时2100公里。深蓝色同样来自大气中的甲烷。它是通过数学计算预测后被发现的第一颗行星。有14颗已知卫星。',
    color: 0x4b70dd,
    orbitRadius: 86,
    size: 1.15,
    orbitSpeed: 0.006,
    rotationSpeed: 0.032,
  },
];

export interface PlanetObject {
  data: PlanetData | CelestialBodyData;
  mesh: THREE.Mesh;
  orbitPivot: THREE.Object3D;
  trail: THREE.Points;
  trailPositions: THREE.Vector3[];
  group: THREE.Group;
}

export class SolarSystem {
  public scene: THREE.Scene;
  public planets: PlanetObject[] = [];
  public sun!: PlanetObject;
  public raycaster: THREE.Raycaster;
  public clickableObjects: THREE.Mesh[] = [];
  public onBodyClick?: (body: PlanetObject) => void;

  private timeSpeed: number = 1.0;
  private targetTimeSpeed: number = 1.0;
  private isPaused: boolean = false;
  private starField!: THREE.Points;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.createSun();
    this.createPlanets();
    this.createStarField();
  }

  public setSpeed(speed: number): void {
    this.targetTimeSpeed = speed;
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getCurrentSpeed(): number {
    return this.targetTimeSpeed;
  }

  public update(delta: number): void {
    if (!this.isPaused) {
      this.timeSpeed += (this.targetTimeSpeed - this.timeSpeed) * Math.min(delta * 4, 1);
    }

    const effectiveDelta = this.isPaused ? 0 : delta * this.timeSpeed;

    this.sun.mesh.rotation.y += 0.001 * delta * 60;

    for (const planet of this.planets) {
      planet.orbitPivot.rotation.y += (planet.data as PlanetData).orbitSpeed * 0.002 * effectiveDelta * 60;
      planet.mesh.rotation.y += (planet.data as PlanetData).rotationSpeed * delta * 60;
      this.updateTrail(planet);
    }

    if (this.starField) {
      this.starField.rotation.y += 0.00005 * delta * 60;
    }
  }

  public handleClick(
    event: MouseEvent,
    camera: THREE.PerspectiveCamera,
    container: HTMLElement
  ): void {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, camera);
    const intersects = this.raycaster.intersectObjects(this.clickableObjects, false);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const body =
        this.planets.find((p) => p.mesh === clickedMesh) ||
        (this.sun.mesh === clickedMesh ? this.sun : null);
      if (body && this.onBodyClick) {
        this.onBodyClick(body);
      }
    }
  }

  private createSun(): void {
    const geometry = new THREE.SphereGeometry(3.5, 48, 48);
    const texture = this.generateTexture(SUN_DATA.color, {
      type: 'sun',
      turbulence: 0.6,
    });
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff,
    });
    const mesh = new THREE.Mesh(geometry, material);

    const glowGeometry = new THREE.SphereGeometry(4.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    const outerGlowGeometry = new THREE.SphereGeometry(5.0, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    mesh.add(outerGlow);

    const pointLight = new THREE.PointLight(0xffffff, 2.5, 400, 1.2);
    mesh.add(pointLight);

    this.scene.add(mesh);
    this.clickableObjects.push(mesh);

    this.sun = {
      data: SUN_DATA,
      mesh,
      orbitPivot: new THREE.Object3D(),
      trail: null as unknown as THREE.Points,
      trailPositions: [],
      group: new THREE.Group(),
    };
  }

  private createPlanets(): void {
    for (const planetData of PLANETS_DATA) {
      const group = new THREE.Group();

      const orbitPivot = new THREE.Object3D();
      this.scene.add(orbitPivot);

      const geometry = new THREE.SphereGeometry(planetData.size, 40, 40);
      const texture = this.generateTexture(planetData.color, {
        type: planetData.nameEn.toLowerCase(),
        turbulence: 0.4,
      });
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(planetData.orbitRadius, 0, 0);

      if (planetData.tilt) {
        mesh.rotation.z = planetData.tilt;
      }

      if (planetData.hasRings) {
        const ringGeometry = new THREE.RingGeometry(
          planetData.size * 1.4,
          planetData.size * 2.4,
          96
        );
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: planetData.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2.2;
        mesh.add(ring);

        const innerRingGeometry = new THREE.RingGeometry(
          planetData.size * 1.15,
          planetData.size * 1.38,
          96
        );
        const innerRingMaterial = new THREE.MeshBasicMaterial({
          color: 0xffe4b5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.rotation.x = Math.PI / 2.2;
        mesh.add(innerRing);
      }

      orbitPivot.add(mesh);
      orbitPivot.rotation.y = Math.random() * Math.PI * 2;

      this.createOrbitLine(planetData);

      const { trail, trailPositions } = this.createTrail(planetData.color);
      this.scene.add(trail);

      this.clickableObjects.push(mesh);

      this.planets.push({
        data: planetData,
        mesh,
        orbitPivot,
        trail,
        trailPositions,
        group,
      });
    }
  }

  private createOrbitLine(planetData: PlanetData): void {
    const segments = 192;
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * planetData.orbitRadius,
          0,
          Math.sin(angle) * planetData.orbitRadius
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: planetData.color,
      transparent: true,
      opacity: 0.28,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
  }

  private createTrail(color: number): { trail: THREE.Points; trailPositions: THREE.Vector3[] } {
    const trailPositions: THREE.Vector3[] = [];
    const positions = new Float32Array(10 * 3);
    const colors = new Float32Array(10 * 3);

    const c = new THREE.Color(color);

    for (let i = 0; i < 10; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    return { trail: new THREE.Points(geometry, material), trailPositions };
  }

  private updateTrail(planet: PlanetObject): void {
    const pos = new THREE.Vector3();
    planet.mesh.getWorldPosition(pos);

    planet.trailPositions.unshift(pos.clone());
    if (planet.trailPositions.length > 10) {
      planet.trailPositions.pop();
    }

    const positions = planet.trail.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < planet.trailPositions.length; i++) {
      positions[i * 3] = planet.trailPositions[i].x;
      positions[i * 3 + 1] = planet.trailPositions[i].y;
      positions[i * 3 + 2] = planet.trailPositions[i].z;
    }

    for (let i = planet.trailPositions.length; i < 10; i++) {
      if (planet.trailPositions.length > 0) {
        const last = planet.trailPositions[planet.trailPositions.length - 1];
        positions[i * 3] = last.x;
        positions[i * 3 + 1] = last.y;
        positions[i * 3 + 2] = last.z;
      }
    }

    planet.trail.geometry.attributes.position.needsUpdate = true;
  }

  private createStarField(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 250 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      const tint = Math.random();
      if (tint > 0.92) {
        colors[i * 3] = brightness * 0.9;
        colors[i * 3 + 1] = brightness * 0.95;
        colors[i * 3 + 2] = brightness;
      } else if (tint > 0.85) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.95;
        colors[i * 3 + 2] = brightness * 0.85;
      } else {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      }

      sizes[i] = 0.3 + Math.random() * 0.9;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  public generateTexture(
    baseColor: number,
    options: { type: string; turbulence: number }
  ): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const color = new THREE.Color(baseColor);
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    const baseR = color.r * 255;
    const baseG = color.g * 255;
    const baseB = color.b * 255;

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;

        const noise1 = this.simpleNoise(x * 0.012, y * 0.012);
        const noise2 = this.simpleNoise(x * 0.035 + 100, y * 0.035 + 100);
        const combined = noise1 * 0.6 + noise2 * 0.4;

        const variation = (combined - 0.5) * 100 * options.turbulence;

        if (options.type === 'sun') {
          data[idx] = Math.min(255, Math.max(0, baseR + variation * 0.5));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + variation * 0.35));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + variation * 0.15));
        } else if (options.type === 'earth') {
          if (combined > 0.55) {
            data[idx] = 60 + variation * 0.4;
            data[idx + 1] = 120 + variation * 0.5;
            data[idx + 2] = 70 + variation * 0.3;
          } else {
            data[idx] = 30 + variation * 0.3;
            data[idx + 1] = 80 + variation * 0.4;
            data[idx + 2] = 160 + variation * 0.5;
          }
          if (y < size * 0.15 || y > size * 0.85) {
            data[idx] = 230;
            data[idx + 1] = 240;
            data[idx + 2] = 255;
          }
        } else if (options.type === 'jupiter') {
          const band = Math.sin(y * 0.08 + noise1 * 8) * 0.5 + 0.5;
          data[idx] = Math.min(255, Math.max(0, baseR + (band - 0.5) * 90 + variation * 0.5));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + (band - 0.5) * 60 + variation * 0.4));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + (band - 0.5) * 40 + variation * 0.3));
        } else if (options.type === 'saturn') {
          const band = Math.sin(y * 0.06 + noise1 * 5) * 0.5 + 0.5;
          data[idx] = Math.min(255, Math.max(0, baseR + (band - 0.5) * 60 + variation * 0.5));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + (band - 0.5) * 45 + variation * 0.4));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + (band - 0.5) * 30 + variation * 0.3));
        } else if (options.type === 'uranus' || options.type === 'neptune') {
          data[idx] = Math.min(255, Math.max(0, baseR + variation * 0.4));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + variation * 0.5));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + variation * 0.6));
        } else if (options.type === 'mars') {
          data[idx] = Math.min(255, Math.max(0, baseR + variation * 0.7));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + variation * 0.5));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + variation * 0.3));
          if (combined > 0.75) {
            data[idx] = Math.min(255, data[idx] + 40);
            data[idx + 1] = Math.min(255, data[idx + 1] + 35);
            data[idx + 2] = Math.min(255, data[idx + 2] + 30);
          }
        } else {
          data[idx] = Math.min(255, Math.max(0, baseR + variation * 0.6));
          data[idx + 1] = Math.min(255, Math.max(0, baseG + variation * 0.6));
          data[idx + 2] = Math.min(255, Math.max(0, baseB + variation * 0.6));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  public generatePreviewCanvas(baseColor: number, type: string): HTMLCanvasElement {
    return this.generateTexture(baseColor, { type, turbulence: 0.4 }).image as HTMLCanvasElement;
  }

  private simpleNoise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    const base = n - Math.floor(n);

    const n2 = Math.sin(x * 39.346 + y * 11.135) * 24634.6345;
    const detail = n2 - Math.floor(n2);

    return base * 0.7 + detail * 0.3;
  }
}
