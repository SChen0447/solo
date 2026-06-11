import * as THREE from 'three';
import gsap from 'gsap';

export interface AuroraParams {
  solarWindIntensity: number;
  magneticInclination: number;
  atmosphereHeight: number;
}

export type AuroraPreset = 'burst' | 'curtain' | 'arc';

interface ParticleData {
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  amplitude: number;
  frequency: number;
  colorOffset: number;
  length: number;
  width: number;
}

interface SparkleParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class AuroraSystem {
  private scene: THREE.Scene;
  private particleCount: number;
  private maxParticles: number;
  private minParticles: number;
  private geometry: THREE.PlaneGeometry;
  private instancedMesh: THREE.InstancedMesh;
  private particleData: ParticleData[] = [];
  private dummy: THREE.Object3D;
  private color: THREE.Color;
  
  private params: AuroraParams;
  private targetInclination: number;
  private currentInclination: number;
  
  private sparkleParticles: SparkleParticle[] = [];
  private sparkleGeometry: THREE.SphereGeometry;
  private sparkleMaterial: THREE.MeshBasicMaterial;
  
  private time: number = 0;
  private performanceDegraded: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.maxParticles = 10000;
    this.minParticles = 6000;
    this.particleCount = this.minParticles;
    
    this.params = {
      solarWindIntensity: 50,
      magneticInclination: 45,
      atmosphereHeight: 200
    };
    
    this.targetInclination = 45;
    this.currentInclination = 45;
    
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    
    this.geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.instancedMesh = new THREE.InstancedMesh(this.geometry, material, this.maxParticles);
    this.instancedMesh.count = this.particleCount;
    this.instancedMesh.frustumCulled = false;
    
    this.sparkleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    this.sparkleMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });
    
    this.initParticles();
    this.scene.add(this.instancedMesh);
  }

  private initParticles(): void {
    this.particleData = [];
    
    for (let i = 0; i < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 20 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 10 + Math.random() * 30;
      
      this.particleData.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        amplitude: 1 + Math.random() * 3,
        frequency: 0.2 + Math.random() * 0.5,
        colorOffset: Math.random(),
        length: 3 + Math.random() * 5,
        width: 0.1 + Math.random() * 0.2
      });
    }
    
    this.updateParticleCount();
  }

  private updateParticleCount(): void {
    const intensityFactor = this.params.solarWindIntensity / 100;
    const effectiveMax = this.performanceDegraded ? 5000 : this.maxParticles;
    const targetCount = Math.floor(this.minParticles + (effectiveMax - this.minParticles) * intensityFactor);
    
    this.particleCount = Math.min(targetCount, this.maxParticles);
    this.instancedMesh.count = this.particleCount;
  }

  private getAuroraColor(t: number): THREE.Color {
    const colors = [
      new THREE.Color(0x00ff88),
      new THREE.Color(0x00aaff),
      new THREE.Color(0xff00aa)
    ];
    
    const scaledT = t * (colors.length - 1);
    const index = Math.floor(scaledT);
    const fract = scaledT - index;
    
    if (index >= colors.length - 1) {
      return colors[colors.length - 1];
    }
    
    const c1 = colors[index];
    const c2 = colors[index + 1];
    
    return new THREE.Color().lerpColors(c1, c2, fract);
  }

  setParams(params: Partial<AuroraParams>): void {
    if (params.solarWindIntensity !== undefined) {
      this.params.solarWindIntensity = params.solarWindIntensity;
      this.updateParticleCount();
    }
    
    if (params.magneticInclination !== undefined) {
      this.targetInclination = params.magneticInclination;
      gsap.to(this, {
        currentInclination: this.targetInclination,
        duration: 2,
        ease: 'power2.out'
      });
    }
    
    if (params.atmosphereHeight !== undefined) {
      this.params.atmosphereHeight = params.atmosphereHeight;
    }
  }

  applyPreset(preset: AuroraPreset): void {
    switch (preset) {
      case 'burst':
        gsap.to(this.params, {
          solarWindIntensity: 90,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => {
            this.updateParticleCount();
          }
        });
        this.targetInclination = 30;
        gsap.to(this, {
          currentInclination: 30,
          duration: 2,
          ease: 'power2.out'
        });
        gsap.to(this.params, {
          atmosphereHeight: 120,
          duration: 1.5,
          ease: 'power2.out'
        });
        for (let i = 0; i < this.particleData.length; i++) {
          this.particleData[i].colorOffset = 0.7 + Math.random() * 0.3;
        }
        break;
        
      case 'curtain':
        gsap.to(this.params, {
          solarWindIntensity: 60,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => {
            this.updateParticleCount();
          }
        });
        this.targetInclination = 60;
        gsap.to(this, {
          currentInclination: 60,
          duration: 2,
          ease: 'power2.out'
        });
        gsap.to(this.params, {
          atmosphereHeight: 200,
          duration: 1.5,
          ease: 'power2.out'
        });
        for (let i = 0; i < this.particleData.length; i++) {
          this.particleData[i].colorOffset = Math.random() * 0.4;
        }
        break;
        
      case 'arc':
        gsap.to(this.params, {
          solarWindIntensity: 40,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => {
            this.updateParticleCount();
          }
        });
        this.targetInclination = 75;
        gsap.to(this, {
          currentInclination: 75,
          duration: 2,
          ease: 'power2.out'
        });
        gsap.to(this.params, {
          atmosphereHeight: 280,
          duration: 1.5,
          ease: 'power2.out'
        });
        for (let i = 0; i < this.particleData.length; i++) {
          this.particleData[i].colorOffset = 0.3 + Math.random() * 0.4;
        }
        break;
    }
  }

  private spawnSparkle(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 10 + Math.random() * 20;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 5 + Math.random() * 10;
    
    const mesh = new THREE.Mesh(this.sparkleGeometry, this.sparkleMaterial.clone());
    mesh.position.set(x, y, z);
    
    const targetY = 60 + Math.random() * 30;
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (targetY - y) / 120,
      (Math.random() - 0.5) * 2
    );
    
    const sparkle: SparkleParticle = {
      mesh,
      velocity,
      life: 0,
      maxLife: 120
    };
    
    this.sparkleParticles.push(sparkle);
    this.scene.add(mesh);
  }

  private updateSparkles(deltaTime: number): void {
    for (let i = this.sparkleParticles.length - 1; i >= 0; i--) {
      const sparkle = this.sparkleParticles[i];
      sparkle.life++;
      
      sparkle.mesh.position.add(sparkle.velocity);
      
      const lifeRatio = sparkle.life / sparkle.maxLife;
      const material = sparkle.mesh.material as THREE.MeshBasicMaterial;
      
      if (lifeRatio < 0.3) {
        material.opacity = lifeRatio / 0.3;
      } else if (lifeRatio > 0.7) {
        material.opacity = (1 - lifeRatio) / 0.3;
      } else {
        material.opacity = 1;
      }
      
      const scale = 0.5 + lifeRatio * 1.5;
      sparkle.mesh.scale.setScalar(scale);
      
      if (sparkle.life >= sparkle.maxLife) {
        this.scene.remove(sparkle.mesh);
        sparkle.mesh.geometry.dispose();
        (sparkle.mesh.material as THREE.Material).dispose();
        this.sparkleParticles.splice(i, 1);
      }
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    
    const intensityFactor = this.params.solarWindIntensity / 100;
    const heightFactor = (this.params.atmosphereHeight - 80) / (400 - 80);
    const inclinationRad = (this.currentInclination * Math.PI) / 180;
    
    if (this.params.solarWindIntensity > 70 && Math.random() < 0.3) {
      this.spawnSparkle();
    }
    
    this.updateSparkles(deltaTime);
    
    for (let i = 0; i < this.particleCount; i++) {
      const data = this.particleData[i];
      
      const waveX = Math.sin(this.time * data.frequency * (1 + intensityFactor * 0.5) + data.phase) * data.amplitude * (1 + intensityFactor * 0.8);
      const waveZ = Math.cos(this.time * data.frequency * 0.7 + data.phase * 1.3) * data.amplitude * 0.5;
      
      const x = data.baseX + waveX;
      const y = data.baseY + Math.sin(this.time * 0.3 + data.phase) * 2;
      const z = data.baseZ + waveZ;
      
      const sizeFactor = 1 - heightFactor * 0.7;
      const length = data.length * sizeFactor;
      const width = data.width * sizeFactor;
      
      const alpha = 0.2 + (1 - heightFactor) * 0.7;
      const twinkle = 0.7 + Math.sin(this.time * data.speed * 2 + data.phase) * 0.3;
      const finalAlpha = alpha * twinkle * (0.5 + intensityFactor * 0.5);
      
      const colorT = (data.colorOffset + intensityFactor * 0.2 + this.time * 0.02) % 1;
      const auroraColor = this.getAuroraColor(colorT);
      
      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(width, length, 1);
      
      const tiltAngle = inclinationRad - Math.PI / 2;
      this.dummy.rotation.set(tiltAngle, 0, Math.atan2(z, x));
      
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      
      this.color.copy(auroraColor);
      this.instancedMesh.setColorAt(i, this.color);
      (this.instancedMesh.material as THREE.MeshBasicMaterial).opacity = finalAlpha;
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  getParticleCount(): number {
    return this.particleCount + this.sparkleParticles.length;
  }

  getParams(): AuroraParams {
    return { ...this.params };
  }

  setPerformanceDegraded(degraded: boolean): void {
    if (this.performanceDegraded !== degraded) {
      this.performanceDegraded = degraded;
      this.updateParticleCount();
    }
  }

  isPerformanceDegraded(): boolean {
    return this.performanceDegraded;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.instancedMesh.dispose();
    
    for (const sparkle of this.sparkleParticles) {
      sparkle.mesh.geometry.dispose();
      (sparkle.mesh.material as THREE.Material).dispose();
    }
    
    this.sparkleGeometry.dispose();
    this.sparkleMaterial.dispose();
  }
}
