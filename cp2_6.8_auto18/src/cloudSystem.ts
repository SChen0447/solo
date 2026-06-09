import * as THREE from 'three';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'storm';

export interface WeatherParams {
  particleCount: number;
  cloudHeight: number;
  cloudSpread: number;
  cloudThickness: number;
  baseColor: THREE.Color;
  particleSize: number;
  driftSpeed: number;
  waveFrequency: number;
  waveAmplitude: number;
  opacity: number;
}

const WEATHER_CONFIGS: Record<WeatherType, WeatherParams> = {
  sunny: {
    particleCount: 3000,
    cloudHeight: 15,
    cloudSpread: 30,
    cloudThickness: 3,
    baseColor: new THREE.Color(0xffffff),
    particleSize: 0.8,
    driftSpeed: 0.3,
    waveFrequency: 0.15,
    waveAmplitude: 0.5,
    opacity: 0.6
  },
  cloudy: {
    particleCount: 6000,
    cloudHeight: 12,
    cloudSpread: 35,
    cloudThickness: 5,
    baseColor: new THREE.Color(0xcccccc),
    particleSize: 1.0,
    driftSpeed: 0.5,
    waveFrequency: 0.25,
    waveAmplitude: 0.8,
    opacity: 0.75
  },
  rainy: {
    particleCount: 9000,
    cloudHeight: 8,
    cloudSpread: 40,
    cloudThickness: 8,
    baseColor: new THREE.Color(0x555566),
    particleSize: 1.2,
    driftSpeed: 0.8,
    waveFrequency: 0.35,
    waveAmplitude: 1.2,
    opacity: 0.85
  },
  storm: {
    particleCount: 12000,
    cloudHeight: 6,
    cloudSpread: 42,
    cloudThickness: 10,
    baseColor: new THREE.Color(0x332244),
    particleSize: 1.4,
    driftSpeed: 1.2,
    waveFrequency: 0.5,
    waveAmplitude: 1.5,
    opacity: 0.95
  }
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  const result = a.clone();
  result.lerp(b, t);
  return result;
}

export class CloudSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private currentWeather: WeatherType;
  private targetWeather: WeatherType;
  private transitionProgress: number;
  private transitionDuration: number;
  private isTransitioning: boolean;
  private currentParams: WeatherParams;
  private targetParams: WeatherParams;
  private startParams: WeatherParams;
  private time: number;
  private speedMultiplier: number;
  private originalPositions: Float32Array;
  private cloudGroup: THREE.Group;
  private rotationSpeed: number;
  private cloudTexture: THREE.Texture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentWeather = 'sunny';
    this.targetWeather = 'sunny';
    this.transitionProgress = 1;
    this.transitionDuration = 3;
    this.isTransitioning = false;
    this.time = 0;
    this.speedMultiplier = 1;
    this.rotationSpeed = 0.02;

    this.currentParams = { ...WEATHER_CONFIGS.sunny };
    this.targetParams = { ...WEATHER_CONFIGS.sunny };
    this.startParams = { ...WEATHER_CONFIGS.sunny };

    this.cloudGroup = new THREE.Group();
    this.scene.add(this.cloudGroup);

    this.cloudTexture = this.createCloudTexture();

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: this.currentParams.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: this.currentParams.opacity,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
      map: this.cloudTexture,
      alphaTest: 0.01
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.cloudGroup.add(this.particles);

    const maxParticles = WEATHER_CONFIGS.storm.particleCount;
    this.originalPositions = new Float32Array(maxParticles * 3);

    this.initParticles(maxParticles);
    this.updateGeometry(this.currentParams);
  }

  private initParticles(count: number): void {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.currentParams.cloudSpread;
      const x = Math.cos(theta) * radius;
      const y = (Math.random() - 0.5) * this.currentParams.cloudThickness + this.currentParams.cloudHeight;
      const z = Math.sin(theta) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.originalPositions[i * 3] = x;
      this.originalPositions[i * 3 + 1] = y;
      this.originalPositions[i * 3 + 2] = z;

      const color = this.currentParams.baseColor;
      const variation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = color.r * variation;
      colors[i * 3 + 1] = color.g * variation;
      colors[i * 3 + 2] = color.b * variation;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setDrawRange(0, this.currentParams.particleCount);
  }

  private updateGeometry(params: WeatherParams): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const maxParticles = WEATHER_CONFIGS.storm.particleCount;

    for (let i = 0; i < maxParticles; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.random() * params.cloudSpread;
      const x = Math.cos(theta) * radius;
      const y = (Math.random() - 0.5) * params.cloudThickness + params.cloudHeight;
      const z = Math.sin(theta) * radius;

      this.originalPositions[i * 3] = x;
      this.originalPositions[i * 3 + 1] = y;
      this.originalPositions[i * 3 + 2] = z;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = params.baseColor;
      const variation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = color.r * variation;
      colors[i * 3 + 1] = color.g * variation;
      colors[i * 3 + 2] = color.b * variation;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, params.particleCount);

    this.material.size = params.particleSize;
    this.material.opacity = params.opacity;
  }

  setWeather(weather: WeatherType): void {
    if (weather === this.currentWeather) return;

    this.startParams = { ...this.currentParams };
    this.targetWeather = weather;
    this.targetParams = { ...WEATHER_CONFIGS[weather] };
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  update(deltaTime: number): void {
    this.time += deltaTime * this.speedMultiplier;

    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.isTransitioning = false;
        this.currentWeather = this.targetWeather;
        this.currentParams = { ...this.targetParams };
      } else {
        const t = easeInOutCubic(this.transitionProgress);
        this.interpolateParams(t);
      }
    }

    this.animateParticles(deltaTime);

    this.cloudGroup.rotation.y += this.rotationSpeed * deltaTime * this.speedMultiplier * this.currentParams.driftSpeed;
  }

  private interpolateParams(t: number): void {
    const sp = this.startParams;
    const tp = this.targetParams;

    this.currentParams.particleCount = Math.round(sp.particleCount + (tp.particleCount - sp.particleCount) * t);
    this.currentParams.cloudHeight = sp.cloudHeight + (tp.cloudHeight - sp.cloudHeight) * t;
    this.currentParams.cloudSpread = sp.cloudSpread + (tp.cloudSpread - sp.cloudSpread) * t;
    this.currentParams.cloudThickness = sp.cloudThickness + (tp.cloudThickness - sp.cloudThickness) * t;
    this.currentParams.particleSize = sp.particleSize + (tp.particleSize - sp.particleSize) * t;
    this.currentParams.driftSpeed = sp.driftSpeed + (tp.driftSpeed - sp.driftSpeed) * t;
    this.currentParams.waveFrequency = sp.waveFrequency + (tp.waveFrequency - sp.waveFrequency) * t;
    this.currentParams.waveAmplitude = sp.waveAmplitude + (tp.waveAmplitude - sp.waveAmplitude) * t;
    this.currentParams.opacity = sp.opacity + (tp.opacity - sp.opacity) * t;
    this.currentParams.baseColor = lerpColor(sp.baseColor, tp.baseColor, t);

    this.geometry.setDrawRange(0, this.currentParams.particleCount);
    this.material.size = this.currentParams.particleSize;
    this.material.opacity = this.currentParams.opacity;

    const colors = this.geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < this.currentParams.particleCount; i++) {
      const color = lerpColor(sp.baseColor, tp.baseColor, t);
      const variation = 0.85 + ((i % 30) / 100);
      colors[i * 3] = color.r * variation;
      colors[i * 3 + 1] = color.g * variation;
      colors[i * 3 + 2] = color.b * variation;
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  private animateParticles(_deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const params = this.currentParams;

    for (let i = 0; i < params.particleCount; i++) {
      const idx = i * 3;
      const ox = this.originalPositions[idx];
      const oy = this.originalPositions[idx + 1];
      const oz = this.originalPositions[idx + 2];

      const waveX = Math.sin(this.time * params.waveFrequency + i * 0.01) * params.waveAmplitude;
      const waveY = Math.cos(this.time * params.waveFrequency * 0.7 + i * 0.015) * params.waveAmplitude * 0.5;
      const waveZ = Math.sin(this.time * params.waveFrequency * 1.3 + i * 0.02) * params.waveAmplitude * 0.7;

      positions[idx] = ox + waveX;
      positions[idx + 1] = oy + waveY;
      positions[idx + 2] = oz + waveZ;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  getCloudGroup(): THREE.Group {
    return this.cloudGroup;
  }

  getCloudHeight(): number {
    return this.currentParams.cloudHeight;
  }

  getCloudSpread(): number {
    return this.currentParams.cloudSpread;
  }

  private createCloudTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.cloudTexture.dispose();
  }
}
