import * as THREE from 'three';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  targetColor: THREE.Color;
  size: number;
  baseSize: number;
  life: number;
  maxLife: number;
  pulsePhase: number;
  pulseSpeed: number;
  clusterId: number;
  isExploding: boolean;
  explodeVelocity: THREE.Vector3;
}

export interface ParticleSystemOptions {
  maxParticles?: number;
  particleLifetime?: number;
  startColor?: THREE.Color;
  endColor?: THREE.Color;
  minSize?: number;
  maxSize?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;
  private particleLifetime: number;
  private startColor: THREE.Color;
  private endColor: THREE.Color;
  private minSize: number;
  private maxSize: number;
  
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  
  private pathProgress: number = 0;
  private isDrawing: boolean = false;
  
  constructor(scene: THREE.Scene, options: ParticleSystemOptions = {}) {
    this.maxParticles = options.maxParticles ?? 3000;
    this.particleLifetime = options.particleLifetime ?? 1.5;
    this.startColor = options.startColor ?? new THREE.Color(0xFFD700);
    this.endColor = options.endColor ?? new THREE.Color(0x00FFFF);
    this.minSize = options.minSize ?? 2;
    this.maxSize = options.maxSize ?? 6;
    
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    
    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    scene.add(this.points);
  }
  
  public startDrawing(): void {
    this.isDrawing = true;
    this.pathProgress = 0;
  }
  
  public stopDrawing(): void {
    this.isDrawing = false;
  }
  
  public emit(position: THREE.Vector3, count: number = 3): void {
    for (let i = 0; i < count; i++) {
      this.addParticle(position);
    }
  }
  
  private addParticle(position: THREE.Vector3): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.2
    );
    
    const color = this.startColor.clone();
    const targetColor = this.endColor.clone();
    
    const size = this.minSize + Math.random() * (this.maxSize - this.minSize);
    
    const particle: Particle = {
      position: position.clone(),
      velocity,
      color,
      targetColor,
      size,
      baseSize: size,
      life: this.particleLifetime,
      maxLife: this.particleLifetime,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: (0.5 + Math.random()) * Math.PI * 2 / (0.5 + Math.random()),
      clusterId: -1,
      isExploding: false,
      explodeVelocity: new THREE.Vector3()
    };
    
    this.particles.push(particle);
  }
  
  public update(deltaTime: number): void {
    if (this.isDrawing) {
      this.pathProgress = Math.min(1, this.pathProgress + deltaTime * 0.1);
    }
    
    const aliveParticles: Particle[] = [];
    
    for (const particle of this.particles) {
      if (particle.life <= 0) continue;
      
      particle.life -= deltaTime;
      
      if (particle.isExploding) {
        particle.position.add(particle.explodeVelocity.clone().multiplyScalar(deltaTime));
        particle.explodeVelocity.multiplyScalar(0.98);
        particle.size = particle.baseSize * 0.2 * (particle.life / particle.maxLife);
      } else {
        particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 60));
        particle.velocity.multiplyScalar(0.98);
        
        particle.pulsePhase += particle.pulseSpeed * deltaTime;
        const pulseScale = 1 + Math.sin(particle.pulsePhase) * 0.3;
        particle.size = particle.baseSize * pulseScale;
        
        const lifeRatio = particle.life / particle.maxLife;
        if (particle.clusterId < 0) {
          const t = 1 - lifeRatio;
          particle.color.lerpColors(this.startColor, this.endColor, t + this.pathProgress * 0.3);
        }
      }
      
      if (particle.life > 0) {
        aliveParticles.push(particle);
      }
    }
    
    this.particles = aliveParticles;
    this.updateGeometry();
  }
  
  private updateGeometry(): void {
    const count = Math.min(this.particles.length, this.maxParticles);
    
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;
      
      this.positions[i3] = p.position.x;
      this.positions[i3 + 1] = p.position.y;
      this.positions[i3 + 2] = p.position.z;
      
      const alpha = Math.max(0, p.life / p.maxLife);
      this.colors[i3] = p.color.r * alpha;
      this.colors[i3 + 1] = p.color.g * alpha;
      this.colors[i3 + 2] = p.color.b * alpha;
      
      this.sizes[i] = p.size;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
  }
  
  public getParticles(): Particle[] {
    return this.particles;
  }
  
  public getParticleCount(): number {
    return this.particles.length;
  }
  
  public getPoints(): THREE.Points {
    return this.points;
  }
  
  public setPathProgress(progress: number): void {
    this.pathProgress = Math.max(0, Math.min(1, progress));
  }
  
  public explodeAll(): void {
    for (const particle of this.particles) {
      particle.isExploding = true;
      const speed = 2 + Math.random() * 3;
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      particle.explodeVelocity.copy(direction.multiplyScalar(speed * 20));
      particle.life = Math.min(particle.life, 0.5);
      particle.maxLife = 0.5;
    }
  }
  
  public reset(): void {
    this.particles = [];
    this.pathProgress = 0;
    this.isDrawing = false;
    this.updateGeometry();
  }
  
  public applyClusterColors(clusterColors: Map<number, THREE.Color>): void {
    for (const particle of this.particles) {
      if (particle.clusterId >= 0 && clusterColors.has(particle.clusterId)) {
        const target = clusterColors.get(particle.clusterId)!;
        particle.color.lerp(target, 0.05);
      }
    }
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
