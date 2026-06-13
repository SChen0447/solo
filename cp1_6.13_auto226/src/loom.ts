import * as THREE from 'three';
import gsap from 'gsap';
import { ParticleSystem, ParticleData } from './particles';

export interface PulseWave {
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  maxRadius: number;
  active: boolean;
  mesh: THREE.Mesh;
}

export interface TrailPoint {
  position: THREE.Vector3;
  startTime: number;
  particle: THREE.Points;
}

export interface WaveData {
  startTime: number;
  duration: number;
  amplitude: number;
  wavelength: number;
  center: THREE.Vector2;
  active: boolean;
}

export class Loom {
  public particleSystem: ParticleSystem;
  public group: THREE.Group;
  public width: number;
  public height: number;
  public pulseWaves: PulseWave[] = [];
  public trailPoints: TrailPoint[] = [];
  public waveData: WaveData | null = null;
  public scene: THREE.Scene;
  public waveAmplitude: number = 15;
  public colorShiftSpeed: number = 3;
  private readonly PARTICLE_COUNT = 3000;
  private readonly REORGANIZE_INTERVAL = 30000;
  private lastReorganizeTime: number = 0;
  private pulseWaveMaterial: THREE.ShaderMaterial;
  private trailMaterial: THREE.ShaderMaterial;

  private pulseVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private pulseFragmentShader = `
    uniform float uTime;
    uniform float uDuration;
    uniform float uMaxRadius;
    varying vec2 vUv;
    
    void main() {
      vec2 center = vUv - vec2(0.5);
      float dist = length(center) * 2.0;
      
      float progress = uTime / uDuration;
      float currentRadius = progress * uMaxRadius / (uMaxRadius * 0.5);
      
      float ring = smoothstep(currentRadius - 0.1, currentRadius, dist) * 
                   smoothstep(currentRadius + 0.1, currentRadius, dist);
      
      float alpha = (1.0 - progress) * ring * 0.8;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  `;

  private trailVertexShader = `
    attribute float aSize;
    attribute float aOpacity;
    attribute vec3 aColor;
    
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
      vColor = aColor;
      vOpacity = aOpacity;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  private trailFragmentShader = `
    varying vec3 vColor;
    varying float vOpacity;
    
    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) {
        discard;
      }
      
      float glow = 1.0 - smoothstep(0.0, 0.5, dist);
      gl_FragColor = vec4(vColor, vOpacity * glow);
    }
  `;

  constructor(scene: THREE.Scene, viewportHeight: number) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.height = viewportHeight * 0.6;
    this.width = this.height * (4 / 3);

    this.pulseWaveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDuration: { value: 0.6 },
        uMaxRadius: { value: 80 }
      },
      vertexShader: this.pulseVertexShader,
      fragmentShader: this.pulseFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: this.trailVertexShader,
      fragmentShader: this.trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new ParticleSystem(this.PARTICLE_COUNT);
    this.particleSystem.createParticles(this.width, this.height);
    this.group.add(this.particleSystem.mesh);
    this.scene.add(this.group);
  }

  public createPulseWave(position: THREE.Vector3, time: number): void {
    const geometry = new THREE.PlaneGeometry(160, 160, 32, 32);
    const material = this.pulseWaveMaterial.clone();
    material.uniforms.uTime.value = 0;
    material.uniforms.uDuration.value = 0.6;
    material.uniforms.uMaxRadius.value = 80;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.position.z = 5;
    this.scene.add(mesh);

    const pulseWave: PulseWave = {
      position: position.clone(),
      startTime: time,
      duration: 0.6,
      maxRadius: 80,
      active: true,
      mesh
    };

    this.pulseWaves.push(pulseWave);
    this.activateParticlesInRadius(position, 80, time, 50);

    gsap.to(material.uniforms.uTime, {
      value: 0.6,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        pulseWave.active = false;
        this.scene.remove(mesh);
        geometry.dispose();
        material.dispose();
      }
    });
  }

  public createTrailPoint(position: THREE.Vector3, direction: THREE.Vector2, time: number): void {
    const trailCount = 20;
    const positions = new Float32Array(trailCount * 3);
    const sizes = new Float32Array(trailCount);
    const opacities = new Float32Array(trailCount);
    const colors = new Float32Array(trailCount * 3);

    for (let i = 0; i < trailCount; i++) {
      const t = i / trailCount;
      const offset = direction.clone().multiplyScalar(-t * 30);
      
      positions[i * 3] = position.x + offset.x;
      positions[i * 3 + 1] = position.y + offset.y;
      positions[i * 3 + 2] = position.z;

      sizes[i] = 3 * (1 - t * 0.5);
      opacities[i] = 0.8 * (1 - t);

      const color1 = new THREE.Color(0x48dbfb);
      const color2 = new THREE.Color(0x54a0ff);
      const color = color1.clone().lerp(color2, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const points = new THREE.Points(geometry, this.trailMaterial);
    this.scene.add(points);

    const trailPoint: TrailPoint = {
      position: position.clone(),
      startTime: time,
      particle: points
    };

    this.trailPoints.push(trailPoint);

    this.activateParticlesAlongPath(position, direction, time);

    gsap.delayedCall(2, () => {
      this.scene.remove(points);
      geometry.dispose();
      const index = this.trailPoints.indexOf(trailPoint);
      if (index > -1) {
        this.trailPoints.splice(index, 1);
      }
    });
  }

  private activateParticlesAlongPath(position: THREE.Vector3, direction: THREE.Vector2, time: number): void {
    const dirNormalized = direction.clone().normalize();
    const perpDir = new THREE.Vector2(-dirNormalized.y, dirNormalized.x);

    for (const p of this.particleSystem.particles) {
      if (p.isActivated) continue;

      const particlePos = new THREE.Vector2(p.basePosition.x, p.basePosition.y);
      const clickPos = new THREE.Vector2(position.x, position.y);
      
      const toParticle = particlePos.clone().sub(clickPos);
      const alongDir = toParticle.dot(dirNormalized);
      const perpDist = Math.abs(toParticle.dot(perpDir));

      if (alongDir > -30 && alongDir < 30 && perpDist < 20) {
        this.particleSystem.activateParticle(p, time);
        this.particleSystem.addDrift(p, dirNormalized, time);
      }
    }
  }

  private activateParticlesInRadius(position: THREE.Vector3, radius: number, time: number, maxCount: number): void {
    const particlesInRadius: { particle: ParticleData; distance: number }[] = [];

    for (const p of this.particleSystem.particles) {
      const distance = p.basePosition.distanceTo(position);
      if (distance < radius) {
        particlesInRadius.push({ particle: p, distance });
      }
    }

    particlesInRadius.sort((a, b) => a.distance - b.distance);
    const count = Math.min(maxCount, particlesInRadius.length);

    for (let i = 0; i < count; i++) {
      this.particleSystem.activateParticle(particlesInRadius[i].particle, time);
    }
  }

  public startGlobalReorganize(time: number): void {
    if (this.waveData?.active) return;

    this.waveData = {
      startTime: time,
      duration: 2,
      amplitude: this.waveAmplitude,
      wavelength: 200,
      center: new THREE.Vector2(0, 0),
      active: true
    };

    for (const p of this.particleSystem.particles) {
      const originalOpacity = p.baseOpacity;
      p.baseOpacity = 0.3;
      
      gsap.to(p, {
        baseOpacity: originalOpacity,
        duration: 0.5,
        delay: 0.5,
        ease: 'power2.inOut'
      });
    }

    this.particleSystem.shiftAllColors(60);

    gsap.delayedCall(2, () => {
      if (this.waveData) {
        this.waveData.active = false;
        this.particleSystem.randomizePositions(this.width, this.height);
      }
    });
  }

  public update(time: number, delta: number, viewAngle: { theta: number; phi: number }): void {
    if (time - this.lastReorganizeTime > this.REORGANIZE_INTERVAL / 1000) {
      this.startGlobalReorganize(time);
      this.lastReorganizeTime = time;
    }

    if (this.waveData?.active) {
      const progress = (time - this.waveData.startTime) / this.waveData.duration;
      const wavePhase = progress * Math.PI * 2;

      for (const p of this.particleSystem.particles) {
        const dx = p.basePosition.x - this.waveData.center.x;
        const dy = p.basePosition.y - this.waveData.center.y;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);

        const waveOffset = this.waveData.amplitude * 
          Math.sin((distFromCenter / this.waveData.wavelength) * Math.PI * 2 - wavePhase * 2) *
          Math.sin(progress * Math.PI);

        const angle = Math.atan2(dy, dx);
        const waveX = Math.cos(angle) * waveOffset * 0.5;
        const waveY = Math.sin(angle) * waveOffset * 0.5;

        p.targetPosition.x = p.basePosition.x + waveX;
        p.targetPosition.y = p.basePosition.y + waveY;
        
        p.currentPosition.x += (p.targetPosition.x - p.currentPosition.x) * 0.1;
        p.currentPosition.y += (p.targetPosition.y - p.currentPosition.y) * 0.1;
      }
    }

    this.particleSystem.update(time, delta, viewAngle);

    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      if (!this.pulseWaves[i].active) {
        this.pulseWaves.splice(i, 1);
      }
    }
  }

  public resize(viewportHeight: number): void {
    this.height = viewportHeight * 0.6;
    this.width = this.height * (4 / 3);
  }

  public setWaveAmplitude(amplitude: number): void {
    this.waveAmplitude = amplitude;
  }

  public setColorShiftSpeed(speed: number): void {
    this.colorShiftSpeed = speed;
  }

  public getDominantColor(): THREE.Color {
    const colorCounts = new Map<number, number>();
    for (const p of this.particleSystem.particles) {
      const hex = p.baseColor.getHex();
      colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
    }
    
    let maxCount = 0;
    let dominantHex = 0x6c63ff;
    for (const [hex, count] of colorCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantHex = hex;
      }
    }
    
    return new THREE.Color(dominantHex);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.pulseWaveMaterial.dispose();
    this.trailMaterial.dispose();
    
    for (const wave of this.pulseWaves) {
      this.scene.remove(wave.mesh);
      wave.mesh.geometry.dispose();
      (wave.mesh.material as THREE.Material).dispose();
    }
    
    for (const trail of this.trailPoints) {
      this.scene.remove(trail.particle);
      trail.particle.geometry.dispose();
    }
  }
}
