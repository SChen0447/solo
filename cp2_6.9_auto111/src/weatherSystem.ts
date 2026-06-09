import * as THREE from 'three';
import type { BuildingData } from './buildings';

export type WeatherType = 'sunny' | 'rainy' | 'snowy' | 'thunder';

interface WeatherConfig {
  bgColor: number;
  fogColor: number;
  fogDensity: number;
  ambientIntensity: number;
  directionalIntensity: number;
  buildingEmissive: number;
}

const WEATHER_CONFIGS: Record<WeatherType, WeatherConfig> = {
  sunny: {
    bgColor: 0x87CEEB,
    fogColor: 0x87CEEB,
    fogDensity: 0.005,
    ambientIntensity: 0.6,
    directionalIntensity: 1.0,
    buildingEmissive: 1.0,
  },
  rainy: {
    bgColor: 0x4A6FA5,
    fogColor: 0x4A6FA5,
    fogDensity: 0.02,
    ambientIntensity: 0.3,
    directionalIntensity: 0.4,
    buildingEmissive: 0.3,
  },
  snowy: {
    bgColor: 0xC8D8E8,
    fogColor: 0xC8D8E8,
    fogDensity: 0.025,
    ambientIntensity: 0.45,
    directionalIntensity: 0.5,
    buildingEmissive: 0.3,
  },
  thunder: {
    bgColor: 0x2C3E50,
    fogColor: 0x2C3E50,
    fogDensity: 0.04,
    ambientIntensity: 0.15,
    directionalIntensity: 0.2,
    buildingEmissive: 0.3,
  },
};

const TRANSITION_DURATION = 2;
const RAIN_COUNT = 5000;
const SNOW_COUNT = 3000;
const AREA_SIZE = 50;
const AREA_HEIGHT = 30;

function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) / 255,
    g: ((hex >> 8) & 255) / 255,
    b: (hex & 255) / 255,
  };
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private buildings: BuildingData[];
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private currentWeather: WeatherType = 'sunny';
  private targetWeather: WeatherType = 'sunny';
  private transitionProgress: number = 1;
  private particleDensity: number = 1;

  private rainSystem: THREE.LineSegments | null = null;
  private snowSystem: THREE.Points | null = null;
  private fog: THREE.FogExp2;

  private lightningMesh: THREE.Line | null = null;
  private lightningLight: THREE.PointLight | null = null;
  private lightningTimer: number = 0;
  private nextLightningTime: number = 5;
  private lightningActive: boolean = false;
  private lightningDuration: number = 0;

  private rainPositions: Float32Array;
  private snowPositions: Float32Array;
  private snowVelocities: Float32Array;

  constructor(
    scene: THREE.Scene,
    buildings: BuildingData[],
    ambientLight: THREE.AmbientLight,
    directionalLight: THREE.DirectionalLight
  ) {
    this.scene = scene;
    this.buildings = buildings;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;

    this.fog = new THREE.FogExp2(
      WEATHER_CONFIGS.sunny.fogColor,
      WEATHER_CONFIGS.sunny.fogDensity
    );
    scene.fog = this.fog;
    scene.background = new THREE.Color(WEATHER_CONFIGS.sunny.bgColor);

    this.rainPositions = new Float32Array(RAIN_COUNT * 6);
    this.initRainSystem();

    this.snowPositions = new Float32Array(SNOW_COUNT * 3);
    this.snowVelocities = new Float32Array(SNOW_COUNT * 3);
    this.initSnowSystem();

    this.initLightning();
    this.applyWeatherConfig(WEATHER_CONFIGS.sunny, 1);
  }

  private initRainSystem(): void {
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.resetRainParticle(i);
    }

    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.rainPositions, 3)
    );

    const rainMat = new THREE.LineBasicMaterial({
      color: 0x5A9BD4,
      transparent: true,
      opacity: 0,
    });

    this.rainSystem = new THREE.LineSegments(rainGeo, rainMat);
    this.rainSystem.frustumCulled = false;
    this.scene.add(this.rainSystem);
  }

  private resetRainParticle(index: number): void {
    const i = index * 6;
    const x = (Math.random() - 0.5) * AREA_SIZE;
    const y = Math.random() * AREA_HEIGHT;
    const z = (Math.random() - 0.5) * AREA_SIZE;
    const tiltAngle = (15 * Math.PI) / 180;
    const length = 0.5;

    this.rainPositions[i] = x;
    this.rainPositions[i + 1] = y;
    this.rainPositions[i + 2] = z;
    this.rainPositions[i + 3] = x + Math.sin(tiltAngle) * length;
    this.rainPositions[i + 4] = y - length;
    this.rainPositions[i + 5] = z;
  }

  private initSnowSystem(): void {
    for (let i = 0; i < SNOW_COUNT; i++) {
      this.resetSnowParticle(i);
    }

    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.snowPositions, 3)
    );

    const snowMat = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.1,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    });

    this.snowSystem = new THREE.Points(snowGeo, snowMat);
    this.snowSystem.frustumCulled = false;
    this.scene.add(this.snowSystem);
  }

  private resetSnowParticle(index: number): void {
    const i = index * 3;
    this.snowPositions[i] = (Math.random() - 0.5) * AREA_SIZE;
    this.snowPositions[i + 1] = AREA_HEIGHT + Math.random() * 5;
    this.snowPositions[i + 2] = (Math.random() - 0.5) * AREA_SIZE;

    this.snowVelocities[i] = (Math.random() - 0.5) * 0.5;
    this.snowVelocities[i + 1] = -(2 + Math.random() * 3);
    this.snowVelocities[i + 2] = (Math.random() - 0.5) * 0.5;
  }

  private initLightning(): void {
    this.lightningLight = new THREE.PointLight(0xFFFFFF, 0, 50, 2);
    this.scene.add(this.lightningLight);
    this.nextLightningTime = 3 + Math.random() * 4;
  }

  private createLightningBolt(): void {
    const startX = (Math.random() - 0.5) * 30;
    const startZ = (Math.random() - 0.5) * 30;
    const startY = AREA_HEIGHT;
    const endY = 0;
    const segments = 10;

    const points: THREE.Vector3[] = [];
    let currentPos = new THREE.Vector3(startX, startY, startZ);
    points.push(currentPos.clone());

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const y = startY + (endY - startY) * t;
      const jitterX = (Math.random() - 0.5) * 3 * (1 - t * 0.5);
      const jitterZ = (Math.random() - 0.5) * 3 * (1 - t * 0.5);
      currentPos = new THREE.Vector3(
        startX + jitterX + (Math.random() - 0.5) * 2,
        y,
        startZ + jitterZ + (Math.random() - 0.5) * 2
      );
      points.push(currentPos.clone());
    }

    const lightningGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lightningMat = new THREE.LineBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.8,
    });

    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
      (this.lightningMesh.material as THREE.Material).dispose();
    }

    this.lightningMesh = new THREE.Line(lightningGeo, lightningMat);
    this.scene.add(this.lightningMesh);

    if (this.lightningLight) {
      this.lightningLight.position.set(
        (startX + currentPos.x) / 2,
        (startY + endY) / 2,
        (startZ + currentPos.z) / 2
      );
      this.lightningLight.intensity = 2;
    }

    this.lightningActive = true;
    this.lightningDuration = 0.2;
  }

  setWeather(weather: WeatherType): void {
    if (weather === this.targetWeather) return;
    this.targetWeather = weather;
    this.transitionProgress = 0;
  }

  getWeather(): WeatherType {
    return this.currentWeather;
  }

  setParticleDensity(density: number): void {
    this.particleDensity = Math.max(0.5, Math.min(2, density));
  }

  getParticleDensity(): number {
    return this.particleDensity;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpColorObj(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: this.lerp(a.r, b.r, t),
      g: this.lerp(a.g, b.g, t),
      b: this.lerp(a.b, b.b, t),
    };
  }

  private applyWeatherConfig(config: WeatherConfig, intensity: number): void {
    const bgColor = hexToRgb(config.bgColor);
    (this.scene.background as THREE.Color).setRGB(bgColor.r, bgColor.g, bgColor.b);

    this.fog.color.setRGB(bgColor.r, bgColor.g, bgColor.b);
    this.fog.density = config.fogDensity;

    this.ambientLight.intensity = config.ambientIntensity;
    this.directionalLight.intensity = config.directionalIntensity;

    this.buildings.forEach((b) => {
      b.materials.forEach((m) => {
        m.emissiveIntensity = config.buildingEmissive;
      });
    });
  }

  update(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(
        1,
        this.transitionProgress + deltaTime / TRANSITION_DURATION
      );
      const t = this.transitionProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const fromConfig = WEATHER_CONFIGS[this.currentWeather];
      const toConfig = WEATHER_CONFIGS[this.targetWeather];

      const fromBg = hexToRgb(fromConfig.bgColor);
      const toBg = hexToRgb(toConfig.bgColor);
      const lerpedBg = this.lerpColorObj(fromBg, toBg, easeT);

      (this.scene.background as THREE.Color).setRGB(
        lerpedBg.r,
        lerpedBg.g,
        lerpedBg.b
      );
      this.fog.color.setRGB(lerpedBg.r, lerpedBg.g, lerpedBg.b);
      this.fog.density = this.lerp(fromConfig.fogDensity, toConfig.fogDensity, easeT);
      this.ambientLight.intensity = this.lerp(
        fromConfig.ambientIntensity,
        toConfig.ambientIntensity,
        easeT
      );
      this.directionalLight.intensity = this.lerp(
        fromConfig.directionalIntensity,
        toConfig.directionalIntensity,
        easeT
      );

      const emissiveLerp = this.lerp(
        fromConfig.buildingEmissive,
        toConfig.buildingEmissive,
        easeT
      );
      this.buildings.forEach((b) => {
        b.materials.forEach((m) => {
          m.emissiveIntensity = emissiveLerp;
        });
      });

      if (this.transitionProgress >= 1) {
        this.currentWeather = this.targetWeather;
        this.applyWeatherConfig(WEATHER_CONFIGS[this.currentWeather], 1);
      }
    }

    this.updateParticles(deltaTime);
    this.updateLightning(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    const showRain =
      this.currentWeather === 'rainy' || this.currentWeather === 'thunder';
    const showSnow = this.currentWeather === 'snowy';

    let rainOpacity = 0;
    let snowOpacity = 0;

    if (this.transitionProgress < 1) {
      const t = this.transitionProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const fromRain =
        this.currentWeather === 'rainy' || this.currentWeather === 'thunder' ? 1 : 0;
      const toRain =
        this.targetWeather === 'rainy' || this.targetWeather === 'thunder' ? 1 : 0;
      rainOpacity = this.lerp(fromRain, toRain, easeT) * 0.6 * this.particleDensity;

      const fromSnow = this.currentWeather === 'snowy' ? 1 : 0;
      const toSnow = this.targetWeather === 'snowy' ? 1 : 0;
      snowOpacity = this.lerp(fromSnow, toSnow, easeT) * 0.9 * this.particleDensity;
    } else {
      rainOpacity = showRain ? 0.6 * this.particleDensity : 0;
      snowOpacity = showSnow ? 0.9 * this.particleDensity : 0;
    }

    if (this.rainSystem) {
      (this.rainSystem.material as THREE.LineBasicMaterial).opacity = rainOpacity;
    }
    if (this.snowSystem) {
      (this.snowSystem.material as THREE.PointsMaterial).opacity = snowOpacity;
    }

    const rainSpeed = 20 * this.particleDensity;
    if (rainOpacity > 0.01 && this.rainSystem) {
      const posAttr = this.rainSystem.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const effectiveCount = Math.floor(RAIN_COUNT * this.particleDensity);

      for (let i = 0; i < effectiveCount; i++) {
        const idx = i * 6;
        positions[idx + 1] -= rainSpeed * deltaTime;
        positions[idx + 4] -= rainSpeed * deltaTime;

        if (positions[idx + 4] < 0) {
          this.resetRainParticle(i);
        }
      }
      posAttr.needsUpdate = true;
    }

    const snowSpeed = 5 * this.particleDensity;
    if (snowOpacity > 0.01 && this.snowSystem) {
      const posAttr = this.snowSystem.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const effectiveCount = Math.floor(SNOW_COUNT * this.particleDensity);

      for (let i = 0; i < effectiveCount; i++) {
        const idx = i * 3;
        positions[idx] += this.snowVelocities[idx] * deltaTime * snowSpeed * 0.3;
        positions[idx + 1] += this.snowVelocities[idx + 1] * deltaTime;
        positions[idx + 2] += this.snowVelocities[idx + 2] * deltaTime * snowSpeed * 0.3;

        this.snowVelocities[idx] += (Math.random() - 0.5) * 0.02;
        this.snowVelocities[idx + 2] += (Math.random() - 0.5) * 0.02;

        if (positions[idx + 1] < 0) {
          this.resetSnowParticle(i);
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  private updateLightning(deltaTime: number): void {
    const isThunder =
      this.currentWeather === 'thunder' ||
      (this.transitionProgress < 1 && this.targetWeather === 'thunder');

    if (this.lightningActive) {
      this.lightningDuration -= deltaTime;

      if (this.lightningMesh) {
        const mat = this.lightningMesh.material as THREE.LineBasicMaterial;
        mat.opacity = Math.max(0, (this.lightningDuration / 0.2) * 0.8);
      }
      if (this.lightningLight) {
        if (this.lightningDuration > 0.15) {
          this.lightningLight.intensity = 2;
        } else {
          this.lightningLight.intensity = Math.max(
            0,
            (this.lightningDuration / 0.15) * 2
          );
        }
      }

      if (this.lightningDuration <= 0) {
        this.lightningActive = false;
        if (this.lightningMesh) {
          this.scene.remove(this.lightningMesh);
          this.lightningMesh.geometry.dispose();
          (this.lightningMesh.material as THREE.Material).dispose();
          this.lightningMesh = null;
        }
        if (this.lightningLight) {
          this.lightningLight.intensity = 0;
        }
      }
      return;
    }

    if (!isThunder) {
      this.lightningTimer = 0;
      return;
    }

    this.lightningTimer += deltaTime;
    if (this.lightningTimer >= this.nextLightningTime) {
      this.createLightningBolt();
      this.lightningTimer = 0;
      this.nextLightningTime = 3 + Math.random() * 4;
    }
  }

  dispose(): void {
    if (this.rainSystem) {
      this.scene.remove(this.rainSystem);
      this.rainSystem.geometry.dispose();
      (this.rainSystem.material as THREE.Material).dispose();
    }
    if (this.snowSystem) {
      this.scene.remove(this.snowSystem);
      this.snowSystem.geometry.dispose();
      (this.snowSystem.material as THREE.Material).dispose();
    }
    if (this.lightningMesh) {
      this.scene.remove(this.lightningMesh);
      this.lightningMesh.geometry.dispose();
      (this.lightningMesh.material as THREE.Material).dispose();
    }
    if (this.lightningLight) {
      this.scene.remove(this.lightningLight);
    }
  }
}
