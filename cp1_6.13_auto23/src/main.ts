import { Visualizer } from './visualizer';
import { ParticleSystem } from './particles';
import './styles.css';

class App {
  private canvas: HTMLCanvasElement;
  private visualizer: Visualizer;
  private particles: ParticleSystem;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array();

  private isPlaying: boolean = false;
  private animationId: number = 0;
  private lastTime: number = 0;
  private isMobile: boolean = false;

  private uploadInput: HTMLInputElement;
  private playBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private volumeSlider: HTMLInputElement;
  private volumeValueText: HTMLElement;
  private trackNameEl: HTMLElement;
  private iconPlay: SVGElement;
  private iconPause: SVGElement;

  constructor() {
    const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.visualizer = new Visualizer(canvas);
    this.particles = new ParticleSystem(canvas);

    this.uploadInput = document.getElementById('audio-upload') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volumeValueText = document.getElementById('volume-value-text') as HTMLElement;
    this.trackNameEl = document.getElementById('track-name') as HTMLElement;

    const iconPlay = document.querySelector('.icon-play');
    const iconPause = document.querySelector('.icon-pause');
    if (!iconPlay || !iconPause) throw new Error('Play/pause icons not found');
    this.iconPlay = iconPlay as SVGElement;
    this.iconPause = iconPause as SVGElement;

    this.checkMobile();
    this.bindEvents();
    this.animate(performance.now());
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    const barCount = this.isMobile ? 16 : 32;
    this.visualizer.setBarCount(barCount);
  }

  private bindEvents(): void {
    this.uploadInput.addEventListener('change', this.handleFileUpload.bind(this));
    this.playBtn.addEventListener('click', this.togglePlay.bind(this));
    this.resetBtn.addEventListener('click', this.resetEffects.bind(this));
    this.volumeSlider.addEventListener('input', this.handleVolumeChange.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.checkMobile();
    this.visualizer.resize();
    this.particles.resize();
  }

  private handleFileUpload(e: Event): void {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    this.trackNameEl.textContent = file.name;

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    if (!this.audioContext) {
      this.initAudioContext();
    }

    const url = URL.createObjectURL(file);
    this.audioElement = new Audio(url);
    this.audioElement.crossOrigin = 'anonymous';

    if (this.audioSource) {
      this.audioSource.disconnect();
    }

    this.audioSource = this.audioContext!.createMediaElementSource(this.audioElement);
    this.audioSource.connect(this.gainNode!);
    this.gainNode!.connect(this.analyser!);
    this.analyser!.connect(this.audioContext!.destination);

    const initialVolume = parseInt(this.volumeSlider.value) / 100;
    this.gainNode!.gain.value = initialVolume;

    this.audioElement.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayButton();
    });

    if (this.audioContext!.state === 'suspended') {
      this.audioContext!.resume();
    }

    this.audioElement.play().then(() => {
      this.isPlaying = true;
      this.updatePlayButton();
      this.enableControls();
    }).catch((err) => {
      console.warn('Autoplay failed:', err);
      this.isPlaying = false;
      this.updatePlayButton();
      this.enableControls();
    });
  }

  private initAudioContext(): void {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;

    this.gainNode = this.audioContext.createGain();

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);
  }

  private togglePlay(): void {
    if (!this.audioElement) return;

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play();
      this.isPlaying = true;
    }
    this.updatePlayButton();
  }

  private updatePlayButton(): void {
    if (this.isPlaying) {
      this.iconPlay.style.display = 'none';
      this.iconPause.style.display = 'block';
    } else {
      this.iconPlay.style.display = 'block';
      this.iconPause.style.display = 'none';
    }
  }

  private enableControls(): void {
    this.playBtn.disabled = false;
    this.resetBtn.disabled = false;
  }

  private resetEffects(): void {
    this.visualizer.triggerFlash();
    this.particles.triggerFlash();
    this.particles.reset();

    this.playBtn.classList.add('flash');
    this.resetBtn.classList.add('flash');
    setTimeout(() => {
      this.playBtn.classList.remove('flash');
      this.resetBtn.classList.remove('flash');
    }, 300);
  }

  private handleVolumeChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = parseInt(target.value);
    const volume = value / 100;

    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(volume, this.audioContext?.currentTime || 0, 0.02);
    }

    this.animateVolumeValue(value);
  }

  private animateVolumeValue(value: number): void {
    this.volumeValueText.style.transform = 'translateY(-100%)';
    this.volumeValueText.style.opacity = '0';

    setTimeout(() => {
      this.volumeValueText.textContent = value.toString();
      this.volumeValueText.style.transform = 'translateY(0)';
      this.volumeValueText.style.opacity = '1';
    }, 100);
  }

  private animate(currentTime: number): void {
    this.animationId = requestAnimationFrame((t) => this.animate(t));

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    ctx.clearRect(0, 0, w, h);

    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.frequencyData);
    } else {
      for (let i = 0; i < this.frequencyData.length; i++) {
        this.frequencyData[i] = Math.random() * 5 + Math.sin(currentTime * 0.002 + i * 0.3) * 3;
      }
    }

    this.visualizer.update(this.frequencyData, dt);
    this.visualizer.render();

    const lowEnergy = this.visualizer.getLowFrequencyEnergy();
    const highEnergy = this.visualizer.getHighFrequencyEnergy();

    this.particles.setEnergies(lowEnergy, highEnergy);
    this.particles.update(dt);
    this.particles.render();
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
