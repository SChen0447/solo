import * as THREE from 'three';
import { ParticleSystem, ColorMode } from './particleSystem';
import { AudioAnalyzer } from './audioAnalyzer';
import { UIControls, UIControlsParams } from './uiControls';
import './styles.css';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private video: HTMLVideoElement;
  private particleSystem: ParticleSystem;
  private audioAnalyzer: AudioAnalyzer;
  private uiControls: UIControls;
  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 0;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.video = document.getElementById('video') as HTMLVideoElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.z = 8;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene, this.video);
    this.audioAnalyzer = new AudioAnalyzer();

    this.uiControls = new UIControls(this.onControlsChange.bind(this));

    this.bindEvents();
    this.initCamera();
    this.initAudio();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onControlsChange(params: UIControlsParams): void {
    this.particleSystem.setParticleCount(params.particleCount);
    this.particleSystem.setColorMode(params.colorMode as ColorMode);
    this.particleSystem.setRotationSpeed(params.rotationSpeed);
    this.particleSystem.setAudioEnabled(params.audioEnabled);

    if (params.audioEnabled && !this.audioAnalyzer.isReady()) {
      this.initAudio();
    }
  }

  private async initCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      this.video.srcObject = stream;
      await this.video.play();

      this.startAnimation();
    } catch (error) {
      console.error('Failed to access camera:', error);
      this.showError('无法访问摄像头，请确保已授予权限。');
    }
  }

  private async initAudio(): Promise<void> {
    const success = await this.audioAnalyzer.init();
    if (!success) {
      console.warn('Audio initialization failed');
      this.uiControls.setAudioEnabled(false);
      this.particleSystem.setAudioEnabled(false);
    }
  }

  private startAnimation(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    if (this.audioAnalyzer.isReady() && this.uiControls.getParams().audioEnabled) {
      const bands = this.audioAnalyzer.getFrequencyBands();
      this.particleSystem.setAudioBands(bands.low, bands.mid, bands.high);
    }

    const latency = this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      this.uiControls.updateFPS(this.currentFPS);
      this.uiControls.updateLatency(latency);
    }
  }

  private showError(message: string): void {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      top: 50%;
      left: 40%;
      transform: translate(-50%, -50%);
      color: #ff6b6b;
      font-size: 16px;
      text-align: center;
      padding: 20px;
      background: rgba(0,0,0,0.7);
      border-radius: 10px;
    `;
    div.textContent = message;
    this.container.appendChild(div);
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particleSystem.dispose();
    this.audioAnalyzer.destroy();
    this.renderer.dispose();

    if (this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
