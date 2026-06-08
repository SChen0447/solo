import * as THREE from 'three';
import type { ParticleConfig, ComboEffect } from './SkillManager';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

interface EffectInstance {
  id: string;
  particles: Particle[];
  particleGeometry: THREE.BufferGeometry;
  particleMaterial: THREE.PointsMaterial;
  points: THREE.Points;
  glowMesh?: THREE.Mesh;
  trailMeshes: THREE.Mesh[];
  startTime: number;
  duration: number;
  emissionAccumulator: number;
  particlesPerSecond: number;
  maxParticles: number;
  fadingOut: boolean;
  fadeStartTime: number;
  opacity: number;
  config: ParticleConfig | null;
  comboData: ComboEffect | null;
}

export type EffectStatusCallback = (activeParticles: number, totalParticles: number) => void;

export class EffectRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private effects: EffectInstance[] = [];
  private speedMultiplier: number = 1.0;
  private statusCallback: EffectStatusCallback | null = null;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 300;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  setSpeedMultiplier(speed: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, speed));
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  setStatusCallback(callback: EffectStatusCallback): void {
    this.statusCallback = callback;
  }

  playSkillEffect(config: ParticleConfig, duration: number): void {
    this.startTransition(() => {
      this.clearAllEffects();
      this.createEffectFromConfig(config, duration);
    });
  }

  playComboEffect(combo: ComboEffect, configs: ParticleConfig[]): void {
    this.startTransition(() => {
      this.clearAllEffects();
      this.createComboEffect(combo, configs);
    });
  }

  private startTransition(onComplete: () => void): void {
    if (this.effects.length === 0) {
      onComplete();
      return;
    }

    this.isTransitioning = true;
    
    this.effects.forEach(effect => {
      effect.fadingOut = true;
      effect.fadeStartTime = performance.now();
    });

    setTimeout(() => {
      this.clearAllEffects();
      this.isTransitioning = false;
      onComplete();
    }, this.transitionDuration);
  }

  private createEffectFromConfig(config: ParticleConfig, duration: number): EffectInstance {
    const effectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const maxParticles = Math.min(config.particleCount, 800);
    const particles: Particle[] = [];
    
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: config.size,
        color: new THREE.Color(config.color),
        active: false
      });
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxParticles * 3);
    const colors = new Float32Array(maxParticles * 3);
    const sizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3 + 1] = -100;
      sizes[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: config.size * 2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: config.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    let glowMesh: THREE.Mesh | undefined;
    if (config.glow) {
      const glowGeometry = new THREE.SphereGeometry(0.8, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });
      glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.y = 0.5;
      this.scene.add(glowMesh);
    }

    const trailMeshes: THREE.Mesh[] = [];
    
    if (config.trail) {
      const trailCount = 6;
      for (let i = 0; i < trailCount; i++) {
        const angle = (i / trailCount) * Math.PI * 2;
        const trailGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const trailMaterial = new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending
        });
        const trailMesh = new THREE.Mesh(trailGeometry, trailMaterial);
        trailMesh.position.set(
          Math.cos(angle) * 0.5,
          0.5,
          Math.sin(angle) * 0.5
        );
        this.scene.add(trailMesh);
        trailMeshes.push(trailMesh);
      }
    }

    const particlesPerSecond = config.emissionRate * 3;

    const effect: EffectInstance = {
      id: effectId,
      particles,
      particleGeometry: geometry,
      particleMaterial: material,
      points,
      glowMesh,
      trailMeshes,
      startTime: performance.now(),
      duration,
      emissionAccumulator: 0,
      particlesPerSecond,
      maxParticles,
      fadingOut: false,
      fadeStartTime: 0,
      opacity: 1,
      config,
      comboData: null
    };

    this.effects.push(effect);
    
    this.burstParticles(effect, Math.floor(maxParticles * 0.3));
    
    return effect;
  }

  private burstParticles(effect: EffectInstance, count: number): void {
    if (!effect.config) return;
    
    let emitted = 0;
    for (let i = 0; i < effect.particles.length && emitted < count; i++) {
      if (!effect.particles[i].active) {
        this.initParticle(effect.particles[i], effect.config);
        emitted++;
      }
    }
  }

  private initParticle(particle: Particle, config: ParticleConfig): void {
    particle.active = true;
    particle.life = config.lifetime * (0.7 + Math.random() * 0.6);
    particle.maxLife = particle.life;
    particle.size = config.size * (0.6 + Math.random() * 0.8);

    const startColor = new THREE.Color(config.color);
    const endColor = new THREE.Color(config.colorEnd);
    particle.color.copy(startColor);
    particle.color.lerp(endColor, Math.random() * 0.3);

    particle.position.set(0, 0.5, 0);

    switch (config.shape) {
      case 'sphere':
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = Math.random() * config.spread * 0.5;
        particle.position.x += radius * Math.sin(phi) * Math.cos(theta);
        particle.position.y += radius * Math.sin(phi) * Math.sin(theta);
        particle.position.z += radius * Math.cos(phi);
        particle.velocity.set(
          (Math.random() - 0.5) * config.speed * 0.5,
          Math.random() * config.speed * 0.5,
          (Math.random() - 0.5) * config.speed * 0.5
        );
        break;

      case 'cone':
        const coneAngle = Math.random() * Math.PI * 2;
        const coneRadius = Math.random() * config.spread * 0.3;
        particle.position.x += Math.cos(coneAngle) * coneRadius;
        particle.position.z += Math.sin(coneAngle) * coneRadius;
        particle.velocity.set(
          (Math.random() - 0.5) * config.speed * 0.4,
          config.speed * (0.7 + Math.random() * 0.6),
          (Math.random() - 0.5) * config.speed * 0.4
        );
        break;

      case 'ring':
        const ringAngle = Math.random() * Math.PI * 2;
        const ringRadius = config.spread * (0.6 + Math.random() * 0.4);
        particle.position.x += Math.cos(ringAngle) * ringRadius;
        particle.position.z += Math.sin(ringAngle) * ringRadius;
        particle.position.y += (Math.random() - 0.5) * 0.3;
        particle.velocity.set(
          -Math.sin(ringAngle) * config.speed * 0.4,
          (Math.random() - 0.5) * config.speed * 0.3,
          Math.cos(ringAngle) * config.speed * 0.4
        );
        break;

      case 'burst':
        const burstTheta = Math.random() * Math.PI * 2;
        const burstPhi = Math.acos(2 * Math.random() - 1);
        const speed = config.speed * (0.7 + Math.random() * 0.6);
        particle.velocity.set(
          Math.sin(burstPhi) * Math.cos(burstTheta) * speed,
          Math.sin(burstPhi) * Math.sin(burstTheta) * speed * 0.8 + 0.5,
          Math.cos(burstPhi) * speed
        );
        break;

      default:
        particle.velocity.set(
          (Math.random() - 0.5) * config.speed,
          Math.random() * config.speed * 0.5,
          (Math.random() - 0.5) * config.speed
        );
    }
  }

  private createComboEffect(combo: ComboEffect, configs: ParticleConfig[]): void {
    const totalMaxParticles = Math.min(combo.particleCount, 1500);
    const particlesPerSkill = Math.floor(totalMaxParticles / configs.length);

    configs.forEach((config, index) => {
      const adjustedConfig = { ...config, particleCount: particlesPerSkill };
      const offsetAngle = (index / configs.length) * Math.PI * 2;
      const offsetRadius = 0.8;
      
      const effect = this.createEffectFromConfig(adjustedConfig, combo.duration);
      effect.comboData = combo;
      
      effect.points.position.x = Math.cos(offsetAngle) * offsetRadius;
      effect.points.position.z = Math.sin(offsetAngle) * offsetRadius;

      if (effect.glowMesh) {
        effect.glowMesh.position.x = Math.cos(offsetAngle) * offsetRadius;
        effect.glowMesh.position.z = Math.sin(offsetAngle) * offsetRadius;
      }
    });

    this.createComboCore(combo);
  }

  private createComboCore(combo: ComboEffect): void {
    const coreGeometry = new THREE.IcosahedronGeometry(0.6, 1);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: combo.primaryColor,
      transparent: true,
      opacity: 0.8,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreMesh.position.y = 0.8;
    this.scene.add(coreMesh);

    const innerGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: combo.secondaryColor,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    innerMesh.position.y = 0.8;
    this.scene.add(innerMesh);

    const orbitRingGeometry = new THREE.TorusGeometry(1, 0.03, 8, 64);
    const orbitRingMaterial = new THREE.MeshBasicMaterial({
      color: combo.primaryColor,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const orbitRing = new THREE.Mesh(orbitRingGeometry, orbitRingMaterial);
    orbitRing.rotation.x = Math.PI / 3;
    orbitRing.position.y = 0.8;
    this.scene.add(orbitRing);

    const comboEffect: EffectInstance = {
      id: `combo_core_${Date.now()}`,
      particles: [],
      particleGeometry: new THREE.BufferGeometry(),
      particleMaterial: new THREE.PointsMaterial(),
      points: new THREE.Points(),
      glowMesh: innerMesh,
      trailMeshes: [coreMesh, orbitRing],
      startTime: performance.now(),
      duration: combo.duration,
      emissionAccumulator: 0,
      particlesPerSecond: 0,
      maxParticles: 0,
      fadingOut: false,
      fadeStartTime: 0,
      opacity: 1,
      config: null,
      comboData: combo
    };

    this.effects.push(comboEffect);
  }

  update(deltaTime: number): void {
    const dt = deltaTime * this.speedMultiplier;
    let totalActiveParticles = 0;
    let totalParticles = 0;

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      totalParticles += effect.maxParticles;

      const elapsed = performance.now() - effect.startTime;
      const isExpired = elapsed > effect.duration;

      if (effect.fadingOut || isExpired) {
        const fadeElapsed = effect.fadingOut 
          ? performance.now() - effect.fadeStartTime 
          : elapsed - effect.duration;
        const fadeProgress = Math.min(fadeElapsed / this.transitionDuration, 1);
        effect.opacity = 1 - fadeProgress;

        if (fadeProgress >= 1) {
          this.removeEffect(effect);
          this.effects.splice(i, 1);
          continue;
        }
      }

      if (effect.particles.length > 0 && effect.config) {
        this.emitParticles(effect, dt);
        this.updateParticles(effect, dt);
        totalActiveParticles += effect.particles.filter(p => p.active).length;
      }

      this.updateTrails(effect, dt);
      this.updateGlow(effect, dt);
    }

    if (this.statusCallback) {
      this.statusCallback(totalActiveParticles, totalParticles);
    }
  }

  private emitParticles(effect: EffectInstance, dt: number): void {
    if (!effect.config) return;
    
    effect.emissionAccumulator += effect.particlesPerSecond * dt;
    
    while (effect.emissionAccumulator >= 1) {
      effect.emissionAccumulator -= 1;
      
      let emitted = false;
      for (let i = 0; i < effect.particles.length; i++) {
        if (!effect.particles[i].active) {
          this.initParticle(effect.particles[i], effect.config);
          emitted = true;
          break;
        }
      }
      
      if (!emitted) break;
    }
  }

  private updateParticles(effect: EffectInstance, dt: number): void {
    const positions = effect.particleGeometry.attributes.position.array as Float32Array;
    const colors = effect.particleGeometry.attributes.color.array as Float32Array;
    const sizes = effect.particleGeometry.attributes.size.array as Float32Array;

    effect.particles.forEach((particle, i) => {
      if (!particle.active) {
        positions[i * 3 + 1] = -100;
        sizes[i] = 0;
        return;
      }

      particle.life -= dt;

      if (particle.life <= 0) {
        particle.active = false;
        positions[i * 3 + 1] = -100;
        sizes[i] = 0;
        return;
      }

      if (effect.config) {
        particle.velocity.y += effect.config.gravity * dt;
      }

      particle.position.add(particle.velocity.clone().multiplyScalar(dt));

      const lifeRatio = particle.life / particle.maxLife;
      
      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      const alpha = lifeRatio * effect.opacity;
      colors[i * 3] = particle.color.r * alpha;
      colors[i * 3 + 1] = particle.color.g * alpha;
      colors[i * 3 + 2] = particle.color.b * alpha;

      sizes[i] = particle.size * lifeRatio * 2;
    });

    effect.particleGeometry.attributes.position.needsUpdate = true;
    effect.particleGeometry.attributes.color.needsUpdate = true;
    effect.particleGeometry.attributes.size.needsUpdate = true;
    effect.particleMaterial.opacity = effect.opacity;
  }

  private updateTrails(effect: EffectInstance, dt: number): void {
    if (effect.trailMeshes.length === 0) return;

    const time = performance.now() * 0.001;

    effect.trailMeshes.forEach((mesh, index) => {
      if (effect.comboData && effect.config === null) {
        if (index === 0) {
          mesh.rotation.x += dt * 0.8;
          mesh.rotation.y += dt * 1.2;
          const scale = 1 + Math.sin(time * 2) * 0.15;
          mesh.scale.set(scale, scale, scale);
        } else if (index === 1) {
          mesh.rotation.z += dt * 0.5;
          mesh.rotation.x = Math.PI / 3 + Math.sin(time) * 0.2;
        }
        (mesh.material as THREE.MeshBasicMaterial).opacity = effect.opacity * 0.7;
      } else if (effect.config && effect.config.trail) {
        const angle = time * 1.5 + (index / effect.trailMeshes.length) * Math.PI * 2;
        const radius = 0.6 + Math.sin(time * 2 + index) * 0.25;
        mesh.position.x = Math.cos(angle) * radius + effect.points.position.x;
        mesh.position.y = 0.5 + Math.sin(time * 1.2 + index * 0.8) * 0.4;
        mesh.position.z = Math.sin(angle) * radius + effect.points.position.z;
        
        const scale = 0.8 + Math.sin(time * 3 + index) * 0.3;
        mesh.scale.set(scale, scale, scale);
        
        (mesh.material as THREE.MeshBasicMaterial).opacity = effect.opacity * 0.6;
      }
    });
  }

  private updateGlow(effect: EffectInstance, dt: number): void {
    if (!effect.glowMesh) return;

    const time = performance.now() * 0.001;
    const pulseScale = 1 + Math.sin(time * 3) * 0.2;
    
    effect.glowMesh.scale.set(pulseScale, pulseScale, pulseScale);
    (effect.glowMesh.material as THREE.MeshBasicMaterial).opacity = effect.opacity * 0.5;

    if (effect.comboData && effect.config === null) {
      effect.glowMesh.rotation.y += dt * 0.5;
    }
  }

  private removeEffect(effect: EffectInstance): void {
    if (effect.points) {
      this.scene.remove(effect.points);
      effect.particleGeometry.dispose();
      effect.particleMaterial.dispose();
    }

    if (effect.glowMesh) {
      this.scene.remove(effect.glowMesh);
      (effect.glowMesh.geometry as THREE.BufferGeometry).dispose();
      (effect.glowMesh.material as THREE.Material).dispose();
    }

    effect.trailMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }

  clearAllEffects(): void {
    while (this.effects.length > 0) {
      const effect = this.effects.pop()!;
      this.removeEffect(effect);
    }
  }

  resetView(): void {
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);
  }

  getActiveParticleCount(): number {
    return this.effects.reduce((sum, effect) => 
      sum + effect.particles.filter(p => p.active).length, 0);
  }

  dispose(): void {
    this.clearAllEffects();
  }
}
