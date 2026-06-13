import * as THREE from 'three';
import { FlameConfig, ColorMode, ColorGradient, DEFAULT_FLAME_CONFIG, COLOR_MODES, COLOR_MODE_ORDER } from './config';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  size: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  trail: THREE.Vector3[];
}

export class FlameSystem {
  private scene: THREE.Scene;
  private config: FlameConfig;
  private particles: ParticleData[] = [];
  private particleSystem!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private heatWaveMesh!: THREE.Mesh;
  
  private currentHeight: number = 1;
  private currentIntensity: number = 0.5;
  private currentColorMode: ColorMode = 'default';
  private targetColorMode: ColorMode = 'default';
  private colorTransitionProgress: number = 1;
  private colorTransitionTime: number = 1.5;
  
  private isBursting: boolean = false;
  private burstProgress: number = 0;
  private burstDuration: number = 2;
  
  private time: number = 0;
  private activeParticleCount: number;
  
  private tmpColor1 = new THREE.Color();
  private tmpColor2 = new THREE.Color();
  private tmpVector = new THREE.Vector3();
  private tmpVector2 = new THREE.Vector3();

  constructor(scene: THREE.Scene, config: Partial<FlameConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_FLAME_CONFIG, ...config };
    this.activeParticleCount = this.config.particleCount;
    this.init();
  }

  private init(): void {
    this.createHeatWave();
    this.createParticles();
    this.createParticleSystem();
  }

  private createHeatWave(): void {
    const geometry = new THREE.CircleGeometry(this.config.coneRadius * 1.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    this.heatWaveMesh = new THREE.Mesh(geometry, material);
    this.heatWaveMesh.rotation.x = -Math.PI / 2;
    this.heatWaveMesh.position.y = 0.1;
    this.scene.add(this.heatWaveMesh);
  }

  private createParticles(): void {
    for (let i = 0; i < this.config.maxParticleCount; i++) {
      const particle = this.createSingleParticle();
      this.particles.push(particle);
    }
  }

  private createSingleParticle(): ParticleData {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.coneRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = Math.random() * 0.5;

    const position = new THREE.Vector3(x, y, z);
    const maxLife = 1.5 + Math.random() * 1.5;

    return {
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        this.config.physics.upwardForce * (0.8 + Math.random() * 0.4),
        (Math.random() - 0.5) * 0.5
      ),
      basePosition: position.clone(),
      size: this.config.particleSizeRange[0] + Math.random() * (this.config.particleSizeRange[1] - this.config.particleSizeRange[0]),
      life: Math.random() * maxLife,
      maxLife,
      colorIndex: Math.random(),
      trail: []
    };
  }

  private resetParticle(particle: ParticleData): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.config.coneRadius;
    particle.basePosition.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    particle.position.copy(particle.basePosition);
    particle.position.y = Math.random() * 0.3;
    particle.velocity.set(
      (Math.random() - 0.5) * 0.5,
      this.config.physics.upwardForce * (0.8 + Math.random() * 0.4),
      (Math.random() - 0.5) * 0.5
    );
    particle.life = 0;
    particle.maxLife = 1.5 + Math.random() * 1.5;
    particle.colorIndex = Math.random();
    particle.trail = [];
  }

  private createParticleSystem(): void {
    const vertexCount = this.config.maxParticleCount;
    
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(vertexCount * 3);
    this.colors = new Float32Array(vertexCount * 3);
    this.sizes = new Float32Array(vertexCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleSystem = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particleSystem);
  }

  private interpolateColor(t: number, gradient: ColorGradient): THREE.Color {
    if (t < 0.25) {
      const localT = t / 0.25;
      return this.tmpColor1.copy(gradient.base).lerp(gradient.outer, localT);
    } else if (t < 0.5) {
      const localT = (t - 0.25) / 0.25;
      return this.tmpColor1.copy(gradient.outer).lerp(gradient.mid, localT);
    } else if (t < 0.75) {
      const localT = (t - 0.5) / 0.25;
      return this.tmpColor1.copy(gradient.mid).lerp(gradient.inner, localT);
    } else {
      return this.tmpColor1.copy(gradient.inner);
    }
  }

  private getColorForParticle(heightRatio: number, colorIndex: number): THREE.Color {
    const currentGradient = COLOR_MODES[this.currentColorMode].gradient;
    const targetGradient = COLOR_MODES[this.targetColorMode].gradient;

    const t = heightRatio * 0.7 + colorIndex * 0.3;
    
    if (this.colorTransitionProgress >= 1) {
      return this.interpolateColor(t, currentGradient);
    }

    const currentColor = this.interpolateColor(t, currentGradient);
    const targetColor = this.interpolateColor(t, targetGradient);
    
    return this.tmpColor2.copy(currentColor).lerp(targetColor, this.colorTransitionProgress);
  }

  setHeight(normalized: number): void {
    this.currentHeight = Math.max(0.3, Math.min(1, normalized));
  }

  setIntensity(normalized: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, normalized));
    const targetCount = Math.round(
      this.config.minParticleCount + 
      (this.config.maxParticleCount - this.config.minParticleCount) * normalized
    );
    this.activeParticleCount = targetCount;
  }

  setColorMode(mode: ColorMode, transitionTime: number = 1.5): void {
    if (mode === this.targetColorMode) return;
    this.currentColorMode = this.targetColorMode;
    this.targetColorMode = mode;
    this.colorTransitionProgress = 0;
    this.colorTransitionTime = transitionTime;
  }

  triggerBurst(duration: number = 2): void {
    if (this.isBursting) return;
    this.isBursting = true;
    this.burstProgress = 0;
    this.burstDuration = duration;
  }

  getCurrentColorMode(): ColorMode {
    return this.targetColorMode;
  }

  getCurrentHeight(): number {
    return this.currentHeight;
  }

  getCurrentIntensity(): number {
    return this.currentIntensity;
  }

  getMainColor(): THREE.Color {
    return COLOR_MODES[this.targetColorMode].gradient.mid;
  }

  update(deltaTime: number, cameraDirection: THREE.Vector3): void {
    this.time += deltaTime;

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + deltaTime / this.colorTransitionTime);
      if (this.colorTransitionProgress >= 1) {
        this.currentColorMode = this.targetColorMode;
      }
    }

    if (this.isBursting) {
      this.burstProgress += deltaTime / this.burstDuration;
      if (this.burstProgress >= 1) {
        this.isBursting = false;
        this.burstProgress = 0;
      }
    }

    const maxHeight = this.config.baseHeight * this.currentHeight;
    const intensity = this.currentIntensity;

    for (let i = 0; i < this.config.maxParticleCount; i++) {
      const particle = this.particles[i];
      const isActive = i < this.activeParticleCount;

      if (!isActive) {
        this.sizes[i] = 0;
        continue;
      }

      particle.life += deltaTime;

      if (particle.life >= particle.maxLife) {
        this.resetParticle(particle);
      }

      const lifeRatio = particle.life / particle.maxLife;
      const heightRatio = particle.position.y / maxHeight;

      const windX = Math.sin(this.time * 2 + particle.basePosition.x * 3) * this.config.physics.windStrength;
      const windZ = Math.cos(this.time * 2 + particle.basePosition.z * 3) * this.config.physics.windStrength;
      const turbulence = (Math.sin(this.time * 5 + i * 0.1) * this.config.physics.turbulence) * deltaTime;

      particle.velocity.x += windX * deltaTime + turbulence * 0.5;
      particle.velocity.z += windZ * deltaTime + turbulence * 0.5;

      this.tmpVector.copy(particle.position);
      this.tmpVector.y = 0;
      const distFromCenter = this.tmpVector.length();
      if (distFromCenter > 0.1) {
        const attractionForce = this.config.physics.attraction * (1 - heightRatio);
        this.tmpVector.normalize().multiplyScalar(-attractionForce * deltaTime);
        particle.velocity.x += this.tmpVector.x;
        particle.velocity.z += this.tmpVector.z;
      }

      let burstForce = 0;
      let burstDirection = new THREE.Vector3();
      if (this.isBursting) {
        const burstPhase = this.burstProgress < 0.5 ? this.burstProgress * 2 : 2 - this.burstProgress * 2;
        burstForce = burstPhase * 8;
        burstDirection.copy(particle.position).normalize();
      }

      particle.position.x += (particle.velocity.x + burstDirection.x * burstForce) * deltaTime * intensity;
      particle.position.y += (particle.velocity.y * this.currentHeight + burstDirection.y * burstForce) * deltaTime * intensity;
      particle.position.z += (particle.velocity.z + burstDirection.z * burstForce) * deltaTime * intensity;

      const heatOffset = Math.sin(this.time * 8 + particle.position.y * 4) * 0.05 * (1 - heightRatio);
      particle.position.x += heatOffset;
      particle.position.z += heatOffset * 0.5;

      const trailPos = particle.position.clone();
      particle.trail.unshift(trailPos);
      if (particle.trail.length > this.config.trailLength) {
        particle.trail.pop();
      }

      const alpha = Math.max(0, 1 - lifeRatio * lifeRatio);
      const sizeMultiplier = (1 + intensity * 0.5) * (1 - heightRatio * 0.5);

      const color = this.getColorForParticle(heightRatio, particle.colorIndex);

      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = particle.size * sizeMultiplier * alpha;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.particleSystem.lookAt(cameraDirection);

    const heatWaveScale = 1 + Math.sin(this.time * 3) * 0.1;
    this.heatWaveMesh.scale.setScalar(heatWaveScale * (1 + intensity * 0.3));
    
    const heatWaveMat = this.heatWaveMesh.material as THREE.MeshBasicMaterial;
    const mainColor = this.getMainColor();
    heatWaveMat.color.copy(mainColor);
    heatWaveMat.opacity = 0.15 * intensity;
  }

  dispose(): void {
    this.scene.remove(this.particleSystem);
    this.scene.remove(this.heatWaveMesh);
    this.geometry.dispose();
    this.material.dispose();
    this.heatWaveMesh.geometry.dispose();
    (this.heatWaveMesh.material as THREE.Material).dispose();
  }
}
