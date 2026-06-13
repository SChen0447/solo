import * as THREE from 'three';
import type { OceanParams } from './particles';

export interface CameraAngles {
  polar: number;
  azimuth: number;
  distance: number;
}

type ParamChangeHandler = (params: Partial<OceanParams>) => void;

const MIN_DISTANCE = 100;
const MAX_DISTANCE = 500;
const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI - 0.05;

export class ControlsManager {
  private canvasContainer: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;

  private windSlider: HTMLInputElement;
  private tempSlider: HTMLInputElement;
  private salinitySlider: HTMLInputElement;

  private windValue: HTMLElement;
  private tempValue: HTMLElement;
  private salinityValue: HTMLElement;

  private onParamChange: ParamChangeHandler;

  public cameraAngles: CameraAngles = {
    polar: Math.PI / 3,
    azimuth: Math.PI / 4,
    distance: 350,
  };

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragSensitivity = 0.005;
  private zoomSensitivity = 15;

  private audioContext: AudioContext | null = null;
  private lastSoundTime = 0;
  private soundCooldown = 40;

  constructor(
    canvasContainer: HTMLElement,
    camera: THREE.PerspectiveCamera,
    target: THREE.Vector3,
    onParamChange: ParamChangeHandler
  ) {
    this.canvasContainer = canvasContainer;
    this.camera = camera;
    this.target = target;
    this.onParamChange = onParamChange;

    this.windSlider = document.getElementById('wind-slider') as HTMLInputElement;
    this.tempSlider = document.getElementById('temp-slider') as HTMLInputElement;
    this.salinitySlider = document.getElementById('salinity-slider') as HTMLInputElement;

    this.windValue = document.getElementById('wind-value') as HTMLElement;
    this.tempValue = document.getElementById('temp-value') as HTMLElement;
    this.salinityValue = document.getElementById('salinity-value') as HTMLElement;

    this.setupSliderListeners();
    this.setupMouseListeners();
    this.updateCameraPosition();
  }

  private setupSliderListeners(): void {
    this.windSlider.addEventListener('input', () => {
      const value = parseFloat(this.windSlider.value);
      this.windValue.textContent = value.toFixed(1);
      this.onParamChange({ windSpeed: value });
      this.playSliderSound(value / 100);
    });

    this.tempSlider.addEventListener('input', () => {
      const value = parseFloat(this.tempSlider.value);
      this.tempValue.textContent = value.toFixed(1);
      this.onParamChange({ temperature: value });
      const normalized = (value + 20) / 60;
      this.playSliderSound(normalized);
    });

    this.salinitySlider.addEventListener('input', () => {
      const value = parseFloat(this.salinitySlider.value);
      this.salinityValue.textContent = value.toFixed(1);
      this.onParamChange({ salinity: value });
      this.playSliderSound(value / 50);
    });
  }

  private setupMouseListeners(): void {
    const canvas = this.canvasContainer;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
      this.initAudio();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraAngles.azimuth -= deltaX * this.dragSensitivity;
      this.cameraAngles.polar -= deltaY * this.dragSensitivity;

      this.cameraAngles.polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.cameraAngles.polar));
      this.cameraAngles.azimuth = this.cameraAngles.azimuth % (Math.PI * 2);
      if (this.cameraAngles.azimuth < 0) this.cameraAngles.azimuth += Math.PI * 2;

      this.updateCameraPosition();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraAngles.distance += e.deltaY * 0.05 * this.zoomSensitivity;
      this.cameraAngles.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, this.cameraAngles.distance));
      this.updateCameraPosition();
      this.initAudio();
      this.playSliderSound(0.5);
    }, { passive: false });

    canvas.style.cursor = 'grab';

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.initAudio();
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;

      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;

      this.cameraAngles.azimuth -= deltaX * this.dragSensitivity;
      this.cameraAngles.polar -= deltaY * this.dragSensitivity;
      this.cameraAngles.polar = Math.max(MIN_POLAR, Math.min(MAX_POLAR, this.cameraAngles.polar));

      this.updateCameraPosition();
    }, { passive: true });
  }

  public updateCameraPosition(): void {
    const { polar, azimuth, distance } = this.cameraAngles;

    const x = distance * Math.sin(polar) * Math.sin(azimuth);
    const y = distance * Math.cos(polar);
    const z = distance * Math.sin(polar) * Math.cos(azimuth);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    this.camera.lookAt(this.target);
  }

  private initAudio(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
      }
    }
  }

  private playSliderSound(intensity: number): void {
    const now = performance.now();
    if (now - this.lastSoundTime < this.soundCooldown) return;
    this.lastSoundTime = now;

    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const ctx = this.audioContext;
    const duration = 0.05;
    const sampleRate = ctx.sampleRate;
    const bufferSize = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      const lastOut = i > 0 ? data[i - 1] : 0;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    const baseGain = 0.04 + intensity * 0.06;
    gainNode.gain.setValueAtTime(baseGain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800 + intensity * 2000;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  }

  public getParams(): OceanParams {
    return {
      windSpeed: parseFloat(this.windSlider.value),
      temperature: parseFloat(this.tempSlider.value),
      salinity: parseFloat(this.salinitySlider.value),
    };
  }
}
