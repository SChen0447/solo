import * as THREE from 'three';

export interface CrystalConfig {
  position: THREE.Vector3;
  height: number;
  polyhedronCount: number;
  hue: number;
  rotationSpeed: number;
  isDendrite?: boolean;
  isFragment?: boolean;
}

export interface CrystalFragment {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  originalPosition: THREE.Vector3;
}

export interface Particle {
  mesh: THREE.Points;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const hslToRgb = (h: number, s: number, l: number): THREE.Color => {
  return new THREE.Color().setHSL(h, s, l);
};

const crystalVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    vHeight = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crystalFragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uGlowIntensity;
  uniform float uLineOpacity;
  uniform float uHoverScale;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vHeight;

  void main() {
    vec3 color = uColor;

    float scanLine = sin(vUv.y * 80.0 + uTime * 1.5) * 0.5 + 0.5;
    scanLine = pow(scanLine, 25.0) * uLineOpacity;
    color += scanLine * 0.25;

    float rim = 1.0 - max(dot(normalize(vNormal), normalize(vec3(0.3, 0.8, 0.5))), 0.0);
    rim = pow(rim, 2.5) * (uGlowIntensity + uHoverScale * 0.5);
    color += rim * uColor * 1.5;

    float ambient = 0.25 + 0.75 * max(dot(normalize(vNormal), normalize(vec3(0.5, 1.0, 0.3))), 0.0);
    color *= ambient;

    float heightGlow = smoothstep(0.0, 2.0, vHeight) * 0.15;
    color += uColor * heightGlow;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const particleVertexShader = `
  attribute float aSize;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    vAlpha = 1.0;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = (1.0 - dist * 2.0) * vAlpha;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class Crystal {
  public group: THREE.Group;
  public id: number;
  public createdAt: number;
  public isFragment: boolean;
  public isDendrite: boolean;

  private config: CrystalConfig;
  private meshes: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private currentHue: number;
  private targetHue: number;
  private rotationSpeed: number;
  private rotationAngle: number = 0;
  private growthProgress: number = 0;
  private isGrowing: boolean = true;
  private growthDuration: number = 1.5;
  private hoverActive: boolean = false;
  private hoverProgress: number = 0;
  private fragments: CrystalFragment[] = [];
  private particles: Particle[] = [];
  private isShattering: boolean = false;
  private scene: THREE.Scene | null = null;
  private baseScale: number = 1;
  private colorTransitionSpeed: number = 0.02;

  private static nextId: number = 0;

  constructor(config: CrystalConfig) {
    this.id = Crystal.nextId++;
    this.createdAt = performance.now();
    this.config = config;
    this.currentHue = config.hue;
    this.targetHue = config.hue;
    this.rotationSpeed = config.rotationSpeed;
    this.isDendrite = config.isDendrite || false;
    this.isFragment = config.isFragment || false;

    this.group = new THREE.Group();
    this.group.position.copy(config.position);
    this.group.userData.crystalId = this.id;
    this.group.userData.crystal = this;

    this.createCrystalStructure();
  }

  private createPolyhedronGeometry(type: 'octahedron' | 'icosahedron', size: number, distortion: number): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    
    if (type === 'octahedron') {
      geometry = new THREE.OctahedronGeometry(size, 0);
    } else {
      geometry = new THREE.IcosahedronGeometry(size, 0);
    }

    const positions = geometry.attributes.position;
    const vertexCount = positions.count;

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const noiseX = (Math.random() - 0.5) * distortion * size;
      const noiseY = (Math.random() - 0.5) * distortion * size;
      const noiseZ = (Math.random() - 0.5) * distortion * size;

      positions.setX(i, x + noiseX);
      positions.setY(i, y + noiseY);
      positions.setZ(i, z + noiseZ);
    }

    geometry.computeVertexNormals();
    geometry.center();

    return geometry;
  }

  private createCrystalMaterial(hue: number): THREE.ShaderMaterial {
    const color = hslToRgb(hue, 0.75, 0.55);
    
    const material = new THREE.ShaderMaterial({
      vertexShader: crystalVertexShader,
      fragmentShader: crystalFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uGlowIntensity: { value: 0.3 },
        uLineOpacity: { value: 0.6 },
        uHoverScale: { value: 0 }
      }
    });

    return material;
  }

  private createCrystalStructure(): void {
    const { height, polyhedronCount, hue } = this.config;
    const baseSize = height / polyhedronCount * 0.4;

    for (let i = 0; i < polyhedronCount; i++) {
      const progress = i / (polyhedronCount - 1 || 1);
      const yOffset = -height / 2 + progress * height;
      const sizeMultiplier = 1 - Math.abs(progress - 0.5) * 0.6;
      const size = baseSize * sizeMultiplier;
      
      const type = Math.random() > 0.5 ? 'octahedron' : 'icosahedron';
      const distortion = 0.15 + Math.random() * 0.2;
      const geometry = this.createPolyhedronGeometry(type, size, distortion);
      
      const hueVariation = hue + (Math.random() - 0.5) * 0.08;
      const material = this.createCrystalMaterial(hueVariation);
      this.materials.push(material);
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = yOffset;
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.rotation.x = (Math.random() - 0.5) * 0.3;
      mesh.rotation.z = (Math.random() - 0.5) * 0.3;
      mesh.scale.setScalar(0);
      mesh.userData.polyhedronIndex = i;
      mesh.userData.originalScale = sizeMultiplier;
      
      this.meshes.push(mesh);
      this.group.add(mesh);
    }

    const edgesMaterial = new THREE.LineBasicMaterial({
      color: hslToRgb(hue, 0.8, 0.7),
      transparent: true,
      opacity: 0.3
    });

    this.meshes.forEach((mesh, index) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry);
      const line = new THREE.LineSegments(edges, edgesMaterial.clone());
      mesh.add(line);
    });

    if (this.isDendrite) {
      this.growthDuration = 1.2;
    }
    if (this.isFragment) {
      this.growthProgress = 1;
      this.isGrowing = false;
      this.meshes.forEach(mesh => mesh.scale.setScalar(mesh.userData.originalScale || 1));
    }
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  public update(delta: number, time: number): void {
    if (!this.isShattering) {
      this.rotationAngle += this.rotationSpeed * delta * 60;
      this.group.rotation.y = this.rotationAngle;
    }

    if (this.isGrowing) {
      this.growthProgress += delta / this.growthDuration;
      const easedProgress = easeOutCubic(Math.min(this.growthProgress, 1));
      
      this.meshes.forEach((mesh, index) => {
        const delay = index * 0.08;
        const individualProgress = Math.max(0, Math.min(1, (this.growthProgress - delay) / (1 - delay)));
        const easedIndividual = easeOutCubic(individualProgress);
        const originalScale = mesh.userData.originalScale || 1;
        mesh.scale.setScalar(easedIndividual * originalScale * this.baseScale);
      });

      if (this.growthProgress >= 1) {
        this.isGrowing = false;
        this.growthProgress = 1;
      }
    }

    if (this.hoverActive && this.hoverProgress < 1) {
      this.hoverProgress = Math.min(1, this.hoverProgress + delta * 5);
    } else if (!this.hoverActive && this.hoverProgress > 0) {
      this.hoverProgress = Math.max(0, this.hoverProgress - delta * 5);
    }

    if (this.currentHue !== this.targetHue) {
      const hueDiff = this.targetHue - this.currentHue;
      const hueStep = Math.sign(hueDiff) * Math.min(Math.abs(hueDiff), this.colorTransitionSpeed * delta * 60);
      this.currentHue += hueStep;
      
      if (Math.abs(this.currentHue - this.targetHue) < 0.001) {
        this.currentHue = this.targetHue;
      }
      
      this.updateMaterialColors();
    }

    this.materials.forEach(material => {
      material.uniforms.uTime.value = time;
      material.uniforms.uHoverScale.value = this.hoverProgress;
    });

    this.updateFragments(delta);
    this.updateParticles(delta);
  }

  private updateMaterialColors(): void {
    this.materials.forEach((material, index) => {
      const hueVariation = this.currentHue + (index / this.materials.length - 0.5) * 0.05;
      const color = hslToRgb(hueVariation, 0.75, 0.55);
      material.uniforms.uColor.value.copy(color);
    });
  }

  private updateFragments(delta: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const fragment = this.fragments[i];
      fragment.lifetime -= delta;

      fragment.mesh.position.add(fragment.velocity.clone().multiplyScalar(delta));
      fragment.velocity.multiplyScalar(0.98);
      fragment.velocity.y -= 2 * delta;

      fragment.mesh.rotation.x += fragment.angularVelocity.x * delta;
      fragment.mesh.rotation.y += fragment.angularVelocity.y * delta;
      fragment.mesh.rotation.z += fragment.angularVelocity.z * delta;

      const opacity = Math.max(0, fragment.lifetime / fragment.maxLifetime);
      const material = fragment.mesh.material as THREE.Material;
      if ('opacity' in material) {
        (material as any).opacity = opacity;
      }

      if (fragment.lifetime <= 0) {
        if (this.scene) {
          this.scene.remove(fragment.mesh);
        }
        fragment.mesh.geometry.dispose();
        (fragment.mesh.material as THREE.Material).dispose();
        this.fragments.splice(i, 1);
      }
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime -= delta;

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
      particle.velocity.y -= 1 * delta;

      const material = particle.mesh.material as THREE.ShaderMaterial;
      const opacity = Math.max(0, particle.lifetime / particle.maxLifetime);
      material.uniforms.uColor.value = new THREE.Color(1, 0.8, 0);
      if ('opacity' in material) {
        (material as any).opacity = opacity;
      }

      if (particle.lifetime <= 0) {
        if (this.scene) {
          this.scene.remove(particle.mesh);
        }
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  public shatter(force: number = 1): CrystalFragment[] {
    if (this.isShattering) return [];
    this.isShattering = true;

    const fragmentCount = 8 + Math.floor(Math.random() * 8);
    const worldPosition = new THREE.Vector3();
    this.group.getWorldPosition(worldPosition);

    for (let i = 0; i < fragmentCount; i++) {
      const sourceMesh = this.meshes[i % this.meshes.length];
      const size = 0.2 + Math.random() * 0.4;
      
      const type = Math.random() > 0.5 ? 'octahedron' : 'icosahedron';
      const geometry = this.createPolyhedronGeometry(type, size, 0.3);
      
      const sourceMaterial = sourceMesh.material as THREE.ShaderMaterial;
      const material = new THREE.MeshPhongMaterial({
        color: sourceMaterial.uniforms.uColor.value.clone(),
        emissive: sourceMaterial.uniforms.uColor.value.clone(),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(worldPosition);
      mesh.position.x += (Math.random() - 0.5) * 0.5;
      mesh.position.y += (Math.random() - 0.5) * 0.5;
      mesh.position.z += (Math.random() - 0.5) * 0.5;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (1 + Math.random() * 2) * force;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.5 + 1,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const angularVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );

      const fragment: CrystalFragment = {
        mesh,
        velocity,
        angularVelocity,
        lifetime: 0.8,
        maxLifetime: 0.8,
        originalPosition: worldPosition.clone()
      };

      this.fragments.push(fragment);
      if (this.scene) {
        this.scene.add(mesh);
      }
    }

    this.spawnParticles(worldPosition);

    this.meshes.forEach(mesh => {
      mesh.visible = false;
    });

    return this.fragments;
  }

  private spawnParticles(position: THREE.Vector3): void {
    const particleCount = 30 + Math.floor(Math.random() * 21);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;
      sizes[i] = 2 + Math.random() * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(1, 0.8, 0) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const speed = 2 + Math.random() * 3;
    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed + 2,
      Math.sin(phi) * Math.sin(theta) * speed
    );

    const particle: Particle = {
      mesh: points,
      velocity,
      lifetime: 1.5,
      maxLifetime: 1.5
    };

    this.particles.push(particle);
    if (this.scene) {
      this.scene.add(points);
    }
  }

  public growDendrite(): Crystal[] {
    const dendrites: Crystal[] = [];
    const dendriteCount = 3 + Math.floor(Math.random() * 3);
    const worldPosition = new THREE.Vector3();
    this.group.getWorldPosition(worldPosition);

    for (let i = 0; i < dendriteCount; i++) {
      const angle = (i / dendriteCount) * Math.PI * 2;
      const spreadAngle = (Math.random() - 0.5) * 0.5;
      
      const direction = new THREE.Vector3(
        Math.cos(angle) * Math.cos(spreadAngle),
        0.5 + Math.random() * 0.5,
        Math.sin(angle) * Math.cos(spreadAngle)
      ).normalize();

      const distance = 1 + Math.random() * 1.5;
      const position = worldPosition.clone().add(direction.multiplyScalar(distance));
      
      const height = 1.5 + Math.random() * 2.5;
      const polyhedronCount = 3 + Math.floor(Math.random() * 3);
      const hue = 0.4 + Math.random() * 0.2;
      const rotationSpeed = 0.01 + Math.random() * 0.02;

      const dendrite = new Crystal({
        position,
        height,
        polyhedronCount,
        hue,
        rotationSpeed,
        isDendrite: true
      });

      if (this.scene) {
        dendrite.setScene(this.scene);
        this.scene.add(dendrite.group);
      }

      dendrites.push(dendrite);
    }

    return dendrites;
  }

  public setColor(hue: number): void {
    this.targetHue = hue;
  }

  public getColor(): number {
    return this.currentHue;
  }

  public setHover(active: boolean): void {
    this.hoverActive = active;
  }

  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  public isAlive(): boolean {
    return !this.isShattering || this.fragments.length > 0 || this.particles.length > 0;
  }

  public dispose(): void {
    this.fragments.forEach(fragment => {
      if (this.scene) {
        this.scene.remove(fragment.mesh);
      }
      fragment.mesh.geometry.dispose();
      (fragment.mesh.material as THREE.Material).dispose();
    });
    this.fragments = [];

    this.particles.forEach(particle => {
      if (this.scene) {
        this.scene.remove(particle.mesh);
      }
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];

    this.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.meshes = [];
    this.materials = [];

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }

  public setColorTransitionSpeed(speed: number): void {
    this.colorTransitionSpeed = speed;
  }

  public resetGrowth(): void {
    this.isGrowing = true;
    this.growthProgress = 0;
    this.isShattering = false;
    this.meshes.forEach(mesh => {
      mesh.visible = true;
      mesh.scale.setScalar(0);
    });
  }

  public getWorldPosition(): THREE.Vector3 {
    const position = new THREE.Vector3();
    this.group.getWorldPosition(position);
    return position;
  }
}
