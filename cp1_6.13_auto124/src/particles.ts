import * as THREE from 'three';
import { gsap } from 'gsap';

export interface OceanParams {
  windSpeed: number;
  temperature: number;
  salinity: number;
}

export type OceanState = 'calm' | 'wave' | 'tornado';

interface ParticleData {
  baseX: number;
  baseY: number;
  baseZ: number;
  randomSeed: number;
  phase: number;
}

const PARTICLE_COUNT = 10000;
const SPHERE_RADIUS = 200;
const SPHERE_THICKNESS = 30;
const SPHERE_RADIUS_SQ = SPHERE_RADIUS * SPHERE_RADIUS;

export class OceanParticles {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;

  private positions: Float32Array;
  private colors: Float32Array;
  private particleData: ParticleData[];

  private currentParams: OceanParams = {
    windSpeed: 0,
    temperature: 20,
    salinity: 35,
  };

  private targetParams: OceanParams = {
    windSpeed: 0,
    temperature: 20,
    salinity: 35,
  };

  private baseColor = new THREE.Color(0x87CEEB);
  private coldColor = new THREE.Color(0x7FD8E6);
  private warmColor = new THREE.Color(0x4682B4);
  private hotColor = new THREE.Color(0xFF8C00);

  private time = 0;
  private tornadoRotation = 0;

  public onStateChange?: (state: OceanState) => void;
  private currentState: OceanState = 'calm';

  constructor() {
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.particleData = new Array(PARTICLE_COUNT);

    this.initializeParticles();

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const { opacity, size } = this.calculateOpacityAndSize(35);

    this.material = new THREE.PointsMaterial({
      size: size,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.updateAllColors();
  }

  private initializeParticles(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const radiusFactor = Math.pow(Math.random(), 0.5);
      const radius = SPHERE_RADIUS * radiusFactor;
      const verticalScale = SPHERE_THICKNESS / SPHERE_RADIUS;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi) * verticalScale;
      const z = radius * Math.sin(phi) * Math.sin(theta);

      const i3 = i * 3;
      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      this.particleData[i] = {
        baseX: x,
        baseY: y,
        baseZ: z,
        randomSeed: Math.random() * 1000,
        phase: Math.random() * Math.PI * 2,
      };
    }
  }

  private calculateOpacityAndSize(salinity: number): { opacity: number; size: number } {
    const t = salinity / 50;
    const opacity = 0.3 + t * 0.6;
    const size = 2 + t * 3;
    return { opacity, size };
  }

  public setParams(params: Partial<OceanParams>): void {
    const newTarget = { ...this.targetParams, ...params };

    if (params.windSpeed !== undefined) {
      gsap.to(this.currentParams, {
        windSpeed: newTarget.windSpeed,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.checkStateChange();
        },
      });
      this.targetParams.windSpeed = newTarget.windSpeed;
    }

    if (params.temperature !== undefined) {
      gsap.to(this.currentParams, {
        temperature: newTarget.temperature,
        duration: 0.6,
        ease: 'power2.inOut',
      });
      this.targetParams.temperature = newTarget.temperature;
    }

    if (params.salinity !== undefined) {
      gsap.to(this.currentParams, {
        salinity: newTarget.salinity,
        duration: 0.6,
        ease: 'power2.inOut',
        onUpdate: () => {
          const { opacity, size } = this.calculateOpacityAndSize(this.currentParams.salinity);
          this.material.opacity = opacity;
          this.material.size = size;
        },
      });
      this.targetParams.salinity = newTarget.salinity;
    }
  }

  private checkStateChange(): void {
    const wind = this.currentParams.windSpeed;
    let newState: OceanState;

    if (wind < 20) {
      newState = 'calm';
    } else if (wind < 60) {
      newState = 'wave';
    } else {
      newState = 'tornado';
    }

    if (newState !== this.currentState) {
      this.currentState = newState;
      this.onStateChange?.(newState);
    }
  }

  private getTemperatureColor(temp: number): THREE.Color {
    const color = new THREE.Color();

    if (temp <= 0) {
      const t = Math.max(0, (temp + 20) / 20);
      color.copy(this.baseColor).lerp(this.coldColor, 1 - t);
    } else if (temp <= 25) {
      const t = temp / 25;
      color.copy(this.coldColor).lerp(this.warmColor, t);
    } else {
      const t = Math.min(1, (temp - 25) / 15);
      color.copy(this.warmColor).lerp(this.hotColor, t);
    }

    return color;
  }

  private updateAllColors(): void {
    const tempColor = this.getTemperatureColor(this.currentParams.temperature);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const variation = 0.9 + this.particleData[i].randomSeed * 0.0002;
      this.colors[i3] = tempColor.r * variation;
      this.colors[i3 + 1] = tempColor.g * variation;
      this.colors[i3 + 2] = tempColor.b * variation;
    }
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    const { windSpeed, temperature } = this.currentParams;
    const tempColor = this.getTemperatureColor(temperature);

    const tornadoAmount = Math.max(0, Math.min(1, (windSpeed - 50) / 20));
    const waveAmount = tornadoAmount < 1
      ? Math.max(0, Math.min(1, (windSpeed - 15) / 35))
      : Math.max(0, 1 - (windSpeed - 60) / 10);

    this.tornadoRotation += (Math.PI / 180) * 10 * deltaTime * 60 * tornadoAmount;

    const waveHeight = 50 * waveAmount;
    const baseDriftSpeed = 0.1 + 0.4 * Math.random();
    const windDriftFactor = windSpeed * 0.02;
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const pd = this.particleData[i];

      let x = pd.baseX;
      let y = pd.baseY;
      let z = pd.baseZ;

      const noiseX = Math.sin(this.time * (0.3 + pd.randomSeed * 0.0001) + pd.phase) * 0.5;
      const noiseY = Math.cos(this.time * (0.25 + pd.randomSeed * 0.00008) + pd.phase * 1.3) * 0.3;
      const noiseZ = Math.sin(this.time * (0.35 + pd.randomSeed * 0.00012) + pd.phase * 0.7) * 0.5;

      x += noiseX + (windDriftFactor * Math.sin(pd.randomSeed) * deltaTime * 60);
      y += noiseY;
      z += noiseZ + (windDriftFactor * Math.cos(pd.randomSeed) * deltaTime * 60);

      if (waveAmount > 0) {
        const waveFreq = 0.015 + windSpeed * 0.0002;
        const wavePhase = this.time * (1.2 + windSpeed * 0.02) + pd.phase;
        const waveX = Math.sin(x * waveFreq + wavePhase) * waveHeight * (0.5 + pd.randomSeed * 0.0005);
        const waveZ = Math.cos(z * waveFreq * 0.8 + wavePhase * 1.2) * waveHeight * 0.4;

        x += Math.cos(this.time * 0.5 + pd.phase) * waveAmount * 8;
        y += waveX;
        z += waveZ + Math.sin(this.time * 0.4 + pd.phase * 1.1) * waveAmount * 6;
      }

      if (tornadoAmount > 0) {
        const currentRadius = Math.sqrt(x * x + z * z);
        const targetRadius = 15 + pd.randomSeed * 0.015;
        const finalRadius = currentRadius + (targetRadius - currentRadius) * tornadoAmount;
        const angle = Math.atan2(z, x) + this.tornadoRotation * (0.5 + pd.randomSeed * 0.0005);

        const tornadoX = Math.cos(angle) * finalRadius;
        const tornadoZ = Math.sin(angle) * finalRadius;
        let tornadoY = ((pd.baseY + SPHERE_THICKNESS) / (SPHERE_THICKNESS * 2)) * 200 - 100;
        tornadoY += Math.sin(this.time * 2 + pd.phase) * 5;

        x = x + (tornadoX - x) * tornadoAmount;
        y = y + (tornadoY - y) * tornadoAmount;
        z = z + (tornadoZ - z) * tornadoAmount;
      }

      const distSq = x * x + y * (SPHERE_RADIUS / SPHERE_THICKNESS) * y * (SPHERE_RADIUS / SPHERE_THICKNESS) + z * z;
      if (distSq > SPHERE_RADIUS_SQ * 1.05) {
        const dist = Math.sqrt(distSq);
        const scale = (SPHERE_RADIUS * Math.sqrt(1.05)) / dist;
        x *= scale;
        y *= scale;
        z *= scale;
      }

      this.positions[i3] = x;
      this.positions[i3 + 1] = y;
      this.positions[i3 + 2] = z;

      const colorVar = 0.92 + (pd.randomSeed * 0.00008);
      this.colors[i3] = tempColor.r * colorVar;
      this.colors[i3 + 1] = tempColor.g * colorVar;
      this.colors[i3 + 2] = tempColor.b * colorVar;
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  public getCurrentState(): OceanState {
    return this.currentState;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
