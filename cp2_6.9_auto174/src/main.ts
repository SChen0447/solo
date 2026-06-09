import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AudioController, AudioData } from './audioController';
import { DanceFloor } from './danceFloor';
import { ParticleSystem, ParticleThemeName, PARTICLE_THEMES } from './particleSystem';

const INITIAL_CAMERA_POS = new THREE.Vector3(10, 8, 10);

interface SpotlightBundle {
  light: THREE.SpotLight;
  angle: number;
  speed: number;
  radius: number;
  height: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private audioController: AudioController;
  private danceFloor: DanceFloor;
  private particleSystem: ParticleSystem;
  private spotlights: SpotlightBundle[];

  private container: HTMLElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private fileInput: HTMLInputElement;
  private micToggle: HTMLInputElement;
  private themeButtons: NodeListOf<HTMLButtonElement>;
  private resetCameraBtn: HTMLButtonElement;
  private nowPlayingEl: HTMLElement;

  private animationId: number = 0;
  private lastAudioData: AudioData = {
    lowFreq: 0,
    midFreq: 0,
    highFreq: 0,
    totalEnergy: 0,
    waveform: new Float32Array(0),
  };

  constructor() {
    this.container = document.getElementById('app')!;
    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d')!;
    this.fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
    this.micToggle = document.getElementById('mic-toggle') as HTMLInputElement;
    this.themeButtons = document.querySelectorAll('.theme-btn');
    this.resetCameraBtn = document.getElementById('reset-camera-btn') as HTMLButtonElement;
    this.nowPlayingEl = document.getElementById('now-playing')!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.FogExp2(0x1A0033, 0.005);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POS);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 0, 0);

    this.clock = new THREE.Clock();

    this.audioController = new AudioController();

    this.danceFloor = new DanceFloor();
    this.scene.add(this.danceFloor.mesh);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.points);

    this.spotlights = this.createSpotlights();

    this.setupAmbientLight();
    this.setupEventListeners();
    this.drawWaveform(new Float32Array(0));
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0A23');
    gradient.addColorStop(1, '#1A0033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupAmbientLight(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
  }

  private createSpotlights(): SpotlightBundle[] {
    const configs = [
      { color: 0xff1744, speed: 0.5, startAngle: 0 },
      { color: 0x00e676, speed: 0.7, startAngle: (Math.PI * 2) / 3 },
      { color: 0x2979ff, speed: 0.9, startAngle: (Math.PI * 4) / 3 },
    ];

    const bundles: SpotlightBundle[] = [];

    for (const cfg of configs) {
      const light = new THREE.SpotLight(cfg.color, 1, 30, Math.PI / 6, 0.4, 1);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 50;
      this.scene.add(light);
      this.scene.add(light.target);

      bundles.push({
        light,
        angle: cfg.startAngle,
        speed: cfg.speed,
        radius: 8,
        height: 8,
      });
    }

    return bundles;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.fileInput.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        try {
          this.micToggle.checked = false;
          await this.audioController.loadAudioFile(file);
          this.nowPlayingEl.textContent = `正在播放: ${file.name}`;
        } catch (err) {
          console.error('Failed to load audio:', err);
          this.nowPlayingEl.textContent = '加载音频失败';
        }
      }
    });

    this.micToggle.addEventListener('change', async (e: Event) => {
      const checked = (e.target as HTMLInputElement).checked;
      if (checked) {
        try {
          await this.audioController.enableMicrophone();
          this.nowPlayingEl.textContent = '麦克风输入已激活';
        } catch (err) {
          console.error('Failed to enable mic:', err);
          this.nowPlayingEl.textContent = '无法访问麦克风';
          (e.target as HTMLInputElement).checked = false;
        }
      } else {
        this.audioController.stop();
        if (this.nowPlayingEl.textContent === '麦克风输入已激活') {
          this.nowPlayingEl.textContent = '';
        }
      }
    });

    this.themeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme as ParticleThemeName;
        if (!theme) return;
        this.themeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.particleSystem.setTheme(theme, performance.now());
      });
    });

    this.resetCameraBtn.addEventListener('click', () => {
      this.camera.position.copy(INITIAL_CAMERA_POS);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private drawWaveform(waveform: Float32Array): void {
    const ctx = this.waveformCtx;
    const w = this.waveformCanvas.width;
    const h = this.waveformCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();

    if (waveform.length === 0) {
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
    } else {
      const step = Math.max(1, Math.floor(waveform.length / w));
      for (let x = 0; x < w; x++) {
        const i = x * step;
        const value = waveform[i] || 0;
        const y = h / 2 + value * (h / 2 - 2);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }

    ctx.stroke();
  }

  private updateSpotlights(delta: number, totalEnergy: number): void {
    for (const bundle of this.spotlights) {
      bundle.angle += bundle.speed * delta;
      const x = Math.cos(bundle.angle) * bundle.radius;
      const z = Math.sin(bundle.angle) * bundle.radius;

      bundle.light.position.set(x, bundle.height, z);
      bundle.light.target.position.set(0, 0, 0);
      bundle.light.target.updateMatrixWorld();

      const intensity = THREE.MathUtils.lerp(0.5, 2.0, totalEnergy);
      bundle.light.intensity = intensity;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = performance.now();
    const elapsed = this.clock.getElapsedTime();

    const audioData = this.audioController.getAudioData();
    this.lastAudioData = audioData;

    this.danceFloor.update({
      lowFreq: audioData.lowFreq,
      delta,
    });

    this.particleSystem.update({
      midFreq: audioData.midFreq,
      highFreq: audioData.highFreq,
      delta,
      time: elapsed,
    });

    this.updateSpotlights(delta, audioData.totalEnergy);
    this.drawWaveform(audioData.waveform);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    this.clock.start();
    this.animate();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.audioController.dispose();
    this.danceFloor.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
app.start();

(window as any).__app = app;
