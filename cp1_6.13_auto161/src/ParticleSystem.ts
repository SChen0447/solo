import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles: number = 150;
  private targetParticleCount: number = 30;
  private stemColor: THREE.Color = new THREE.Color(0x88ccff);
  private flowerColor: THREE.Color = new THREE.Color(0xff6699);
  private mouseSpeed: number = 0;
  private mousePosition: THREE.Vector3 = new THREE.Vector3();
  private mouseDirection: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setStemColor(color: THREE.Color): void {
    this.stemColor.copy(color);
  }

  public setFlowerColor(color: THREE.Color): void {
    this.flowerColor.copy(color);
  }

  public updateMouse(position: THREE.Vector3, speed: number, direction: THREE.Vector3): void {
    this.mousePosition.copy(position);
    this.mouseSpeed = speed;
    this.mouseDirection.copy(direction).normalize();
    
    this.targetParticleCount = Math.floor(30 + speed * 50);
    this.targetParticleCount = Math.min(80, Math.max(30, this.targetParticleCount));
  }

  public spawnParticles(count: number, position: THREE.Vector3, colorStart?: THREE.Color, colorEnd?: THREE.Color): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      
      const startColor = colorStart || this.stemColor;
      const endColor = colorEnd || this.flowerColor;
      
      const size = 1 + Math.random() * 2;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      
      const color = startColor.clone().lerp(endColor, Math.random());
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * speed,
        Math.sin(angle) * speed
      );
      
      const maxLife = 4 + Math.random() * 2;
      
      this.particles.push({
        mesh,
        velocity,
        life: maxLife,
        maxLife,
        size
      });
      
      this.scene.add(mesh);
    }
  }

  public update(deltaTime: number): void {
    if (this.particles.length < this.targetParticleCount && this.mouseSpeed > 0.1) {
      const toSpawn = Math.min(3, this.targetParticleCount - this.particles.length);
      
      for (let i = 0; i < toSpawn; i++) {
        if (this.particles.length >= this.maxParticles) break;
        
        const size = 1 + Math.random() * 2;
        const geometry = new THREE.SphereGeometry(size, 6, 6);
        
        const t = Math.random();
        const color = this.stemColor.clone().lerp(this.flowerColor, t);
        const material = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.mousePosition);
        mesh.position.x += (Math.random() - 0.5) * 20;
        mesh.position.y += (Math.random() - 0.5) * 20;
        mesh.position.z += (Math.random() - 0.5) * 20;
        
        const speed = 3 + Math.random() * 5;
        const velocity = this.mouseDirection.clone()
          .multiplyScalar(-speed)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
          ));
        
        const maxLife = 4 + Math.random() * 2;
        
        this.particles.push({
          mesh,
          velocity,
          life: maxLife,
          maxLife,
          size
        });
        
        this.scene.add(mesh);
      }
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime * 60));
      p.velocity.y -= 0.02;
      
      const material = p.mesh.material as THREE.MeshBasicMaterial;
      if (p.life < 1) {
        material.opacity = p.life * 0.8;
      } else {
        material.opacity = Math.min(0.8, (p.life / p.maxLife) * 0.8);
      }
    }
  }

  public reset(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
