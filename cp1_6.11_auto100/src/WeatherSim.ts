import * as THREE from 'three';
import { gsap } from 'gsap';
import { RainForest } from './RainForest';

export enum WeatherState {
  CLEAR = 'clear',
  RAINING = 'raining'
}

interface WeatherTransition {
  startTime: number;
  duration: number;
  fromDensity: number;
  toDensity: number;
  fromParticleCount: number;
  toParticleCount: number;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  fromBgColor: THREE.Color;
  toBgColor: THREE.Color;
}

export class WeatherSim {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private rainForest: RainForest;

  private rainParticles: THREE.Points | null = null;
  private rainGeometry: THREE.BufferGeometry | null = null;
  private rainMaterial: THREE.PointsMaterial | null = null;

  private currentState: WeatherState = WeatherState.CLEAR;
  private targetState: WeatherState = WeatherState.CLEAR;

  private transition: WeatherTransition | null = null;

  private audioContext: AudioContext | null = null;
  private rainOscillator: OscillatorNode | null = null;
  private rainGain: GainNode | null = null;

  private rainVelocity: Float32Array | null = null;
  private currentParticleCount: number = 0;
  private maxParticleCount: number = 600;

  private fogColor = new THREE.Color('#0a2a0a');
  private bgColor = new THREE.Color('#0a2a0a');

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, rainForest: RainForest) {
    this.scene = scene;
    this.camera = camera;
    this.rainForest = rainForest;

    this.setupFog();
    this.createRainParticles(0);
    this.setupAudio();
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x0a2a0a, 0.002);
    this.scene.background = new THREE.Color('#0a2a0a');
  }

  private createRainParticles(count: number): void {
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainGeometry?.dispose();
      this.rainMaterial?.dispose();
    }

    this.currentParticleCount = count;

    if (count === 0) {
      this.rainParticles = null;
      this.rainGeometry = null;
      this.rainMaterial = null;
      return;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.rainVelocity = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 55;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      this.rainVelocity[i] = 4 + Math.random() * 4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true
    });

    this.rainGeometry = geometry;
    this.rainMaterial = material;
    this.rainParticles = new THREE.Points(geometry, material);
    this.scene.add(this.rainParticles);
  }

  private setupAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.log('Web Audio API not supported');
    }
  }

  private startRainSound(): void {
    if (!this.audioContext || this.rainOscillator) return;

    this.rainOscillator = this.audioContext.createOscillator();
    this.rainGain = this.audioContext.createGain();

    this.rainOscillator.type = 'sine';
    this.rainOscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    this.rainOscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 1.2);

    this.rainGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.rainGain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 1.2);

    this.rainOscillator.connect(this.rainGain);
    this.rainGain.connect(this.audioContext.destination);

    this.rainOscillator.start();

    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.03, this.audioContext.currentTime + 1.2);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    noiseSource.start();
  }

  private stopRainSound(): void {
    if (!this.audioContext || !this.rainOscillator) return;

    const fadeOutTime = 1.2;
    const currentTime = this.audioContext.currentTime;

    if (this.rainGain) {
      this.rainGain.gain.linearRampToValueAtTime(0, currentTime + fadeOutTime);
    }

    setTimeout(() => {
      if (this.rainOscillator) {
        this.rainOscillator.stop();
        this.rainOscillator.disconnect();
        this.rainOscillator = null;
      }
      if (this.rainGain) {
        this.rainGain.disconnect();
        this.rainGain = null;
      }
    }, fadeOutTime * 1000);
  }

  toggleWeather(): void {
    const newState = this.currentState === WeatherState.CLEAR ? WeatherState.RAINING : WeatherState.CLEAR;

    if (newState === this.targetState) return;

    this.targetState = newState;

    const fog = this.scene.fog as THREE.FogExp2;
    const currentDensity = fog.density;
    const currentColor = this.fogColor.clone();
    const currentBgColor = this.bgColor.clone();

    const targetDensity = newState === WeatherState.RAINING ? 0.015 : 0.002;
    const targetColor = new THREE.Color(newState === WeatherState.RAINING ? '#0a1a0a' : '#0a2a0a');
    const targetBgColor = new THREE.Color(newState === WeatherState.RAINING ? '#0a1a0a' : '#0a2a0a');
    const targetParticleCount = newState === WeatherState.RAINING ? this.maxParticleCount : 0;

    this.transition = {
      startTime: performance.now(),
      duration: 1200,
      fromDensity: currentDensity,
      toDensity: targetDensity,
      fromParticleCount: this.currentParticleCount,
      toParticleCount: targetParticleCount,
      fromColor: currentColor,
      toColor: targetColor,
      fromBgColor: currentBgColor,
      toBgColor: targetBgColor
    };

    if (newState === WeatherState.RAINING) {
      this.createRainParticles(this.maxParticleCount);
      this.startRainSound();
      this.rainForest.setReflectionOpacity(0.3);
    } else {
      this.stopRainSound();
      this.rainForest.setReflectionOpacity(0);
    }

    this.updateWeatherIndicator(newState);
  }

  private updateWeatherIndicator(state: WeatherState): void {
    const indicator = document.getElementById('weatherIndicator');
    if (indicator) {
      if (state === WeatherState.RAINING) {
        indicator.innerHTML = '🌧️ 降雨中 | 按 G 切换天气';
      } else {
        indicator.innerHTML = '☀️ 晴朗 | 按 G 切换天气';
      }
    }
  }

  getFogDensity(): number {
    const fog = this.scene.fog as THREE.FogExp2;
    return fog.density;
  }

  getVisibility(): number {
    const fogDensity = this.getFogDensity();
    const minVisibility = 15;
    const maxVisibility = 50;
    const minDensity = 0.002;
    const maxDensity = 0.015;

    const t = (fogDensity - minDensity) / (maxDensity - minDensity);
    return maxVisibility - t * (maxVisibility - minVisibility);
  }

  adjustForFPS(fps: number): void {
    if (fps < 30 && this.maxParticleCount === 600) {
      this.maxParticleCount = 300;
      if (this.currentState === WeatherState.RAINING) {
        this.createRainParticles(300);
      }
      this.rainForest.reduceGeometryDetail();
    }
  }

  update(delta: number, time: number): void {
    const now = performance.now();

    if (this.transition) {
      const elapsed = now - this.transition.startTime;
      const progress = Math.min(elapsed / this.transition.duration, 1);

      const easeProgress = this.easeInOutCubic(progress);

      const fog = this.scene.fog as THREE.FogExp2;
      fog.density = this.transition.fromDensity + (this.transition.toDensity - this.transition.fromDensity) * easeProgress;

      this.fogColor.copy(this.transition.fromColor).lerp(this.transition.toColor, easeProgress);
      this.bgColor.copy(this.transition.fromBgColor).lerp(this.transition.toBgColor, easeProgress);

      fog.color.copy(this.fogColor);
      (this.scene.background as THREE.Color).copy(this.bgColor);

      if (progress >= 1) {
        this.currentState = this.targetState;
        this.transition = null;

        if (this.currentState === WeatherState.CLEAR) {
          this.createRainParticles(0);
        }
      }
    }

    if (this.rainParticles && this.rainGeometry && this.rainVelocity) {
      const positions = this.rainGeometry.attributes.position.array as Float32Array;

      for (let i = 0; i < this.currentParticleCount; i++) {
        positions[i * 3 + 1] -= this.rainVelocity[i] * delta;

        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 55;
          positions[i * 3] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }

      this.rainGeometry.attributes.position.needsUpdate = true;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getCurrentState(): WeatherState {
    return this.currentState;
  }

  setFogDensityForLayer(fogColor: string): void {
    const targetColor = new THREE.Color(fogColor);
    const fog = this.scene.fog as THREE.FogExp2;

    gsap.to(fog.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 1,
      ease: 'power2.out'
    });

    gsap.to(this.fogColor, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration: 1,
      ease: 'power2.out'
    });
  }
}
