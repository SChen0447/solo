import * as THREE from 'three';

interface SphereData {
  mesh: THREE.Mesh;
  baseRadius: number;
  basePosition: THREE.Vector3;
  sinOffset: number;
  sinFrequency: number;
  bandIndex: number;
  targetScale: number;
  currentScale: number;
  baseEmissiveIntensity: number;
  highlightIntensity: number;
}

interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class SphereManager {
  private scene: THREE.Scene;
  private spheres: SphereData[] = [];
  private particles: ParticleData[] = [];
  private particlePool: ParticleData[] = [];
  
  private readonly SPHERE_COUNT: number = 32;
  private readonly SHELL_RADIUS: number = 5;
  private readonly MIN_SCALE: number = 0.3;
  private readonly MAX_SCALE: number = 1.2;
  private readonly PARTICLE_POOL_SIZE: number = 200;
  private readonly PARTICLES_PER_HOVER: number = 20;
  private readonly PARTICLE_LIFE: number = 1.0;
  private readonly HOVER_SCALE_MULTIPLIER: number = 1.5;
  private readonly NEIGHBOR_DISTANCE: number = 2;
  private readonly NEIGHBOR_BRIGHTNESS_BOOST: number = 0.3;
  
  private rotationY: number = 0;
  private readonly ROTATION_SPEED: number = (Math.PI * 2) / 15;
  
  private hoveredSphere: SphereData | null = null;
  
  private colorCache: THREE.Color[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initColorCache();
    this.createSpheres();
    this.initParticlePool();
  }

  private initColorCache(): void {
    for (let i = 0; i < this.SPHERE_COUNT; i++) {
      const t = i / (this.SPHERE_COUNT - 1);
      const color = this.getColorFromFrequency(t);
      this.colorCache.push(color);
    }
  }

  private getColorFromFrequency(t: number): THREE.Color {
    const r = Math.floor(255 * (1 - t));
    const g = Math.floor(50 + 50 * Math.sin(t * Math.PI));
    const b = Math.floor(100 + 155 * t);
    return new THREE.Color(r / 255, g / 255, b / 255);
  }

  private createSpheres(): void {
    const phi = Math.PI * (3 - Math.sqrt(5));
    
    for (let i = 0; i < this.SPHERE_COUNT; i++) {
      const y = 1 - (i / (this.SPHERE_COUNT - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      
      const basePos = new THREE.Vector3(x, y, z).multiplyScalar(this.SHELL_RADIUS);
      
      const baseRadius = 0.4 + Math.random() * 0.2;
      
      const geometry = new THREE.SphereGeometry(baseRadius, 16, 16);
      const color = this.colorCache[i].clone();
      
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(basePos);
      mesh.userData.bandIndex = i;
      
      this.scene.add(mesh);
      
      const sinFrequency = 0.5 + Math.random() * 1.5;
      const sinOffset = Math.random() * Math.PI * 2;
      
      this.spheres.push({
        mesh,
        baseRadius,
        basePosition: basePos.clone(),
        sinOffset,
        sinFrequency,
        bandIndex: i,
        targetScale: 1,
        currentScale: 1,
        baseEmissiveIntensity: 0.3,
        highlightIntensity: 0
      });
    }
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.PARTICLE_POOL_SIZE; i++) {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);
      
      this.particlePool.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: this.PARTICLE_LIFE,
        active: false
      });
    }
  }

  private getParticleFromPool(): ParticleData | null {
    for (const particle of this.particlePool) {
      if (!particle.active) {
        return particle;
      }
    }
    return null;
  }

  public update(frequencyData: number[], deltaTime: number, elapsedTime: number): void {
    this.rotationY += this.ROTATION_SPEED * deltaTime;
    
    for (let i = 0; i < this.spheres.length; i++) {
      const sphere = this.spheres[i];
      const freqValue = frequencyData[i] || 0;
      
      const targetRadius = this.MIN_SCALE + (this.MAX_SCALE - this.MIN_SCALE) * freqValue;
      sphere.targetScale = targetRadius / sphere.baseRadius;
      
      sphere.currentScale += (sphere.targetScale - sphere.currentScale) * 0.15;
      
      const sinOffset = Math.sin(elapsedTime * sphere.sinFrequency + sphere.sinOffset) * 0.2;
      
      const radialDir = sphere.basePosition.clone().normalize();
      const radialOffset = radialDir.multiplyScalar(sinOffset + freqValue * 0.5);
      
      const basePosRotated = sphere.basePosition.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
      const offsetRotated = radialOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
      
      sphere.mesh.position.copy(basePosRotated).add(offsetRotated);
      
      const finalScale = sphere.currentScale * (this.hoveredSphere === sphere ? this.HOVER_SCALE_MULTIPLIER : 1);
      sphere.mesh.scale.setScalar(finalScale);
      
      const material = sphere.mesh.material as THREE.MeshStandardMaterial;
      
      const emissiveBoost = freqValue * 0.7;
      const neighborBoost = sphere.highlightIntensity * this.NEIGHBOR_BRIGHTNESS_BOOST;
      material.emissiveIntensity = sphere.baseEmissiveIntensity + emissiveBoost + neighborBoost;
      
      material.opacity = 0.6 + freqValue * 0.35;
      
      sphere.highlightIntensity *= 0.9;
    }
    
    this.updateParticles(deltaTime);
    this.updateNeighborHighlights();
  }

  private updateNeighborHighlights(): void {
    if (!this.hoveredSphere) return;
    
    const hoveredPos = this.hoveredSphere.mesh.position;
    
    for (const sphere of this.spheres) {
      if (sphere === this.hoveredSphere) continue;
      
      const distance = sphere.mesh.position.distanceTo(hoveredPos);
      if (distance < this.NEIGHBOR_DISTANCE) {
        sphere.highlightIntensity = Math.max(sphere.highlightIntensity, 1.0);
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        particle.active = false;
        particle.mesh.visible = false;
        const index = this.particles.indexOf(particle);
        if (index > -1) {
          this.particles.splice(index, 1);
        }
        continue;
      }
      
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = particle.life / particle.maxLife;
      
      const scale = particle.life / particle.maxLife;
      particle.mesh.scale.setScalar(scale);
    }
  }

  public emitParticles(sphere: SphereData): void {
    const spherePos = sphere.mesh.position;
    const color = (sphere.mesh.material as THREE.MeshStandardMaterial).emissive.clone();
    
    for (let i = 0; i < this.PARTICLES_PER_HOVER; i++) {
      const particle = this.getParticleFromPool();
      if (!particle) break;
      
      particle.active = true;
      particle.life = this.PARTICLE_LIFE;
      particle.maxLife = this.PARTICLE_LIFE;
      particle.mesh.visible = true;
      particle.mesh.position.copy(spherePos);
      particle.mesh.scale.setScalar(1);
      
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color);
      material.opacity = 1;
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1 + Math.random() * 2;
      
      particle.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      
      if (!this.particles.includes(particle)) {
        this.particles.push(particle);
      }
    }
  }

  public handleHover(sphereMesh: THREE.Mesh | null): void {
    const sphereData = sphereMesh 
      ? this.spheres.find(s => s.mesh === sphereMesh) || null
      : null;
    
    if (this.hoveredSphere !== sphereData) {
      this.hoveredSphere = sphereData;
      
      if (sphereData) {
        this.emitParticles(sphereData);
      }
    }
  }

  public getSpheres(): THREE.Mesh[] {
    return this.spheres.map(s => s.mesh);
  }

  public getSphereCount(): number {
    return this.SPHERE_COUNT;
  }

  public dispose(): void {
    for (const sphere of this.spheres) {
      this.scene.remove(sphere.mesh);
      sphere.mesh.geometry.dispose();
      (sphere.mesh.material as THREE.Material).dispose();
    }
    this.spheres = [];
    
    for (const particle of this.particlePool) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.particlePool = [];
    this.particles = [];
  }
}
