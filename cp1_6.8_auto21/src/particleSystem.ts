import * as THREE from 'three';
import type { FrequencyData, ParticleStyle } from './audioAnalyzer';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  baseSize: number;
  color: THREE.Color;
  targetColor: THREE.Color;
  turbulenceOffset: THREE.Vector2;
}

interface StyleConfig {
  baseColor: THREE.Color;
  bassColor: THREE.Color;
  midColor: THREE.Color;
  highColor: THREE.Color;
  sizeMultiplier: number;
  opacity: number;
  glowIntensity: number;
}

const STYLE_CONFIGS: Record<ParticleStyle, StyleConfig> = {
  fire: {
    baseColor: new THREE.Color(0xff4400),
    bassColor: new THREE.Color(0xff0000),
    midColor: new THREE.Color(0xffaa00),
    highColor: new THREE.Color(0xffff66),
    sizeMultiplier: 1.2,
    opacity: 0.9,
    glowIntensity: 1.5
  },
  ice: {
    baseColor: new THREE.Color(0x00ccff),
    bassColor: new THREE.Color(0x0066ff),
    midColor: new THREE.Color(0x66ffff),
    highColor: new THREE.Color(0xffffff),
    sizeMultiplier: 0.9,
    opacity: 0.6,
    glowIntensity: 0.8
  },
  star: {
    baseColor: new THREE.Color(0xffffff),
    bassColor: new THREE.Color(0x6666ff),
    midColor: new THREE.Color(0xaaccff),
    highColor: new THREE.Color(0xffffff),
    sizeMultiplier: 0.7,
    opacity: 0.95,
    glowIntensity: 1.2
  }
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private particleCount: number;
  private currentStyle: ParticleStyle = 'fire';
  private targetStyle: ParticleStyle = 'fire';
  private styleTransitionProgress = 1;
  private styleTransitionDuration = 1;
  private gravity = -25;
  private emissionRadius = 3;
  private turbulenceStrength = 2;
  private time = 0;

  constructor(count: number = 2000) {
    this.particleCount = count;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.initParticles();
  }

  private initParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    const config = STYLE_CONFIGS[this.currentStyle];

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.createParticle(config);
      this.particles.push(particle);

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      sizes[i] = particle.size;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private createParticle(config: StyleConfig): Particle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.emissionRadius * 0.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const spreadAngle = (Math.random() - 0.5) * 0.6;
    const spreadAngle2 = (Math.random() - 0.5) * 0.6;
    const speed = 8 + Math.random() * 6;

    const velocity = new THREE.Vector3(
      Math.sin(spreadAngle) * speed * 0.3,
      speed,
      Math.sin(spreadAngle2) * speed * 0.3
    );

    const maxLife = 1.5 + Math.random() * 2;

    return {
      position: new THREE.Vector3(x, 0.1, z),
      velocity,
      life: Math.random() * maxLife,
      maxLife,
      size: (0.05 + Math.random() * 0.1) * config.sizeMultiplier,
      baseSize: (0.05 + Math.random() * 0.1) * config.sizeMultiplier,
      color: config.baseColor.clone(),
      targetColor: config.baseColor.clone(),
      turbulenceOffset: new THREE.Vector2(
        Math.random() * 1000,
        Math.random() * 1000
      )
    };
  }

  update(deltaTime: number, freqData: FrequencyData): void {
    this.time += deltaTime;

    if (this.currentStyle !== this.targetStyle) {
      this.styleTransitionProgress += deltaTime / this.styleTransitionDuration;
      if (this.styleTransitionProgress >= 1) {
        this.styleTransitionProgress = 1;
        this.currentStyle = this.targetStyle;
      }
    }

    const currentConfig = STYLE_CONFIGS[this.currentStyle];
    const targetConfig = STYLE_CONFIGS[this.targetStyle];
    const t = this.styleTransitionProgress;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;

    const bassColor = currentConfig.bassColor.clone().lerp(targetConfig.bassColor, t);
    const midColor = currentConfig.midColor.clone().lerp(targetConfig.midColor, t);
    const highColor = currentConfig.highColor.clone().lerp(targetConfig.highColor, t);
    const sizeMult = currentConfig.sizeMultiplier * (1 - t) + targetConfig.sizeMultiplier * t;
    const opacity = currentConfig.opacity * (1 - t) + targetConfig.opacity * t;
    const glowIntensity = currentConfig.glowIntensity * (1 - t) + targetConfig.glowIntensity * t;

    this.material.opacity = opacity;

    const emissionBoost = 1 + freqData.bass * 3;

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.resetParticle(particle, freqData);
      }

      const turbulenceX = Math.sin(this.time * 2 + particle.turbulenceOffset.x) * this.turbulenceStrength;
      const turbulenceZ = Math.cos(this.time * 1.5 + particle.turbulenceOffset.y) * this.turbulenceStrength;

      particle.velocity.x += turbulenceX * deltaTime * freqData.mid;
      particle.velocity.z += turbulenceZ * deltaTime * freqData.mid;
      particle.velocity.y += this.gravity * deltaTime;

      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      const lifeRatio = particle.life / particle.maxLife;
      
      let targetColor = new THREE.Color();
      if (freqData.bass > freqData.mid && freqData.bass > freqData.high) {
        targetColor.copy(bassColor);
      } else if (freqData.mid > freqData.high) {
        targetColor.copy(midColor);
      } else {
        targetColor.copy(highColor);
      }

      if (this.currentStyle === 'star') {
        const twinkle = 0.5 + Math.sin(this.time * 10 + particle.turbulenceOffset.x) * 0.5;
        targetColor.multiplyScalar(0.5 + twinkle * 0.5);
      }

      particle.color.lerp(targetColor, deltaTime * 5);

      const sizeAmplitude = 1 + freqData.overall * 2 * glowIntensity;
      const lifeSize = lifeRatio < 0.3 ? lifeRatio / 0.3 : 1;
      particle.size = particle.baseSize * sizeMult * sizeAmplitude * lifeSize * emissionBoost;

      positions[i * 3] = particle.position.x;
      positions[i * 3 + 1] = particle.position.y;
      positions[i * 3 + 2] = particle.position.z;

      colors[i * 3] = particle.color.r;
      colors[i * 3 + 1] = particle.color.g;
      colors[i * 3 + 2] = particle.color.b;

      sizes[i] = particle.size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  private resetParticle(particle: Particle, freqData: FrequencyData): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.emissionRadius;
    particle.position.set(
      Math.cos(angle) * radius,
      0.1,
      Math.sin(angle) * radius
    );

    const spreadAngle = (Math.random() - 0.5) * (0.4 + freqData.bass * 0.4);
    const spreadAngle2 = (Math.random() - 0.5) * (0.4 + freqData.bass * 0.4);
    const speed = (6 + freqData.overall * 8) * (1 + Math.random() * 0.3);

    particle.velocity.set(
      Math.sin(spreadAngle) * speed * 0.4,
      speed,
      Math.sin(spreadAngle2) * speed * 0.4
    );

    particle.life = particle.maxLife;
    particle.turbulenceOffset.set(
      Math.random() * 1000,
      Math.random() * 1000
    );
  }

  setStyle(style: ParticleStyle): void {
    if (this.targetStyle !== style) {
      this.targetStyle = style;
      this.styleTransitionProgress = 0;
    }
  }

  getPoints(): THREE.Points {
    return this.points;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  setParticleCount(count: number): void {
    this.particleCount = count;
    this.particles = [];
    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.initParticles();
    this.points.geometry = this.geometry;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
