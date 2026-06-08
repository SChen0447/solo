import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particleSystem';
import { AudioAnalyzer } from './audioAnalyzer';
import type { ParticleStyle, FrequencyData } from './audioAnalyzer';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private audioAnalyzer: AudioAnalyzer;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private isMobile: boolean;
  private defaultCameraPosition: THREE.Vector3;
  private isResettingCamera = false;
  private resetStartTime = 0;
  private resetStartPosition: THREE.Vector3 = new THREE.Vector3();
  private resetTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private resetStartTarget: THREE.Vector3 = new THREE.Vector3();
  private freqData: FrequencyData = { bass: 0, mid: 0, high: 0, overall: 0 };

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.waveformCanvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
    this.waveformCtx = this.waveformCanvas.getContext('2d')!;
    
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;

    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.defaultCameraPosition = new THREE.Vector3(0, 8, 15);
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.lookAt(0, 3, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 3, 0);

    const particleCount = this.isMobile ? 800 : 2000;
    this.particleSystem = new ParticleSystem(particleCount);
    this.scene.add(this.particleSystem.getPoints());

    this.addGroundRing();

    this.audioAnalyzer = new AudioAnalyzer();
    this.clock = new THREE.Clock();

    this.setupEventListeners();
    this.setupUI();
    this.resizeWaveform();
    this.animate();
  }

  private addGroundRing(): void {
    const ringGeometry = new THREE.RingGeometry(2.9, 3.1, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    const innerRingGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const innerRingMaterial = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.06;
    this.scene.add(innerRing);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private setupUI(): void {
    const uploadZone = document.getElementById('upload-zone')!;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const playBtn = document.getElementById('play-btn')!;
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const panelToggle = document.getElementById('panel-toggle')!;
    const controlPanel = document.getElementById('control-panel')!;
    const styleButtons = document.querySelectorAll('.style-btn');

    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFileUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.handleFileUpload(target.files[0]);
      }
    });

    playBtn.addEventListener('click', () => {
      if (this.audioAnalyzer.getIsPlaying()) {
        this.audioAnalyzer.pause();
        playBtn.textContent = '▶';
      } else {
        this.audioAnalyzer.play()?.then(() => {
          playBtn.textContent = '⏸';
        });
      }
    });

    volumeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.audioAnalyzer.setVolume(value);
    });

    panelToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('open');
    });

    styleButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const style = (btn as HTMLElement).dataset.style as ParticleStyle;
        this.particleSystem.setStyle(style);
        
        styleButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        btn.animate(
          [
            { transform: 'scale(1)' },
            { transform: 'scale(1.15)' },
            { transform: 'scale(1)' }
          ],
          {
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
          }
        );
      });
    });
  }

  private async handleFileUpload(file: File): Promise<void> {
    const uploadZone = document.getElementById('upload-zone')!;
    const audioInfo = document.getElementById('audio-info')!;
    const audioName = document.getElementById('audio-name')!;
    const playBtn = document.getElementById('play-btn')!;
    const controlPanel = document.getElementById('control-panel')!;

    try {
      await this.audioAnalyzer.loadFile(file);
      
      uploadZone.classList.add('hidden');
      audioInfo.style.display = 'block';
      audioName.textContent = file.name;
      controlPanel.classList.add('open');
      playBtn.textContent = '▶';

      this.updateProgressDisplay();
    } catch (error) {
      console.error('Failed to load audio:', error);
      alert('音频文件加载失败，请检查文件格式');
    }
  }

  private updateProgressDisplay(): void {
    const audioProgress = document.getElementById('audio-progress')!;
    const progressBar = document.getElementById('progress-bar')!;
    
    const current = this.audioAnalyzer.getCurrentTime();
    const duration = this.audioAnalyzer.getDuration();
    
    const formatTime = (time: number): string => {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    audioProgress.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    
    if (duration > 0) {
      progressBar.style.width = `${(current / duration) * 100}%`;
    }
  }

  private drawWaveform(): void {
    const waveformData = this.audioAnalyzer.getWaveformData();
    const ctx = this.waveformCtx;
    const canvas = this.waveformCanvas;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const hue = (this.freqData.bass * 60 + 180) % 360;
    gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, 0.8)`);
    gradient.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 80%, 60%, 0.6)`);
    gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 80%, 50%, 0.3)`);

    if (waveformData) {
      ctx.beginPath();
      const sliceWidth = width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      x = 0;
      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = height - (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.1)`;
      ctx.fillRect(0, 0, width, height);
    } else {
      const barCount = 64;
      const barWidth = width / barCount - 2;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = (Math.sin(Date.now() / 500 + i * 0.5) + 1) * height * 0.15 + height * 0.1;
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;
        
        ctx.fillStyle = `rgba(100, 200, 255, 0.3)`;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    }
  }

  private resizeWaveform(): void {
    const container = document.getElementById('waveform-container')!;
    this.waveformCanvas.width = container.clientWidth * window.devicePixelRatio;
    this.waveformCanvas.height = container.clientHeight * window.devicePixelRatio;
    this.waveformCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.resizeWaveform();

    const newIsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768;
    
    if (newIsMobile !== this.isMobile) {
      this.isMobile = newIsMobile;
      const particleCount = this.isMobile ? 800 : 2000;
      this.particleSystem.setParticleCount(particleCount);
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'r') {
      this.resetCamera();
    }
  }

  private resetCamera(): void {
    this.isResettingCamera = true;
    this.resetStartTime = performance.now();
    this.resetStartPosition.copy(this.camera.position);
    this.resetTargetPosition.copy(this.defaultCameraPosition);
    this.resetStartTarget.copy(this.controls.target);
  }

  private updateCameraReset(): void {
    if (!this.isResettingCamera) return;

    const elapsed = (performance.now() - this.resetStartTime) / 1000;
    const duration = 1;
    
    if (elapsed >= duration) {
      this.isResettingCamera = false;
      this.camera.position.copy(this.defaultCameraPosition);
      this.controls.target.set(0, 3, 0);
      return;
    }

    const t = elapsed / duration;
    const easeT = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(
      this.resetStartPosition,
      this.resetTargetPosition,
      easeT
    );

    this.controls.target.lerpVectors(
      this.resetStartTarget,
      new THREE.Vector3(0, 3, 0),
      easeT
    );
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.freqData = this.audioAnalyzer.getFrequencyData();

    this.particleSystem.update(deltaTime, this.freqData);

    this.updateCameraReset();
    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.drawWaveform();
    
    if (this.audioAnalyzer.getFileName()) {
      this.updateProgressDisplay();
    }
  }
}

new App();
