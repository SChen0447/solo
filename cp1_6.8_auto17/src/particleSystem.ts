import * as THREE from 'three';

export interface ParticleParams {
  gravity: number;
  windStrength: number;
  lifetime: number;
  trailDecay: number;
}

export interface ForceField {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
  seed: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleCount: number;
  private particles: ParticleData[] = [];
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  
  private trailGeometry!: THREE.BufferGeometry;
  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;
  private trailLines!: THREE.LineSegments;
  private trailLength: number = 6;
  
  private forceFields: ForceField[] = [];
  private params: ParticleParams;
  
  private bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  private isPaused: boolean = false;
  private isResetting: boolean = false;
  private resetProgress: number = 0;
  private resetStartPositions: THREE.Vector3[] = [];
  private resetEndPositions: THREE.Vector3[] = [];
  
  private noiseTime: number = 0;
  private windDirection: THREE.Vector3 = new THREE.Vector3(1, 0.2, 0.5).normalize();
  
  private tempVec1: THREE.Vector3 = new THREE.Vector3();
  private tempVec2: THREE.Vector3 = new THREE.Vector3();
  private tempVec3: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, particleCount: number = 5000) {
    this.scene = scene;
    this.particleCount = particleCount;
    
    this.params = {
      gravity: -9.8,
      windStrength: 1.5,
      lifetime: 5.0,
      trailDecay: 0.98
    };
    
    this.bounds = {
      minX: -15, maxX: 15,
      minY: -5, maxY: 15,
      minZ: -10, maxZ: 10
    };
    
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    
    const particleTexture = this.createParticleTexture();
    
    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: particleTexture,
      sizeAttenuation: true
    });
    
    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
    
    this.initTrailSystem();
    this.initParticles();
  }

  private createParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(200, 230, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(100, 180, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(50, 100, 200, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initTrailSystem(): void {
    const trailVertexCount = this.particleCount * this.trailLength * 2;
    this.trailPositions = new Float32Array(trailVertexCount * 3);
    this.trailColors = new Float32Array(trailVertexCount * 3);
    
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    
    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.trailLines = new THREE.LineSegments(this.trailGeometry, trailMaterial);
    this.scene.add(this.trailLines);
  }

  private initParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.createParticle();
      particle.age = Math.random() * this.params.lifetime;
      this.particles.push(particle);
      
      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;
      
      this.updateParticleColor(i, particle);
      this.sizes[i] = particle.size;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private createParticle(): ParticleData {
    const x = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
    const y = this.bounds.minY + Math.random() * (this.bounds.maxY - this.bounds.minY) * 0.3;
    const z = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);
    
    return {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 0.5
      ),
      age: 0,
      lifetime: this.params.lifetime * (0.7 + Math.random() * 0.6),
      size: 0.1 + Math.random() * 0.15,
      seed: Math.random() * 1000
    };
  }

  private resetParticle(i: number): void {
    const p = this.particles[i];
    p.position.set(
      this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX),
      this.bounds.minY + Math.random() * 1,
      this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ)
    );
    p.velocity.set(
      (Math.random() - 0.5) * 0.5,
      Math.random() * 2 + 0.5,
      (Math.random() - 0.5) * 0.5
    );
    p.age = 0;
    p.lifetime = this.params.lifetime * (0.7 + Math.random() * 0.6);
    p.size = 0.1 + Math.random() * 0.15;
  }

  private updateParticleColor(index: number, particle: ParticleData): void {
    const speedSq = particle.velocity.x * particle.velocity.x + 
                    particle.velocity.y * particle.velocity.y + 
                    particle.velocity.z * particle.velocity.z;
    const speed = Math.sqrt(speedSq);
    const heightFactor = Math.max(0, Math.min(1, (particle.position.y - this.bounds.minY) / (this.bounds.maxY - this.bounds.minY)));
    const speedFactor = Math.min(1, speed / 5);
    
    const r = 0.2 + heightFactor * 0.6 + speedFactor * 0.2;
    const g = 0.4 + heightFactor * 0.5 + speedFactor * 0.1;
    const b = 0.8 + heightFactor * 0.2;
    
    this.colors[index * 3] = r;
    this.colors[index * 3 + 1] = g;
    this.colors[index * 3 + 2] = b;
  }

  private noise(x: number, y: number, z: number, t: number): number {
    return Math.sin(x * 0.5 + t) * Math.cos(y * 0.5 + t * 0.7) * 
           Math.sin(z * 0.5 + t * 0.5) * Math.cos(t * 0.3);
  }

  private getVortexForce(position: THREE.Vector3, time: number, out: THREE.Vector3): THREE.Vector3 {
    const centerX = 0;
    const centerY = 5;
    const centerZ = 0;
    
    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const dz = position.z - centerZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (dist < 0.1) {
      out.set(0, 0, 0);
      return out;
    }
    
    const strength = Math.max(0, 1 - dist / 15) * 0.5;
    
    const tangentX = -dz / dist;
    const tangentZ = dx / dist;
    
    const noiseScale = 0.3;
    const noiseVal = this.noise(
      position.x * noiseScale,
      position.y * noiseScale,
      position.z * noiseScale,
      time
    );
    
    out.set(
      tangentX * strength + noiseVal * 0.2,
      noiseVal * 0.3 + 0.2,
      tangentZ * strength + noiseVal * 0.2
    );
    return out;
  }

  addForceField(position: THREE.Vector3, strength: number, radius: number): void {
    this.forceFields.push({
      position: position.clone(),
      strength,
      radius,
      lifetime: 2.0,
      maxLifetime: 2.0
    });
  }

  update(deltaTime: number): void {
    if (this.isPaused) return;
    
    if (this.isResetting) {
      this.updateResetAnimation(deltaTime);
      return;
    }
    
    this.noiseTime += deltaTime * 0.5;
    
    for (let i = 0; i < this.forceFields.length; i++) {
      this.forceFields[i].lifetime -= deltaTime;
    }
    this.forceFields = this.forceFields.filter(ff => ff.lifetime > 0);
    
    const gravity = this.params.gravity;
    const windStrength = this.params.windStrength;
    const windDirX = this.windDirection.x;
    const windDirY = this.windDirection.y;
    const windDirZ = this.windDirection.z;
    const buoyancy = 3.5;
    const drag = 0.98;
    const maxSpeedSq = 64;
    
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      p.age += deltaTime;
      
      if (p.age >= p.lifetime) {
        this.resetParticle(i);
        continue;
      }
      
      p.velocity.y += gravity * deltaTime;
      
      const windNoise = this.noise(
        p.position.x * 0.2 + p.seed,
        p.position.y * 0.2,
        p.position.z * 0.2,
        this.noiseTime
      );
      const windMul = windStrength * (0.7 + windNoise * 0.6) * deltaTime;
      p.velocity.x += windDirX * windMul;
      p.velocity.y += windDirY * windMul;
      p.velocity.z += windDirZ * windMul;
      
      p.velocity.y += buoyancy * deltaTime;
      
      this.getVortexForce(p.position, this.noiseTime, this.tempVec1);
      p.velocity.x += this.tempVec1.x * deltaTime * 2;
      p.velocity.y += this.tempVec1.y * deltaTime * 2;
      p.velocity.z += this.tempVec1.z * deltaTime * 2;
      
      for (const ff of this.forceFields) {
        const dx = p.position.x - ff.position.x;
        const dy = p.position.y - ff.position.y;
        const dz = p.position.z - ff.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radiusSq = ff.radius * ff.radius;
        
        if (distSq < radiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const forceStrength = ff.strength * (1 - dist / ff.radius) * (ff.lifetime / ff.maxLifetime) * deltaTime;
          const invDist = 1 / dist;
          p.velocity.x += dx * invDist * forceStrength;
          p.velocity.y += dy * invDist * forceStrength;
          p.velocity.z += dz * invDist * forceStrength;
        }
      }
      
      p.velocity.x *= drag;
      p.velocity.y *= drag;
      p.velocity.z *= drag;
      
      const speedSq = p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y + p.velocity.z * p.velocity.z;
      if (speedSq > maxSpeedSq) {
        const scale = 8 / Math.sqrt(speedSq);
        p.velocity.x *= scale;
        p.velocity.y *= scale;
        p.velocity.z *= scale;
      }
      
      p.position.x += p.velocity.x * deltaTime;
      p.position.y += p.velocity.y * deltaTime;
      p.position.z += p.velocity.z * deltaTime;
      
      if (p.position.y < this.bounds.minY) {
        p.position.y = this.bounds.minY;
        p.velocity.y = Math.abs(p.velocity.y) * 0.3;
      }
      if (p.position.y > this.bounds.maxY) {
        p.age = p.lifetime;
      }
      
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      
      this.updateParticleColor(i, p);
    }
    
    this.updateTrails();
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private updateTrails(): void {
    const decay = this.params.trailDecay;
    
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const baseIdx = i * this.trailLength * 2 * 3;
      
      for (let j = this.trailLength - 1; j > 0; j--) {
        const prevIdx = baseIdx + (j - 1) * 6;
        const currIdx = baseIdx + j * 6;
        
        this.trailPositions[currIdx] = this.trailPositions[prevIdx];
        this.trailPositions[currIdx + 1] = this.trailPositions[prevIdx + 1];
        this.trailPositions[currIdx + 2] = this.trailPositions[prevIdx + 2];
        this.trailPositions[currIdx + 3] = this.trailPositions[prevIdx + 3];
        this.trailPositions[currIdx + 4] = this.trailPositions[prevIdx + 4];
        this.trailPositions[currIdx + 5] = this.trailPositions[prevIdx + 5];
      }
      
      this.trailPositions[baseIdx] = p.position.x;
      this.trailPositions[baseIdx + 1] = p.position.y;
      this.trailPositions[baseIdx + 2] = p.position.z;
      
      const nextPos = p.position.clone().addScaledVector(p.velocity, -0.02);
      this.trailPositions[baseIdx + 3] = nextPos.x;
      this.trailPositions[baseIdx + 4] = nextPos.y;
      this.trailPositions[baseIdx + 5] = nextPos.z;
      
      const alpha = 1 - (p.age / p.lifetime);
      for (let j = 0; j < this.trailLength; j++) {
        const colorIdx = baseIdx + j * 6;
        const fadeAlpha = alpha * Math.pow(decay, j) * 0.5;
        
        const r = this.colors[i * 3] * fadeAlpha;
        const g = this.colors[i * 3 + 1] * fadeAlpha;
        const b = this.colors[i * 3 + 2] * fadeAlpha;
        
        this.trailColors[colorIdx] = r;
        this.trailColors[colorIdx + 1] = g;
        this.trailColors[colorIdx + 2] = b;
        this.trailColors[colorIdx + 3] = r;
        this.trailColors[colorIdx + 4] = g;
        this.trailColors[colorIdx + 5] = b;
      }
    }
    
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  startResetAnimation(): void {
    this.isResetting = true;
    this.resetProgress = 0;
    
    this.resetStartPositions = [];
    this.resetEndPositions = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      this.resetStartPositions.push(this.particles[i].position.clone());
      
      const endPos = new THREE.Vector3(
        this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX),
        this.bounds.minY + Math.random() * 1,
        this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ)
      );
      this.resetEndPositions.push(endPos);
    }
  }

  private updateResetAnimation(deltaTime: number): void {
    this.resetProgress += deltaTime * 1.5;
    
    if (this.resetProgress >= 1) {
      this.isResetting = false;
      this.resetProgress = 1;
      
      for (let i = 0; i < this.particleCount; i++) {
        this.particles[i].position.copy(this.resetEndPositions[i]);
        this.particles[i].velocity.set(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 2 + 0.5,
          (Math.random() - 0.5) * 0.5
        );
        this.particles[i].age = 0;
        this.particles[i].lifetime = this.params.lifetime * (0.7 + Math.random() * 0.6);
        
        this.positions[i * 3] = this.particles[i].position.x;
        this.positions[i * 3 + 1] = this.particles[i].position.y;
        this.positions[i * 3 + 2] = this.particles[i].position.z;
        
        this.updateParticleColor(i, this.particles[i]);
      }
      
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
      return;
    }
    
    const t = this.easeInOutCubic(this.resetProgress);
    
    for (let i = 0; i < this.particleCount; i++) {
      const pos = new THREE.Vector3().lerpVectors(
        this.resetStartPositions[i],
        this.resetEndPositions[i],
        t
      );
      
      this.particles[i].position.copy(pos);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      
      this.updateParticleColor(i, this.particles[i]);
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  setParams(params: Partial<ParticleParams>): void {
    Object.assign(this.params, params);
  }

  getParams(): ParticleParams {
    return { ...this.params };
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.trailLines);
    this.geometry.dispose();
    this.trailGeometry.dispose();
    if (this.points.material instanceof THREE.Material) {
      this.points.material.dispose();
    }
    if (this.trailLines.material instanceof THREE.Material) {
      this.trailLines.material.dispose();
    }
  }
}
