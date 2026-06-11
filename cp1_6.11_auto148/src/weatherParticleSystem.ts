import * as THREE from 'three';
import { vertexShader, fragmentShader } from '@shaders/particleShaders';
import gsap from 'gsap';

export interface ParticleSystemParams {
  name: string;
  particleCount: number;
  windSpeed: number;
  windDirection: THREE.Vector3;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  particleSize: [number, number];
  lifeTime: number;
  turbulence: number;
  latitudeRange: [number, number];
  sphereRadius: number;
}

export interface ClimateZoneConfig {
  name: string;
  baseColor: string;
  particleCount: number;
  windSpeed: number;
  hueOffset: number;
  particleSize: [number, number];
  lifeTime: number;
  latitudeRange: [number, number];
}

export class WeatherParticleSystem {
  public mesh: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;
  public params: ParticleSystemParams;
  public sphereRadius: number;

  private positions: Float32Array;
  private basePositions: Float32Array;
  private velocities: Float32Array;
  private sizes: Float32Array;
  private lives: Float32Array;
  private speeds: Float32Array;
  private phases: Float32Array;
  private seeds: Float32Array;
  private colors: Float32Array;

  private targetDensity: number;
  private targetWindSpeed: number;
  private targetColorStart: THREE.Color;
  private targetColorEnd: THREE.Color;
  private targetTurbulence: number;
  private sizeMultiplier: number = 1;
  private opacityBoost: number = 0;

  constructor(params: ParticleSystemParams) {
    this.params = { ...params };
    this.sphereRadius = params.sphereRadius;

    this.targetDensity = params.particleCount;
    this.targetWindSpeed = params.windSpeed;
    this.targetColorStart = params.colorStart.clone();
    this.targetColorEnd = params.colorEnd.clone();
    this.targetTurbulence = params.turbulence;

    this.positions = new Float32Array(params.particleCount * 3);
    this.basePositions = new Float32Array(params.particleCount * 3);
    this.velocities = new Float32Array(params.particleCount * 3);
    this.sizes = new Float32Array(params.particleCount);
    this.lives = new Float32Array(params.particleCount);
    this.speeds = new Float32Array(params.particleCount);
    this.phases = new Float32Array(params.particleCount);
    this.seeds = new Float32Array(params.particleCount);
    this.colors = new Float32Array(params.particleCount * 3);

    this.geometry = new THREE.BufferGeometry();
    this.material = this.createMaterial();
    this.mesh = new THREE.Points(this.geometry, this.material);

    this.initParticles();
    this.setupAttributes();
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTimeScale: { value: 1 },
        uWindSpeed: { value: this.params.windSpeed },
        uWindDirection: { value: this.params.windDirection.clone() },
        uTurbulence: { value: this.params.turbulence },
        uColor: { value: this.params.colorStart.clone() },
        uColorEnd: { value: this.params.colorEnd.clone() },
        uSizeMultiplier: { value: 1 },
        uOpacityBoost: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private initParticles(): void {
    const count = this.params.particleCount;
    const [minLat, maxLat] = this.params.latitudeRange;
    const r = this.sphereRadius;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const lat = minLat + Math.random() * (maxLat - minLat);
      const lon = Math.random() * Math.PI * 2;

      const latRad = (lat * Math.PI) / 180;
      const lonRad = lon;

      const x = r * Math.cos(latRad) * Math.cos(lonRad);
      const y = r * Math.sin(latRad);
      const z = r * Math.cos(latRad) * Math.sin(lonRad);

      const heightOffset = 0.1 + Math.random() * 0.5;
      const scale = (r + heightOffset) / r;

      this.positions[i3] = x * scale;
      this.positions[i3 + 1] = y * scale;
      this.positions[i3 + 2] = z * scale;

      this.basePositions[i3] = x * scale;
      this.basePositions[i3 + 1] = y * scale;
      this.basePositions[i3 + 2] = z * scale;

      const speed = 0.5 + Math.random() * 0.5;
      this.speeds[i] = speed;

      const [minSize, maxSize] = this.params.particleSize;
      this.sizes[i] = minSize + Math.random() * (maxSize - minSize);

      this.lives[i] = Math.random();
      this.phases[i] = Math.random() * Math.PI * 2;
      this.seeds[i] = Math.random();

      const color = new THREE.Color().lerpColors(
        this.params.colorStart,
        this.params.colorEnd,
        Math.random()
      );
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }
  }

  private setupAttributes(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aBasePosition', new THREE.BufferAttribute(this.basePositions, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(this.speeds, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  public setDensity(targetCount: number, duration: number = 2): void {
    if (targetCount === this.targetDensity) return;
    this.targetDensity = targetCount;

    const currentCount = this.params.particleCount;
    if (targetCount > currentCount) {
      this.expandParticles(targetCount);
    } else {
      this.shrinkParticles(targetCount);
    }

    gsap.to(this.params, {
      particleCount: targetCount,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.updateVisibility();
      }
    });
  }

  private expandParticles(newCount: number): void {
    const oldCount = this.positions.length / 3;
    const addCount = newCount - oldCount;

    const expandArray = (oldArr: Float32Array, stride: number): Float32Array => {
      const newArr = new Float32Array(newCount * stride);
      newArr.set(oldArr, 0);
      return newArr;
    };

    this.positions = expandArray(this.positions, 3);
    this.basePositions = expandArray(this.basePositions, 3);
    this.velocities = expandArray(this.velocities, 3);
    this.sizes = expandArray(this.sizes, 1);
    this.lives = expandArray(this.lives, 1);
    this.speeds = expandArray(this.speeds, 1);
    this.phases = expandArray(this.phases, 1);
    this.seeds = expandArray(this.seeds, 1);
    this.colors = expandArray(this.colors, 3);

    const [minLat, maxLat] = this.params.latitudeRange;
    const r = this.sphereRadius;

    for (let i = oldCount; i < newCount; i++) {
      const i3 = i * 3;

      const lat = minLat + Math.random() * (maxLat - minLat);
      const lon = Math.random() * Math.PI * 2;
      const latRad = (lat * Math.PI) / 180;
      const lonRad = lon;

      const x = r * Math.cos(latRad) * Math.cos(lonRad);
      const y = r * Math.sin(latRad);
      const z = r * Math.cos(latRad) * Math.sin(lonRad);

      const heightOffset = 0.1 + Math.random() * 0.5;
      const scale = (r + heightOffset) / r;

      this.positions[i3] = x * scale;
      this.positions[i3 + 1] = y * scale;
      this.positions[i3 + 2] = z * scale;

      this.basePositions[i3] = x * scale;
      this.basePositions[i3 + 1] = y * scale;
      this.basePositions[i3 + 2] = z * scale;

      this.speeds[i] = 0.5 + Math.random() * 0.5;
      const [minSize, maxSize] = this.params.particleSize;
      this.sizes[i] = minSize + Math.random() * (maxSize - minSize);
      this.lives[i] = Math.random();
      this.phases[i] = Math.random() * Math.PI * 2;
      this.seeds[i] = Math.random();

      const color = new THREE.Color().lerpColors(
        this.targetColorStart,
        this.targetColorEnd,
        Math.random()
      );
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;
    }

    this.updateGeometryAttributes();
  }

  private shrinkParticles(newCount: number): void {
    this.updateVisibility();
  }

  private updateVisibility(): void {
    const count = Math.floor(this.params.particleCount);
    this.geometry.setDrawRange(0, count);
  }

  private updateGeometryAttributes(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aBasePosition', new THREE.BufferAttribute(this.basePositions, 3));
    this.geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1));
    this.geometry.setAttribute('aSpeed', new THREE.BufferAttribute(this.speeds, 1));
    this.geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
  }

  public setWind(speed: number, duration: number = 2): void {
    if (speed === this.targetWindSpeed) return;
    this.targetWindSpeed = speed;

    gsap.to(this.material.uniforms.uWindSpeed, {
      value: speed,
      duration,
      ease: 'power2.out'
    });
  }

  public setColor(hueOffset: number, duration: number = 2): void {
    const baseHue = this.getBaseHue();
    const newHue = (baseHue + hueOffset) / 360;

    const startColor = new THREE.Color().setHSL(newHue, 0.8, 0.6);
    const endColor = new THREE.Color().setHSL(newHue, 0.7, 0.4);

    gsap.to(this.material.uniforms.uColor.value, {
      r: startColor.r,
      g: startColor.g,
      b: startColor.b,
      duration,
      ease: 'power2.out'
    });

    gsap.to(this.material.uniforms.uColorEnd.value, {
      r: endColor.r,
      g: endColor.g,
      b: endColor.b,
      duration,
      ease: 'power2.out'
    });

    this.targetColorStart = startColor;
    this.targetColorEnd = endColor;
  }

  private getBaseHue(): number {
    switch (this.params.name) {
      case 'tropical':
        return 20;
      case 'temperate':
        return 120;
      case 'polar':
        return 210;
      default:
        return 0;
    }
  }

  public setTurbulence(value: number, duration: number = 2): void {
    if (value === this.targetTurbulence) return;
    this.targetTurbulence = value;

    gsap.to(this.material.uniforms.uTurbulence, {
      value,
      duration,
      ease: 'power2.out'
    });
  }

  public setTimeScale(scale: number): void {
    this.material.uniforms.uTimeScale.value = scale;
  }

  public zoomIn(duration: number = 1.2): void {
    gsap.to(this, {
      sizeMultiplier: 2,
      opacityBoost: 0.3,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        this.material.uniforms.uSizeMultiplier.value = this.sizeMultiplier;
        this.material.uniforms.uOpacityBoost.value = this.opacityBoost;
      }
    });
  }

  public zoomOut(duration: number = 1.2): void {
    gsap.to(this, {
      sizeMultiplier: 1,
      opacityBoost: 0,
      duration,
      ease: 'power3.out',
      onUpdate: () => {
        this.material.uniforms.uSizeMultiplier.value = this.sizeMultiplier;
        this.material.uniforms.uOpacityBoost.value = this.opacityBoost;
      }
    });
  }

  public update(time: number, timeScale: number): void {
    this.material.uniforms.uTime.value = time;
  }

  public getWindSpeed(): number {
    return this.material.uniforms.uWindSpeed.value;
  }

  public getParticleCount(): number {
    return this.params.particleCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
