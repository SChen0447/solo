import * as THREE from 'three';
import { TelescopeArray } from './array';
import { SignalProcessor } from './signal';
import { UIManager } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvasContainer: HTMLElement;
  private uiLayer: HTMLElement;

  private telescopeArray: TelescopeArray;
  private signalProcessor: SignalProcessor;
  private uiManager: UIManager;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private azimuth: number = 0;
  private elevation: number = 0;
  private targetAzimuth: number = 0;
  private targetElevation: number = 0;

  private clock: THREE.Clock;
  private lastPulseAlert: number = 0;
  private pulseAlertCooldown: number = 5;

  private frameCount: number = 0;
  private lastFpsTime: number = 0;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.uiLayer = document.getElementById('ui-layer')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.addBackgroundGradient();

    this.telescopeArray = new TelescopeArray(this.scene);

    this.signalProcessor = new SignalProcessor();

    this.uiManager = new UIManager(this.uiLayer, {
      onFrequencyChange: (freq) => this.onFrequencyChange(freq),
      onGainChange: (gain) => this.onGainChange(gain),
      onDecode: () => this.onDecode()
    });

    this.clock = new THREE.Clock();

    this.bindEvents();
    this.updateSignalParams();
  }

  private addBackgroundGradient(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.5, '#0d0820');
    gradient.addColorStop(1, '#1a0a2e');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.onPointerUp());

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.onPointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        this.onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    canvas.addEventListener('touchend', () => this.onPointerUp());

    canvas.style.cursor = 'grab';
  }

  private onPointerDown(x: number, y: number): void {
    this.isDragging = true;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onPointerMove(x: number, y: number): void {
    if (!this.isDragging) return;

    const deltaX = x - this.lastMouseX;
    const deltaY = y - this.lastMouseY;

    const azSensitivity = 0.5;
    const elSensitivity = 0.3;

    this.targetAzimuth -= deltaX * azSensitivity;
    this.targetElevation -= deltaY * elSensitivity;

    this.targetAzimuth = Math.max(-180, Math.min(180, this.targetAzimuth));
    this.targetElevation = Math.max(-30, Math.min(30, this.targetElevation));

    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  private onPointerUp(): void {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'grab';
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private onFrequencyChange(freq: number): void {
    this.signalProcessor.setFrequency(freq);
    this.updateSignalParams();
  }

  private onGainChange(gain: number): void {
    this.signalProcessor.setGain(gain);
  }

  private onDecode(): void {
    const waveform = this.signalProcessor.update(0);
    const spectrum = this.signalProcessor.computeFFT(waveform);
    const result = this.signalProcessor.smartDecode(spectrum);
    this.uiManager.showDecodeResult(result);
  }

  private updateSignalParams(): void {
    const pointing = this.telescopeArray.getPointing();
    const freq = this.uiManager.getFrequency();
    const signalInfo = this.telescopeArray.computeSignalStrength(freq);

    this.signalProcessor.setSignalStrength(signalInfo.strength);
    this.signalProcessor.setSNR(signalInfo.snr);

    this.uiManager.updateStatus(signalInfo.strength, signalInfo.snr);
    this.uiManager.updatePointing(pointing);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    this.azimuth += (this.targetAzimuth - this.azimuth) * 0.1;
    this.elevation += (this.targetElevation - this.elevation) * 0.1;

    this.telescopeArray.setPointing(this.azimuth, this.elevation);
    this.telescopeArray.update(time);

    this.updateSignalParams();

    const waveform = this.signalProcessor.update(deltaTime);
    const spectrum = this.signalProcessor.computeFFT(waveform);

    this.uiManager.updateWaveform(waveform);
    this.uiManager.updateSpectrum(spectrum);
    this.uiManager.update(deltaTime, time);

    if (waveform.hasPulse && waveform.pulseIntensity > 0.5) {
      const now = time;
      if (now - this.lastPulseAlert > this.pulseAlertCooldown) {
        this.lastPulseAlert = now;
        this.uiManager.showPulseAlert();
      }
    }

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (time - this.lastFpsTime >= 1) {
      this.lastFpsTime = time;
      this.frameCount = 0;
    }
  }

  start(): void {
    this.animate();
  }
}

const app = new App();
app.start();
