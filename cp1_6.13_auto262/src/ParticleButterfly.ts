import * as THREE from 'three';

const COLOR_PALETTE = [
  0xff6b6b,
  0xff9ff3,
  0x48dbfb,
  0x54a0ff,
  0xfeca57
];

const PARTICLE_COUNT = 2000;
const WING_SPAN = 8;
const FLAP_FREQUENCY = 1.5;
const FLAP_AMPLITUDE = 0.8;
const SCATTER_SPEED_MIN = 0.5;
const SCATTER_SPEED_MAX = 1.5;
const RETURN_DURATION = 2.0;

export interface ParticleData {
  originalPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  normal: THREE.Vector3;
  isScattered: boolean;
  scatterTimer: number;
  returnProgress: number;
}

export class ParticleButterfly {
  public points: THREE.Points;
  public particles: ParticleData[] = [];
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private time: number = 0;
  private energyWaves: { position: THREE.Vector3; radius: number; maxRadius: number; life: number; maxLife: number }[] = [];

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.generateButterflyParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.points = new THREE.Points(this.geometry, this.material);
  }

  private generateButterflyParticles(): void {
    const halfCount = Math.floor(PARTICLE_COUNT / 2);
    let particleIndex = 0;

    for (let i = 0; i < halfCount && particleIndex < PARTICLE_COUNT; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = Math.random();
      
      const { x: baseX, y: baseY } = this.getButterflyWingPoint(t, r);
      
      const size = 0.1 + Math.random() * 0.2;
      
      const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
      const color = new THREE.Color(COLOR_PALETTE[colorIndex]);
      
      const normal = new THREE.Vector3(
        Math.sign(baseX) * 0.7 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        0.7 + (Math.random() - 0.5) * 0.3
      ).normalize();

      const originalPos = new THREE.Vector3(baseX, baseY, 0);

      this.particles[particleIndex] = {
        originalPosition: originalPos.clone(),
        currentPosition: originalPos.clone(),
        velocity: new THREE.Vector3(),
        color: color,
        size: size,
        normal: normal,
        isScattered: false,
        scatterTimer: 0,
        returnProgress: 0
      };

      this.updateParticleBuffers(particleIndex);
      particleIndex++;

      if (particleIndex < PARTICLE_COUNT) {
        const mirrorPos = new THREE.Vector3(-baseX, baseY, 0);
        const mirrorNormal = normal.clone();
        mirrorNormal.x = -mirrorNormal.x;

        this.particles[particleIndex] = {
          originalPosition: mirrorPos.clone(),
          currentPosition: mirrorPos.clone(),
          velocity: new THREE.Vector3(),
          color: color.clone(),
          size: size,
          normal: mirrorNormal,
          isScattered: false,
          scatterTimer: 0,
          returnProgress: 0
        };

        this.updateParticleBuffers(particleIndex);
        particleIndex++;
      }
    }

    const bodyCount = Math.max(0, PARTICLE_COUNT - particleIndex);
    for (let i = 0; i < bodyCount && particleIndex < PARTICLE_COUNT; i++) {
      const bodyY = (Math.random() - 0.5) * 4;
      const bodyX = (Math.random() - 0.5) * 0.3;
      const size = 0.1 + Math.random() * 0.15;
      
      const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
      const color = new THREE.Color(COLOR_PALETTE[colorIndex]);
      
      const originalPos = new THREE.Vector3(bodyX, bodyY, 0);

      this.particles[particleIndex] = {
        originalPosition: originalPos.clone(),
        currentPosition: originalPos.clone(),
        velocity: new THREE.Vector3(),
        color: color,
        size: size,
        normal: new THREE.Vector3(0, 0, 1),
        isScattered: false,
        scatterTimer: 0,
        returnProgress: 0
      };

      this.updateParticleBuffers(particleIndex);
      particleIndex++;
    }
  }

  private getButterflyWingPoint(t: number, r: number): { x: number; y: number } {
    const wingScale = WING_SPAN / 2;
    
    const baseR = Math.sin(t * 0.5) * Math.cos(t * 0.3) + 0.5;
    const radius = baseR * r * wingScale;
    
    const x = Math.cos(t) * radius * 1.2;
    const y = Math.sin(t) * radius * 0.9;
    
    const yOffset = -radius * 0.1 * Math.sin(t * 2);
    
    return { x: Math.abs(x), y: y + yOffset };
  }

  private updateParticleBuffers(index: number): void {
    const particle = this.particles[index];
    if (!particle) return;

    const i3 = index * 3;
    this.positions[i3] = particle.currentPosition.x;
    this.positions[i3 + 1] = particle.currentPosition.y;
    this.positions[i3 + 2] = particle.currentPosition.z;

    this.colors[i3] = particle.color.r;
    this.colors[i3 + 1] = particle.color.g;
    this.colors[i3 + 2] = particle.color.b;

    this.sizes[index] = particle.size;
  }

  public triggerEnergyWave(worldPosition: THREE.Vector3): void {
    this.energyWaves.push({
      position: worldPosition.clone(),
      radius: 0,
      maxRadius: 10,
      life: 0,
      maxLife: 1.5
    });

    const wavePos = worldPosition;
    for (const particle of this.particles) {
      const dist = particle.currentPosition.distanceTo(wavePos);
      if (dist < 12) {
        const dir = particle.currentPosition.clone().sub(wavePos).normalize();
        const speed = SCATTER_SPEED_MIN + Math.random() * (SCATTER_SPEED_MAX - SCATTER_SPEED_MIN);
        const intensity = Math.max(0, 1 - dist / 12);
        
        particle.velocity.copy(dir.multiplyScalar(speed * intensity * 3));
        particle.isScattered = true;
        particle.scatterTimer = 1.5;
        particle.returnProgress = 0;
      }
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.updateEnergyWaves(deltaTime);
    this.updateParticles(deltaTime);

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateEnergyWaves(deltaTime: number): void {
    for (let i = this.energyWaves.length - 1; i >= 0; i--) {
      const wave = this.energyWaves[i];
      wave.life += deltaTime;
      
      const progress = wave.life / wave.maxLife;
      wave.radius = wave.maxRadius * (1 - Math.pow(1 - progress, 3));

      if (wave.life >= wave.maxLife) {
        this.energyWaves.splice(i, 1);
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    const flapAngle = Math.sin(this.time * FLAP_FREQUENCY * Math.PI * 2) * FLAP_AMPLITUDE;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      if (particle.isScattered) {
        particle.scatterTimer -= deltaTime;
        
        if (particle.scatterTimer <= 0) {
          particle.returnProgress = Math.min(1, particle.returnProgress + deltaTime / RETURN_DURATION);
          
          const t = this.easeOutCubic(particle.returnProgress);
          particle.currentPosition.lerpVectors(
            particle.currentPosition,
            particle.originalPosition,
            t * 0.1
          );
          
          particle.velocity.multiplyScalar(0.92);
          
          if (particle.returnProgress >= 1) {
            particle.isScattered = false;
            particle.currentPosition.copy(particle.originalPosition);
            particle.velocity.set(0, 0, 0);
          }
        } else {
          particle.currentPosition.add(particle.velocity.clone().multiplyScalar(deltaTime));
          particle.velocity.multiplyScalar(0.97);
        }
      } else {
        const flapOffset = particle.normal.clone().multiplyScalar(flapAngle);
        particle.currentPosition.copy(particle.originalPosition).add(flapOffset);
      }

      this.updateParticleBuffers(i);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public getEnergyWaves(): { position: THREE.Vector3; radius: number; life: number; maxLife: number }[] {
    return this.energyWaves;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
