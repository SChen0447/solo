import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export interface SandSystemConfig {
  gridSize: number;
  minHeight: number;
  maxHeight: number;
  windDirection: THREE.Vector3;
  migrationInterval: number;
  particleEmitRate: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class SandSystem {
  private scene: THREE.Scene;
  private config: SandSystemConfig;
  private terrainMesh!: THREE.Mesh;
  private terrainGeometry!: THREE.PlaneGeometry;
  private originalPositions!: Float32Array;
  private noise2D: (x: number, y: number) => number;
  private migrationTimer: number = 0;
  private particleTimer: number = 0;
  private particles: Particle[] = [];
  private particlesGeometry!: THREE.BufferGeometry;
  private particlesMaterial!: THREE.PointsMaterial;
  private particlesMesh!: THREE.Points;
  private stormMode: boolean = false;
  private MAX_PARTICLES = 3000;
  private sandColorLight = new THREE.Color(0xf5deb3);
  private sandColorDark = new THREE.Color(0xd2b48c);
  private shakeTime: number = 0;
  private shakeAmplitude: number = 0;

  constructor(scene: THREE.Scene, config: Partial<SandSystemConfig> = {}) {
    this.scene = scene;
    this.noise2D = createNoise2D();
    this.config = {
      gridSize: 20,
      minHeight: 0,
      maxHeight: 3,
      windDirection: new THREE.Vector3(1, 0, 0),
      migrationInterval: 2000,
      particleEmitRate: 50,
      ...config
    };
  }

  init(): void {
    this.createTerrain();
    this.createParticles();
  }

  private createTerrain(): void {
    const size = 40;
    const segments = this.config.gridSize - 1;
    this.terrainGeometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.terrainGeometry.rotateX(-Math.PI / 2);

    const positions = this.terrainGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    this.originalPositions = new Float32Array(positions.array);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noiseVal = this.noise2D(x * 0.1, z * 0.1);
      const height = ((noiseVal + 1) / 2) * (this.config.maxHeight - this.config.minHeight) + this.config.minHeight;
      positions.setY(i, height);
      this.originalPositions[i * 3 + 1] = height;

      const colorMix = height / this.config.maxHeight;
      const color = this.sandColorLight.clone().lerp(this.sandColorDark, colorMix);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.terrainGeometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      metalness: 0
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  private createParticles(): void {
    this.particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.MAX_PARTICLES * 3);
    const colors = new Float32Array(this.MAX_PARTICLES * 3);
    const sizes = new Float32Array(this.MAX_PARTICLES);

    this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particlesMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particlesMesh = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
    this.scene.add(this.particlesMesh);
  }

  getHeightAt(x: number, z: number): number {
    const positions = this.terrainGeometry.attributes.position;
    let closestHeight = 0;
    let minDist = Infinity;

    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i);
      const pz = positions.getZ(i);
      const dist = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
      if (dist < minDist) {
        minDist = dist;
        closestHeight = positions.getY(i);
      }
    }
    return closestHeight;
  }

  triggerShake(duration: number, amplitude: number): void {
    this.shakeTime = duration;
    this.shakeAmplitude = amplitude;
  }

  update(delta: number, migrationSpeedMultiplier: number = 1): void {
    this.migrationTimer += delta * 1000 * migrationSpeedMultiplier;
    this.particleTimer += delta;

    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      this.applyShake();
    }

    if (this.migrationTimer >= this.config.migrationInterval) {
      this.migrationTimer = 0;
      this.migrateDunes();
    }

    const emitRate = this.stormMode ? this.config.particleEmitRate * 10 : this.config.particleEmitRate;
    if (this.particleTimer >= 1 / emitRate) {
      this.particleTimer = 0;
      const count = this.stormMode ? 10 : Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        this.emitSandParticle();
      }
    }

    this.updateParticles(delta);
  }

  private applyShake(): void {
    const positions = this.terrainGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const baseY = this.originalPositions[i * 3 + 1];
      const shake = (Math.random() - 0.5) * this.shakeAmplitude;
      positions.setY(i, baseY + shake);
    }
    positions.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();
  }

  private migrateDunes(): void {
    const positions = this.terrainGeometry.attributes.position;
    const wind = this.config.windDirection;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const currentY = positions.getY(i);
      const baseY = this.originalPositions[i * 3 + 1];

      const isEdge = Math.abs(x) > 18 || Math.abs(z) > 18;
      if (isEdge || Math.random() > 0.7) {
        const amplitude = 0.05 + Math.random() * 0.15;
        const phase = Math.random() * Math.PI * 2;
        const change = Math.sin(phase) * amplitude;
        const windEffect = wind.x * 0.02;
        const newY = THREE.MathUtils.clamp(currentY + change + windEffect, 0, this.config.maxHeight + 1);
        positions.setY(i, newY);
        this.originalPositions[i * 3 + 1] = baseY + change * 0.1;
      }
    }

    positions.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();

    const edgeParticleCount = 10 + Math.floor(Math.random() * 11);
    for (let i = 0; i < edgeParticleCount; i++) {
      this.emitEdgeParticle();
    }
  }

  private emitSandParticle(): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const x = (Math.random() - 0.5) * 38;
    const z = (Math.random() - 0.5) * 38;
    const y = this.getHeightAt(x, z) + Math.random() * 0.5;

    let color: THREE.Color;
    let size: number;
    let opacity: number;
    let speed: number;

    if (this.stormMode) {
      const colorMix = Math.random();
      color = new THREE.Color(0xff6347).lerp(new THREE.Color(0x8b4513), colorMix);
      size = 0.1 + Math.random() * 0.2;
      opacity = 0.5 + Math.random() * 0.4;
      speed = 3 + Math.random() * 5;
    } else {
      color = new THREE.Color(0xf4d58d);
      size = 0.03 + Math.random() * 0.05;
      opacity = 0.1 + Math.random() * 0.5;
      speed = 0.5 + Math.random() * 1;
    }

    this.particles.push({
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        this.config.windDirection.x * speed + (Math.random() - 0.5),
        Math.random() * 0.5,
        this.config.windDirection.z * speed + (Math.random() - 0.5)
      ),
      life: 0,
      maxLife: this.stormMode ? 2 + Math.random() * 2 : 1 + Math.random() * 2,
      size,
      color: color.clone()
    });
  }

  private emitEdgeParticle(): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    const edge = Math.floor(Math.random() * 4);
    let x: number, z: number;
    switch (edge) {
      case 0: x = -19 + Math.random() * 2; z = (Math.random() - 0.5) * 38; break;
      case 1: x = 19 - Math.random() * 2; z = (Math.random() - 0.5) * 38; break;
      case 2: x = (Math.random() - 0.5) * 38; z = -19 + Math.random() * 2; break;
      default: x = (Math.random() - 0.5) * 38; z = 19 - Math.random() * 2; break;
    }
    const y = this.getHeightAt(x, z) + Math.random() * 0.3;

    this.particles.push({
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        this.config.windDirection.x * 1.5,
        Math.random() * 0.3,
        this.config.windDirection.z * 0.5
      ),
      life: 0,
      maxLife: 1 + Math.random() * 1.5,
      size: 0.03 + Math.random() * 0.05,
      color: new THREE.Color(0xf4d58d)
    });
  }

  private updateParticles(delta: number): void {
    const positions = this.particlesGeometry.attributes.position.array as Float32Array;
    const colors = this.particlesGeometry.attributes.color.array as Float32Array;
    const sizes = this.particlesGeometry.attributes.size.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.y -= delta * 0.5;

      if (this.stormMode) {
        const rotSpeed = 0.1 + Math.random() * 0.4;
        p.position.x += Math.sin(p.life * 10) * rotSpeed * delta;
        p.position.z += Math.cos(p.life * 10) * rotSpeed * delta;
      }

      const lifeRatio = p.life / p.maxLife;
      const alpha = this.stormMode ? (0.5 + 0.4 * (1 - lifeRatio)) : (0.6 - 0.5 * lifeRatio);
      this.particlesMaterial.opacity = alpha;
    }

    const count = Math.min(this.particles.length, this.MAX_PARTICLES);
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      sizes[i] = p.size;
    }

    this.particlesGeometry.attributes.position.needsUpdate = true;
    this.particlesGeometry.attributes.color.needsUpdate = true;
    this.particlesGeometry.attributes.size.needsUpdate = true;
    this.particlesGeometry.setDrawRange(0, count);
  }

  setStormMode(active: boolean): void {
    this.stormMode = active;
  }

  getWindDirection(): THREE.Vector3 {
    return this.config.windDirection.clone();
  }

  getTerrainMesh(): THREE.Mesh {
    return this.terrainMesh;
  }

  getTerrainGeometry(): THREE.PlaneGeometry {
    return this.terrainGeometry;
  }
}
