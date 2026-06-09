import { Visualizer, VisualEffect } from './visualizer.js';
import { UIController } from './ui.js';

class App {
  private visualizer: Visualizer;
  private ui: UIController;
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private lastTimestamp = 0;
  private animationFrameId: number | null = null;

  constructor() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.visualizer = new Visualizer(canvas);

    this.ui = new UIController({
      onFileSelected: (file) => this.handleFileSelected(file),
      onPlayToggle: () => this.handlePlayToggle(),
      onEffectChange: (effect) => this.handleEffectChange(effect),
      onVolumeChange: (volume) => this.handleVolumeChange(volume)
    });

    this.bindWindowEvents();
    this.startRenderLoop();
  }

  private bindWindowEvents(): void {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.visualizer.resize();
      }, 100);
    });
  }

  private async handleFileSelected(file: File): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
          sampleRate: 44100
        });
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.isPlaying = false;
        this.ui.setPlayingState(false);
        this.visualizer.clearParticles();
      }

      this.audioElement = new Audio();
      this.audioElement.src = URL.createObjectURL(file);
      this.audioElement.crossOrigin = 'anonymous';

      this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.ui.getVolume();

      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      if (this.analyser) {
        this.visualizer.setupAudio(this.analyser);
      }

      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.ui.setPlayingState(false);
        this.visualizer.clearParticles();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        this.ui.disablePlayButton();
      });

      await this.audioElement.play();
      this.isPlaying = true;
      this.ui.setPlayingState(true);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      this.ui.disablePlayButton();
    }
  }

  private async handlePlayToggle(): Promise<void> {
    if (!this.audioElement || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.isPlaying) {
        this.audioElement.pause();
        this.isPlaying = false;
        this.ui.setPlayingState(false);
      } else {
        await this.audioElement.play();
        this.isPlaying = true;
        this.ui.setPlayingState(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  }

  private handleEffectChange(effect: VisualEffect): void {
    this.visualizer.setEffect(effect);
  }

  private handleVolumeChange(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
  }

  private startRenderLoop(): void {
    const render = (timestamp: number) => {
      if (this.lastTimestamp === 0) {
        this.lastTimestamp = timestamp;
      }
      const deltaTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
      this.lastTimestamp = timestamp;

      this.visualizer.render(deltaTime, this.isPlaying);

      this.animationFrameId = requestAnimationFrame(render);
    };

    this.animationFrameId = requestAnimationFrame(render);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
