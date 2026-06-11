import * as THREE from 'three';

interface FlipAnimation {
  mesh: THREE.Mesh;
  targetRotation: number;
  startRotation: number;
  startTime: number;
  duration: number;
  isFlipping: boolean;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface WaveRing {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  baseScale: number;
}

export class AnimationManager {
  private scene: THREE.Scene;
  private flipAnimations: Map<number, FlipAnimation> = new Map();
  private particles: Particle[] = [];
  private waveRings: WaveRing[] = [];
  private tileMaterials: Map<number, THREE.MeshStandardMaterial> = new Map();

  private readonly DARK_COLOR = 0x3e2723;
  private readonly LIT_COLOR = 0xffecb3;
  private readonly FLIP_DURATION = 400;
  private readonly PARTICLE_MAX_COUNT = 50;
  private readonly WAVE_DURATION = 1500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  registerTile(tileId: number, mesh: THREE.Mesh, material: THREE.MeshStandardMaterial): void {
    this.tileMaterials.set(tileId, material);
  }

  unregisterAllTiles(): void {
    this.tileMaterials.clear();
    this.flipAnimations.clear();
  }

  startFlipAnimation(
    tileId: number,
    mesh: THREE.Mesh,
    isCurrentlyLit: boolean,
    willBeLit: boolean
  ): void {
    const currentRotation = mesh.rotation.y;
    const targetRotation = currentRotation + Math.PI;

    const animation: FlipAnimation = {
      mesh,
      targetRotation,
      startRotation: currentRotation,
      startTime: performance.now(),
      duration: this.FLIP_DURATION,
      isFlipping: true,
    };

    this.flipAnimations.set(tileId, animation);

    const material = this.tileMaterials.get(tileId);
    if (material) {
      material.color.setHex(willBeLit ? this.LIT_COLOR : this.DARK_COLOR);
      material.emissive.setHex(willBeLit ? this.LIT_COLOR : 0x000000);
      material.emissiveIntensity = willBeLit ? 0.3 : 0;
    }
  }

  spawnClickParticles(position: THREE.Vector3): void {
    if (this.particles.length >= this.PARTICLE_MAX_COUNT) {
      const oldParticle = this.particles.shift();
      if (oldParticle) {
        this.scene.remove(oldParticle.mesh);
      }
    }

    const particleCount = Math.min(8, this.PARTICLE_MAX_COUNT - this.particles.length);

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.02 + Math.random() * 0.04, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.position.y += 0.3;

      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 0.02 + Math.random() * 0.03;

      const particle: Particle = {
        mesh,
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.03 + Math.random() * 0.02,
          Math.sin(angle) * speed
        ),
        life: 1,
        maxLife: 300,
      };

      this.particles.push(particle);
      this.scene.add(mesh);
    }
  }

  startVictoryWave(tiles: THREE.Mesh[]): void {
    const sortedTiles = [...tiles].sort((a, b) => {
      const distA = a.position.length();
      const distB = b.position.length();
      return distA - distB;
    });

    sortedTiles.forEach((tile, index) => {
      setTimeout(() => {
        this.createWaveRing(tile.position);
      }, index * 100);
    });
  }

  private createWaveRing(position: THREE.Vector3): void {
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd54f,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y += 0.05;
    ring.rotation.x = -Math.PI / 2;

    const wave: WaveRing = {
      mesh: ring,
      startTime: performance.now(),
      duration: this.WAVE_DURATION,
      baseScale: 1,
    };

    this.waveRings.push(wave);
    this.scene.add(ring);
  }

  update(deltaTime: number): void {
    this.updateFlipAnimations();
    this.updateParticles(deltaTime);
    this.updateWaveRings();
  }

  private updateFlipAnimations(): void {
    const now = performance.now();
    const completedIds: number[] = [];

    for (const [tileId, anim] of this.flipAnimations) {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = this.easeInOutCubic(progress);

      anim.mesh.rotation.y = anim.startRotation + (anim.targetRotation - anim.startRotation) * eased;

      if (progress >= 1) {
        completedIds.push(tileId);
      }
    }

    for (const id of completedIds) {
      this.flipAnimations.delete(id);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      particle.mesh.position.add(particle.velocity);
      particle.velocity.y -= 0.001;
      particle.life -= deltaTime;

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, particle.life / particle.maxLife);

      const scale = particle.life / particle.maxLife;
      particle.mesh.scale.setScalar(Math.max(0.1, scale));

      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        (particle.mesh.geometry as THREE.BufferGeometry).dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateWaveRings(): void {
    const now = performance.now();

    for (let i = this.waveRings.length - 1; i >= 0; i--) {
      const wave = this.waveRings[i];
      const elapsed = now - wave.startTime;
      const progress = Math.min(elapsed / wave.duration, 1);
      const eased = this.easeOutCubic(progress);

      const scale = wave.baseScale + eased * 4;
      wave.mesh.scale.setScalar(scale);

      const material = wave.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.8 * (1 - progress);

      if (progress >= 1) {
        this.scene.remove(wave.mesh);
        (wave.mesh.geometry as THREE.BufferGeometry).dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.waveRings.splice(i, 1);
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  isAnimating(): boolean {
    return this.flipAnimations.size > 0 || this.particles.length > 0 || this.waveRings.length > 0;
  }

  dispose(): void {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      (particle.mesh.geometry as THREE.BufferGeometry).dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];

    for (const wave of this.waveRings) {
      this.scene.remove(wave.mesh);
      (wave.mesh.geometry as THREE.BufferGeometry).dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
    this.waveRings = [];

    this.flipAnimations.clear();
    this.tileMaterials.clear();
  }
}
