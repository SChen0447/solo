import * as THREE from 'three';
import { Planet, PlanetData } from './Planet';

export interface SolarSystemOptions {
  container: HTMLElement;
}

const PLANET_DATA: PlanetData[] = [
  {
    name: '水星',
    nameEn: 'Mercury',
    color: 0xa8a29e,
    size: 4,
    orbitRadius: 80,
    orbitSpeed: 0.8,
    rotationSpeed: 0.15,
    axialTilt: 0.03,
    orbitInclination: 0.12,
    orbitalPeriod: '88 天',
    rotationPeriod: '58.6 天',
    distanceFromSun: '5790 万公里',
    mass: '3.30×10²³ kg',
    temperatureRange: '-173°C ~ 427°C',
    moons: 0,
    description: '水星是太阳系中最小的行星，也是距离太阳最近的行星。它的表面布满陨石坑，没有大气层保护，昼夜温差极大。',
    textureType: 'mercury'
  },
  {
    name: '金星',
    nameEn: 'Venus',
    color: 0xfbbf24,
    size: 9,
    orbitRadius: 120,
    orbitSpeed: 0.5,
    rotationSpeed: -0.05,
    axialTilt: 177.4,
    orbitInclination: 0.06,
    orbitalPeriod: '225 天',
    rotationPeriod: '243 天 (逆向)',
    distanceFromSun: '1.08 亿公里',
    mass: '4.87×10²⁴ kg',
    temperatureRange: '462°C (平均)',
    moons: 0,
    description: '金星是太阳系中最热的行星，浓厚的二氧化碳大气层产生强烈的温室效应。它是夜空中最亮的行星，被称为"启明星"或"长庚星"。',
    textureType: 'venus'
  },
  {
    name: '地球',
    nameEn: 'Earth',
    color: 0x2563eb,
    size: 12,
    orbitRadius: 170,
    orbitSpeed: 0.3,
    rotationSpeed: 1.0,
    axialTilt: 23.5,
    orbitInclination: 0.0,
    orbitalPeriod: '365.25 天',
    rotationPeriod: '24 小时',
    distanceFromSun: '1.5 亿公里',
    mass: '5.97×10²⁴ kg',
    temperatureRange: '-88°C ~ 58°C',
    moons: 1,
    description: '地球是太阳系中唯一已知存在生命的行星。它拥有液态水、适宜的大气层和磁场，为生命提供了理想的环境。',
    textureType: 'earth'
  },
  {
    name: '火星',
    nameEn: 'Mars',
    color: 0xdc2626,
    size: 8,
    orbitRadius: 230,
    orbitSpeed: 0.2,
    rotationSpeed: 0.95,
    axialTilt: 25.2,
    orbitInclination: 0.03,
    orbitalPeriod: '687 天',
    rotationPeriod: '24.6 小时',
    distanceFromSun: '2.28 亿公里',
    mass: '6.42×10²³ kg',
    temperatureRange: '-125°C ~ 20°C',
    moons: 2,
    description: '火星因其红色外表而被称为"红色星球"。它是人类探索的重点目标，可能存在过液态水，是未来殖民的潜在地点。',
    textureType: 'mars'
  },
  {
    name: '木星',
    nameEn: 'Jupiter',
    color: 0xd4a855,
    size: 36,
    orbitRadius: 330,
    orbitSpeed: 0.08,
    rotationSpeed: 2.4,
    axialTilt: 3.1,
    orbitInclination: 0.02,
    orbitalPeriod: '11.86 年',
    rotationPeriod: '9.9 小时',
    distanceFromSun: '7.78 亿公里',
    mass: '1.90×10²⁷ kg',
    temperatureRange: '-108°C (云顶)',
    moons: 95,
    description: '木星是太阳系中最大的行星，其质量是其他所有行星总和的2.5倍。著名的大红斑是一个持续数百年的巨型风暴系统。',
    textureType: 'jupiter'
  }
];

export class SolarSystem {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public planets: Planet[] = [];
  public sun!: THREE.Mesh;
  public coronaGroups: THREE.Group[] = [];

  private container: HTMLElement;
  private width: number = 0;
  private height: number = 0;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 600;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI * 0.35;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI * 0.35;
  private targetDistance: number = 600;
  private minDistance: number = 80;
  private maxDistance: number = 1200;
  private minPhi: number = Math.PI * 0.15;
  private maxPhi: number = Math.PI * 0.75;

  private stars!: THREE.Points;
  private hoveredPlanet: Planet | null = null;
  private selectedPlanet: Planet | null = null;

  private onPlanetHover?: (planet: Planet | null) => void;
  private onPlanetSelect?: (planet: Planet | null) => void;

  constructor(options: SolarSystemOptions) {
    this.container = options.container;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.width / this.height,
      0.1,
      5000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.init();
  }

  private init(): void {
    this.resize();
    this.setupRenderer();
    this.setupLights();
    this.createSun();
    this.createCorona();
    this.createPlanets();
    this.createStars();
    this.setupEvents();
    this.updateCameraPosition();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x0a0a2e, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x333366, 0.4);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffdd00, 2, 2000, 1);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);
  }

  private createSun(): void {
    const geometry = new THREE.SphereGeometry(40, 48, 48);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 128, 20, 256, 128, 256);
    gradient.addColorStop(0, '#ffdd00');
    gradient.addColorStop(0.3, '#ffcc00');
    gradient.addColorStop(0.6, '#ff9900');
    gradient.addColorStop(1, '#ff5500');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = 3 + Math.random() * 10;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0xffffff
    });
    this.sun = new THREE.Mesh(geometry, material);
    this.scene.add(this.sun);
  }

  private createCorona(): void {
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const particleCount = 40;
      const positions = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);

      for (let j = 0; j < particleCount; j++) {
        const angle = (j / particleCount) * Math.PI * 2;
        const radius = 50 + i * 15 + Math.random() * 10;
        const offsetY = (Math.random() - 0.5) * 8;

        positions[j * 3] = Math.cos(angle) * radius;
        positions[j * 3 + 1] = offsetY;
        positions[j * 3 + 2] = Math.sin(angle) * radius;
        sizes[j] = 2 + Math.random() * 3;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        color: 0xffffaa,
        size: 3,
        transparent: true,
        opacity: 0.4 - i * 0.1,
        sizeAttenuation: true
      });

      const particles = new THREE.Points(geometry, material);
      group.add(particles);
      group.rotation.x = (i * 0.3) + Math.random() * 0.2;
      group.rotation.z = Math.random() * Math.PI;
      this.coronaGroups.push(group);
      this.scene.add(group);
    }
  }

  private createPlanets(): void {
    PLANET_DATA.forEach(data => {
      const planet = new Planet(data);
      this.planets.push(planet);
      this.scene.add(planet.group);
      this.scene.add(planet.orbit);
    });
  }

  private createStars(): void {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 1500 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 1.1;

      sizes[i] = 1 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('click', this.onClick.bind(this));

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onResize(): void {
    this.resize();
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  private resize(): void {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      this.targetTheta -= deltaX * 0.005;
      this.targetPhi -= deltaY * 0.005;
      this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi));

      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    }

    this.updateMousePosition(e.clientX, e.clientY);
    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseLeave(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetDistance *= scale;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  private onClick(): void {
    if (this.hoveredPlanet) {
      if (this.selectedPlanet === this.hoveredPlanet) {
        this.selectedPlanet.isSelected = false;
        this.selectedPlanet = null;
        this.onPlanetSelect?.(null);
      } else {
        if (this.selectedPlanet) {
          this.selectedPlanet.isSelected = false;
        }
        this.selectedPlanet = this.hoveredPlanet;
        this.selectedPlanet.isSelected = true;
        this.onPlanetSelect?.(this.selectedPlanet);
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.previousMouse.x;
      const deltaY = e.touches[0].clientY - this.previousMouse.y;

      this.targetTheta -= deltaX * 0.005;
      this.targetPhi -= deltaY * 0.005;
      this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi));

      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object;
      const planet = this.planets.find(p => p.mesh === intersectedMesh);
      if (planet && planet !== this.hoveredPlanet) {
        if (this.hoveredPlanet && !this.hoveredPlanet.isSelected) {
          this.hoveredPlanet.isHovered = false;
        }
        this.hoveredPlanet = planet;
        this.hoveredPlanet.isHovered = true;
        this.onPlanetHover?.(this.hoveredPlanet);
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else if (this.hoveredPlanet) {
      if (!this.hoveredPlanet.isSelected) {
        this.hoveredPlanet.isHovered = false;
      }
      this.hoveredPlanet = null;
      this.onPlanetHover?.(null);
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private updateCameraPosition(): void {
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * 0.1;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * 0.1;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * 0.1;

    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  public resetView(): void {
    this.targetTheta = 0;
    this.targetPhi = Math.PI * 0.35;
    this.targetDistance = 600;

    if (this.selectedPlanet) {
      this.selectedPlanet.isSelected = false;
      this.selectedPlanet = null;
      this.onPlanetSelect?.(null);
    }
  }

  public setOnPlanetHover(callback: (planet: Planet | null) => void): void {
    this.onPlanetHover = callback;
  }

  public setOnPlanetSelect(callback: (planet: Planet | null) => void): void {
    this.onPlanetSelect = callback;
  }

  public getHoveredPlanet(): Planet | null {
    return this.hoveredPlanet;
  }

  public getSelectedPlanet(): Planet | null {
    return this.selectedPlanet;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();

    this.updateCameraPosition();
    this.sun.rotation.y += delta * 0.05;

    this.coronaGroups.forEach((group, index) => {
      group.rotation.y += delta * (0.05 + index * 0.02);
    });

    this.planets.forEach(planet => {
      planet.update(delta);
    });

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.planets.forEach(planet => planet.dispose());
    this.renderer.dispose();
  }
}
