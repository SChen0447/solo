import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer, type AudioFeatures } from './audioAnalyzer';
import { ParticleSystem, themes, type ParticleShape } from './particleSystem';
import './styles.css';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioAnalyzer: AudioAnalyzer;
  private particleSystem: ParticleSystem;
  private canvas: HTMLCanvasElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D | null;
  private isRunning: boolean = false;
  private animationId: number = 0;
  private lastTime: number = 0;
  private clock: THREE.Clock;
  private currentTheme: string = 'neon';

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.audioAnalyzer = new AudioAnalyzer();
    this.particleSystem = new ParticleSystem(this.scene);
    this.clock = new THREE.Clock();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupScene();
    this.setupEventListeners();
    this.setupUI();
    this.applyTheme(this.currentTheme);
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupCamera(): void {
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.autoRotate = false;
  }

  private setupScene(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 0.5, 50);
    pointLight2.position.set(-10, -10, 10);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupUI(): void {
    const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    micBtn.addEventListener('click', () => this.toggleMicrophone());

    const shapeBtns = document.querySelectorAll('.shape-btn');
    shapeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const shape = target.dataset.shape as ParticleShape;
        if (shape) {
          this.setShape(shape);
          shapeBtns.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
        }
      });
    });

    const particleCountSlider = document.getElementById('particle-count') as HTMLInputElement;
    const particleCountValue = document.getElementById('particle-count-value') as HTMLSpanElement;
    particleCountSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      particleCountValue.textContent = value.toString();
    });
    particleCountSlider.addEventListener('change', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.particleSystem.setParticleCount(value);
    });

    const rotationSpeedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    const rotationSpeedValue = document.getElementById('rotation-speed-value') as HTMLSpanElement;
    rotationSpeedSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      const speed = value / 100;
      rotationSpeedValue.textContent = speed.toFixed(1);
      this.particleSystem.setRotationSpeed(speed);
    });

    const colorSpeedSlider = document.getElementById('color-speed') as HTMLInputElement;
    const colorSpeedValue = document.getElementById('color-speed-value') as HTMLSpanElement;
    colorSpeedSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      const speed = value / 100;
      colorSpeedValue.textContent = speed.toFixed(1);
      this.particleSystem.setColorTransitionSpeed(speed);
    });

    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const theme = target.dataset.theme;
        if (theme) {
          this.applyTheme(theme);
          themeBtns.forEach(b => b.classList.remove('active'));
          target.classList.add('active');
        }
      });
    });

    const collapseBtn = document.getElementById('collapse-btn') as HTMLButtonElement;
    const expandBtn = document.getElementById('expand-btn') as HTMLButtonElement;
    const controlBar = document.getElementById('control-bar') as HTMLDivElement;

    collapseBtn.addEventListener('click', () => {
      controlBar.classList.add('collapsed');
      expandBtn.classList.add('visible');
    });

    expandBtn.addEventListener('click', () => {
      controlBar.classList.remove('collapsed');
      expandBtn.classList.remove('visible');
    });

    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
  }

  private checkResponsive(): void {
    const controlBar = document.getElementById('control-bar') as HTMLDivElement;
    const expandBtn = document.getElementById('expand-btn') as HTMLButtonElement;

    if (window.innerWidth < 768) {
      controlBar.classList.add('collapsed');
      expandBtn.classList.add('visible');
    } else {
      controlBar.classList.remove('collapsed');
      expandBtn.classList.remove('visible');
    }
  }

  private async toggleMicrophone(): Promise<void> {
    const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;

    if (this.isRunning) {
      this.stopAudio();
      micBtn.classList.remove('active');
      micBtn.title = '启动麦克风';
    } else {
      try {
        await this.startAudio();
        micBtn.classList.add('active');
        micBtn.title = '停止麦克风';
      } catch (error) {
        console.error('Failed to start microphone:', error);
        alert('无法访问麦克风，请确保已授权麦克风权限。');
      }
    }
  }

  private async startAudio(): Promise<void> {
    await this.audioAnalyzer.start();
    this.isRunning = true;
  }

  private stopAudio(): void {
    this.audioAnalyzer.stop();
    this.isRunning = false;
  }

  private setShape(shape: ParticleShape): void {
    this.particleSystem.setShape(shape);
  }

  private applyTheme(themeName: string): void {
    this.currentTheme = themeName;
    this.particleSystem.setTheme(themeName);
    document.body.dataset.theme = themeName;

    const theme = themes[themeName];
    if (theme) {
      this.renderer.setClearColor(theme.bgColor, 1);
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    let features: AudioFeatures;
    if (this.isRunning && this.audioAnalyzer.getIsInitialized()) {
      features = this.audioAnalyzer.getFeatures();
      this.drawMiniWaveform(features.waveform, features.volume);
    } else {
      features = this.getIdleFeatures(deltaTime);
      this.drawIdleWaveform();
    }

    this.particleSystem.update(features, deltaTime);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private getIdleFeatures(deltaTime: number): AudioFeatures {
    const spectrum = new Float32Array(128);
    const waveform = new Float32Array(256);
    
    this.lastTime += deltaTime;

    for (let i = 0; i < spectrum.length; i++) {
      const t = this.lastTime * 2 + i * 0.1;
      spectrum[i] = (Math.sin(t) * 0.5 + 0.5) * 0.2;
    }

    for (let i = 0; i < waveform.length; i++) {
      waveform[i] = Math.sin(this.lastTime * 3 + i * 0.05) * 0.1;
    }

    return {
      spectrum,
      volume: 0.1,
      bassEnergy: 0.1,
      midEnergy: 0.08,
      highEnergy: 0.05,
      pan: 0,
      waveform
    };
  }

  private drawMiniWaveform(waveform: Float32Array, volume: number): void {
    if (!this.waveformCtx) return;

    const ctx = this.waveformCtx;
    const width = this.waveformCanvas.width;
    const height = this.waveformCanvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + volume * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();

    const step = waveform.length / width;
    for (let i = 0; i < width; i++) {
      const index = Math.floor(i * step);
      const value = waveform[index] || 0;
      const y = height / 2 + value * height * 0.8;
      
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    ctx.stroke();
  }

  private drawIdleWaveform(): void {
    if (!this.waveformCtx) return;

    const ctx = this.waveformCtx;
    const width = this.waveformCanvas.width;
    const height = this.waveformCanvas.height;
    const time = Date.now() * 0.003;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(100, 100, 120, 0.1)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(100, 100, 120, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      const x = i / width;
      const y = height / 2 + Math.sin(x * Math.PI * 4 + time) * 3;
      
      if (i === 0) {
        ctx.moveTo(i, y);
      } else {
        ctx.lineTo(i, y);
      }
    }
    ctx.stroke();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.audioAnalyzer.stop();
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

export { App };
