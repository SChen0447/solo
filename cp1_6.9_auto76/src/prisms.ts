import * as THREE from 'three';

export interface PrismData {
  position: THREE.Vector3;
  size: number;
  height: number;
  color: THREE.Color;
  refractiveIndex: number;
}

export interface PrismState {
  towerRotationY: number;
  towerTiltX: number;
  prismOpacity: number;
  particleCount: number;
}

const PRISM_COLORS = [
  new THREE.Color(0xffffff),
  new THREE.Color(0xff4444),
  new THREE.Color(0x4444ff),
  new THREE.Color(0x44ff44),
];

const PRISM_SIZES = [2.5, 2.2, 1.8, 1.5];
const PRISM_HEIGHTS = [1.2, 1.1, 0.95, 0.8];
const REFRACTIVE_INDICES = [1.5, 1.52, 1.48, 1.55];

const PARTICLE_COLORS = [
  new THREE.Color(0xff4444),
  new THREE.Color(0xff8844),
  new THREE.Color(0xffff44),
  new THREE.Color(0x44ff44),
  new THREE.Color(0x4444ff),
  new THREE.Color(0x8844ff),
];

export class PrismTower {
  public group: THREE.Group;
  public prisms: THREE.Mesh[] = [];
  public prismData: PrismData[] = [];
  public baseRing!: THREE.Mesh;
  public particles!: THREE.Points;
  public particleVelocities: { angle: number; radius: number; ySpeed: number; phase: number }[] = [];

  private state: PrismState = {
    towerRotationY: 0,
    towerTiltX: 0,
    prismOpacity: 0.5,
    particleCount: 200,
  };

  private particleGeometry: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;

  constructor() {
    this.group = new THREE.Group();

    this.buildBaseRing();
    this.buildPrisms();

    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.state.particleCount * 3);
    this.particleColors = new Float32Array(this.state.particleCount * 3);
    this.initParticles();
    this.particles = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.group.add(this.particles);
  }

  private buildBaseRing(): void {
    const geometry = new THREE.TorusGeometry(3, 0.15, 16, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.baseRing = new THREE.Mesh(geometry, material);
    this.baseRing.position.y = -2.5;
    this.baseRing.rotation.x = Math.PI / 2;
    this.group.add(this.baseRing);
  }

  private buildPrisms(): void {
    let yOffset = -1.5;
    for (let i = 0; i < 4; i++) {
      const size = PRISM_SIZES[i];
      const height = PRISM_HEIGHTS[i];
      const color = PRISM_COLORS[i];

      const geometry = new THREE.CylinderGeometry(size, size, height, 3, 1);
      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: this.state.prismOpacity,
        roughness: 0.05,
        metalness: 0.0,
        transmission: 0.7,
        thickness: 0.5,
        ior: REFRACTIVE_INDICES[i],
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
      });

      const prism = new THREE.Mesh(geometry, material);
      prism.position.y = yOffset + height / 2;
      prism.rotation.y = (i * Math.PI) / 6;
      this.group.add(prism);
      this.prisms.push(prism);

      this.prismData.push({
        position: prism.position.clone(),
        size,
        height,
        color: color.clone(),
        refractiveIndex: REFRACTIVE_INDICES[i],
      });

      yOffset += height + 0.1;
    }
  }

  private initParticles(): void {
    this.particleVelocities = [];
    for (let i = 0; i < this.state.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 2.5;
      const y = -2 + Math.random() * 4;
      this.particlePositions[i * 3] = Math.cos(angle) * radius;
      this.particlePositions[i * 3 + 1] = y;
      this.particlePositions[i * 3 + 2] = Math.sin(angle) * radius;

      const colorIdx = Math.floor(Math.random() * PARTICLE_COLORS.length);
      const c = PARTICLE_COLORS[colorIdx];
      this.particleColors[i * 3] = c.r;
      this.particleColors[i * 3 + 1] = c.g;
      this.particleColors[i * 3 + 2] = c.b;

      this.particleVelocities.push({
        angle,
        radius,
        ySpeed: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
  }

  public setParticleCount(count: number): void {
    if (count === this.state.particleCount) return;
    this.state.particleCount = count;
    this.group.remove(this.particles);
    this.particleGeometry.dispose();

    this.particlePositions = new Float32Array(count * 3);
    this.particleColors = new Float32Array(count * 3);
    this.particleGeometry = new THREE.BufferGeometry();
    this.initParticles();

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(this.particleGeometry, mat);
    this.group.add(this.particles);
  }

  public setPrismOpacity(opacity: number): void {
    this.state.prismOpacity = opacity;
    this.prisms.forEach((prism) => {
      (prism.material as THREE.MeshPhysicalMaterial).opacity = opacity;
    });
  }

  public setRotationY(angleDeg: number): void {
    this.state.towerRotationY = (angleDeg * Math.PI) / 180;
    this.group.rotation.y = this.state.towerRotationY;
  }

  public setTiltX(angleDeg: number): void {
    this.state.towerTiltX = (angleDeg * Math.PI) / 180;
    this.group.rotation.x = this.state.towerTiltX;
  }

  public getState(): PrismState {
    return { ...this.state };
  }

  public update(deltaTime: number, isRotating: boolean): void {
    const effectiveDelta = Math.min(deltaTime, 0.05);
    for (let i = 0; i < this.state.particleCount; i++) {
      const v = this.particleVelocities[i];
      const speed = (0.2 + Math.random() * 0.3) * (isRotating ? 2.0 : 1.0);
      v.angle += speed * effectiveDelta;
      v.phase += effectiveDelta * 1.5;

      const wobble = Math.sin(v.phase) * 0.3;
      const yWobble = Math.cos(v.phase * 0.7) * 0.5;

      this.particlePositions[i * 3] = Math.cos(v.angle) * (v.radius + wobble);
      this.particlePositions[i * 3 + 1] += v.ySpeed * effectiveDelta + yWobble * 0.01;
      this.particlePositions[i * 3 + 2] = Math.sin(v.angle) * (v.radius + wobble);

      if (this.particlePositions[i * 3 + 1] > 2.5) this.particlePositions[i * 3 + 1] = -2.5;
      if (this.particlePositions[i * 3 + 1] < -2.5) this.particlePositions[i * 3 + 1] = 2.5;
    }
    this.particleGeometry.attributes.position.needsUpdate = true;

    if (isRotating) {
      (this.particles.material as THREE.PointsMaterial).opacity = 0.8;
    } else {
      (this.particles.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(
        (this.particles.material as THREE.PointsMaterial).opacity,
        0.5,
        effectiveDelta * 3
      );
    }
  }
}
