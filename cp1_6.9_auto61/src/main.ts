import { GestureTracker, GestureData } from './gestureTracker';
import { AudioAnalyzer, AudioData } from './audioAnalyzer';
import { ParticleSystem } from './particleSystem';
import { SceneRenderer } from './sceneRenderer';

const EMPTY_GESTURE: GestureData = {
  handsDetected: 0,
  wristAngles: [undefined, undefined],
  palmSpeeds: [undefined, undefined],
  isFist: [undefined, undefined],
  handsDistance: undefined,
  handPositions: [],
  landmarks: []
};

const EMPTY_AUDIO: AudioData = {
  spectrum: new Float32Array(64),
  bassEnergy: 0,
  midEnergy: 0,
  highEnergy: 0,
  averageVolume: 0
};

class App {
  private gestureTracker: GestureTracker | null = null;
  private audioAnalyzer: AudioAnalyzer | null = null;
  private particleSystem: ParticleSystem | null = null;
  private sceneRenderer: SceneRenderer | null = null;

  private currentGesture: GestureData = { ...EMPTY_GESTURE, handPositions: [], landmarks: [] };
  private currentAudio: AudioData = { ...EMPTY_AUDIO, spectrum: new Float32Array(64) };

  private animationFrameId: number | null = null;
  private lastTime = 0;
  private fps = 60;
  private fpsFrames = 0;
  private fpsLastUpdate = 0;

  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private camPreview: HTMLVideoElement;
  private camWrap: HTMLElement;
  private fpsCounter: HTMLElement;
  private spectrumBar: HTMLElement;
  private spectrumBars: HTMLDivElement[] = [];
  private isRunning = false;

  constructor() {
    this.canvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('app') as HTMLElement;
    this.camPreview = document.getElementById('cam-preview') as HTMLVideoElement;
    this.camWrap = document.getElementById('cam-wrap') as HTMLElement;
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement;
    this.spectrumBar = document.getElementById('spectrum-bar') as HTMLElement;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.particleSystem = new ParticleSystem();
    this.sceneRenderer = new SceneRenderer(this.canvas, this.container);

    this.buildSpectrumBars();

    try {
      await this.initCamera();
      this.gestureTracker = new GestureTracker(this.camPreview);
      await this.gestureTracker.init();
      this.gestureTracker.onResults((data) => {
        this.currentGesture = data;
        if (data.handsDetected > 0) {
          this.camWrap.classList.add('ready');
        } else {
          this.camWrap.classList.remove('ready');
        }
      });
      this.gestureTracker.start();
    } catch (e) {
      console.warn('Camera or gesture tracking failed:', e);
    }

    try {
      this.audioAnalyzer = new AudioAnalyzer();
      this.audioAnalyzer.startRandomMode();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }

    this.lastTime = performance.now();
    this.fpsLastUpdate = this.lastTime;
    this.loop();
  }

  private buildSpectrumBars(): void {
    this.spectrumBar.innerHTML = '';
    this.spectrumBars = [];
    for (let i = 0; i < 64; i++) {
      const bar = document.createElement('div');
      bar.style.height = '2px';
      this.spectrumBar.appendChild(bar);
      this.spectrumBars.push(bar);
    }
  }

  private async initCamera(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    });
    this.camPreview.srcObject = stream;
    await this.camPreview.play();
    this.camWrap.style.display = 'block';
  }

  private loop = (): void => {
    this.animationFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.fpsFrames++;
    if (now - this.fpsLastUpdate >= 500) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastUpdate));
      this.fpsCounter.textContent = `FPS: ${this.fps}`;
      this.fpsFrames = 0;
      this.fpsLastUpdate = now;
    }

    if (this.audioAnalyzer) {
      this.currentAudio = this.audioAnalyzer.getAudioData(dt);
    }
    if (this.particleSystem && this.sceneRenderer) {
      const state = this.particleSystem.update(dt, this.currentGesture, this.currentAudio);
      this.sceneRenderer.render(state);
    }

    this.updateSpectrumUI();
  };

  private updateSpectrumUI(): void {
    const spectrum = this.currentAudio.spectrum;
    const maxH = 80;
    for (let i = 0; i < 64 && i < spectrum.length; i++) {
      const v = spectrum[i];
      const h = Math.max(2, Math.round(v * maxH));
      this.spectrumBars[i].style.height = `${h}px`;
    }
  }

  getAudioAnalyzer(): AudioAnalyzer | null {
    return this.audioAnalyzer;
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.gestureTracker) this.gestureTracker.stop();
    if (this.audioAnalyzer) this.audioAnalyzer.dispose();
    if (this.sceneRenderer) this.sceneRenderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
  const overlay = document.getElementById('start-overlay') as HTMLElement;
  const topBar = document.getElementById('top-bar') as HTMLElement;
  const fpsCounter = document.getElementById('fps-counter') as HTMLElement;
  const spectrumBar = document.getElementById('spectrum-bar') as HTMLElement;
  const musicBtn = document.getElementById('music-btn') as HTMLButtonElement;
  const randomBtn = document.getElementById('random-btn') as HTMLButtonElement;
  const musicInput = document.getElementById('music-input') as HTMLInputElement;
  const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

  startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = '正 在 启 动...';
    try {
      app = new App();
      await app.start();
      overlay.style.display = 'none';
      topBar.style.display = 'flex';
      fpsCounter.style.display = 'block';
      spectrumBar.style.display = 'flex';
    } catch (e) {
      console.error(e);
      startBtn.disabled = false;
      startBtn.textContent = '重 试';
      alert('启动失败：' + (e instanceof Error ? e.message : String(e)));
    }
  });

  musicBtn.addEventListener('click', () => {
    musicInput.click();
  });

  musicInput.addEventListener('change', async () => {
    const file = musicInput.files?.[0];
    if (!file || !app) return;
    try {
      const analyzer = app.getAudioAnalyzer();
      if (analyzer) {
        analyzer.stopRandomMode();
        randomBtn.classList.remove('active');
        await analyzer.initFromFile(file);
      }
    } catch (e) {
      console.error('Failed to load audio file:', e);
    }
  });

  randomBtn.addEventListener('click', () => {
    if (!app) return;
    const analyzer = app.getAudioAnalyzer();
    if (!analyzer) return;
    if (analyzer.isRandomMode()) {
      analyzer.stopRandomMode();
      randomBtn.classList.remove('active');
    } else {
      analyzer.stopFilePlayback();
      analyzer.startRandomMode();
      randomBtn.classList.add('active');
    }
  });

  volumeSlider.addEventListener('input', () => {
    if (!app) return;
    const analyzer = app.getAudioAnalyzer();
    if (!analyzer) return;
    const v = parseInt(volumeSlider.value, 10) / 100;
    analyzer.setVolume(v);
  });
});
