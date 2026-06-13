import * as THREE from 'three';

const COLOR_PALETTE = [
  0xff6b6b,
  0xff9ff3,
  0x48dbfb,
  0x54a0ff,
  0xfeca57
];

const PARTICLE_COUNT = 2000;
const WING_SPAN = 4;
const WING_HEIGHT = 3.5;
const BODY_LENGTH = 3;

interface ParticleData {
  origin: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  normal: THREE.Vector3;
  color: THREE.Color;
  size: number;
  scatterFactor: number;
  returning: boolean;
  returnProgress: number;
}

export class ParticleButterfly {
  public mesh: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public particles: ParticleData[] = [];
  
  private material: THREE.PointsMaterial;
  private time: number = 0;
  private flapFrequency: number = 1.5;
  private flapAmplitude: number = 0.8;
  
  private energyWaves: Array<{
    position: THREE.Vector3;
    radius: number;
    maxRadius: number;
    speed: number;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
  }> = [];
  
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.generateParticles();
    this.updateGeometry();
  }

  private generateParticles(): void {
    this.particles = [];
    
    const bodyCount = 80;
    const wingCount = Math.floor((PARTICLE_COUNT - bodyCount) / 2);
    
    for (let i = 0; i < bodyCount; i++) {
      const t = i / (bodyCount - 1);
      const y = (t - 0.5) * BODY_LENGTH;
      const x = 0;
      const z = 0;
      
      this.particles.push(this.createParticle(x, y, z, new THREE.Vector3(0, 0, 1)));
    }
    
    for (let i = 0; i < wingCount; i++) {
      const p = this.generateWingParticle(1);
      this.particles.push(p);
    }
    
    for (let i = 0; i < wingCount; i++) {
      const p = this.generateWingParticle(-1);
      this.particles.push(p);
    }
  }

  private generateWingParticle(side: number): ParticleData {
    let x: number, y: number;
    let attempts = 0;
    
    do {
      x = Math.random() * WING_SPAN;
      y = (Math.random() - 0.5) * WING_HEIGHT;
      attempts++;
    } while (!this.isInsideWing(x, y) && attempts < 100);
    
    const wingShape = this.getWingShape(x);
    const normalizedY = y / (wingShape * 0.5);
    const zOffset = Math.sin(normalizedY * Math.PI) * 0.3;
    
    const posX = x * side;
    const posY = y;
    const posZ = zOffset * side;
    
    const normal = this.calculateWingNormal(x, y, side);
    
    return this.createParticle(posX, posY, posZ, normal);
  }

  private isInsideWing(x: number, y: number): boolean {
    if (x < 0 || x > WING_SPAN) return false;
    
    const wingShape = this.getWingShape(x);
    return Math.abs(y) < wingShape * 0.5;
  }

  private getWingShape(x: number): number {
    const normalizedX = x / WING_SPAN;
    
    let shape: number;
    if (normalizedX < 0.3) {
      const t = normalizedX / 0.3;
      shape = t * WING_HEIGHT * 0.6;
    } else if (normalizedX < 0.75) {
      const t = (normalizedX - 0.3) / 0.45;
      const upper = WING_HEIGHT * 0.8;
      const lower = WING_HEIGHT * 0.5;
      shape = upper + Math.sin(t * Math.PI) * (lower - upper) * 0.3;
    } else {
      const t = (normalizedX - 0.75) / 0.25;
      shape = WING_HEIGHT * 0.6 * (1 - t * 0.8);
    }
    
    return shape;
  }

  private calculateWingNormal(x: number, y: number, side: number): THREE.Vector3 {
    const eps = 0.01;
    const shapeAtX = this.getWingShape(x);
    const shapeAtXPlus = this.getWingShape(x + eps);
    
    const slopeX = (shapeAtXPlus - shapeAtX) / eps;
    
    const normal = new THREE.Vector3(
      side * Math.abs(slopeX) * 0.3,
      0,
      1
    ).normalize();
    
    return normal;
  }

  private createParticle(x: number, y: number, z: number, normal: THREE.Vector3): ParticleData {
    const colorIndex = Math.floor(Math.random() * COLOR_PALETTE.length);
    const color = new THREE.Color(COLOR_PALETTE[colorIndex]);
    
    return {
      origin: new THREE.Vector3(x, y, z),
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      normal: normal.clone(),
      color: color,
      size: 0.1 + Math.random() * 0.2,
      scatterFactor: 0.5 + Math.random() * 1.0,
      returning: false,
      returnProgress: 0
    };
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);
    const sizes = new Float32Array(this.particles.length);
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      
      sizes[i] = p.size;
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  public triggerEnergyWave(worldPosition: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x48dbfb,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(worldPosition);
    this.scene.add(mesh);
    
    this.energyWaves.push({
      position: worldPosition.clone(),
      radius: 0,
      maxRadius: 10,
      speed: 10 / 1.5,
      life: 0,
      maxLife: 1.5,
      mesh
    });
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    this.updateEnergyWaves(deltaTime);
    this.updateParticlePositions(deltaTime);
    this.updateGeometry();
  }

  private updateEnergyWaves(deltaTime: number): void {
    for (let i = this.energyWaves.length - 1; i >= 0; i--) {
      const wave = this.energyWaves[i];
      wave.life += deltaTime;
      wave.radius += wave.speed * deltaTime;
      
      const scale = wave.radius / 0.1;
      wave.mesh.scale.setScalar(scale);
      
      const opacity = 0.6 * (1 - wave.life / wave.maxLife);
      (wave.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      
      this.applyWaveForce(wave);
      
      if (wave.life >= wave.maxLife) {
        this.scene.remove(wave.mesh);
        wave.geometry.dispose();
        (wave.mesh.material as THREE.Material).dispose();
        this.energyWaves.splice(i, 1);
      }
    }
  }

  private applyWaveForce(wave: { position: THREE.Vector3; radius: number; speed: number }): void {
    const waveThickness = 1.5;
    const waveInnerRadius = wave.radius - waveThickness;
    
    for (const particle of this.particles) {
      const distance = particle.position.distanceTo(wave.position);
      
      if (distance > waveInnerRadius && distance < wave.radius) {
        const direction = new THREE.Vector3()
          .subVectors(particle.position, wave.position)
          .normalize();
        
        const force = (1 - (wave.radius - distance) / waveThickness) * particle.scatterFactor;
        const speed = 0.5 + Math.random() * 1.0;
        
        particle.velocity.add(direction.multiplyScalar(force * speed * 5));
        particle.returning = false;
        particle.returnProgress = 0;
      }
    }
  }

  private updateParticlePositions(deltaTime: number): void {
    const flapPhase = this.time * this.flapFrequency * Math.PI * 2;
    const flapValue = Math.sin(flapPhase) * this.flapAmplitude;
    
    for (const particle of this.particles) {
      const flapOffset = particle.normal.clone().multiplyScalar(flapValue);
      
      const targetPos = particle.origin.clone().add(flapOffset);
      
      if (particle.velocity.length() > 0.01 || !particle.returning) {
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
        
        particle.velocity.multiplyScalar(0.95);
        
        const distFromOrigin = particle.position.distanceTo(particle.origin);
        if (distFromOrigin > 0.1 && this.energyWaves.length === 0) {
          particle.returning = true;
        }
      }
      
      if (particle.returning) {
        particle.returnProgress += deltaTime * 0.5;
        
        if (particle.returnProgress >= 1) {
          particle.returnProgress = 1;
          particle.position.copy(targetPos);
          particle.velocity.set(0, 0, 0);
        } else {
          const t = this.easeOutCubic(particle.returnProgress);
          particle.position.lerp(targetPos, t * deltaTime * 3);
        }
      } else {
        const basePull = targetPos.clone().sub(particle.position).multiplyScalar(0.1);
        particle.velocity.add(basePull.multiplyScalar(deltaTime * 2));
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getParticlePosition(index: number): THREE.Vector3 {
    return this.particles[index].position;
  }

  public getParticleColor(index: number): THREE.Color {
    return this.particles[index].color;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    
    for (const wave of this.energyWaves) {
      wave.geometry.dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
  }
}
