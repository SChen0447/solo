import * as THREE from 'three';
import { WeatherParticleSystem, ClimateZoneConfig } from './weatherParticleSystem';
import { scaleLinear } from 'd3-scale';

export type ClimateZoneName = 'tropical' | 'temperate' | 'polar';

export interface ClimateZoneState {
  name: ClimateZoneName;
  density: number;
  windSpeed: number;
  hueOffset: number;
  windSpeedKmh: number;
  precipitationMmh: number;
}

export interface WeatherUpdateParams {
  zone: ClimateZoneName;
  density?: number;
  windSpeed?: number;
  hueOffset?: number;
  turbulence?: number;
}

export class ClimateManager {
  public scene: THREE.Scene;
  public zones: Map<ClimateZoneName, WeatherParticleSystem> = new Map();
  public sphereRadius: number = 2;
  public timeScale: number = 1;

  private windSpeedScale = scaleLinear().domain([0.1, 10]).range([5, 150]);
  private precipitationScale = scaleLinear().domain([2000, 15000]).range([2, 200]);

  private zoneConfigs: Record<ClimateZoneName, ClimateZoneConfig> = {
    tropical: {
      name: 'tropical',
      baseColor: '#ff6b35',
      particleCount: 8000,
      windSpeed: 3,
      hueOffset: 0,
      particleSize: [2, 4],
      lifeTime: 8,
      latitudeRange: [-23, 23]
    },
    temperate: {
      name: 'temperate',
      baseColor: '#4caf50',
      particleCount: 6000,
      windSpeed: 2,
      hueOffset: 0,
      particleSize: [1, 3],
      lifeTime: 5,
      latitudeRange: [23, 66]
    },
    polar: {
      name: 'polar',
      baseColor: '#55aaff',
      particleCount: 4000,
      windSpeed: 1.5,
      hueOffset: 0,
      particleSize: [0.5, 1.5],
      lifeTime: 12,
      latitudeRange: [66, 90]
    }
  };

  constructor(scene: THREE.Scene, sphereRadius: number = 2) {
    this.scene = scene;
    this.sphereRadius = sphereRadius;
    this.initZones();
  }

  private initZones(): void {
    (Object.keys(this.zoneConfigs) as ClimateZoneName[]).forEach((zoneName) => {
      const config = this.zoneConfigs[zoneName];
      const colorStart = new THREE.Color(config.baseColor);
      const colorEnd = colorStart.clone().offsetHSL(0, -0.1, -0.2);

      let latRange: [number, number];
      switch (zoneName) {
        case 'tropical':
          latRange = [-23, 23];
          break;
        case 'temperate':
          latRange = [25, 65];
          break;
        case 'polar':
          latRange = [67, 88];
          break;
        default:
          latRange = [-90, 90];
      }

      const particleSystem = new WeatherParticleSystem({
        name: config.name,
        particleCount: config.particleCount,
        windSpeed: config.windSpeed,
        windDirection: new THREE.Vector3(0.3, 0, 0.5).normalize(),
        colorStart,
        colorEnd,
        particleSize: config.particleSize,
        lifeTime: config.lifeTime,
        turbulence: 1,
        latitudeRange: latRange,
        sphereRadius: this.sphereRadius
      });

      this.zones.set(zoneName, particleSystem);
      this.scene.add(particleSystem.mesh);

      if (zoneName === 'temperate') {
        const southernSystem = this.createSouthernTemperate(config);
        if (southernSystem) {
          this.zones.set(`temperate_south` as ClimateZoneName, southernSystem);
          this.scene.add(southernSystem.mesh);
        }
      }

      if (zoneName === 'polar') {
        const southernPolar = this.createSouthernPolar(config);
        if (southernPolar) {
          this.zones.set(`polar_south` as ClimateZoneName, southernPolar);
          this.scene.add(southernPolar.mesh);
        }
      }
    });
  }

  private createSouthernTemperate(config: ClimateZoneConfig): WeatherParticleSystem | null {
    const colorStart = new THREE.Color(config.baseColor);
    const colorEnd = colorStart.clone().offsetHSL(0, -0.1, -0.2);

    return new WeatherParticleSystem({
      name: 'temperate_south',
      particleCount: config.particleCount,
      windSpeed: config.windSpeed,
      windDirection: new THREE.Vector3(0.3, 0, -0.5).normalize(),
      colorStart,
      colorEnd,
      particleSize: config.particleSize,
      lifeTime: config.lifeTime,
      turbulence: 1,
      latitudeRange: [-65, -25],
      sphereRadius: this.sphereRadius
    });
  }

  private createSouthernPolar(config: ClimateZoneConfig): WeatherParticleSystem | null {
    const colorStart = new THREE.Color(config.baseColor);
    const colorEnd = colorStart.clone().offsetHSL(0, -0.1, -0.2);

    return new WeatherParticleSystem({
      name: 'polar_south',
      particleCount: config.particleCount,
      windSpeed: config.windSpeed,
      windDirection: new THREE.Vector3(-0.3, 0, -0.5).normalize(),
      colorStart,
      colorEnd,
      particleSize: config.particleSize,
      lifeTime: config.lifeTime,
      turbulence: 1,
      latitudeRange: [-88, -67],
      sphereRadius: this.sphereRadius
    });
  }

  public updateWeather(params: WeatherUpdateParams): void {
    const { zone, density, windSpeed, hueOffset, turbulence } = params;

    const zonesToUpdate: WeatherParticleSystem[] = [];
    const mainZone = this.zones.get(zone);
    if (mainZone) {
      zonesToUpdate.push(mainZone);
    }

    const southZone = this.zones.get(`${zone}_south` as ClimateZoneName);
    if (southZone) {
      zonesToUpdate.push(southZone);
    }

    zonesToUpdate.forEach((system) => {
      if (density !== undefined) {
        system.setDensity(density);
      }
      if (windSpeed !== undefined) {
        system.setWind(windSpeed);
      }
      if (hueOffset !== undefined) {
        system.setColor(hueOffset);
      }
      if (turbulence !== undefined) {
        system.setTurbulence(turbulence);
      }
    });
  }

  public setGlobalTimeScale(scale: number): void {
    this.timeScale = scale;
    this.zones.forEach((system) => {
      system.setTimeScale(scale);
    });
  }

  public update(time: number): void {
    this.zones.forEach((system) => {
      system.update(time, this.timeScale);
    });
  }

  public getZoneState(zone: ClimateZoneName): ClimateZoneState {
    const system = this.zones.get(zone);
    if (!system) {
      return {
        name: zone,
        density: 0,
        windSpeed: 0,
        hueOffset: 0,
        windSpeedKmh: 0,
        precipitationMmh: 0
      };
    }

    const windSpeed = system.getWindSpeed();
    const particleCount = system.getParticleCount();

    return {
      name: zone,
      density: particleCount,
      windSpeed,
      hueOffset: this.zoneConfigs[zone].hueOffset,
      windSpeedKmh: Math.round(this.windSpeedScale(windSpeed)),
      precipitationMmh: Math.round(this.precipitationScale(particleCount) * 10) / 10
    };
  }

  public getTotalParticleCount(): number {
    let total = 0;
    this.zones.forEach((system) => {
      total += system.getParticleCount();
    });
    return total;
  }

  public zoomInZone(zone: ClimateZoneName, duration: number = 1.2): void {
    this.zones.forEach((system, name) => {
      if (name === zone || name === `${zone}_south`) {
        system.zoomIn(duration);
      } else {
        system.zoomOut(duration);
      }
    });
  }

  public zoomOutAll(duration: number = 1.2): void {
    this.zones.forEach((system) => {
      system.zoomOut(duration);
    });
  }

  public getPolarWindSpeed(): number {
    const polar = this.zones.get('polar');
    return polar ? polar.getWindSpeed() : 1;
  }

  public dispose(): void {
    this.zones.forEach((system) => {
      system.dispose();
      this.scene.remove(system.mesh);
    });
    this.zones.clear();
  }
}
