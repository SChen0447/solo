import * as THREE from 'three';
import { TerrainGenerator, TerrainData } from './terrainGenerator';
import { InteractionHandler } from './interactionHandler';
import { UIOverlay } from './uiOverlay';

interface GlowingPlant {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  baseRadius: number;
  phase: number;
  color: THREE.Color;
}

interface ParticleRing {
  particles: THREE.Points;
  startTime: number;
  duration: number;
  startSize: number;
  endSize: number;
}

interface StarData {
  mesh: THREE.Mesh;
  phase: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private terrainGenerator: TerrainGenerator;
  private terrainData: TerrainData | null = null;
  private terrainMesh: THREE.Mesh | null = null;
  private islandGroup: THREE.Group;

  private interactionHandler: InteractionHandler;
  private uiOverlay: UIOverlay;

  private starRing: THREE.Points | null = null;
  private starRingGroup: THREE.Group;
  private ringSpeed: number = 0.05;
  private ringTilt: number = 0;

  private waterfallParticles: THREE.Points | null = null;
  private waterfallPositions: Float32Array | null = null;
  private waterfallVelocities: Float32Array | null = null;
  private waterfallStartY: number = 0;
  private particleCount: number = 80;
  private waterfallOrigin: THREE.Vector3 = new THREE.Vector3();

  private stars: THREE.Points | null = null;
  private starsGroup: THREE.Group;
  private starCount: number = 500;
  private brightStars: StarData[] = [];
  private starRotation: number = 0;

  private glowingPlants: GlowingPlant[] = [];
  private particleRings: ParticleRing[] = [];

  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0e27, 800, 2000);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 5000);
    this.camera.position.set(0, 0, 500);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.container.appendChild(this.renderer.domElement);

    this.islandGroup = new THREE.Group();
    this.scene.add(this.islandGroup);

    this.starRingGroup = new THREE.Group();
    this.islandGroup.add(this.starRingGroup);

    this.starsGroup = new THREE.Group();
    this.scene.add(this.starsGroup);

    this.terrainGenerator = new TerrainGenerator(Math.random() * 10000, 128, 300);

    this.interactionHandler = new InteractionHandler(
      this.renderer.domElement,
      this.camera,
      this.islandGroup
    );

    this.uiOverlay = new UIOverlay();

    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.setupLights();
    this.createTerrain();
    this.createStarRing();
    this.createWaterfall();
    this.createStarField();
    this.bindEvents();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 200, 100);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    fillLight.position.set(-100, 50, -100);
    this.scene.add(fillLight);

    const pointLight = new THREE.PointLight(0x88aaff, 0.5, 800);
    pointLight.position.set(0, 100, 200);
    this.scene.add(pointLight);
  }

  private createTerrain(): void {
    this.terrainData = this.terrainGenerator.generateHeightMap();

    const geometry = new THREE.PlaneGeometry(
      this.terrainData.size,
      this.terrainData.size,
      this.terrainData.resolution - 1,
      this.terrainData.resolution - 1
    );

    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();

    const dirtColor = new THREE.Color(0x8b6914);
    const darkDirtColor = new THREE.Color(0x4a3f32);
    const grassColor = new THREE.Color(0x5a8f29);

    const halfRes = this.terrainData.resolution / 2;
    const step = this.terrainData.size / (this.terrainData.resolution - 1);

    for (let i = 0; i < positions.count; i++) {
      const x = i % this.terrainData.resolution;
      const z = Math.floor(i / this.terrainData.resolution);

      const height = this.terrainData.heightMap[x][z];
      positions.setY(i, height);

      const heightNormalized = height / 60;

      if (heightNormalized > 0.4) {
        const t = (heightNormalized - 0.4) / 0.6;
        color.copy(grassColor).lerp(dirtColor, 1 - Math.min(1, t * 1.5));
      } else {
        const t = heightNormalized / 0.4;
        color.copy(darkDirtColor).lerp(dirtColor, t);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.9,
      metalness: 0.1
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.islandGroup.add(this.terrainMesh);
    this.interactionHandler.setTerrainMesh(this.terrainMesh);

    this.interactionHandler.onClick((point) => {
      this.addGlowingPlant(point);
      this.createParticleRing(point);
      this.addBrightStar(point);
    });
  }

  private createStarRing(): void {
    const innerRadius = 100;
    const outerRadius = 140;
    const particleCount = 1000;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const ringColor = new THREE.Color(0x89aaff);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = ringColor.r;
      colors[i * 3 + 1] = ringColor.g;
      colors[i * 3 + 2] = ringColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true
    });

    this.starRing = new THREE.Points(geometry, material);
    this.starRing.position.y = 80;
    this.starRingGroup.add(this.starRing);
  }

  private createWaterfall(): void {
    this.particleCount = this.uiOverlay.getState().particleCount;

    const positions = new Float32Array(this.particleCount * 3);
    const velocities = new Float32Array(this.particleCount);

    const angle = Math.random() * Math.PI * 2;
    const radius = 60 + Math.random() * 40;
    const originX = Math.cos(angle) * radius;
    const originZ = Math.sin(angle) * radius;

    let originY = 0;
    if (this.terrainData) {
      originY = this.terrainGenerator.getHeightAt(originX, originZ, this.terrainData);
    }

    this.waterfallOrigin.set(originX, originY, originZ);
    this.waterfallStartY = originY;

    for (let i = 0; i < this.particleCount; i++) {
      const offset = Math.random();
      positions[i * 3] = originX + (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = originY - offset * 150;
      positions[i * 3 + 2] = originZ + (Math.random() - 0.5) * 8;

      velocities[i] = 90 + Math.random() * 20;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const vertexShader = `
      uniform float uStartY;
      uniform float uFallDistance;
      uniform float uMaxSize;
      varying float vOpacity;
      void main() {
        float progress = clamp((uStartY - position.y) / uFallDistance, 0.0, 1.0);
        float size = uMaxSize * (1.0 - progress);
        vOpacity = 0.8 * (1.0 - progress);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor;
      varying float vOpacity;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = vOpacity * (1.0 - smoothstep(0.0, 0.5, dist));
        gl_FragColor = vec4(uColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uStartY: { value: originY },
        uFallDistance: { value: 150 },
        uMaxSize: { value: 3.0 },
        uColor: { value: new THREE.Color(0x66ccff) }
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    if (this.waterfallParticles) {
      this.islandGroup.remove(this.waterfallParticles);
      this.waterfallParticles.geometry.dispose();
      (this.waterfallParticles.material as THREE.Material).dispose();
    }

    this.waterfallParticles = new THREE.Points(geometry, material);
    this.waterfallPositions = positions;
    this.waterfallVelocities = velocities;
    this.islandGroup.add(this.waterfallParticles);
  }

  private createStarField(): void {
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    const whiteColor = new THREE.Color(0xffffff);
    const blueColor = new THREE.Color(0xaaddff);

    for (let i = 0; i < this.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1500 + Math.random() * 500;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const t = Math.random();
      const color = whiteColor.clone().lerp(blueColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 1 + Math.random() * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const vertexShader = `
      attribute float aSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    const material = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);
    this.starsGroup.add(this.stars);
  }

  private addGlowingPlant(position: THREE.Vector3): void {
    const colors = [0xff77aa, 0x77ffaa, 0xffaa77];
    const colorHex = colors[Math.floor(Math.random() * colors.length)];
    const color = new THREE.Color(colorHex);

    const radius = 8 + Math.random() * 4;

    const sphereGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(position);
    sphere.position.y += radius;

    const haloGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });

    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.position.copy(sphere.position);

    this.islandGroup.add(sphere);
    this.islandGroup.add(halo);

    this.glowingPlants.push({
      mesh: sphere,
      halo: halo,
      baseRadius: radius,
      phase: Math.random() * Math.PI * 2,
      color: color
    });
  }

  private createParticleRing(position: THREE.Vector3): void {
    const plantCount = this.glowingPlants.length;
    const particleCount = plantCount > 30 ? 12 : 20;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const ringColor = new THREE.Color();
    const hue = Math.random();
    ringColor.setHSL(hue, 1, 0.7);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      positions[i * 3] = position.x + Math.cos(angle) * 5;
      positions[i * 3 + 1] = position.y + 5;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * 5;

      colors[i * 3] = ringColor.r;
      colors[i * 3 + 1] = ringColor.g;
      colors[i * 3 + 2] = ringColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    this.islandGroup.add(particles);

    this.particleRings.push({
      particles,
      startTime: this.clock.getElapsedTime(),
      duration: 0.8,
      startSize: 5,
      endSize: 50
    });
  }

  private addBrightStar(position: THREE.Vector3): void {
    const starGeometry = new THREE.SphereGeometry(5, 16, 16);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1
    });

    const star = new THREE.Mesh(starGeometry, starMaterial);

    const direction = position.clone().normalize();
    const distance = 1800;
    star.position.copy(direction.multiplyScalar(distance));

    this.starsGroup.add(star);

    this.brightStars.push({
      mesh: star,
      phase: Math.random() * Math.PI * 2
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.uiOverlay.onChange((state) => {
      this.ringSpeed = state.ringSpeed;
      this.ringTilt = state.ringTilt;
      if (state.particleCount !== this.particleCount) {
        this.particleCount = state.particleCount;
        this.createWaterfall();
      }
    });

    this.uiOverlay.onResetWaterfall(() => {
      this.createWaterfall();
    });
  }

  private onResize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private updateWaterfall(deltaTime: number): void {
    if (!this.waterfallParticles || !this.waterfallPositions || !this.waterfallVelocities) return;

    const positions = this.waterfallParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3 + 1] -= this.waterfallVelocities[i] * deltaTime;

      if (positions[i * 3 + 1] < this.waterfallStartY - 150) {
        positions[i * 3] = this.waterfallOrigin.x + (Math.random() - 0.5) * 8;
        positions[i * 3 + 1] = this.waterfallStartY;
        positions[i * 3 + 2] = this.waterfallOrigin.z + (Math.random() - 0.5) * 8;
        this.waterfallVelocities[i] = 80 + Math.random() * 40;
      }
    }

    this.waterfallParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateGlowingPlants(time: number): void {
    for (const plant of this.glowingPlants) {
      const pulse = 2.0 + 0.5 * Math.sin(time * (Math.PI * 2 / 1.2) + plant.phase);
      const haloScale = pulse;

      plant.halo.scale.setScalar(haloScale);

      const opacity = 0.2 + 0.15 * Math.sin(time * (Math.PI * 2 / 1.2) + plant.phase);
      (plant.halo.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  }

  private updateParticleRings(time: number): void {
    for (let i = this.particleRings.length - 1; i >= 0; i--) {
      const ring = this.particleRings[i];
      const elapsed = time - ring.startTime;
      const progress = elapsed / ring.duration;

      if (progress >= 1) {
        this.islandGroup.remove(ring.particles);
        ring.particles.geometry.dispose();
        (ring.particles.material as THREE.Material).dispose();
        this.particleRings.splice(i, 1);
        continue;
      }

      const positions = ring.particles.geometry.attributes.position.array as Float32Array;
      const currentSize = ring.startSize + (ring.endSize - ring.startSize) * progress;

      const centerX = positions[0];
      const centerZ = positions[2];

      const particleCount = positions.length / 3;
      for (let j = 0; j < particleCount; j++) {
        const angle = (j / particleCount) * Math.PI * 2;
        positions[j * 3] = centerX + Math.cos(angle) * currentSize;
        positions[j * 3 + 2] = centerZ + Math.sin(angle) * currentSize;
      }

      ring.particles.geometry.attributes.position.needsUpdate = true;

      (ring.particles.material as THREE.PointsMaterial).opacity = 1 - progress;
    }
  }

  private updateBrightStars(time: number): void {
    for (const star of this.brightStars) {
      const flicker = 0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / 0.5) + star.phase);
      (star.mesh.material as THREE.MeshBasicMaterial).opacity = flicker;
      star.mesh.scale.setScalar(0.8 + flicker * 0.4);
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.interactionHandler.update(deltaTime);

    if (this.starRingGroup) {
      this.starRingGroup.rotation.y += this.ringSpeed * deltaTime;
      const targetTilt = (this.ringTilt * Math.PI) / 180;
      this.starRingGroup.rotation.x += (targetTilt - this.starRingGroup.rotation.x) * 0.05;
    }

    if (this.starsGroup) {
      this.starRotation += 0.002 * deltaTime;
      this.starsGroup.rotation.y = this.starRotation;
    }

    this.updateWaterfall(deltaTime);
    this.updateGlowingPlants(time);
    this.updateParticleRings(time);
    this.updateBrightStars(time);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));

    this.interactionHandler.dispose();

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
