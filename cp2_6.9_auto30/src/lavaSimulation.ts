import * as THREE from 'three';

export interface TerrainData {
  size: number;
  getHeight: (x: number, z: number) => number;
  getNormal: (x: number, z: number) => THREE.Vector3;
}

interface LavaParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  temperature: number;
  active: boolean;
  solidified: boolean;
  id: number;
}

interface SparkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

const COLOR_HOT = new THREE.Color(0xFF4500);
const COLOR_WARM = new THREE.Color(0x8B0000);
const COLOR_COLD = new THREE.Color(0x2F2F2F);

export class LavaSimulation {
  private scene: THREE.Scene;
  private terrain: TerrainData;
  private particles: LavaParticle[] = [];
  private sparks: SparkParticle[] = [];
  private solidifiedMeshes: THREE.Mesh[] = [];
  
  private lavaPoints!: THREE.Points;
  private sparkPoints!: THREE.Points;
  private lavaPositions!: Float32Array;
  private lavaColors!: Float32Array;
  private sparkPositions!: Float32Array;
  private sparkColors!: Float32Array;
  
  private viscosity: number = 1.5;
  private coolingRate: number = 1.5;
  private maxParticles: number = 2000;
  private maxSparks: number = 500;
  private nextParticleId: number = 0;
  
  private erupting: boolean = false;
  private eruptionProgress: number = 0;
  private eruptionTargetCount: number = 0;
  private craterPosition: THREE.Vector3;
  
  private solidifiedGroup: THREE.Group;

  constructor(scene: THREE.Scene, terrain: TerrainData) {
    this.scene = scene;
    this.terrain = terrain;
    this.craterPosition = new THREE.Vector3(0, terrain.getHeight(0, 0), 0);
    this.solidifiedGroup = new THREE.Group();
    this.scene.add(this.solidifiedGroup);
    
    this.initParticleSystem();
    this.initSparkSystem();
  }

  private initParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    this.lavaPositions = new Float32Array(this.maxParticles * 3);
    this.lavaColors = new Float32Array(this.maxParticles * 3);
    
    for (let i = 0; i < this.maxParticles; i++) {
      this.lavaPositions[i * 3] = 0;
      this.lavaPositions[i * 3 + 1] = -1000;
      this.lavaPositions[i * 3 + 2] = 0;
      
      this.lavaColors[i * 3] = COLOR_HOT.r;
      this.lavaColors[i * 3 + 1] = COLOR_HOT.g;
      this.lavaColors[i * 3 + 2] = COLOR_HOT.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.lavaPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.lavaColors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 3.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.lavaPoints = new THREE.Points(geometry, material);
    this.scene.add(this.lavaPoints);
  }

  private initSparkSystem(): void {
    const geometry = new THREE.BufferGeometry();
    this.sparkPositions = new Float32Array(this.maxSparks * 3);
    this.sparkColors = new Float32Array(this.maxSparks * 3);
    
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparkPositions[i * 3] = 0;
      this.sparkPositions[i * 3 + 1] = -1000;
      this.sparkPositions[i * 3 + 2] = 0;
      
      this.sparkColors[i * 3] = 1.0;
      this.sparkColors[i * 3 + 1] = 1.0;
      this.sparkColors[i * 3 + 2] = 0.3;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.sparkColors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.sparkPoints = new THREE.Points(geometry, material);
    this.scene.add(this.sparkPoints);
  }

  setViscosity(value: number): void {
    this.viscosity = Math.max(0.1, Math.min(5.0, value));
  }

  setCoolingRate(value: number): void {
    this.coolingRate = Math.max(0.5, Math.min(5.0, value));
  }

  erupt(count: number = 2000): void {
    this.erupting = true;
    this.eruptionProgress = 0;
    this.eruptionTargetCount = Math.min(count, this.maxParticles - this.getActiveParticleCount());
    
    for (let i = 0; i < 30; i++) {
      this.spawnSpark();
    }
  }

  private getActiveParticleCount(): number {
    return this.particles.filter(p => p.active && !p.solidified).length;
  }

  getActiveCount(): number {
    return this.particles.filter(p => p.active && !p.solidified).length;
  }

  getSolidifiedCount(): number {
    return this.solidifiedMeshes.length;
  }

  private spawnParticle(): void {
    if (this.particles.length >= this.maxParticles) {
      const inactive = this.particles.findIndex(p => !p.active);
      if (inactive === -1) return;
      this.particles.splice(inactive, 1);
    }
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 12;
    const x = this.craterPosition.x + Math.cos(angle) * radius;
    const z = this.craterPosition.z + Math.sin(angle) * radius;
    const y = this.terrain.getHeight(x, z) + Math.random() * 8 + 5;
    
    const particle: LavaParticle = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 3
      ),
      temperature: 1.0,
      active: true,
      solidified: false,
      id: this.nextParticleId++
    };
    
    this.particles.push(particle);
  }

  private spawnSpark(): void {
    if (this.sparks.length >= this.maxSparks) {
      const inactive = this.sparks.findIndex(s => !s.active);
      if (inactive === -1) return;
      this.sparks.splice(inactive, 1);
    }
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 8;
    const x = this.craterPosition.x + Math.cos(angle) * radius;
    const z = this.craterPosition.z + Math.sin(angle) * radius;
    const y = this.terrain.getHeight(x, z) + Math.random() * 15 + 5;
    
    const spark: SparkParticle = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 8 + 3,
        (Math.random() - 0.5) * 6
      ),
      life: 1.0,
      maxLife: Math.random() * 1.5 + 0.8,
      active: true
    };
    
    this.sparks.push(spark);
  }

  private createSolidifiedBlock(position: THREE.Vector3): void {
    const useCylinder = Math.random() > 0.5;
    let geometry: THREE.BufferGeometry;
    
    if (useCylinder) {
      const radiusTop = 0.8 + Math.random() * 0.7;
      const radiusBottom = 0.8 + Math.random() * 0.7;
      const height = 0.5 + Math.random() * 1.5;
      geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 6 + Math.floor(Math.random() * 4));
    } else {
      const width = 1.0 + Math.random() * 1.0;
      const height = 0.5 + Math.random() * 1.5;
      const depth = 1.0 + Math.random() * 1.0;
      geometry = new THREE.BoxGeometry(width, height, depth);
    }
    
    const baseColor = new THREE.Color(0x2F2F2F);
    const hueShift = (Math.random() - 0.5) * 0.05;
    const satShift = (Math.random() - 0.5) * 0.1;
    baseColor.offsetHSL(hueShift, satShift, (Math.random() - 0.5) * 0.05);
    
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.y = position.y + (geometry.parameters?.height || 1) * 0.4;
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.rotation.x = (Math.random() - 0.5) * 0.3;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    
    this.solidifiedGroup.add(mesh);
    this.solidifiedMeshes.push(mesh);
  }

  private getTemperatureColor(temperature: number): THREE.Color {
    if (temperature > 0.5) {
      const t = (temperature - 0.5) * 2;
      return COLOR_WARM.clone().lerp(COLOR_HOT, t);
    } else {
      const t = temperature * 2;
      return COLOR_COLD.clone().lerp(COLOR_WARM, t);
    }
  }

  update(deltaTime: number): void {
    if (this.erupting) {
      this.eruptionProgress += deltaTime * 800;
      const toSpawn = Math.min(
        Math.floor(this.eruptionProgress),
        this.eruptionTargetCount,
        this.maxParticles - this.getActiveParticleCount()
      );
      
      for (let i = 0; i < toSpawn; i++) {
        this.spawnParticle();
        if (Math.random() > 0.6) {
          this.spawnSpark();
        }
      }
      
      this.eruptionProgress -= toSpawn;
      this.eruptionTargetCount -= toSpawn;
      
      if (this.eruptionTargetCount <= 0) {
        this.erupting = false;
      }
    }
    
    this.updateLavaParticles(deltaTime);
    this.updateSparkParticles(deltaTime);
    this.updateBuffers();
  }

  private updateLavaParticles(deltaTime: number): void {
    const gravity = -15;
    const coolingAmount = this.coolingRate * deltaTime * 0.12;
    const viscosityFactor = 1 / this.viscosity;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active || p.solidified) continue;
      
      p.temperature -= coolingAmount;
      
      if (p.temperature <= 0) {
        p.temperature = 0;
        p.solidified = true;
        p.active = false;
        const groundY = this.terrain.getHeight(p.position.x, p.position.z);
        this.createSolidifiedBlock(new THREE.Vector3(p.position.x, groundY, p.position.z));
        continue;
      }
      
      p.velocity.y += gravity * deltaTime;
      
      const terrainHeight = this.terrain.getHeight(p.position.x, p.position.z);
      
      if (p.position.y <= terrainHeight + 0.5) {
        p.position.y = terrainHeight + 0.5;
        p.velocity.y = 0;
        
        const normal = this.terrain.getNormal(p.position.x, p.position.z);
        const slope = new THREE.Vector3(-normal.x, 0, -normal.z);
        const slopeMagnitude = slope.length();
        
        if (slopeMagnitude > 0.01) {
          slope.normalize();
          const speedFactor = slopeMagnitude * 25 * viscosityFactor;
          p.velocity.x += slope.x * speedFactor * deltaTime;
          p.velocity.z += slope.z * speedFactor * deltaTime;
        }
        
        const damping = Math.pow(0.02, deltaTime * this.viscosity);
        p.velocity.x *= damping;
        p.velocity.z *= damping;
      }
      
      p.position.addScaledVector(p.velocity, deltaTime);
      
      const halfSize = this.terrain.size * 0.5;
      if (Math.abs(p.position.x) > halfSize || Math.abs(p.position.z) > halfSize) {
        p.active = false;
      }
    }
  }

  private updateSparkParticles(deltaTime: number): void {
    const gravity = -20;
    
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      
      s.life -= deltaTime / s.maxLife;
      
      if (s.life <= 0) {
        s.active = false;
        continue;
      }
      
      s.velocity.y += gravity * deltaTime;
      s.velocity.x *= Math.pow(0.5, deltaTime);
      s.velocity.z *= Math.pow(0.5, deltaTime);
      
      s.position.addScaledVector(s.velocity, deltaTime);
    }
  }

  private updateBuffers(): void {
    let particleIndex = 0;
    
    for (let i = 0; i < this.particles.length && particleIndex < this.maxParticles; i++) {
      const p = this.particles[i];
      
      if (p.active && !p.solidified) {
        this.lavaPositions[particleIndex * 3] = p.position.x;
        this.lavaPositions[particleIndex * 3 + 1] = p.position.y;
        this.lavaPositions[particleIndex * 3 + 2] = p.position.z;
        
        const color = this.getTemperatureColor(p.temperature);
        this.lavaColors[particleIndex * 3] = color.r;
        this.lavaColors[particleIndex * 3 + 1] = color.g;
        this.lavaColors[particleIndex * 3 + 2] = color.b;
        
        particleIndex++;
      }
    }
    
    for (let i = particleIndex; i < this.maxParticles; i++) {
      this.lavaPositions[i * 3 + 1] = -1000;
    }
    
    (this.lavaPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lavaPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    
    let sparkIndex = 0;
    
    for (let i = 0; i < this.sparks.length && sparkIndex < this.maxSparks; i++) {
      const s = this.sparks[i];
      
      if (s.active) {
        this.sparkPositions[sparkIndex * 3] = s.position.x;
        this.sparkPositions[sparkIndex * 3 + 1] = s.position.y;
        this.sparkPositions[sparkIndex * 3 + 2] = s.position.z;
        
        const alpha = s.life;
        this.sparkColors[sparkIndex * 3] = 1.0;
        this.sparkColors[sparkIndex * 3 + 1] = 0.8 + alpha * 0.2;
        this.sparkColors[sparkIndex * 3 + 2] = 0.2;
        
        sparkIndex++;
      }
    }
    
    for (let i = sparkIndex; i < this.maxSparks; i++) {
      this.sparkPositions[i * 3 + 1] = -1000;
    }
    
    (this.sparkPoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.sparkPoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.lavaPoints);
    this.scene.remove(this.sparkPoints);
    this.scene.remove(this.solidifiedGroup);
    this.lavaPoints.geometry.dispose();
    (this.lavaPoints.material as THREE.Material).dispose();
    this.sparkPoints.geometry.dispose();
    (this.sparkPoints.material as THREE.Material).dispose();
    
    this.solidifiedMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }
}
