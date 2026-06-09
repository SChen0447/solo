import * as THREE from 'three';
import { ForceFieldManager } from './forceField';

const COLOR_PALETTE: number[] = [
  0xFF6B6B,
  0xFFD93D,
  0x6BCB77,
  0x4FC3F7,
  0xC084FC
];

const FADE_DURATION = 0.5;
const BOUNDARY_MIN = -8;
const BOUNDARY_MAX = 8;
const MAX_SPEED = 0.1;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  isDying: boolean;
  isFragment: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private forceFieldManager: ForceFieldManager;

  private maxParticles: number;
  private particles: Particle[] = [];
  private points!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;

  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private alphas!: Float32Array;

  private lineGeometry!: THREE.BufferGeometry;
  private lineMaterial!: THREE.LineBasicMaterial;
  private lines!: THREE.LineSegments;
  private linePositions!: Float32Array;
  private lineColors!: Float32Array;
  private lineCount: number = 0;
  private connectionThreshold: number = 0.8;

  private speedMultiplier: number = 1.0;
  private elapsedTime: number = 0;
  private paletteIndex: number = 0;

  public pulseRings: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];

  constructor(
    scene: THREE.Scene,
    forceFieldManager: ForceFieldManager,
    maxParticles: number = 10000
  ) {
    this.scene = scene;
    this.forceFieldManager = forceFieldManager;
    this.maxParticles = maxParticles;

    this.initParticleData();
    this.initGeometry();
    this.initMaterial();
    this.initPoints();
    this.initLines();

    this.spawnInitialParticles();
  }

  private initParticleData(): void {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.alphas = new Float32Array(this.maxParticles);
  }

  private initGeometry(): void {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  private initMaterial(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
  }

  private initPoints(): void {
    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private initLines(): void {
    const maxLines = 5000;
    this.linePositions = new Float32Array(maxLines * 6);
    this.lineColors = new Float32Array(maxLines * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lines);
  }

  private spawnInitialParticles(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(false));
    }
  }

  private createParticle(isFragment: boolean = false, parentPosition?: THREE.Vector3, parentColor?: THREE.Color): Particle {
    const position = new THREE.Vector3();

    if (isFragment && parentPosition) {
      position.copy(parentPosition);
    } else {
      position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
    }

    const velocity = new THREE.Vector3();
    if (isFragment) {
      const speed = 0.05 + Math.random() * 0.05;
      velocity.set(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(speed);
    } else {
      velocity.set(
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04,
        (Math.random() - 0.5) * 0.04
      );
    }

    const color = new THREE.Color();
    if (isFragment && parentColor) {
      color.copy(parentColor);
    } else {
      const paletteColor = COLOR_PALETTE[this.paletteIndex % COLOR_PALETTE.length];
      color.setHex(paletteColor);
      this.paletteIndex++;
    }

    const maxLife = isFragment ? 0.3 : 5 + Math.random() * 5;
    const size = isFragment
      ? 0.003 + Math.random() * 0.007
      : 0.015 + Math.random() * 0.035;

    return {
      position,
      velocity,
      color,
      size,
      life: maxLife,
      maxLife,
      alpha: 1,
      isDying: false,
      isFragment
    };
  }

  public setMaxParticles(count: number): void {
    if (count === this.maxParticles) return;

    if (count > this.maxParticles) {
      const oldMax = this.maxParticles;
      this.maxParticles = count;
      this.initParticleData();

      for (let i = oldMax; i < count; i++) {
        this.particles.push(this.createParticle(false));
      }

      this.geometry.dispose();
      this.initGeometry();
      this.points.geometry = this.geometry;
    } else {
      this.maxParticles = count;
      this.particles = this.particles.slice(0, count);
      this.initParticleData();
      this.geometry.dispose();
      this.initGeometry();
      this.points.geometry = this.geometry;
    }
  }

  public getActiveParticleCount(): number {
    return this.particles.length;
  }

  public getLineCount(): number {
    return this.lineCount;
  }

  public getConnectionThreshold(): number {
    return this.connectionThreshold;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  public reset(): void {
    this.particles = [];
    this.elapsedTime = 0;
    this.paletteIndex = 0;
    this.connectionThreshold = 0.8;
    this.spawnInitialParticles();
    this.clearPulseRings();
  }

  public clearPulseRings(): void {
    for (const ring of this.pulseRings) {
      this.scene.remove(ring.mesh);
      ring.mesh.geometry.dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
    this.pulseRings = [];
  }

  public addPulseRing(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.lookAt(new THREE.Vector3(0, 0, 0).add(position.clone().multiplyScalar(2)));
    this.scene.add(mesh);

    this.pulseRings.push({
      mesh,
      life: 0,
      maxLife: 0.3
    });
  }

  private spawnFragments(parent: Particle): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      if (this.particles.length < this.maxParticles + 1000) {
        this.particles.push(this.createParticle(true, parent.position, parent.color));
      }
    }
  }

  private getCurrentPaletteColor(): number {
    const cycleLength = 8;
    const timeIndex = Math.floor(this.elapsedTime / 2) % COLOR_PALETTE.length;
    return COLOR_PALETTE[timeIndex];
  }

  private respawnParticle(particle: Particle): void {
    particle.position.set(
      BOUNDARY_MIN + Math.random() * (BOUNDARY_MAX - BOUNDARY_MIN),
      BOUNDARY_MIN + Math.random() * (BOUNDARY_MAX - BOUNDARY_MIN),
      BOUNDARY_MIN + Math.random() * (BOUNDARY_MAX - BOUNDARY_MIN)
    );

    particle.velocity.set(
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.04
    );

    particle.color.setHex(this.getCurrentPaletteColor());

    particle.maxLife = 5 + Math.random() * 5;
    particle.life = particle.maxLife;
    particle.alpha = 1;
    particle.isDying = false;
    particle.size = 0.015 + Math.random() * 0.035;
  }

  private clampToBoundary(particle: Particle): void {
    const margin = 0.5;
    if (particle.position.x > BOUNDARY_MAX + margin) particle.position.x = BOUNDARY_MIN - margin;
    if (particle.position.x < BOUNDARY_MIN - margin) particle.position.x = BOUNDARY_MAX + margin;
    if (particle.position.y > BOUNDARY_MAX + margin) particle.position.y = BOUNDARY_MIN - margin;
    if (particle.position.y < BOUNDARY_MIN - margin) particle.position.y = BOUNDARY_MAX + margin;
    if (particle.position.z > BOUNDARY_MAX + margin) particle.position.z = BOUNDARY_MIN - margin;
    if (particle.position.z < BOUNDARY_MIN - margin) particle.position.z = BOUNDARY_MAX + margin;
  }

  private updatePulseRings(deltaTime: number): void {
    for (let i = this.pulseRings.length - 1; i >= 0; i--) {
      const ring = this.pulseRings[i];
      ring.life += deltaTime;

      const progress = ring.life / ring.maxLife;
      const scale = 1 + progress * 20;
      ring.mesh.scale.set(scale, scale, scale);

      const material = ring.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.8 * (1 - progress);

      if (ring.life >= ring.maxLife) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        material.dispose();
        this.pulseRings.splice(i, 1);
      }
    }
  }

  public update(deltaTime: number, fps: number): void {
    this.elapsedTime += deltaTime;
    const force = new THREE.Vector3();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isFragment) {
        p.life -= deltaTime;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        p.life -= deltaTime;

        if (!p.isDying && p.life <= FADE_DURATION) {
          p.isDying = true;
          this.spawnFragments(p);
        }

        if (p.isDying) {
          p.alpha = Math.max(0, p.life / FADE_DURATION);
        }

        if (p.life <= 0) {
          this.respawnParticle(p);
        }
      }

      this.forceFieldManager.calculateForce(p.position, p.velocity, force);

      p.velocity.x += force.x;
      p.velocity.y += force.y;
      p.velocity.z += force.z;

      const speed = p.velocity.length();
      const effectiveMaxSpeed = MAX_SPEED * this.speedMultiplier;
      if (speed > effectiveMaxSpeed) {
        p.velocity.multiplyScalar(effectiveMaxSpeed / speed);
      }

      const scaledSpeed = this.speedMultiplier;
      p.position.x += p.velocity.x * scaledSpeed;
      p.position.y += p.velocity.y * scaledSpeed;
      p.position.z += p.velocity.z * scaledSpeed;

      this.clampToBoundary(p);
    }

    if (fps < 30 && this.connectionThreshold > 0.4) {
      this.connectionThreshold = Math.max(0.4, this.connectionThreshold - 0.02);
    } else if (fps > 50 && this.connectionThreshold < 0.8) {
      this.connectionThreshold = Math.min(0.8, this.connectionThreshold + 0.01);
    }

    this.updateBuffers();
    this.updateConnections();
    this.updatePulseRings(deltaTime);
  }

  private updateBuffers(): void {
    const count = Math.min(this.particles.length, this.maxParticles);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;

      this.colors[i3] = p.color.r * p.alpha;
      this.colors[i3 + 1] = p.color.g * p.alpha;
      this.colors[i3 + 2] = p.color.b * p.alpha;

      this.sizes[i] = p.size;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }

  private updateConnections(): void {
    const maxLines = 5000;
    const maxConnectionsPerParticle = 15;
    this.lineCount = 0;

    const count = Math.min(this.particles.length, this.maxParticles);
    const threshold = this.connectionThreshold;
    const thresholdSq = threshold * threshold;

    for (let i = 0; i < count && this.lineCount < maxLines; i++) {
      const pi = this.particles[i];
      let connections = 0;

      for (let j = i + 1; j < count && this.lineCount < maxLines && connections < maxConnectionsPerParticle; j++) {
        const pj = this.particles[j];

        const dx = pi.position.x - pj.position.x;
        const dy = pi.position.y - pj.position.y;
        const dz = pi.position.z - pj.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < thresholdSq) {
          const dist = Math.sqrt(distSq);
          const ratio = dist / threshold;
          const alpha = 0.1 + (1 - ratio * ratio) * 0.3;

          const idx6 = this.lineCount * 6;

          this.linePositions[idx6] = pi.position.x;
          this.linePositions[idx6 + 1] = pi.position.y;
          this.linePositions[idx6 + 2] = pi.position.z;

          this.linePositions[idx6 + 3] = pj.position.x;
          this.linePositions[idx6 + 4] = pj.position.y;
          this.linePositions[idx6 + 5] = pj.position.z;

          this.lineColors[idx6] = pi.color.r * alpha;
          this.lineColors[idx6 + 1] = pi.color.g * alpha;
          this.lineColors[idx6 + 2] = pi.color.b * alpha;

          this.lineColors[idx6 + 3] = pj.color.r * alpha;
          this.lineColors[idx6 + 4] = pj.color.g * alpha;
          this.lineColors[idx6 + 5] = pj.color.b * alpha;

          this.lineCount++;
          connections++;
        }
      }
    }

    (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.lineGeometry.setDrawRange(0, this.lineCount * 2);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
    this.clearPulseRings();
    this.scene.remove(this.points);
    this.scene.remove(this.lines);
  }
}
