import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer';
import { BuildingGrid, ColorMode } from './buildingGrid';
import { Environment, DayNightMode } from './environment';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private audioAnalyzer: AudioAnalyzer;
  private buildingGrid: BuildingGrid;
  private environment: Environment;

  private container: HTMLElement;
  private dropZone: HTMLElement;
  private fileInput: HTMLInputElement;
  private controlPanel: HTMLElement;
  private playPauseBtn: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private colorModeToggle: HTMLInputElement;
  private dayNightBtn: HTMLButtonElement;
  private uploadBtn: HTMLButtonElement;
  private trackInfo: HTMLElement;
  private trackName: HTMLElement;
  private trackStatusText: HTMLElement;

  private isAudioLoaded: boolean = false;
  private animationId: number = 0;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.dropZone = document.getElementById('drop-zone')!;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.controlPanel = document.getElementById('control-panel')!;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.colorModeToggle = document.getElementById('color-mode-toggle') as HTMLInputElement;
    this.dayNightBtn = document.getElementById('day-night-btn') as HTMLButtonElement;
    this.uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
    this.trackInfo = document.getElementById('track-info')!;
    this.trackName = document.getElementById('track-name')!;
    this.trackStatusText = document.getElementById('track-status-text')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 10, 25);
    this.camera.lookAt(0, 3, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 3, 0);

    this.clock = new THREE.Clock();

    this.audioAnalyzer = new AudioAnalyzer();
    this.environment = new Environment(this.scene, this.renderer);
    this.buildingGrid = new BuildingGrid(this.scene);

    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.dropZone.addEventListener('click', () => {
      this.fileInput.click();
    });

    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleAudioFile(files[0]);
      }
    });

    this.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (files && files.length > 0) {
        this.handleAudioFile(files[0]);
      }
    });

    this.playPauseBtn.addEventListener('click', () => {
      if (!this.isAudioLoaded) return;
      
      const isPlaying = this.audioAnalyzer.togglePlayback();
      this.updatePlayPauseButton(isPlaying);
      this.updateStatusText(isPlaying ? '播放中' : '已暂停');
    });

    this.volumeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.audioAnalyzer.setVolume(value);
    });

    this.colorModeToggle.addEventListener('change', (e) => {
      const isMonochrome = (e.target as HTMLInputElement).checked;
      const mode: ColorMode = isMonochrome ? 'monochrome' : 'rainbow';
      this.buildingGrid.setColorMode(mode);
    });

    this.dayNightBtn.addEventListener('click', () => {
      const newMode = this.environment.toggleMode();
      this.updateDayNightButton(newMode);
    });

    this.uploadBtn.addEventListener('click', () => {
      this.fileInput.click();
    });
  }

  private async handleAudioFile(file: File): Promise<void> {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
    const fileName = file.name.toLowerCase();
    const validExtension = fileName.endsWith('.mp3') || fileName.endsWith('.wav');
    
    if (!validTypes.includes(file.type) && !validExtension) {
      alert('请上传 MP3 或 WAV 格式的音频文件');
      return;
    }

    try {
      this.updateStatusText('正在加载...');
      this.trackName.textContent = file.name;
      
      await this.audioAnalyzer.loadAudioFile(file);
      this.isAudioLoaded = true;

      this.dropZone.classList.add('hidden');
      this.controlPanel.style.display = 'block';
      this.trackInfo.classList.add('visible');

      this.audioAnalyzer.play();
      this.updatePlayPauseButton(true);
      this.updateStatusText('播放中');
      
      this.buildingGrid.resetRiseAnimation();

    } catch (error) {
      console.error('音频加载失败:', error);
      alert('音频加载失败，请尝试其他文件');
      this.updateStatusText('加载失败');
    }
  }

  private updatePlayPauseButton(isPlaying: boolean): void {
    this.playPauseBtn.textContent = isPlaying ? '⏸ 暂停' : '▶ 播放';
  }

  private updateDayNightButton(mode: DayNightMode): void {
    this.dayNightBtn.textContent = mode === 'night' ? '☀️ 切换到白天' : '🌙 切换到夜晚';
  }

  private updateStatusText(text: string): void {
    this.trackStatusText.textContent = text;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1) {
      console.debug(`FPS: ${this.fpsFrames}`);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.controls.update();

    const frequencyData = this.audioAnalyzer.getFrequencyData();

    this.environment.update(deltaTime);
    this.buildingGrid.update(deltaTime, frequencyData, this.environment.isNight());

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.audioAnalyzer.dispose();
    this.buildingGrid.dispose();
    this.environment.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
