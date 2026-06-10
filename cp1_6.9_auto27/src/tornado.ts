import * as THREE from 'three';
import { ParticleSystem } from './particles';

export interface TornadoParams {
  temperature: number;
  humidity: number;
  windSpeed: number;
}

export type LifecyclePhase = 'spawning' | 'stable' | 'dissipating';

interface SmoothedValues {
  funnelHeight: number;
  funnelBottomRadius: number;
  rotationSpeed: number;
  debrisDistance: number;
  particleOpacity: number;
  activeParticleCount: number;
  noiseAmplitude: number;
}

interface DebrisPiece {
  mesh: THREE.Mesh;
  angle: number;
  radius: number;
  height: number;
  speed: number;
  baseScale: number;
}

const DEFAULT_PARAMS: TornadoParams = {
  temperature: 30,
  humidity: 60,
  windSpeed: 12
};

const BASE_PARTICLE_COUNT = 2000;
const BASE_DEBRIS_COUNT = 300;
const FUNNEL_TOP_RADIUS = 0.25;

export class Tornado {
  private group: THREE.Group;
  private funnel: THREE.Mesh;
  private funnelMaterial: THREE.ShaderMaterial;
  private particles: ParticleSystem;
  private debris: DebrisPiece[] = [];
  private debrisGroup: THREE.Group;

  private params: TornadoParams = { ...DEFAULT_PARAMS };
  private targetParams: TornadoParams = { ...DEFAULT_PARAMS };
  private smoothed: SmoothedValues;

  private lifecyclePhase: LifecyclePhase = 'spawning';
  private lifecycleTime: number = 0;
  private spawningDuration: number = 5;
  private stableDuration: number = 15;
  private dissipatingDuration: number = 5;
  private totalDuration: number = 25;

  private noiseTimer: number = 0;
  private currentNoiseAmplitude: number = 0.3;

  private performanceOptimized: boolean = false;
  private transitionSpeed: number = 1 / 0.3;

  constructor() {
    this.group = new THREE.Group();
    this.debrisGroup = new THREE.Group();

    this.smoothed = this.computeTargetValues(this.params);

    this.funnelMaterial = this.createFunnelShader();
    this.funnel = this.createFunnel();
    this.group.add(this.funnel);

    this.particles = new ParticleSystem({
      count: BASE_PARTICLE_COUNT,
      sizeRange: [0.1, 0.3],
      colorRange: ['#aaaaaa', '#ffffff'],
      radiusRange: [3, 8],
      heightRange: [0, 12]
    });
    this.group.add(this.particles.getMesh());

    this.createDebris(BASE_DEBRIS_COUNT);
    this.group.add(this.debrisGroup);

    this.randomizeStableDuration();
    this.setRandomPosition();
  }

  private createFunnelShader(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x555555) },
        bottomColor: { value: new THREE.Color(0xcccccc) },
        opacity: { value: 0.7 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float opacity;
        varying vec3 vPosition;
        void main() {
          float t = clamp(vPosition.y / 15.0, 0.0, 1.0);
          vec3 color = mix(bottomColor, topColor, t);
          gl_FragColor = vec4(color, opacity * (0.4 + 0.6 * (1.0 - t)));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  private createFunnel(): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(1, 1, 32, 1, true);
    const mesh = new THREE.Mesh(geometry, this.funnelMaterial);
    mesh.position.y = this.smoothed.funnelHeight / 2;
    mesh.scale.set(
      this.smoothed.funnelBottomRadius * 2,
      this.smoothed.funnelHeight,
      this.smoothed.funnelBottomRadius * 2
    );
    return mesh;
  }

  private createDebris(count: number): void {
    const debrisColors = [
      new THREE.Color('#5a4a2a'),
      new THREE.Color('#4a3a1a'),
      new THREE.Color('#3a5a2a'),
      new THREE.Color('#2a4a1a'),
      new THREE.Color('#6a5a3a')
    ];

    for (let i = 0; i < count; i++) {
      const size = 0.1 + Math.random() * 0.3;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const color = debrisColors[Math.floor(Math.random() * debrisColors.length)];
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);

      const piece: DebrisPiece = {
        mesh,
        angle: Math.random() * Math.PI * 2,
        radius: 2 + Math.random() * 4,
        height: Math.random() * 0.5,
        speed: 0.5 + Math.random() * 0.5,
        baseScale: size
      };

      this.debris.push(piece);
      this.debrisGroup.add(mesh);
    }
  }

  private computeTargetValues(params: TornadoParams): SmoothedValues {
    const tempDelta = params.temperature - 30;
    const baseHeight = 12 + tempDelta * 0.3;
    const funnelHeight = Math.max(5, Math.min(18, baseHeight));
    const funnelBottomRadius = 2.5 + (params.humidity - 60) * 0.02;

    const particleCountFactor = 1 + (params.humidity - 60) / 60 * 0.5;
    const baseCount = this.performanceOptimized ? BASE_PARTICLE_COUNT * 0.5 : BASE_PARTICLE_COUNT;
    const activeParticleCount = Math.floor(baseCount * particleCountFactor);

    const particleOpacity = 0.3 + (params.humidity / 100) * 0.6;

    const rotationSpeed = params.windSpeed * 0.5;
    const debrisDistance = params.windSpeed * 0.5;

    const noiseAmplitude = 0.2 + (params.windSpeed - 5) / 15 * 0.3;

    return {
      funnelHeight,
      funnelBottomRadius: Math.max(2, Math.min(3.5, funnelBottomRadius)),
      rotationSpeed,
      debrisDistance,
      particleOpacity,
      activeParticleCount,
      noiseAmplitude
    };
  }

  private updateFunnelColors(): void {
    const tempT = (this.params.temperature - 20) / 20;
    const coolColor = new THREE.Color('#4488ff');
    const warmColor = new THREE.Color('#ff8844');
    const midColor = new THREE.Color('#aaaaaa');

    let topColor: THREE.Color;
    let bottomColor: THREE.Color;

    if (tempT < 0.5) {
      const t = tempT * 2;
      topColor = coolColor.clone().lerp(midColor, t);
      bottomColor = coolColor.clone().lerp(new THREE.Color('#cccccc'), t);
    } else {
      const t = (tempT - 0.5) * 2;
      topColor = midColor.clone().lerp(warmColor, t);
      bottomColor = new THREE.Color('#cccccc').lerp(warmColor, t);
    }

    this.funnelMaterial.uniforms.topColor.value.lerp(topColor, 0.1);
    this.funnelMaterial.uniforms.bottomColor.value.lerp(bottomColor, 0.1);
  }

  private randomizeStableDuration(): void {
    this.stableDuration = 10 + Math.random() * 10;
    this.totalDuration = this.spawningDuration + this.stableDuration + this.dissipatingDuration;
  }

  private setRandomPosition(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 3;
    this.group.position.x = Math.cos(angle) * radius;
    this.group.position.z = Math.sin(angle) * radius;
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getCenter(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.smoothed.funnelHeight / 3,
      this.group.position.z
    );
  }

  setParams(params: Partial<TornadoParams>): void {
    this.targetParams = { ...this.targetParams, ...params };
  }

  getLifecyclePhase(): LifecyclePhase {
    return this.lifecyclePhase;
  }

  getLifecycleProgress(): number {
    if (this.lifecyclePhase === 'spawning') {
      return Math.min(1, this.lifecycleTime / this.spawningDuration);
    } else if (this.lifecyclePhase === 'dissipating') {
      return Math.min(1, (this.lifecycleTime - this.spawningDuration - this.stableDuration) / this.dissipatingDuration);
    }
    return 0;
  }

  setPerformanceOptimized(optimized: boolean): void {
    if (this.performanceOptimized === optimized) return;
    this.performanceOptimized = optimized;

    const debrisTarget = optimized ? BASE_DEBRIS_COUNT * 0.5 : BASE_DEBRIS_COUNT;
    for (let i = 0; i < this.debris.length; i++) {
      this.debris[i].mesh.visible = i < debrisTarget;
    }
  }

  private updateLifecycle(deltaTime: number): void {
    this.lifecycleTime += deltaTime;

    if (this.lifecyclePhase === 'spawning' && this.lifecycleTime >= this.spawningDuration) {
      this.lifecyclePhase = 'stable';
    } else if (this.lifecyclePhase === 'stable' && this.lifecycleTime >= this.spawningDuration + this.stableDuration) {
      this.lifecyclePhase = 'dissipating';
    } else if (this.lifecyclePhase === 'dissipating' && this.lifecycleTime >= this.totalDuration) {
      this.regenerate();
    }
  }

  private regenerate(): void {
    this.lifecycleTime = 0;
    this.lifecyclePhase = 'spawning';
    this.randomizeStableDuration();
    this.setRandomPosition();
    this.particles.reset();
  }

  private smoothUpdate(deltaTime: number): void {
    const lerpFactor = 1 - Math.exp(-this.transitionSpeed * deltaTime);

    this.params.temperature += (this.targetParams.temperature - this.params.temperature) * lerpFactor;
    this.params.humidity += (this.targetParams.humidity - this.params.humidity) * lerpFactor;
    this.params.windSpeed += (this.targetParams.windSpeed - this.params.windSpeed) * lerpFactor;

    const target = this.computeTargetValues(this.targetParams);
    this.smoothed.funnelHeight += (target.funnelHeight - this.smoothed.funnelHeight) * lerpFactor;
    this.smoothed.funnelBottomRadius += (target.funnelBottomRadius - this.smoothed.funnelBottomRadius) * lerpFactor;
    this.smoothed.rotationSpeed += (target.rotationSpeed - this.smoothed.rotationSpeed) * lerpFactor;
    this.smoothed.debrisDistance += (target.debrisDistance - this.smoothed.debrisDistance) * lerpFactor;
    this.smoothed.particleOpacity += (target.particleOpacity - this.smoothed.particleOpacity) * lerpFactor;
    this.smoothed.activeParticleCount = target.activeParticleCount;
    this.smoothed.noiseAmplitude += (target.noiseAmplitude - this.smoothed.noiseAmplitude) * lerpFactor;
  }

  update(time: number, deltaTime: number): void {
    this.updateLifecycle(deltaTime);
    this.smoothUpdate(deltaTime);
    this.updateFunnelColors();

    let effectiveHeight = this.smoothed.funnelHeight;
    let funnelOpacity = 0.7;

    if (this.lifecyclePhase === 'spawning') {
      const t = this.getLifecycleProgress();
      effectiveHeight *= t;
      funnelOpacity *= t;
    } else if (this.lifecyclePhase === 'dissipating') {
      const t = this.getLifecycleProgress();
      effectiveHeight *= (1 - t);
      funnelOpacity *= (1 - t);
    }

    this.funnel.position.y = effectiveHeight / 2;
    this.funnel.scale.set(
      this.smoothed.funnelBottomRadius * 2,
      effectiveHeight,
      this.smoothed.funnelBottomRadius * 2
    );
    this.funnel.rotation.y = time * this.smoothed.rotationSpeed * 0.2;
    this.funnelMaterial.uniforms.opacity.value = funnelOpacity;

    this.noiseTimer += deltaTime;
    if (this.noiseTimer >= 1) {
      this.noiseTimer = 0;
      this.currentNoiseAmplitude = 0.2 + Math.random() * 0.3;
    }

    this.particles.setCount(this.smoothed.activeParticleCount);
    this.particles.update({
      time,
      deltaTime,
      rotationSpeed: this.smoothed.rotationSpeed,
      targetHeight: effectiveHeight,
      lifecyclePhase: this.lifecyclePhase,
      lifecycleProgress: this.getLifecycleProgress(),
      opacity: this.smoothed.particleOpacity,
      noiseAmplitude: this.currentNoiseAmplitude * this.smoothed.noiseAmplitude / 0.3
    });

    this.updateDebris(time, deltaTime);
  }

  private updateDebris(time: number, deltaTime: number): void {
    const debrisTargetCount = this.performanceOptimized ? BASE_DEBRIS_COUNT * 0.5 : BASE_DEBRIS_COUNT;

    let opacityScale = 1;
    if (this.lifecyclePhase === 'spawning') {
      opacityScale = this.getLifecycleProgress();
    } else if (this.lifecyclePhase === 'dissipating') {
      opacityScale = 1 - this.getLifecycleProgress();
    }

    for (let i = 0; i < this.debris.length; i++) {
      const piece = this.debris[i];
      if (!piece.mesh.visible || i >= debrisTargetCount) {
        piece.mesh.visible = false;
        continue;
      }
      piece.mesh.visible = true;

      piece.angle += deltaTime * this.smoothed.rotationSpeed * piece.speed;

      const targetRadius = 2 + this.smoothed.debrisDistance * (piece.radius - 2) / 4;
      const effectiveRadius = targetRadius * opacityScale;

      piece.mesh.position.x = Math.cos(piece.angle) * effectiveRadius;
      piece.mesh.position.z = Math.sin(piece.angle) * effectiveRadius;
      piece.mesh.position.y = piece.height + Math.sin(time * 2 + i) * 0.1;

      piece.mesh.rotation.x = time * piece.speed + i;
      piece.mesh.rotation.y = time * piece.speed * 0.7 + i * 0.5;

      const scale = piece.baseScale * opacityScale;
      piece.mesh.scale.set(scale, scale, scale);
    }
  }

  dispose(): void {
    this.funnel.geometry.dispose();
    this.funnelMaterial.dispose();
    this.particles.dispose();
    for (const piece of this.debris) {
      piece.mesh.geometry.dispose();
      (piece.mesh.material as THREE.Material).dispose();
    }
  }
}
