import * as THREE from 'three';

const PARTICLE_COUNT = 5000;
const DISK_RADIUS = 200;
const DISK_THICKNESS = 30;
const ROTATION_PERIOD = 30;
const CENTER_COLOR = new THREE.Color(0xff7700);
const EDGE_COLOR = new THREE.Color(0x0044ff);
const DEFAULT_OPACITY = 0.6;

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aOpacity;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = aColor;
    vOpacity = aOpacity;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = vOpacity * (1.0 - smoothstep(0.2, 0.5, dist));
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface DyeWave {
  center: THREE.Vector3;
  radius: number;
  maxRadius: number;
  color: THREE.Color;
  startTime: number;
  duration: number;
}

export class ParticleCloud {
  mesh: THREE.Points;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private originalColors: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private originalSizes: Float32Array;
  private originalPositions: Float32Array;

  private rotationAngle: number = 0;
  private isPaused: boolean = false;
  private dyeWaves: DyeWave[] = [];

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.originalColors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.opacities = new Float32Array(PARTICLE_COUNT);
    this.originalSizes = new Float32Array(PARTICLE_COUNT);
    this.originalPositions = new Float32Array(PARTICLE_COUNT * 3);

    this.initParticles();
    this.setupGeometry();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const angle = Math.random() * Math.PI * 2;
      const spiralOffset = (angle / (Math.PI * 2)) * 40;
      const r = Math.sqrt(Math.random()) * DISK_RADIUS;
      const armAngle = angle + (r / DISK_RADIUS) * Math.PI * 2;
      const x = Math.cos(armAngle) * r + Math.cos(armAngle + spiralOffset * 0.01) * spiralOffset * 0.3;
      const z = Math.sin(armAngle) * r + Math.sin(armAngle + spiralOffset * 0.01) * spiralOffset * 0.3;
      const y = (Math.random() - 0.5) * DISK_THICKNESS * Math.exp(-r / DISK_RADIUS * 2);

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.originalPositions[i3] = x;
      this.originalPositions[i3 + 1] = y;
      this.originalPositions[i3 + 2] = z;

      const t = Math.min(r / DISK_RADIUS, 1);
      const color = new THREE.Color().lerpColors(CENTER_COLOR, EDGE_COLOR, t);
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      this.originalColors[i3] = color.r;
      this.originalColors[i3 + 1] = color.g;
      this.originalColors[i3 + 2] = color.b;

      const size = 2 + Math.random() * 3;
      this.sizes[i] = size;
      this.originalSizes[i] = size;

      this.opacities[i] = DEFAULT_OPACITY;
    }
  }

  private setupGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));
  }

  update(deltaTime: number, cameraDistance: number): void {
    if (!this.isPaused) {
      this.rotationAngle += (deltaTime / ROTATION_PERIOD) * Math.PI * 2;
      this.mesh.rotation.y = this.rotationAngle;
    }

    this.updateOpacityByDistance(cameraDistance);
    this.updateDyeWaves();

    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aOpacity.needsUpdate = true;
  }

  private updateOpacityByDistance(distance: number): void {
    const minDist = 50;
    const maxDist = 500;
    const t = Math.max(0, Math.min(1, (distance - minDist) / (maxDist - minDist)));
    const opacity = 0.9 - t * 0.6;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.opacities[i] = opacity;
    }
    this.geometry.attributes.aOpacity.needsUpdate = true;
  }

  private updateDyeWaves(): void {
    const now = performance.now();
    const activeWaves: DyeWave[] = [];

    for (const wave of this.dyeWaves) {
      const elapsed = (now - wave.startTime) / 1000;
      if (elapsed > wave.duration) continue;
      activeWaves.push(wave);

      const progress = elapsed / wave.duration;
      wave.radius = wave.maxRadius * progress;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const worldPos = new THREE.Vector3(
          this.positions[i3],
          this.positions[i3 + 1],
          this.positions[i3 + 2]
        ).applyMatrix4(this.mesh.matrixWorld);

        const dist = worldPos.distanceTo(wave.center);

        if (dist <= wave.radius && dist >= wave.radius - 30) {
          const waveFrontDist = Math.abs(dist - (wave.radius - 15)) / 15;
          const blend = (1 - waveFrontDist) * (1 - progress);
          const clampedBlend = Math.max(0, Math.min(1, blend));

          this.colors[i3] = this.originalColors[i3] + (wave.color.r - this.originalColors[i3]) * clampedBlend;
          this.colors[i3 + 1] = this.originalColors[i3 + 1] + (wave.color.g - this.originalColors[i3 + 1]) * clampedBlend;
          this.colors[i3 + 2] = this.originalColors[i3 + 2] + (wave.color.b - this.originalColors[i3 + 2]) * clampedBlend;
        }
      }
    }

    this.dyeWaves = activeWaves;

    if (activeWaves.length === 0) {
      this.colors.set(this.originalColors);
    }

    this.geometry.attributes.aColor.needsUpdate = true;
  }

  triggerDyeWave(worldCenter: THREE.Vector3, color: THREE.Color): void {
    this.dyeWaves.push({
      center: worldCenter.clone(),
      radius: 0,
      maxRadius: 80,
      color: color.clone(),
      startTime: performance.now(),
      duration: 1.5,
    });
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  reset(): void {
    this.positions.set(this.originalPositions);
    this.colors.set(this.originalColors);
    this.sizes.set(this.originalSizes);
    this.rotationAngle = 0;
    this.isPaused = false;
    this.dyeWaves = [];
    this.mesh.rotation.y = 0;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  getParticleWorldPosition(index: number): THREE.Vector3 {
    const i3 = index * 3;
    const pos = new THREE.Vector3(
      this.positions[i3],
      this.positions[i3 + 1],
      this.positions[i3 + 2]
    );
    return pos.applyMatrix4(this.mesh.matrixWorld);
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}
