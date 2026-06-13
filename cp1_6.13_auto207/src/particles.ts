import * as THREE from 'three';

const PARTICLE_CONFIG = {
  ORBIT_COUNT: 200,
  ORBIT_COUNT_LOW: 120,
  ORBIT_RADIUS_MIN: 150,
  ORBIT_RADIUS_MAX: 300,
  ORBIT_PERIOD_MIN: 8,
  ORBIT_PERIOD_MAX: 15,
  ORBIT_SIZE_MIN: 2,
  ORBIT_SIZE_MAX: 4,
  ORBIT_OPACITY_MIN: 0.2,
  ORBIT_OPACITY_MAX: 0.6,
  BURST_COUNT: 50,
  BURST_SPEED_MIN: 50,
  BURST_SPEED_MAX: 120,
  BURST_LIFE: 1.5,
  LOW_FPS_THRESHOLD: 45,
};

interface OrbitParticle {
  mesh: THREE.Mesh;
  radius: number;
  speed: number;
  angle: number;
  inclination: number;
  baseOpacity: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

interface ParticleSystemOptions {
  scene: THREE.Scene;
  orbitCount?: number;
  astrolabeCenter: THREE.Vector3;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private astrolabeCenter: THREE.Vector3;
  private orbitParticles: OrbitParticle[] = [];
  private burstParticles: BurstParticle[] = [];
  private orbitGeometry: THREE.SphereGeometry;
  private orbitMaterial: THREE.MeshBasicMaterial;
  private burstGeometry: THREE.SphereGeometry;

  constructor(options: ParticleSystemOptions) {
    this.scene = options.scene;
    this.astrolabeCenter = options.astrolabeCenter.clone();
    
    const orbitCount = options.orbitCount ?? PARTICLE_CONFIG.ORBIT_COUNT;
    
    this.orbitGeometry = new THREE.SphereGeometry(1, 8, 8);
    this.orbitMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    
    this.burstGeometry = new THREE.SphereGeometry(1, 6, 6);
    
    this.createOrbitParticles(orbitCount);
  }

  private createOrbitParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const size = this.randomRange(
        PARTICLE_CONFIG.ORBIT_SIZE_MIN,
        PARTICLE_CONFIG.ORBIT_SIZE_MAX
      );
      
      const material = this.orbitMaterial.clone();
      const baseOpacity = this.randomRange(
        PARTICLE_CONFIG.ORBIT_OPACITY_MIN,
        PARTICLE_CONFIG.ORBIT_OPACITY_MAX
      );
      material.opacity = baseOpacity;
      
      const mesh = new THREE.Mesh(this.orbitGeometry, material);
      mesh.scale.setScalar(size * 0.1);
      
      const radius = this.randomRange(
        PARTICLE_CONFIG.ORBIT_RADIUS_MIN,
        PARTICLE_CONFIG.ORBIT_RADIUS_MAX
      );
      const period = this.randomRange(
        PARTICLE_CONFIG.ORBIT_PERIOD_MIN,
        PARTICLE_CONFIG.ORBIT_PERIOD_MAX
      );
      const speed = (Math.PI * 2) / period;
      
      const particle: OrbitParticle = {
        mesh,
        radius: radius * 0.01,
        speed,
        angle: Math.random() * Math.PI * 2,
        inclination: this.randomRange(-Math.PI / 3, Math.PI / 3),
        baseOpacity,
      };
      
      this.updateOrbitParticlePosition(particle);
      this.orbitParticles.push(particle);
      this.scene.add(mesh);
    }
  }

  private updateOrbitParticlePosition(particle: OrbitParticle): void {
    const x = Math.cos(particle.angle) * particle.radius * Math.cos(particle.inclination);
    const y = Math.sin(particle.inclination) * particle.radius;
    const z = Math.sin(particle.angle) * particle.radius * Math.cos(particle.inclination);
    
    particle.mesh.position.set(
      this.astrolabeCenter.x + x,
      this.astrolabeCenter.y + y,
      this.astrolabeCenter.z + z
    );
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  public triggerBurst(position: THREE.Vector3, color: string, intensity: number): void {
    const colorHex = parseInt(color.replace('#', ''), 16);
    const count = Math.floor(PARTICLE_CONFIG.BURST_COUNT * intensity);
    
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1,
      });
      
      const mesh = new THREE.Mesh(this.burstGeometry, material);
      mesh.position.copy(position);
      
      const size = this.randomRange(0.02, 0.04) * intensity;
      mesh.scale.setScalar(size);
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = this.randomRange(
        PARTICLE_CONFIG.BURST_SPEED_MIN,
        PARTICLE_CONFIG.BURST_SPEED_MAX
      ) * 0.01 * intensity;
      
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      
      const burstParticle: BurstParticle = {
        mesh,
        velocity,
        life: PARTICLE_CONFIG.BURST_LIFE,
        maxLife: PARTICLE_CONFIG.BURST_LIFE,
        initialScale: size,
      };
      
      this.burstParticles.push(burstParticle);
      this.scene.add(mesh);
    }
  }

  public adjustParticleCount(targetCount: number): void {
    const currentCount = this.orbitParticles.length;
    
    if (targetCount < currentCount) {
      const toRemove = currentCount - targetCount;
      for (let i = 0; i < toRemove; i++) {
        const particle = this.orbitParticles.pop();
        if (particle) {
          this.scene.remove(particle.mesh);
          (particle.mesh.material as THREE.Material).dispose();
        }
      }
    } else if (targetCount > currentCount) {
      const toAdd = targetCount - currentCount;
      this.createOrbitParticles(toAdd);
    }
  }

  public update(deltaTime: number): void {
    for (const particle of this.orbitParticles) {
      particle.angle += particle.speed * deltaTime;
      this.updateOrbitParticlePosition(particle);
      
      const twinkle = 0.8 + Math.sin(performance.now() * 0.002 + particle.angle) * 0.2;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = particle.baseOpacity * twinkle;
    }
    
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const particle = this.burstParticles[i];
      particle.life -= deltaTime;
      
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        (particle.mesh.material as THREE.Material).dispose();
        this.burstParticles.splice(i, 1);
        continue;
      }
      
      particle.mesh.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      
      const lifeRatio = particle.life / particle.maxLife;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = lifeRatio;
      particle.mesh.scale.setScalar(particle.initialScale * lifeRatio);
      
      particle.velocity.multiplyScalar(0.98);
    }
  }

  public dispose(): void {
    for (const particle of this.orbitParticles) {
      this.scene.remove(particle.mesh);
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.orbitParticles = [];
    
    for (const particle of this.burstParticles) {
      this.scene.remove(particle.mesh);
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.burstParticles = [];
    
    this.orbitGeometry.dispose();
    this.orbitMaterial.dispose();
    this.burstGeometry.dispose();
  }
}

export { PARTICLE_CONFIG };
